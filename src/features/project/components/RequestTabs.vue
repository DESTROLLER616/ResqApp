<script setup lang="ts">
import { watch } from 'vue'
import { NEmpty, NIcon, NTabPane, NTabs } from 'naive-ui'
import { Cog } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { DOCUMENTATION_TAB_KEY, isDocumentationTab } from '@/types/project'
import { useI18n } from 'vue-i18n'

const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const { openTabs, activeRequestPath } = storeToRefs(workspaceStore)
const { t, locale } = useI18n()

watch(locale, () => {
  workspaceStore.renameTab(DOCUMENTATION_TAB_KEY, t('project.documentation.title'))
})

async function onUpdateValue(value: string) {
  if (isDocumentationTab(value)) {
    await projectStore.flushSave()
    workspaceStore.openDocumentation(t('project.documentation.title'))
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

  if (isDocumentationTab(next)) {
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
      <n-tab-pane
        v-for="tab in openTabs"
        :key="tab.relativePath"
        :name="tab.relativePath"
      >
        <template #tab>
          <span class="request-tabs__label">
            <n-icon v-if="isDocumentationTab(tab.relativePath)" :component="Cog" :size="12" />
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
