<script setup lang="ts">
import { NConfigProvider, type GlobalThemeOverrides } from 'naive-ui'
import AppShell from '@/components/layout/AppShell.vue'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '6px',
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
  },
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
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
