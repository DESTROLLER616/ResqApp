<script setup lang="ts">
import { NInput } from 'naive-ui'
import { useCollectionsStore } from '@/stores/collections'

const props = defineProps<{
  collectionId: string
  requestId: string
  body: string
}>()

const collectionsStore = useCollectionsStore()

function updateBody(value: string): void {
  collectionsStore.updateRequest(props.collectionId, props.requestId, {
    body: value,
  })
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
