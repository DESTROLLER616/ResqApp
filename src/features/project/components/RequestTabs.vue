<script setup lang="ts">
import { NEmpty, NTabPane, NTabs } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { openTabs, activeRequestPath } = storeToRefs(workspaceStore)

async function onUpdateValue(value: string) {
  workspaceStore.setActiveRequest(value)
  try {
    await projectStore.selectRequest(value)
  } catch {
    // selectRequest already surfaces errors via store in other flows
  }
}

function onClose(name: string | number) {
  workspaceStore.closeRequest(String(name))
  const next = workspaceStore.activeRequestPath
  if (next) {
    void projectStore.selectRequest(next)
  } else {
    projectStore.clearActiveDraft()
  }
}
</script>

<template>
  <div class="request-tabs">
    <n-tabs
      v-if="openTabs.length > 0"
      type="card"
      size="small"
      closable
      :value="activeRequestPath ?? undefined"
      @update:value="onUpdateValue"
      @close="onClose"
    >
      <n-tab-pane
        v-for="tab in openTabs"
        :key="tab.relativePath"
        :name="tab.relativePath"
        :tab="tab.name"
      />
    </n-tabs>

    <div v-else class="request-tabs__empty">
      <n-empty description="Selecciona una petición del proyecto" size="small" />
    </div>
  </div>
</template>

<style scoped>
.request-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
}

.request-tabs :deep(.n-tabs) {
  flex: 1;
  min-width: 0;
}

.request-tabs :deep(.n-tabs-nav) {
  padding-left: 0 !important;
}

.request-tabs :deep(.n-tabs-pad),
.request-tabs :deep(.n-tabs-pane-wrapper) {
  display: none;
}

.request-tabs__empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px 8px 10px;
}
</style>
