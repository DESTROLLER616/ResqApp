<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ProjectLifecycleModals from '@/features/project/components/ProjectLifecycleModals.vue'
import ProjectSidebar from '@/features/project/components/ProjectSidebar.vue'
import RecentProjectsSidebar from '@/features/project/components/RecentProjectsSidebar.vue'
import RequestTabs from '@/features/project/components/RequestTabs.vue'
import RequestPanel from '@/features/request/components/RequestPanel.vue'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useAppMenu } from '@/composables/use-app-menu'
import { useResizableSize } from '@/composables/use-resizable-size'
import { useRecentProjectsStore } from '@/stores/recent-projects'
import { useUiStore } from '@/stores/ui'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX_DEFAULT = 520
const MAIN_MIN = 360
const RECENT_WIDTH = 220

const uiStore = useUiStore()
const { isProjectSidebarVisible, isRecentSidebarVisible } = storeToRefs(uiStore)

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
        <RequestPanel />
      </div>
    </main>

    <aside
      v-if="isRecentSidebarVisible"
      class="app-shell__recent"
      :style="{ width: `${RECENT_WIDTH}px` }"
    >
      <RecentProjectsSidebar />
    </aside>
  </div>

  <ProjectLifecycleModals />
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--app-surface);
}

.app-shell__sider {
  flex: 0 0 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: var(--app-sidebar-bg);
}

.app-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.app-shell__panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-shell__recent {
  flex: 0 0 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
</style>
