<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  NConfigProvider,
  darkTheme,
  dateEnUS,
  dateEsAR,
  enUS,
  esAR,
  type GlobalThemeOverrides,
  type NDateLocale,
  type NLocale,
} from 'naive-ui'
import AppShell from '@/components/layout/AppShell.vue'
import { useUiStore } from '@/stores/ui'

const fallbackNaiveUiLocale: { locale: NLocale; dateLocale: NDateLocale } = {
  locale: esAR,
  dateLocale: dateEsAR,
}

const naiveUiLocales: Record<string, { locale: NLocale; dateLocale: NDateLocale }> = {
  es: fallbackNaiveUiLocale,
  en: { locale: enUS, dateLocale: dateEnUS },
}

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
const { locale } = useI18n()

const theme = computed(() => (resolvedTheme.value === 'dark' ? darkTheme : null))
const themeOverrides = computed(() =>
  resolvedTheme.value === 'dark' ? darkThemeOverrides : lightThemeOverrides,
)

const naiveUiLocale = computed(() => {
  const language = locale.value.split('-')[0] ?? 'es'
  return naiveUiLocales[language] ?? fallbackNaiveUiLocale
})
</script>

<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="naiveUiLocale.locale"
    :date-locale="naiveUiLocale.dateLocale"
  >
    <div class="app-root">
      <AppShell />
    </div>
  </n-config-provider>
</template>

<style scoped src="@/styles/app.css"></style>
