<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import CollectionsSidebar from '@/features/collections/components/CollectionsSidebar.vue'
import CollectionTabs from '@/features/collections/components/CollectionTabs.vue'
import RequestPanel from '@/features/request/components/RequestPanel.vue'
import ResizeHandle from '@/components/layout/ResizeHandle.vue'
import { useResizableSize } from '@/composables/use-resizable-size'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX_DEFAULT = 520
const MAIN_MIN = 360

const shellRef = useTemplateRef<HTMLElement>('shell')
const { size: siderWidth, resizeBy, setMax } = useResizableSize({
  initial: 280,
  min: SIDEBAR_MIN,
  max: SIDEBAR_MAX_DEFAULT,
})

function updateSidebarMax(): void {
  const shellWidth = shellRef.value?.clientWidth ?? window.innerWidth
  setMax(Math.max(SIDEBAR_MIN, shellWidth - MAIN_MIN))
}

function onSiderDrag(delta: number): void {
  updateSidebarMax()
  resizeBy(delta)
}

onMounted(() => {
  updateSidebarMax()
  window.addEventListener('resize', updateSidebarMax)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSidebarMax)
})
</script>

<template>
  <div ref="shell" class="app-shell">
    <aside
      class="app-shell__sider"
      :style="{ width: `${siderWidth}px`, flexBasis: `${siderWidth}px` }"
    >
      <CollectionsSidebar />
    </aside>

    <ResizeHandle orientation="vertical" @drag="onSiderDrag" />

    <main class="app-shell__main">
      <CollectionTabs />
      <div class="app-shell__panel">
        <RequestPanel />
      </div>
    </main>
  </div>
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
</style>
