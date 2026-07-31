<script setup lang="ts">
import { NInput } from 'naive-ui'
import { useProjectStore } from '@/stores/project'

defineProps<{
  body: string
}>()

const projectStore = useProjectStore()

function updateBody(value: string): void {
  projectStore.updateActiveRequest({ body: value })
}
</script>

<template>
  <n-input
    type="textarea"
    class="body-editor"
    :value="body"
    placeholder="{}"
    @update:value="updateBody"
  />
</template>

<style scoped>
.body-editor {
  height: 100%;
}

.body-editor :deep(.n-input),
.body-editor :deep(.n-input-wrapper),
.body-editor :deep(textarea) {
  height: 100% !important;
}
</style>
