<script setup lang="ts">
import { Code } from '@vicons/fa'
import { NButton, NDropdown, NIcon, NInput, NTooltip } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { variableSpans } from '@/features/environments/resolve'
import { useEnvironmentsStore } from '@/stores/environments'
import type { VariableStatus } from '@/types/environment'

const props = withDefaults(
  defineProps<{
    value: string
    placeholder?: string
    size?: 'small' | 'medium' | 'large'
  }>(),
  {
    placeholder: '',
    size: 'medium',
  },
)

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const { t } = useI18n()
const environmentsStore = useEnvironmentsStore()
const { catalog, activeEnvironment } = storeToRefs(environmentsStore)

const root = ref<HTMLElement | null>(null)
const mirror = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const titles = computed<Record<VariableStatus, string>>(() => ({
  active: t('environments.highlight.active'),
  other: t('environments.highlight.other'),
  missing: t('environments.highlight.missing'),
}))

const parts = computed(() => {
  const text = props.value
  const spans = variableSpans(text, catalog.value.activeKeys, catalog.value.projectKeys)
  if (spans.length === 0) {
    return [{ text, status: 'plain' as const, title: '' }]
  }
  const pieces: Array<{ text: string; status: VariableStatus | 'plain'; title: string }> = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) {
      pieces.push({ text: text.slice(cursor, span.start), status: 'plain', title: '' })
    }
    pieces.push({
      text: text.slice(span.start, span.end),
      status: span.status,
      title: titles.value[span.status],
    })
    cursor = span.end
  }
  if (cursor < text.length) {
    pieces.push({ text: text.slice(cursor), status: 'plain', title: '' })
  }
  return pieces
})

const insertOptions = computed(() => {
  const variables = activeEnvironment.value?.variables ?? []
  const seen = new Set<string>()
  const options: Array<{ label: string; key: string }> = []
  for (const variable of variables) {
    const key = variable.key.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    options.push({ label: key, key })
  }
  return options
})

function inputElement(): HTMLInputElement | null {
  return root.value?.querySelector('input') ?? null
}

function syncMirror(): void {
  const input = inputElement()
  const mirrorEl = mirror.value
  const host = root.value
  if (!input || !mirrorEl || !host) return
  const hostRect = host.getBoundingClientRect()
  const rect = input.getBoundingClientRect()
  const style = getComputedStyle(input)
  mirrorEl.style.left = `${rect.left - hostRect.left}px`
  mirrorEl.style.top = `${rect.top - hostRect.top}px`
  mirrorEl.style.width = `${rect.width}px`
  mirrorEl.style.height = `${rect.height}px`
  mirrorEl.style.font = style.font
  mirrorEl.style.letterSpacing = style.letterSpacing
  mirrorEl.style.padding = style.padding
  mirrorEl.style.lineHeight = style.lineHeight
  mirrorEl.scrollLeft = input.scrollLeft
}

function onScroll(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !mirror.value) return
  mirror.value.scrollLeft = input.scrollLeft
}

function insertVariable(key: string | number): void {
  const token = `{{${String(key)}}}`
  const input = inputElement()
  const start = input?.selectionStart ?? props.value.length
  const end = input?.selectionEnd ?? start
  const next = `${props.value.slice(0, start)}${token}${props.value.slice(end)}`
  emit('update:value', next)
  const caret = start + token.length
  void nextTick(() => {
    const field = inputElement()
    field?.focus()
    field?.setSelectionRange(caret, caret)
    syncMirror()
  })
}

onMounted(() => {
  void nextTick(() => {
    syncMirror()
    inputElement()?.addEventListener('scroll', onScroll)
  })
  if (root.value) {
    resizeObserver = new ResizeObserver(() => syncMirror())
    resizeObserver.observe(root.value)
  }
})

onUnmounted(() => {
  inputElement()?.removeEventListener('scroll', onScroll)
  resizeObserver?.disconnect()
})

watch(
  () => props.value,
  () => {
    void nextTick(syncMirror)
  },
)
</script>

<template>
  <div ref="root" class="variable-input">
    <n-input
      :value="value"
      :placeholder="placeholder"
      :size="size"
      @update:value="emit('update:value', $event)"
    >
      <template #suffix>
        <n-dropdown
          trigger="click"
          :options="insertOptions"
          :disabled="insertOptions.length === 0"
          @select="insertVariable"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button quaternary size="tiny" :disabled="insertOptions.length === 0" tabindex="-1">
                <template #icon>
                  <n-icon :component="Code" />
                </template>
              </n-button>
            </template>
            {{ t('environments.insert') }}
          </n-tooltip>
        </n-dropdown>
      </template>
    </n-input>
    <div ref="mirror" class="variable-input__mirror" aria-hidden="true">
      <span
        v-for="(part, index) in parts"
        :key="index"
        :class="part.status === 'plain' ? undefined : `variable-input__token--${part.status}`"
        :title="part.title || undefined"
        >{{ part.text }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.variable-input {
  position: relative;
  width: 100%;
  min-width: 0;
}

.variable-input :deep(.n-input__input-el) {
  position: relative;
  z-index: 2;
  color: transparent;
  caret-color: var(--n-text-color);
  background: transparent;
}

.variable-input :deep(.n-input__input-el::placeholder) {
  color: var(--n-placeholder-color);
}

.variable-input__mirror {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  white-space: pre;
  pointer-events: none;
  color: var(--n-text-color);
}

.variable-input__token--active,
.variable-input__token--other,
.variable-input__token--missing {
  border-radius: 3px;
}

.variable-input__token--active {
  color: var(--var-active-fg);
  background: var(--var-active-bg);
}

.variable-input__token--other {
  color: var(--var-other-fg);
  background: var(--var-other-bg);
}

.variable-input__token--missing {
  color: var(--var-missing-fg);
  background: var(--var-missing-bg);
}
</style>
