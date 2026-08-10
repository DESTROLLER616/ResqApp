<script setup lang="ts">
import { NButton, NEmpty, NIcon, NSpace, NTooltip, useMessage } from 'naive-ui'
import { FolderOpen, FolderPlus, Times } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import { useProjectLifecycle } from '@/features/project/composables/use-project-lifecycle'
import { useProjectStore } from '@/stores/project'
import { useRecentProjectsStore } from '@/stores/recent-projects'

const recentStore = useRecentProjectsStore()
const projectStore = useProjectStore()
const { recentProjects, isLoading } = storeToRefs(recentStore)
const { rootPath } = storeToRefs(projectStore)
const message = useMessage()
const { openProject, createProject } = useProjectLifecycle()

function truncatePath(path: string): string {
  if (path.length <= 36) return path
  return `…${path.slice(-34)}`
}

async function onOpenRecent(path: string) {
  try {
    await recentStore.open(path)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  }
}

async function onRemoveRecent(path: string, event: MouseEvent) {
  event.stopPropagation()
  try {
    await recentStore.remove(path)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  }
}
</script>

<template>
  <div class="recent-sidebar">
    <div class="recent-sidebar__header">
      <span class="recent-sidebar__title">Proyectos</span>
    </div>

    <div class="recent-sidebar__actions">
      <n-space vertical :size="8" style="width: 100%">
        <n-button block size="small" type="primary" @click="openProject">
          <template #icon>
            <n-icon :component="FolderOpen" />
          </template>
          Abrir…
        </n-button>
        <n-button block size="small" @click="createProject">
          <template #icon>
            <n-icon :component="FolderPlus" />
          </template>
          Nuevo…
        </n-button>
      </n-space>
    </div>

    <div class="recent-sidebar__list">
      <n-empty
        v-if="!isLoading && recentProjects.length === 0"
        description="Sin proyectos recientes"
        size="small"
      />
      <button
        v-for="project in recentProjects"
        :key="project.path"
        type="button"
        class="recent-sidebar__item"
        :class="{ 'recent-sidebar__item--active': project.path === rootPath }"
        @click="onOpenRecent(project.path)"
      >
        <div class="recent-sidebar__item-main">
          <span class="recent-sidebar__item-name">{{ project.name }}</span>
          <n-tooltip trigger="hover">
            <template #trigger>
              <span class="recent-sidebar__item-path">{{ truncatePath(project.path) }}</span>
            </template>
            {{ project.path }}
          </n-tooltip>
        </div>
        <n-button
          quaternary
          size="tiny"
          class="recent-sidebar__item-remove"
          @click="onRemoveRecent(project.path, $event)"
        >
          <template #icon>
            <n-icon :component="Times" size="12" />
          </template>
        </n-button>
      </button>
    </div>
  </div>
</template>

<style scoped>
.recent-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-sidebar-bg);
  border-left: 1px solid var(--app-border);
}

.recent-sidebar__header {
  flex-shrink: 0;
  padding: 12px 14px 8px;
}

.recent-sidebar__title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--app-muted);
}

.recent-sidebar__actions {
  flex-shrink: 0;
  padding: 0 12px 12px;
}

.recent-sidebar__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-sidebar__item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  padding: 8px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.recent-sidebar__item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.recent-sidebar__item--active {
  border-color: var(--app-border);
  background: rgba(37, 99, 235, 0.08);
}

.recent-sidebar__item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-sidebar__item-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sidebar__item-path {
  font-size: 11px;
  color: var(--app-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sidebar__item-remove {
  flex-shrink: 0;
  opacity: 0.5;
}

.recent-sidebar__item:hover .recent-sidebar__item-remove {
  opacity: 1;
}
</style>
