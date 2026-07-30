<script setup lang="ts">
import { NButton, NCheckbox, NInput, NTable } from 'naive-ui'
import { useCollectionsStore } from '@/stores/collections'
import type { HttpHeader } from '@/types/http'

const props = defineProps<{
  collectionId: string
  requestId: string
  headers: HttpHeader[]
}>()

const collectionsStore = useCollectionsStore()

function updateHeader(
  headerId: string,
  patch: Partial<Pick<HttpHeader, 'key' | 'value' | 'enabled'>>,
): void {
  const headers = props.headers.map((header) =>
    header.id === headerId ? { ...header, ...patch } : header,
  )
  collectionsStore.updateRequest(props.collectionId, props.requestId, { headers })
}

function addHeader(): void {
  const headers: HttpHeader[] = [
    ...props.headers,
    {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    },
  ]
  collectionsStore.updateRequest(props.collectionId, props.requestId, { headers })
}
</script>

<template>
  <div class="headers-editor">
    <n-table :key="requestId" striped size="small" class="headers-editor__table">
      <thead>
        <tr>
          <th style="width: 40%">Name</th>
          <th style="width: 45%">Value</th>
          <th style="width: 15%; text-align: center">Active</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="header in headers" :key="header.id">
          <td>
            <n-input
              :value="header.key"
              placeholder="Header name"
              size="small"
              @update:value="(key) => updateHeader(header.id, { key })"
            />
          </td>
          <td>
            <n-input
              :value="header.value"
              placeholder="Header value"
              size="small"
              @update:value="(value) => updateHeader(header.id, { value })"
            />
          </td>
          <td style="text-align: center">
            <n-checkbox
              :checked="header.enabled"
              @update:checked="(enabled) => updateHeader(header.id, { enabled })"
            />
          </td>
        </tr>
      </tbody>
    </n-table>
    <div class="headers-editor__actions">
      <n-button size="small" @click="addHeader">Add header</n-button>
    </div>
  </div>
</template>

<style scoped>
.headers-editor__table {
  width: 100%;
  table-layout: fixed;
}

.headers-editor__actions {
  margin-top: 8px;
}
</style>
