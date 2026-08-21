<script setup lang="ts">
import { NButton, NCheckbox, NInput, NTable, NIcon, NTooltip } from 'naive-ui'
import { useProjectStore } from '@/stores/project'
import type { HttpHeader } from '@/types/http'
import { Plus, TrashAlt } from '@vicons/fa'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  headers: HttpHeader[]
}>()

const projectStore = useProjectStore()
const { t } = useI18n()

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
          <th style="width: 25%">{{ t('request.table.name') }}</th>
          <th style="width: 25%">{{ t('request.table.value') }}</th>
          <th style="width: 25%; text-align: center">{{ t('request.table.active') }}</th>
          <th style="width: 25%; text-align: center">{{ t('request.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="header in headers" :key="header.id">
          <td>
            <n-input
              :value="header.key"
              :placeholder="t('request.table.name')"
              size="small"
              @update:value="(key) => updateHeader(header.id, { key })"
            />
          </td>
          <td>
            <n-input
              :value="header.value"
              :placeholder="t('request.table.value')"
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
          <td style="text-align: center">
            <n-button type="error" @click="deleteHeader(header.id)">
              <template #icon>
                <n-icon :component="TrashAlt" size="12"></n-icon>
              </template>
            </n-button>
          </td>
        </tr>
      </tbody>
    </n-table>
    <div class="headers-editor__actions">
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button size="small" :bordered="false" @click="addHeader">
            <template #icon>
              <n-icon :component="Plus" size="28" :color="'#ff6543'" />
            </template>
          </n-button>
        </template>
        {{ t('request.actions.addHeader') }}
      </n-tooltip>
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
