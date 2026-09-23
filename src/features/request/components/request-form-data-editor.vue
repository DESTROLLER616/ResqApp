<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NButton,
  NCheckbox,
  NEmpty,
  NIcon,
  NInput,
  NList,
  NListItem,
  NModal,
  NSelect,
  NSpace,
  NTable,
  NTag,
  NTooltip,
  useMessage,
  type SelectOption,
} from 'naive-ui'
import { File, Image, Plus, TrashAlt } from '@vicons/fa'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/project'
import {
  copyRequestAttachment,
  listRequestAttachments,
  pickFile,
  type ProjectAttachment,
} from '@/services/attachments'
import type { FormField, FormFieldKind, RequestBody } from '@/types/http'

const props = defineProps<{
  body: RequestBody
}>()

const projectStore = useProjectStore()
const message = useMessage()
const { t } = useI18n()

const projectPickerOpen = ref(false)
const projectFiles = ref<ProjectAttachment[]>([])
const pickerFieldId = ref<string | null>(null)

const kindOptions = computed<SelectOption[]>(() => [
  { label: t('request.form.text'), value: 'text' },
  { label: t('request.form.file'), value: 'file' },
])

function isKind(value: unknown): value is FormFieldKind {
  return value === 'text' || value === 'file'
}

function fileName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

function fileLabel(field: FormField): string {
  if (!field.value) return t('request.form.noFile')
  const base = fileName(field.value)
  const prefix = `${field.id}-`
  return base.startsWith(prefix) ? base.slice(prefix.length) : base
}

function writeFields(fields: FormField[]): void {
  projectStore.updateActiveRequest({
    body: {
      ...props.body,
      fields,
    },
  })
}

function patchField(fieldId: string, patch: Partial<Omit<FormField, 'id'>>): void {
  writeFields(
    props.body.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
  )
}

function addField(): void {
  const fields: FormField[] = [
    ...props.body.fields,
    {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
      kind: 'text',
      source: 'disk',
    },
  ]
  writeFields(fields)
}

function deleteField(field: FormField): void {
  writeFields(props.body.fields.filter((item) => item.id !== field.id))
}

function updateKind(field: FormField, value: string): void {
  if (!isKind(value) || value === field.kind) return
  patchField(field.id, { kind: value, value: '', source: 'disk' })
}

function requireProjectRoot(): string | null {
  const root = projectStore.rootPath
  if (!root) {
    message.error(t('errors.noProjectOpen'))
    return null
  }
  return root
}

async function openProjectPicker(field: FormField): Promise<void> {
  const root = requireProjectRoot()
  if (!root) return
  try {
    projectFiles.value = await listRequestAttachments(root)
    pickerFieldId.value = field.id
    projectPickerOpen.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
}

function selectProjectFile(relativePath: string): void {
  if (!pickerFieldId.value) return
  patchField(pickerFieldId.value, { kind: 'file', source: 'project', value: relativePath })
  projectPickerOpen.value = false
}

async function uploadProjectCopy(): Promise<void> {
  const root = requireProjectRoot()
  const fieldId = pickerFieldId.value
  if (!root || !fieldId) return

  try {
    const selected = await pickFile(t('request.dialog.pickFile'))
    if (!selected) return
    const value = await copyRequestAttachment(root, selected)
    patchField(fieldId, { kind: 'file', source: 'project', value })
    projectPickerOpen.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
}

async function chooseDiskFile(field: FormField): Promise<void> {
  const root = requireProjectRoot()
  if (!root) return

  try {
    const selected = await pickFile(t('request.dialog.pickFile'))
    if (!selected) return
    patchField(field.id, { kind: 'file', source: 'disk', value: selected })
  } catch (error) {
    message.error(error instanceof Error ? error.message : String(error))
  }
}
</script>

<template>
  <div class="form-data-editor">
    <n-table striped size="small" class="form-data-editor__table">
      <thead>
        <tr>
          <th class="form-data-editor__name">{{ t('request.table.name') }}</th>
          <th class="form-data-editor__kind">{{ t('request.table.type') }}</th>
          <th>{{ t('request.table.value') }}</th>
          <th class="form-data-editor__active">{{ t('request.table.active') }}</th>
          <th class="form-data-editor__actions">{{ t('request.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="field in body.fields" :key="field.id">
          <td>
            <n-input
              :value="field.key"
              :placeholder="t('request.table.name')"
              size="small"
              @update:value="(key) => patchField(field.id, { key })"
            />
          </td>
          <td>
            <n-select
              size="small"
              to="body"
              :value="field.kind"
              :options="kindOptions"
              :consistent-menu-width="false"
              @update:value="(kind: string) => updateKind(field, kind)"
            />
          </td>
          <td>
            <n-input
              v-if="field.kind === 'text'"
              :value="field.value"
              :placeholder="t('request.table.value')"
              size="small"
              @update:value="(value) => patchField(field.id, { value })"
            />
            <div v-else class="form-data-editor__file">
              <span class="form-data-editor__file-name">{{ fileLabel(field) }}</span>
              <n-tag v-if="field.value" size="small" :bordered="false">
                {{
                  field.source === 'project' ? t('request.form.project') : t('request.form.disk')
                }}
              </n-tag>
              <n-space :size="4" :wrap="false">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button size="tiny" @click="openProjectPicker(field)">
                      {{ t('request.form.project') }}
                    </n-button>
                  </template>
                  {{ t('request.form.saveInProject') }}
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-button size="tiny" @click="chooseDiskFile(field)">
                      {{ t('request.form.disk') }}
                    </n-button>
                  </template>
                  {{ t('request.form.useFromDisk') }}
                </n-tooltip>
              </n-space>
            </div>
          </td>
          <td class="form-data-editor__center">
            <n-checkbox
              :checked="field.enabled"
              @update:checked="(enabled: boolean) => patchField(field.id, { enabled })"
            />
          </td>
          <td class="form-data-editor__center">
            <n-button type="error" @click="deleteField(field)">
              <template #icon>
                <n-icon :component="TrashAlt" size="12" />
              </template>
            </n-button>
          </td>
        </tr>
      </tbody>
    </n-table>
    <div class="form-data-editor__add">
      <n-tooltip trigger="hover" placement="bottom">
        <template #trigger>
          <n-button size="small" :bordered="false" @click="addField">
            <template #icon>
              <n-icon :component="Plus" size="28" color="#ff6543" />
            </template>
          </n-button>
        </template>
        {{ t('request.form.addField') }}
      </n-tooltip>
    </div>

    <n-modal
      v-model:show="projectPickerOpen"
      preset="card"
      :title="t('request.form.projectFiles')"
      style="width: 420px"
    >
      <n-empty
        v-if="projectFiles.length === 0"
        :description="t('request.form.projectFilesEmpty')"
        size="small"
      />
      <n-list v-else class="form-data-editor__files" hoverable clickable>
        <n-list-item
          v-for="file in projectFiles"
          :key="file.path"
          @click="selectProjectFile(file.path)"
        >
          <n-space justify="space-between" align="center">
            <n-icon size="16">
              <Image v-if="file.kind === 'image'" />
              <File v-else />
            </n-icon>
            <span>{{ fileName(file.path) }}</span>
          </n-space>
        </n-list-item>
      </n-list>
      <template #footer>
        <n-button type="primary" @click="uploadProjectCopy">
          {{ t('request.form.uploadCopy') }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.form-data-editor {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.form-data-editor__table {
  width: 100%;
  table-layout: fixed;
}

.form-data-editor__name {
  width: 18%;
}

.form-data-editor__kind {
  width: 16%;
}

.form-data-editor__active,
.form-data-editor__actions {
  width: 12%;
  text-align: center;
}

.form-data-editor__center {
  text-align: center;
}

.form-data-editor__file {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.form-data-editor__file-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-data-editor__add {
  margin-top: 8px;
}

.form-data-editor__files {
  max-height: 280px;
  overflow: auto;
}
</style>
