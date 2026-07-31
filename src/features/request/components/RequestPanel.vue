<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import {
  NButton,
  NEmpty,
  NInput,
  NSelect,
  NTabPane,
  NTabs,
  NText,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { storeToRefs } from 'pinia'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useResizableSize } from '@/composables/use-resizable-size'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { HTTP_METHODS, type HttpMethod } from '@/types/http'
import RequestBodyEditor from './request-body-editor.vue'
import RequestHeadersEditor from './request-headers-editor.vue'
import RequestParamsEditor from './request-params-editor.vue'

const RESPONSE_MIN = 120
const REQUEST_MIN = 180
const RESPONSE_INITIAL = 220

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { activeDraft, hasProject } = storeToRefs(projectStore)
const { activeRequestPath } = storeToRefs(workspaceStore)

const panelRef = useTemplateRef<HTMLElement>('panel')
const { size: responseHeight, resizeBy, setMax } = useResizableSize({
  initial: RESPONSE_INITIAL,
  min: RESPONSE_MIN,
  max: 600,
})

const methodOptions: SelectOption[] = HTTP_METHODS.map((method) => ({
  label: String(method).charAt(0).toUpperCase() + String(method).slice(1),
  value: method,
}))

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

function updateUrl(value: string): void {
  projectStore.updateActiveRequest({ url: value })
}

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

const displayCompleteUrl = computed(() => {
  if (!activeDraft.value) return ''

  try {
    const url = new URL(activeDraft.value.url)
    for (const param of activeDraft.value.params) {
      if (param.enabled && param.key) {
        url.searchParams.set(param.key, param.value)
      }
    }
    return url.toString()
  } catch {
    return activeDraft.value.url
  }
})
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
              @update:value="updateMethod"
            />
            <n-input
              class="request-panel__url"
              :value="activeDraft.url"
              :title="displayCompleteUrl || undefined"
              placeholder="https://api.example.com/…"
              @update:value="updateUrl"
            />
            <n-button type="primary" class="request-panel__send">Send</n-button>
          </div>
        </div>

        <div class="request-panel__name">
          <n-text strong>{{ activeDraft.name }}</n-text>
          <n-text depth="3" class="request-panel__path">{{ activeRequestPath }}</n-text>
        </div>

        <div class="request-panel__editor">
          <n-tabs type="line" size="small" default-value="body" class="request-panel__tabs">
            <n-tab-pane name="params" tab="Params" display-directive="show:lazy">
              <RequestParamsEditor :params="activeDraft.params ?? []" />
            </n-tab-pane>
            <n-tab-pane name="headers" tab="Headers" display-directive="show:lazy">
              <RequestHeadersEditor :headers="activeDraft.headers ?? []" />
            </n-tab-pane>
            <n-tab-pane name="body" tab="Body" display-directive="show:lazy" class="request-panel__body-pane">
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
        <div class="request-panel__response-title">Response</div>
        <n-empty description="Envía una petición para ver la respuesta" size="small" />
      </div>
    </template>

    <div v-else class="request-panel__placeholder">
      <n-empty
        :description="
          hasProject
            ? 'Selecciona una petición del proyecto'
            : 'Abre o crea un proyecto para empezar'
        "
      />
    </div>
  </div>
</template>

<style scoped>
.request-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-surface);
}

.request-panel__request {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.request-panel__bar {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border);
}

.request-panel__bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.request-panel__method {
  flex: 0 0 118px;
  width: 118px;
}

.request-panel__url {
  flex: 1 1 auto;
  min-width: 0;
}

.request-panel__send {
  flex-shrink: 0;
}

.request-panel__name {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 16px 0;
}

.request-panel__path {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-panel__editor {
  flex: 1;
  min-height: 0;
  padding: 0 16px 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.request-panel__tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.request-panel__tabs :deep(.n-tabs-pane-wrapper),
.request-panel__tabs :deep(.n-tab-pane) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.request-panel__body-pane {
  height: 100%;
}

.request-panel__response {
  flex: 0 0 auto;
  overflow: auto;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--app-border);
  min-height: 0;
}

.request-panel__response-title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--app-muted);
}

.request-panel__placeholder {
  flex: 1;
  display: grid;
  place-items: center;
}
</style>
