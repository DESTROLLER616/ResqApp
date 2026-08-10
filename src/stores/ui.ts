import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isProjectSidebarVisible = ref(true)
  const isRecentSidebarVisible = ref(true)

  function toggleProjectSidebar(): void {
    isProjectSidebarVisible.value = !isProjectSidebarVisible.value
  }

  function toggleRecentSidebar(): void {
    isRecentSidebarVisible.value = !isRecentSidebarVisible.value
  }

  function setProjectSidebarVisible(visible: boolean): void {
    isProjectSidebarVisible.value = visible
  }

  function setRecentSidebarVisible(visible: boolean): void {
    isRecentSidebarVisible.value = visible
  }

  return {
    isProjectSidebarVisible,
    isRecentSidebarVisible,
    toggleProjectSidebar,
    toggleRecentSidebar,
    setProjectSidebarVisible,
    setRecentSidebarVisible,
  }
})
