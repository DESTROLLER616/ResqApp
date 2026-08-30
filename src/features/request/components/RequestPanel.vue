<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { NButton, NEmpty, NInput, NSelect, NTabPane, NTabs, NText, NIcon, NTooltip } from 'naive-ui'
import { storeToRefs } from 'pinia'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { type HttpMethod, type HttpResponse } from '@/types/http'
import RequestBodyEditor from './request-body-editor.vue'
import RequestHeadersEditor from './request-headers-editor.vue'
import RequestParamsEditor from './request-params-editor.vue'
import ResponseBodyTab from './response-body-tab.vue'
import makeRequest from '../make-request.ts'
import ResponseHeadersTab from './response-headers-tab.vue'
import formatBytes from '@/utils/format-numbers.ts'
import { Upload } from '@vicons/fa'
import { useI18n } from 'vue-i18n'
import { methodOptions, renderMethodLabel } from './request-method-options'
import { buildCompleteUrl, mergeParamsFromUrlSearch } from '../utils/request-url'
import { useResponsePanelSize } from '../composables/use-response-panel-size'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { activeDraft, hasProject } = storeToRefs(projectStore)
const { activeRequestPath } = storeToRefs(workspaceStore)
const { t } = useI18n()
const { responseHeight, onResponseDrag } = useResponsePanelSize(activeDraft)

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

function syncUrlDraftFromStore(): void {
  const draft = activeDraft.value
  if (!draft) {
    urlDraft.value = ''
    return
  }
  urlDraft.value = buildCompleteUrl(draft.url, draft.params ?? [])
}

function updateMethod(value: string): void {
  projectStore.updateActiveRequest({ method: value as HttpMethod })
}

function updateUrl(raw: string): void {
  urlDraft.value = raw

  try {
    const parsed = new URL(raw)
    const params = mergeParamsFromUrlSearch(parsed.searchParams, activeDraft.value?.params ?? [])
    parsed.search = ''
    skipParamsUrlSync = true
    projectStore.updateActiveRequest({
      url: parsed.toString(),
      params,
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

onUnmounted(() => {
  void projectStore.flushSave()
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
