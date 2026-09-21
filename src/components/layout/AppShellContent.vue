<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ProjectLifecycleModals from '@/features/project/components/ProjectLifecycleModals.vue'
import ProjectSidebar from '@/features/project/components/ProjectSidebar.vue'
import RecentProjectsSidebar from '@/features/project/components/RecentProjectsSidebar.vue'
import RequestTabs from '@/features/project/components/RequestTabs.vue'
import ProjectDocumentationEditor from '@/features/project/components/ProjectDocumentationEditor.vue'
import RequestPanel from '@/features/request/components/RequestPanel.vue'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useAppMenu } from '@/composables/use-app-menu'
import { useResizableSize } from '@/composables/use-resizable-size'
import { useRecentProjectsStore } from '@/stores/recent-projects'
import { useUiStore } from '@/stores/ui'
import { useWorkspaceStore } from '@/stores/workspace'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX_DEFAULT = 520
const MAIN_MIN = 360
const RECENT_WIDTH = 220

const uiStore = useUiStore()
const workspaceStore = useWorkspaceStore()
const { isProjectSidebarVisible, isRecentSidebarVisible } = storeToRefs(uiStore)
const { activePanel } = storeToRefs(workspaceStore)

const shellRef = useTemplateRef<HTMLElement>('shell')
const {
  size: siderWidth,
  resizeBy,
  setMax,
} = useResizableSize({
  initial: 280,
  min: SIDEBAR_MIN,
  max: SIDEBAR_MAX_DEFAULT,
})

const {
  size: recentWidth,
  resizeBy: resizeRecentBy,
  setMax: setRecentMax,
} = useResizableSize({
  initial: 220,
  min: SIDEBAR_MIN,
  max: SIDEBAR_MAX_DEFAULT,
})

function projectOccupied(): number {
  return isProjectSidebarVisible.value ? siderWidth.value : 0
}
function updateRecentMax(): void {
  const shellWidth = shellRef.value?.clientWidth ?? window.innerWidth
  setRecentMax(Math.max(SIDEBAR_MIN, shellWidth - MAIN_MIN - projectOccupied()))
}
function onRecentDrag(delta: number): void {
  updateRecentMax()
  resizeRecentBy(-delta)
}

function updateSidebarMax(): void {
  const shellWidth = shellRef.value?.clientWidth ?? window.innerWidth
  const recentWidth = isRecentSidebarVisible.value ? RECENT_WIDTH : 0
  setMax(Math.max(SIDEBAR_MIN, shellWidth - MAIN_MIN - recentWidth))
}

function onSiderDrag(delta: number): void {
  updateSidebarMax()
  resizeBy(delta)
}

const recentStore = useRecentProjectsStore()

useAppMenu()

onMounted(() => {
  updateSidebarMax()
  window.addEventListener('resize', updateSidebarMax)
  void recentStore.openLastIfAvailable()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSidebarMax)
})

watch([isProjectSidebarVisible, isRecentSidebarVisible], () => {
  updateSidebarMax()
})
</script>

<template>
  <div ref="shell" class="app-shell">
    <template v-if="isProjectSidebarVisible">
      <aside
        class="app-shell__sider"
        :style="{ width: `${siderWidth}px`, flexBasis: `${siderWidth}px` }"
      >
        <ProjectSidebar />
      </aside>

      <ResizeHandle orientation="vertical" @drag="onSiderDrag" />
    </template>

    <main class="app-shell__main">
      <RequestTabs />
      <div class="app-shell__panel">
        <ProjectDocumentationEditor v-if="activePanel === 'documentation'" />
        <RequestPanel v-else />
      </div>
    </main>

    <template v-if="isRecentSidebarVisible">
      <ResizeHandle orientation="vertical" @drag="onRecentDrag" />
      <aside
        class="app-shell__sider"
        :style="{ width: `${recentWidth}px`, flexBasis: `${recentWidth}px` }"
      >
        <RecentProjectsSidebar />
      </aside>
    </template>
  </div>

  <ProjectLifecycleModals />
</template>

<style scoped src="@/styles/app-shell-content.css"></style>
