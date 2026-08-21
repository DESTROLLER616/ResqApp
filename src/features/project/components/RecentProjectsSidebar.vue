<script setup lang="ts">
import { NButton, NEmpty, NIcon, NSpace, NTooltip, useMessage } from 'naive-ui'
import { FolderOpen, FolderPlus, Times } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import { useProjectLifecycle } from '@/features/project/composables/use-project-lifecycle'
import { useProjectStore } from '@/stores/project'
import { useRecentProjectsStore } from '@/stores/recent-projects'
import { useI18n } from 'vue-i18n'

const recentStore = useRecentProjectsStore()
const projectStore = useProjectStore()
const { recentProjects, isLoading } = storeToRefs(recentStore)
const { rootPath } = storeToRefs(projectStore)
const message = useMessage()
const { openProject, createProject } = useProjectLifecycle()
const { t } = useI18n()

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
      <span class="recent-sidebar__title">{{ t('project.recent.title') }}</span>
    </div>

    <div class="recent-sidebar__actions">
      <n-space vertical :size="8" style="width: 100%">
        <n-button block size="small" type="primary" @click="openProject">
          <template #icon>
            <n-icon :component="FolderOpen" />
          </template>
          {{ t('project.recent.open') }}
        </n-button>
        <n-button block size="small" @click="createProject">
          <template #icon>
            <n-icon :component="FolderPlus" />
          </template>
          {{ t('project.recent.new') }}
        </n-button>
      </n-space>
    </div>

    <div class="recent-sidebar__list">
      <n-empty
        v-if="!isLoading && recentProjects.length === 0"
        :description="t('project.recent.empty')"
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

<style scoped src="@/styles/recent-projects-sidebar.css"></style>
