<script setup lang="ts">
import { Cog, Key } from '@vicons/fa'
import { NEmpty, NIcon, NTabPane, NTabs } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useEnvironmentsStore } from '@/stores/environments'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  DOCUMENTATION_TAB_KEY,
  ENVIRONMENTS_TAB_KEY,
  isDocumentationTab,
  isEnvironmentsTab,
  isVirtualTab,
} from '@/types/project'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { openTabs, activeRequestPath } = storeToRefs(workspaceStore)
const { t, locale } = useI18n()

watch(locale, () => {
  workspaceStore.renameTab(DOCUMENTATION_TAB_KEY, t('project.documentation.title'))
  workspaceStore.renameTab(ENVIRONMENTS_TAB_KEY, t('environments.title'))
})

async function onUpdateValue(value: string) {
  if (isDocumentationTab(value)) {
    await projectStore.flushSave()
    await useEnvironmentsStore().flush()
    workspaceStore.openDocumentation(t('project.documentation.title'))
    return
  }

  if (isEnvironmentsTab(value)) {
    await projectStore.flushSave()
    await projectStore.flushDocumentation()
    workspaceStore.openEnvironments(t('environments.title'))
    return
  }

  await projectStore.flushDocumentation()
  workspaceStore.setActiveRequest(value)
  try {
    await projectStore.selectRequest(value)
  } catch {
    // selectRequest already surfaces errors via store in other flows
  }
}

function onClose(name: string | number) {
  const closedPath = String(name)
  const previousActive = workspaceStore.activeRequestPath
  workspaceStore.closeRequest(closedPath)

  const next = workspaceStore.activeRequestPath
  if (next === previousActive && next !== closedPath) {
    return
  }

  if (!next) {
    projectStore.clearActiveDraft()
    return
  }

  if (isVirtualTab(next)) {
    return
  }

  void projectStore.selectRequest(next)
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
      <n-tab-pane v-for="tab in openTabs" :key="tab.relativePath" :name="tab.relativePath">
        <template #tab>
          <span class="request-tabs__label">
            <n-icon v-if="isDocumentationTab(tab.relativePath)" :component="Cog" :size="12" />
            <n-icon v-else-if="isEnvironmentsTab(tab.relativePath)" :component="Key" :size="12" />
            {{ tab.name }}
          </span>
        </template>
      </n-tab-pane>
    </n-tabs>

    <div v-else class="request-tabs__empty">
      <n-empty :description="t('project.tabs.empty')" size="small" />
    </div>
  </div>
</template>

<style scoped src="@/styles/request-tabs.css"></style>
