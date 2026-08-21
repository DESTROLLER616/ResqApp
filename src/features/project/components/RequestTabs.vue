<script setup lang="ts">
import { NEmpty, NTabPane, NTabs } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { useI18n } from 'vue-i18n'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { openTabs, activeRequestPath } = storeToRefs(workspaceStore)
const { t } = useI18n()

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
      <n-empty :description="t('project.tabs.empty')" size="small" />
    </div>
  </div>
</template>

<style scoped src="@/styles/request-tabs.css"></style>
