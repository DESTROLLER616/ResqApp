<script setup lang="ts">
import { indentWithTab } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { linter, lintGutter } from '@codemirror/lint'
import { Compartment, type Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap, placeholder, type ViewUpdate } from '@codemirror/view'
import { Code } from '@vicons/fa'
import { basicSetup } from 'codemirror'
import { NButton, NDropdown, NIcon, NSelect, NTooltip, type SelectOption } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { environmentVariableHighlight } from '@/features/environments/variable-decorations'
import { jsonBodyLinter, syntaxErrorLinter } from '@/features/request/utils/body-linter'
import { useEnvironmentsStore } from '@/stores/environments'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import type { VariableStatus } from '@/types/environment'
import type { BodyMode, RequestBody } from '@/types/http'
import { LANGUAGE_BODY, type LanguageBody } from '@/types/language-body'

import RequestFormDataEditor from './request-form-data-editor.vue'

const LINT_DELAY_MS = 300

const REMOTE_SET_EVENT = 'set.remote'

const props = defineProps<{
  body: RequestBody
}>()

const projectStore = useProjectStore()
const environmentsStore = useEnvironmentsStore()
const { catalog, activeEnvironment } = storeToRefs(environmentsStore)
const { resolvedTheme } = storeToRefs(useUiStore())
const { t, locale } = useI18n()

const languageOptions: SelectOption[] = LANGUAGE_BODY.map((language) => ({
  label: language,
  value: language,
}))

const modeOptions = computed<SelectOption[]>(() => [
  { label: t('request.bodyModes.raw'), value: 'raw' },
  { label: t('request.bodyModes.formData'), value: 'formData' },
])

const hostRef = ref<HTMLDivElement | null>(null)
const languageCompartment = new Compartment()
const lintCompartment = new Compartment()
const themeCompartment = new Compartment()
const highlightCompartment = new Compartment()
let view: EditorView | null = null
let resizeObserver: ResizeObserver | null = null

function languageExtension(language: LanguageBody): Extension {
  switch (language) {
    case 'JSON':
      return json()
    case 'HTML':
      return html()
    case 'XML':
      return xml()
    case 'TEXT':
      return []
  }
}

function lintExtension(language: LanguageBody): Extension {
  const config = { delay: LINT_DELAY_MS }
  switch (language) {
    case 'JSON':
      return linter(jsonBodyLinter, config)
    case 'HTML':
    case 'XML':
      return linter(
        syntaxErrorLinter(() => t('request.error.bodySyntaxError')),
        config,
      )
    case 'TEXT':
      return []
  }
}

function editorSizeExtension(): Extension {
  return EditorView.theme({
    '&': { height: '100%', maxHeight: '100%' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-content': { minHeight: '100%' },
  })
}

function themeExtension(theme: 'light' | 'dark') {
  return theme === 'dark' ? oneDark : []
}

const highlightTitles = computed<Record<VariableStatus, string>>(() => ({
  active: t('environments.highlight.active'),
  other: t('environments.highlight.other'),
  missing: t('environments.highlight.missing'),
}))

const highlightKey = computed(() => {
  const active = [...catalog.value.activeKeys].sort().join('\0')
  const project = [...catalog.value.projectKeys].sort().join('\0')
  return `${locale.value}|${active}|${project}`
})

function highlightExtension(): Extension {
  return environmentVariableHighlight(
    catalog.value.activeKeys,
    catalog.value.projectKeys,
    highlightTitles.value,
  )
}

const insertOptions = computed(() => {
  const seen = new Set<string>()
  const options: Array<{ label: string; key: string }> = []
  for (const variable of activeEnvironment.value?.variables ?? []) {
    const key = variable.key.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    options.push({ label: key, key })
  }
  return options
})

function insertVariable(key: string | number): void {
  if (!view) return
  const token = `{{${String(key)}}}`
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: token },
    selection: { anchor: from + token.length },
  })
  view.focus()
}

function isLanguageBody(value: unknown): value is LanguageBody {
  return typeof value === 'string' && (LANGUAGE_BODY as readonly string[]).includes(value)
}

function isBodyMode(value: unknown): value is BodyMode {
  return value === 'raw' || value === 'formData'
}

function currentBodyData(): string {
  return view?.state.doc.toString() ?? props.body.data
}

function updateBody(patch: Partial<RequestBody>): void {
  projectStore.updateActiveRequest({
    body: {
      ...props.body,
      ...patch,
    },
  })
}

function updateMode(value: string): void {
  if (!isBodyMode(value) || value === props.body.mode) return
  updateBody({
    mode: value,
    data: currentBodyData(),
  })
}

function updateLanguage(value: string): void {
  if (!isLanguageBody(value) || value === props.body.language) return
  updateBody({
    data: currentBodyData(),
    language: value,
  })
}

function onDocChanged(update: ViewUpdate): void {
  if (!update.docChanged) return
  if (update.transactions.every((tr) => tr.isUserEvent(REMOTE_SET_EVENT))) return

  updateBody({
    data: update.state.doc.toString(),
  })
}

onMounted(async () => {
  await nextTick()
  if (!hostRef.value) return

  view = new EditorView({
    parent: hostRef.value,
    doc: props.body.data ?? '',
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      placeholder('{}'),
      editorSizeExtension(),
      languageCompartment.of(languageExtension(props.body.language)),
      lintCompartment.of(lintExtension(props.body.language)),
      lintGutter(),
      themeCompartment.of(themeExtension(resolvedTheme.value)),
      highlightCompartment.of(highlightExtension()),
      EditorView.updateListener.of(onDocChanged),
      EditorView.lineWrapping,
    ],
  })

  resizeObserver = new ResizeObserver(() => {
    view?.requestMeasure()
  })
  resizeObserver.observe(hostRef.value)
})

watch(
  () => props.body.data,
  (body) => {
    if (!view || view.state.doc.toString() === body) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: body },
      userEvent: REMOTE_SET_EVENT,
    })
  },
)

watch(
  () => props.body.mode,
  (mode) => {
    if (mode === 'raw') view?.requestMeasure()
  },
)

watch(
  () => props.body.language,
  (language) => {
    view?.dispatch({
      effects: [
        languageCompartment.reconfigure(languageExtension(language)),
        lintCompartment.reconfigure(lintExtension(language)),
      ],
    })
  },
)

watch(highlightKey, () => {
  view?.dispatch({
    effects: highlightCompartment.reconfigure(highlightExtension()),
  })
})

watch(resolvedTheme, (theme) => {
  view?.dispatch({
    effects: themeCompartment.reconfigure(themeExtension(theme)),
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  view?.destroy()
  view = null
})
</script>

<template>
  <div class="body-editor">
    <div class="body-editor__toolbar">
      <n-select
        class="body-editor__mode"
        size="small"
        to="body"
        :value="body.mode"
        :options="modeOptions"
        :consistent-menu-width="false"
        :aria-label="t('request.bodyMode')"
        @update:value="updateMode"
      />
      <n-dropdown
        v-if="body.mode === 'raw'"
        trigger="click"
        :options="insertOptions"
        :disabled="insertOptions.length === 0"
        @select="insertVariable"
      >
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" quaternary :disabled="insertOptions.length === 0">
              <template #icon>
                <n-icon :component="Code" />
              </template>
              {{ t('environments.insert') }}
            </n-button>
          </template>
          {{ t('environments.insert') }}
        </n-tooltip>
      </n-dropdown>
      <n-select
        v-if="body.mode === 'raw'"
        class="body-editor__language"
        size="small"
        to="body"
        :value="body.language"
        :options="languageOptions"
        :consistent-menu-width="false"
        :aria-label="t('request.bodyLanguage')"
        @update:value="updateLanguage"
      />
    </div>
    <RequestFormDataEditor v-if="body.mode === 'formData'" :body="body" />
    <div v-show="body.mode === 'raw'" ref="hostRef" class="body-editor__host"></div>
  </div>
</template>

<style scoped>
.body-editor {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}

.body-editor__toolbar {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 0 8px;
}

.body-editor__mode {
  width: 140px;
}

.body-editor__language {
  width: 110px;
}

.body-editor__host {
  position: relative;
  z-index: 0;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.body-editor__host :deep(.cm-editor) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.body-editor__host :deep(.cm-scroller) {
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.body-editor__host :deep(.cm-env-var) {
  border-radius: 3px;
}

.body-editor__host :deep(.cm-env-var--active) {
  color: var(--var-active-fg);
  background: var(--var-active-bg);
}

.body-editor__host :deep(.cm-env-var--other) {
  color: var(--var-other-fg);
  background: var(--var-other-bg);
}

.body-editor__host :deep(.cm-env-var--missing) {
  color: var(--var-missing-fg);
  background: var(--var-missing-bg);
}
</style>
