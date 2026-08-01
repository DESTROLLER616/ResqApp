<script setup lang="ts">
import { NButton, NCheckbox, NInput, NTable } from 'naive-ui'
import { useProjectStore } from '@/stores/project'
import type { HttpHeader } from '@/types/http'

const props = defineProps<{
  headers: HttpHeader[]
}>()

const projectStore = useProjectStore()

function updateHeader(
  headerId: string,
  patch: Partial<Pick<HttpHeader, 'key' | 'value' | 'enabled'>>,
): void {
  const headers = props.headers.map((header) =>
    header.id === headerId ? { ...header, ...patch } : header,
  )
  projectStore.updateActiveRequest({ headers })
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
  projectStore.updateActiveRequest({ headers })
}

function deleteHeader(id: string): void {
  const headers = props.headers.filter((header) => header.id !== id)
  projectStore.updateActiveRequest({ headers })
}
</script>

<template>
  <div class="headers-editor">
    <n-table striped size="small" class="headers-editor__table">
      <thead>
        <tr>
          <th style="width: 25%">Name</th>
          <th style="width: 25%">Value</th>
          <th style="width: 25%; text-align: center">Active</th>
          <th style="width: 25%">Acciones</th>
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
          <n-button type="error" @click="deleteHeader(header.id)"> Borrar </n-button>
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
