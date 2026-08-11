import { onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMessage } from 'naive-ui'
import { useProjectLifecycle } from '@/features/project/composables/use-project-lifecycle'
import { installAppMenu } from '@/services/app-menu'
import { useProjectStore } from '@/stores/project'
import { useRecentProjectsStore } from '@/stores/recent-projects'
import { useUiStore } from '@/stores/ui'

export function useAppMenu(): void {
  const message = useMessage()
  const projectStore = useProjectStore()
  const recentStore = useRecentProjectsStore()
  const uiStore = useUiStore()
  const { hasProject } = storeToRefs(projectStore)
  const { recentProjects } = storeToRefs(recentStore)
  const { isProjectSidebarVisible, isRecentSidebarVisible, themeMode } = storeToRefs(uiStore)
  const { openProject, createProject } = useProjectLifecycle()

  let rebuildToken = 0
  let disposed = false

  async function rebuildMenu(): Promise<void> {
    const token = ++rebuildToken
    try {
      await installAppMenu(
        {
          hasProject: hasProject.value,
          recentProjects: recentProjects.value,
          isProjectSidebarVisible: isProjectSidebarVisible.value,
          isRecentSidebarVisible: isRecentSidebarVisible.value,
          themeMode: themeMode.value,
        },
        {
          onNewProject: () => {
            void createProject()
          },
          onOpenProject: () => {
            void openProject()
          },
          onOpenRecent: (path) => {
            void (async () => {
              try {
                await recentStore.open(path)
              } catch (e) {
                message.error(e instanceof Error ? e.message : String(e))
              }
            })()
          },
          onSave: () => {
            void (async () => {
              try {
                await projectStore.flushSave()
              } catch (e) {
                message.error(e instanceof Error ? e.message : String(e))
              }
            })()
          },
          onRefresh: () => {
            void (async () => {
              try {
                await projectStore.refresh()
              } catch (e) {
                message.error(e instanceof Error ? e.message : String(e))
              }
            })()
          },
          onToggleProjectSidebar: () => {
            uiStore.toggleProjectSidebar()
          },
          onToggleRecentSidebar: () => {
            uiStore.toggleRecentSidebar()
          },
          onSetThemeMode: (mode) => {
            uiStore.setThemeMode(mode)
          },
        },
      )
    } catch (e) {
      if (!disposed && token === rebuildToken) {
        message.error(e instanceof Error ? e.message : String(e))
      }
    }
  }

  onMounted(() => {
    void rebuildMenu()
  })

  onUnmounted(() => {
    disposed = true
  })

  watch(
    [hasProject, recentProjects, isProjectSidebarVisible, isRecentSidebarVisible, themeMode],
    () => {
      void rebuildMenu()
    },
    { deep: true },
  )
}
