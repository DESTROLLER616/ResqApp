<script setup lang="ts">
import { computed } from 'vue'
import { NEmpty } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  responseHeaders: Record<string, string>
}>()

const headerEntries = computed(() => Object.entries(props.responseHeaders))
</script>

<template>
  <div v-if="headerEntries.length === 0">
    <n-empty :description="t('request.empty.headers')" size="small" />
  </div>

  <div v-else class="response-headers-tab">
    <div v-for="[key, value] in headerEntries" :key="key" class="response-headers-tab__row">
      <strong>{{ key }}</strong
      >: {{ value }}
    </div>
  </div>
</template>

<style scoped>
.response-headers-tab {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

.response-headers-tab__row {
  margin-bottom: 6px;
  word-break: break-word;
}
</style>
