import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as workspaceService from '@/services/workspace'
import type { RecentProject } from '@/types/project'
import { useProjectStore } from '@/stores/project'

export const useRecentProjectsStore = defineStore('recent-projects', () => {
  const recentProjects = ref<RecentProject[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function load(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      recentProjects.value = await workspaceService.listRecentProjects()
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
    } finally {
      isLoading.value = false
    }
  }

  async function open(path: string): Promise<void> {
    const projectStore = useProjectStore()
    await projectStore.openProject(path)
    recentProjects.value = await workspaceService.listRecentProjects()
  }

  async function remove(path: string): Promise<void> {
    recentProjects.value = await workspaceService.removeRecentProject(path)
  }

  async function openLastIfAvailable(): Promise<void> {
    await load()
    const first = recentProjects.value[0]
    if (!first) return
    try {
      await open(first.path)
    } catch {
      // Stale path — drop from recents
      await remove(first.path)
    }
  }

  return {
    recentProjects,
    isLoading,
    errorMessage,
    load,
    open,
    remove,
    openLastIfAvailable,
  }
})
