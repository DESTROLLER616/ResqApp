<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { NConfigProvider, darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import AppShell from '@/components/layout/AppShell.vue'
import { useUiStore } from '@/stores/ui'

const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '6px',
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
  },
}

const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '6px',
    primaryColor: '#3b82f6',
    primaryColorHover: '#60a5fa',
    primaryColorPressed: '#2563eb',
  },
}

const { resolvedTheme } = storeToRefs(useUiStore())

const theme = computed(() => (resolvedTheme.value === 'dark' ? darkTheme : null))
const themeOverrides = computed(() =>
  resolvedTheme.value === 'dark' ? darkThemeOverrides : lightThemeOverrides,
)
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <div class="app-root">
      <AppShell />
    </div>
  </n-config-provider>
</template>

<style scoped>
.app-root {
  height: 100%;
}
</style>
