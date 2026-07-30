<script setup lang="ts">
import { NButton, NCheckbox, NInput, NTable } from 'naive-ui'
import { useCollectionsStore } from '@/stores/collections'
import type { HttpParam } from '@/types/http'

const props = defineProps<{
  collectionId: string
  requestId: string
  params: HttpParam[]
}>()

const collectionsStore = useCollectionsStore()

function updateParam(
  paramId: string,
  patch: Partial<Pick<HttpParam, 'key' | 'value' | 'enabled'>>,
): void {
  const params = props.params.map((param) =>
    param.id === paramId ? { ...param, ...patch } : param,
  )
  collectionsStore.updateRequest(props.collectionId, props.requestId, { params })
}

function addParam(): void {
  const params: HttpParam[] = [
    ...props.params,
    {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    },
  ]
  collectionsStore.updateRequest(props.collectionId, props.requestId, { params })
}
</script>

<template>
  <div class="params-editor">
    <n-table :key="requestId" striped size="small" class="params-editor__table">
      <thead>
        <tr>
          <th style="width: 40%">Name</th>
          <th style="width: 45%">Value</th>
          <th style="width: 15%; text-align: center">Active</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="param in params" :key="param.id">
          <td>
            <n-input
              :value="param.key"
              placeholder="Param name"
              size="small"
              @update:value="(key) => updateParam(param.id, { key })"
            />
          </td>
          <td>
            <n-input
              :value="param.value"
              placeholder="Param value"
              size="small"
              @update:value="(value) => updateParam(param.id, { value })"
            />
          </td>
          <td style="text-align: center">
            <n-checkbox
              :checked="param.enabled"
              @update:checked="(enabled) => updateParam(param.id, { enabled })"
            />
          </td>
        </tr>
      </tbody>
    </n-table>
    <div class="params-editor__actions">
      <n-button size="small" @click="addParam">Add param</n-button>
    </div>
  </div>
</template>

<style scoped>
.params-editor__table {
  width: 100%;
  table-layout: fixed;
}

.params-editor__actions {
  margin-top: 8px;
}
</style>
