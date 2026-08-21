<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, useTemplateRef, VNodeChild, watch } from 'vue'
import { NButton, NEmpty, NInput, NSelect, NTabPane, NTabs, NText, NIcon, NTooltip } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { storeToRefs } from 'pinia'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useResizableSize } from '@/composables/use-resizable-size'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { HTTP_METHODS, type HttpMethod, type HttpParam, type HttpResponse } from '@/types/http'
import RequestBodyEditor from './request-body-editor.vue'
import RequestHeadersEditor from './request-headers-editor.vue'
import RequestParamsEditor from './request-params-editor.vue'
import ResponseBodyTab from './response-body-tab.vue'
import makeRequest from '../make-request.ts'
import ResponseHeadersTab from './response-headers-tab.vue'
import formatBytes from '@/utils/format-numbers.ts'
import { Upload } from '@vicons/fa'
import { useI18n } from 'vue-i18n'

const RESPONSE_MIN = 120
const REQUEST_MIN = 180
const RESPONSE_INITIAL = 220

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { activeDraft, hasProject } = storeToRefs(projectStore)
const { activeRequestPath } = storeToRefs(workspaceStore)
const { t } = useI18n()

const panelRef = useTemplateRef<HTMLElement>('panel')
const {
  size: responseHeight,
  resizeBy,
  setMax,
} = useResizableSize({
  initial: RESPONSE_INITIAL,
  min: RESPONSE_MIN,
  max: 600,
})
const response = ref<HttpResponse | null>(null)
const responseError = ref<string | null>(null)
const isSending = ref(false)
const requestTab = ref<'params' | 'headers' | 'body'>('body')

const METHODS_WITHOUT_BODY: ReadonlySet<HttpMethod> = new Set(['GET', 'HEAD'])

const isBodyDisabled = computed(() => {
  const method = activeDraft.value?.method
  return method !== undefined && METHODS_WITHOUT_BODY.has(method)
})

/** Local input value so URL normalization does not fight caret while typing. */
const urlDraft = ref('')
let skipParamsUrlSync = false

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  HEAD: '#6b7280',
  OPTIONS: '#6b7280',
}

const methodOptions: SelectOption[] = HTTP_METHODS.map((method) => ({
  label: String(method).charAt(0).toUpperCase() + String(method).slice(1),
  value: method,
}))

function renderMethodLabel(option: SelectOption): VNodeChild {
  const method = option.value as HttpMethod
  return h(
    'span',
    {
      style: {
        color: METHOD_COLORS[method],
        fontWeight: 600,
      },
    },
    String(option.label ?? method),
  )
}

async function sendRequest() {
  const draft = projectStore.activeDraft
  if (!draft) return
  responseError.value = null
  isSending.value = true
  try {
    response.value = await makeRequest(draft)
  } catch (error) {
    response.value = null
    responseError.value = error instanceof Error ? error.message : t('request.error.sendFailed')
  } finally {
    isSending.value = false
  }
}

function buildCompleteUrl(base: string, params: HttpParam[]): string {
  try {
    const url = new URL(base)
    url.search = ''
    for (const param of params) {
      if (param.enabled && param.key) {
        url.searchParams.append(param.key, param.value)
      }
    }
    return url.toString()
  } catch {
    return base
  }
}

function syncUrlDraftFromStore(): void {
  const draft = activeDraft.value
  if (!draft) {
    urlDraft.value = ''
    return
  }
  urlDraft.value = buildCompleteUrl(draft.url, draft.params ?? [])
}

function updateResponseMax(): void {
  const panelHeight = panelRef.value?.clientHeight ?? 0
  if (panelHeight <= 0) return
  setMax(Math.max(RESPONSE_MIN, panelHeight - REQUEST_MIN))
}

function onResponseDrag(delta: number): void {
  updateResponseMax()
  resizeBy(-delta)
}

function updateMethod(value: string): void {
  projectStore.updateActiveRequest({ method: value as HttpMethod })
}

function updateUrl(raw: string): void {
  urlDraft.value = raw

  try {
    const parsed = new URL(raw)
    const existingEnabled = activeDraft.value?.params.filter((p) => p.enabled) ?? []
    const usedIds = new Set<string>()

    const fromUrl: HttpParam[] = [...parsed.searchParams.entries()].map(([key, value]) => {
      const existing = existingEnabled.find((param) => param.key === key && !usedIds.has(param.id))
      if (existing) {
        usedIds.add(existing.id)
        return { ...existing, key, value, enabled: true }
      }
      return {
        id: crypto.randomUUID(),
        key,
        value,
        enabled: true,
      }
    })

    const emptyEnabled =
      activeDraft.value?.params.filter((param) => param.enabled && !param.key) ?? []
    const disabled = activeDraft.value?.params.filter((param) => !param.enabled) ?? []

    parsed.search = ''
    skipParamsUrlSync = true
    projectStore.updateActiveRequest({
      url: parsed.toString(),
      params: [...fromUrl, ...emptyEnabled, ...disabled],
    })
  } catch {
    // Incomplete URL while typing — keep draft as typed; do not touch params.
    projectStore.updateActiveRequest({ url: raw })
  }
}

watch(isBodyDisabled, (disabled) => {
  if (disabled && requestTab.value === 'body') {
    requestTab.value = 'params'
  }
})

onMounted(() => {
  updateResponseMax()
  window.addEventListener('resize', updateResponseMax)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateResponseMax)
  void projectStore.flushSave()
})

watch(activeDraft, () => {
  requestAnimationFrame(updateResponseMax)
})

watch(
  activeRequestPath,
  () => {
    syncUrlDraftFromStore()
  },
  { immediate: true },
)

watch(
  () => activeDraft.value?.params,
  () => {
    if (skipParamsUrlSync) {
      skipParamsUrlSync = false
      return
    }
    syncUrlDraftFromStore()
  },
  { deep: true },
)
</script>

<template>
  <div ref="panel" class="request-panel">
    <template v-if="activeDraft && activeRequestPath">
      <div class="request-panel__request">
        <div class="request-panel__bar">
          <div class="request-panel__bar-row">
            <n-select
              class="request-panel__method"
              :value="activeDraft.method"
              :options="methodOptions"
              :consistent-menu-width="false"
              :render-label="renderMethodLabel"
              @update:value="updateMethod"
            />
            <n-input
              class="request-panel__url"
              :value="urlDraft"
              placeholder="https://api.example.com/…"
              @update:value="updateUrl"
            />
            <n-tooltip trigger="hover" placement="bottom">
              <template #trigger>
                <n-button
                  :loading="isSending"
                  @click="sendRequest"
                  type="primary"
                  class="request-panel__send"
                >
                  <template #icon>
                    <n-icon :component="Upload" size="12"></n-icon>
                  </template>
                </n-button>
              </template>
              {{ t('request.actions.send') }}
            </n-tooltip>
          </div>
        </div>

        <div class="request-panel__name">
          <n-text strong>{{ activeDraft.name }}</n-text>
          <n-text depth="3" class="request-panel__path">{{ activeRequestPath }}</n-text>
        </div>

        <div class="request-panel__editor">
          <n-tabs v-model:value="requestTab" type="line" size="small" class="request-panel__tabs">
            <n-tab-pane name="params" :tab="t('request.params')" display-directive="show:lazy">
              <RequestParamsEditor :params="activeDraft.params ?? []" />
            </n-tab-pane>
            <n-tab-pane name="headers" :tab="t('request.headers')" display-directive="show:lazy">
              <RequestHeadersEditor :headers="activeDraft.headers ?? []" />
            </n-tab-pane>
            <n-tab-pane
              name="body"
              :tab="t('request.body')"
              :disabled="isBodyDisabled"
              display-directive="show:lazy"
              class="request-panel__body-pane"
            >
              <RequestBodyEditor :body="activeDraft.body" />
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>

      <ResizeHandle orientation="horizontal" @drag="onResponseDrag" />

      <div
        class="request-panel__response"
        :style="{ height: `${responseHeight}px`, flexBasis: `${responseHeight}px` }"
      >
        <div class="request-panel__response-title">{{ t('request.response') }}</div>
        <div v-if="responseError" class="request-panel__error">
          {{ responseError }}
        </div>
        <div v-else-if="!response">
          <n-empty :description="t('request.empty.response')" size="small" />
        </div>
        <div v-else class="request-panel__response-content">
          <div class="request-panel__meta">
            <n-text strong>{{ response.status }} {{ response.statusText }}</n-text>
            <n-text depth="3"
              >{{ response.elapsedMs }} ms |
              {{ formatBytes(Number(response.headers['content-length'] ?? 0)) }}</n-text
            >
          </div>
          <n-tabs default-value="body" class="request-panel__response-tabs">
            <n-tab-pane name="body" :tab="t('request.body')">
              <ResponseBodyTab
                :response-body="response.body"
                :content-type="response.headers['content-type']"
              />
            </n-tab-pane>
            <n-tab-pane name="headers" :tab="t('request.headers')">
              <ResponseHeadersTab :response-headers="response.headers"></ResponseHeadersTab>
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>
    </template>

    <div v-else class="request-panel__placeholder">
      <n-empty
        :description="
          hasProject ? t('request.empty.selectRequest') : t('request.empty.openProject')
        "
      />
    </div>
  </div>
</template>

<style scoped src="@/styles/request-panel.css"></style>
