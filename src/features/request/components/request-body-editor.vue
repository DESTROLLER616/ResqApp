<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { NSelect, type SelectOption } from 'naive-ui'
import { basicSetup } from 'codemirror'
import { Compartment } from '@codemirror/state'
import { EditorView, keymap, placeholder, type ViewUpdate } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { xml } from '@codemirror/lang-xml'
import { linter, lintGutter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { indentWithTab } from '@codemirror/commands'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import { LANGUAGE_BODY, type LanguageBody } from '@/types/language-body'
import { jsonBodyLinter, syntaxErrorLinter } from '@/features/request/utils/body-linter'

const LINT_DELAY_MS = 300

const REMOTE_SET_EVENT = 'set.remote'

const props = defineProps<{
  body: string
  language: LanguageBody
}>()

const projectStore = useProjectStore()
const { resolvedTheme } = storeToRefs(useUiStore())
const { t } = useI18n()

const languageOptions: SelectOption[] = LANGUAGE_BODY.map((language) => ({
  label: language,
  value: language,
}))

const hostRef = ref<HTMLDivElement | null>(null)
const languageCompartment = new Compartment()
const lintCompartment = new Compartment()
const themeCompartment = new Compartment()
let view: EditorView | null = null

function languageExtension(language: LanguageBody) {
  switch (language) {
    case 'JSON':
      return json()
    case 'HTML':
      return html()
    case 'XML':
      return xml()
  }
}

function lintExtension(language: LanguageBody) {
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
  }
}

function themeExtension(theme: 'light' | 'dark') {
  return theme === 'dark' ? oneDark : []
}

function isLanguageBody(value: unknown): value is LanguageBody {
  return typeof value === 'string' && (LANGUAGE_BODY as readonly string[]).includes(value)
}

function currentBodyData(): string {
  return view?.state.doc.toString() ?? props.body
}

function updateLanguage(value: string): void {
  if (!isLanguageBody(value) || value === props.language) return
  projectStore.updateActiveRequest({
    body: {
      data: currentBodyData(),
      language: value,
    },
  })
}

function onDocChanged(update: ViewUpdate): void {
  if (!update.docChanged) return
  if (update.transactions.every((tr) => tr.isUserEvent(REMOTE_SET_EVENT))) return

  projectStore.updateActiveRequest({
    body: {
      data: update.state.doc.toString(),
      language: props.language,
    },
  })
}

onMounted(() => {
  if (!hostRef.value) return

  view = new EditorView({
    parent: hostRef.value,
    doc: props.body,
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      placeholder('{}'),
      languageCompartment.of(languageExtension(props.language)),
      lintCompartment.of(lintExtension(props.language)),
      lintGutter(),
      themeCompartment.of(themeExtension(resolvedTheme.value)),
      EditorView.updateListener.of(onDocChanged),
      EditorView.lineWrapping,
    ],
  })
})

watch(
  () => props.body,
  (body) => {
    if (!view || view.state.doc.toString() === body) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: body },
      userEvent: REMOTE_SET_EVENT,
    })
  },
)

watch(
  () => props.language,
  (language) => {
    view?.dispatch({
      effects: [
        languageCompartment.reconfigure(languageExtension(language)),
        lintCompartment.reconfigure(lintExtension(language)),
      ],
    })
  },
)

watch(resolvedTheme, (theme) => {
  view?.dispatch({
    effects: themeCompartment.reconfigure(themeExtension(theme)),
  })
})

onUnmounted(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <div class="body-editor">
    <div class="body-editor__toolbar">
      <n-select
        class="body-editor__language"
        size="small"
        :value="language"
        :options="languageOptions"
        :consistent-menu-width="false"
        :aria-label="t('request.bodyLanguage')"
        @update:value="updateLanguage"
      />
    </div>
    <div ref="hostRef" class="body-editor__host" />
  </div>
</template>

<style scoped>
.body-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.body-editor__toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 8px;
}

.body-editor__language {
  width: 110px;
}

.body-editor__host {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.body-editor__host :deep(.cm-editor) {
  height: 100%;
}

.body-editor__host :deep(.cm-scroller) {
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}
</style>
