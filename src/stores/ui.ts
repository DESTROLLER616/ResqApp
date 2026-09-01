import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ResolvedTheme, ThemeMode } from '@/types/ui'

export type { ResolvedTheme, ThemeMode }

function syncDocumentTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useUiStore = defineStore('ui', () => {
  const isProjectSidebarVisible = ref(true)
  const isRecentSidebarVisible = ref(true)
  const themeMode = ref<ThemeMode>('system')
  const systemPrefersDark = ref(getSystemPrefersDark())

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemThemeChange = (event: MediaQueryListEvent): void => {
    systemPrefersDark.value = event.matches
  }
  mediaQuery.addEventListener('change', onSystemThemeChange)

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return themeMode.value
  })

  syncDocumentTheme(resolvedTheme.value)

  watch(resolvedTheme, (theme) => {
    syncDocumentTheme(theme)
  })

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

  function setThemeMode(mode: ThemeMode): void {
    themeMode.value = mode
  }

  return {
    isProjectSidebarVisible,
    isRecentSidebarVisible,
    themeMode,
    resolvedTheme,
    toggleProjectSidebar,
    toggleRecentSidebar,
    setProjectSidebarVisible,
    setRecentSidebarVisible,
    setThemeMode,
  }
})
