import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  DOCUMENTATION_TAB_KEY,
  isDocumentationTab,
  type OpenRequestTab,
  type WorkspacePanel,
} from '@/types/project'

export const useWorkspaceStore = defineStore('workspace', () => {
  const openTabs = ref<OpenRequestTab[]>([])
  const activeRequestPath = ref<string | null>(null)

  const activeTab = computed(() =>
    openTabs.value.find((tab) => tab.relativePath === activeRequestPath.value),
  )

  const activePanel = computed<WorkspacePanel>(() =>
    isDocumentationTab(activeRequestPath.value) ? 'documentation' : 'request',
  )

  function openRequest(relativePath: string, name: string): void {
    const existing = openTabs.value.find((tab) => tab.relativePath === relativePath)
    if (!existing) {
      openTabs.value.push({ relativePath, name })
    } else {
      existing.name = name
    }
    activeRequestPath.value = relativePath
  }

  function closeRequest(relativePath: string): void {
    const index = openTabs.value.findIndex((tab) => tab.relativePath === relativePath)
    if (index === -1) return

    openTabs.value.splice(index, 1)

    if (activeRequestPath.value !== relativePath) return

    const next = openTabs.value[index] ?? openTabs.value[index - 1] ?? null
    activeRequestPath.value = next?.relativePath ?? null
  }

  function setActiveRequest(relativePath: string): void {
    if (!openTabs.value.some((tab) => tab.relativePath === relativePath)) {
      return
    }
    activeRequestPath.value = relativePath
  }

  function openDocumentation(name: string): void {
    const existing = openTabs.value.find((tab) => tab.relativePath === DOCUMENTATION_TAB_KEY)
    if (!existing) {
      openTabs.value.push({ relativePath: DOCUMENTATION_TAB_KEY, name })
    } else {
      existing.name = name
    }
    activeRequestPath.value = DOCUMENTATION_TAB_KEY
  }

  function renameTab(relativePath: string, name: string): void {
    const tab = openTabs.value.find((item) => item.relativePath === relativePath)
    if (tab) tab.name = name
  }

  function closeMatching(pathPrefix: string): void {
    openTabs.value = openTabs.value.filter(
      (tab) =>
        isDocumentationTab(tab.relativePath) ||
        (tab.relativePath !== pathPrefix && !tab.relativePath.startsWith(`${pathPrefix}/`)),
    )
    if (
      activeRequestPath.value &&
      !isDocumentationTab(activeRequestPath.value) &&
      (activeRequestPath.value === pathPrefix ||
        activeRequestPath.value.startsWith(`${pathPrefix}/`))
    ) {
      activeRequestPath.value = openTabs.value[0]?.relativePath ?? null
    }
  }

  function remapPaths(oldPath: string, newPath: string): void {
    if (oldPath === newPath) return

    for (const tab of openTabs.value) {
      if (isDocumentationTab(tab.relativePath)) continue
      if (tab.relativePath === oldPath) {
        tab.relativePath = newPath
      } else if (tab.relativePath.startsWith(`${oldPath}/`)) {
        tab.relativePath = `${newPath}${tab.relativePath.slice(oldPath.length)}`
      }
    }

    if (isDocumentationTab(activeRequestPath.value)) return

    if (activeRequestPath.value === oldPath) {
      activeRequestPath.value = newPath
    } else if (activeRequestPath.value?.startsWith(`${oldPath}/`)) {
      activeRequestPath.value = `${newPath}${activeRequestPath.value.slice(oldPath.length)}`
    }
  }

  function resetForProject(): void {
    openTabs.value = []
    activeRequestPath.value = null
  }

  return {
    openTabs,
    activeRequestPath,
    activePanel,
    activeTab,
    openRequest,
    closeRequest,
    setActiveRequest,
    openDocumentation,
    renameTab,
    closeMatching,
    remapPaths,
    resetForProject,
  }
})
