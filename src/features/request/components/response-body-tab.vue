<script setup lang="ts">
import {
  NEmpty,
} from 'naive-ui'

defineProps<{
    responseBody: string 
}>()
</script>

<template>
  <div v-if="responseBody === ''">
    <n-empty description="Envía una petición para ver la respuesta" size="small" />
  </div>
  <div v-else class="response-body-tab">
    <pre class="response-body-tab__content">{{ JSON.parse(responseBody) }}</pre>
  </div>
</template>

<style scoped>
.response-body-tab {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.response-body-tab__content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>