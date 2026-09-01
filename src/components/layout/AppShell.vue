<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
import AppShellContent from '@/components/layout/AppShellContent.vue'
</script>

<template>
  <n-message-provider>
    <AppShellContent />
  </n-message-provider>
</template>
