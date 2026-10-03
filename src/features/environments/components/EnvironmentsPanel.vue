<script setup lang="ts">
import { Check, Eye, EyeSlash, Plus, TrashAlt } from '@vicons/fa'
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NSpace,
  NSwitch,
  NText,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useEnvironmentsStore } from '@/stores/environments'
import type { EnvironmentVariable } from '@/types/environment'
import { toErrorMessage } from '@/utils/error-message'

const environmentsStore = useEnvironmentsStore()
const { environments, activeEnvironmentId, errorMessage } = storeToRefs(environmentsStore)
const { t } = useI18n()
const message = useMessage()

const selectedId = ref<string | null>(null)
const revealed = ref<Record<string, string>>({})
const secretDrafts = ref<Record<string, string>>({})
const pendingDeleteId = ref<string | null>(null)

const selected = computed(
  () => environments.value.find((environment) => environment.id === selectedId.value) ?? null,
)

const duplicateKeys = computed(() => {
  const counts = new Map<string, number>()
  for (const variable of selected.value?.variables ?? []) {
    const key = variable.key.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key))
})

watch(
  environments,
  (list) => {
    if (list.some((environment) => environment.id === selectedId.value)) return
    selectedId.value =
      list.find((environment) => environment.id === activeEnvironmentId.value)?.id ??
      list[0]?.id ??
      null
  },
  { immediate: true },
)

watch(errorMessage, (value) => {
  if (!value) return
  message.error(value)
  errorMessage.value = null
})

function addEnvironment(): void {
  const id = environmentsStore.addEnvironment(
    t('environments.defaultName', { n: environments.value.length + 1 }),
  )
  selectedId.value = id
}

function renameSelected(name: string): void {
  if (!selected.value) return
  environmentsStore.renameEnvironment(selected.value.id, name)
}

function askDelete(): void {
  if (!selected.value) return
  pendingDeleteId.value = selected.value.id
}

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteId.value) return
  try {
    await environmentsStore.deleteEnvironment(pendingDeleteId.value)
  } catch (error) {
    message.error(toErrorMessage(error))
  } finally {
    pendingDeleteId.value = null
  }
}

function updateKey(variable: EnvironmentVariable, key: string): void {
  if (!selected.value) return
  environmentsStore.updateVariable(selected.value.id, variable.id, { key })
}

function updatePublicValue(variable: EnvironmentVariable, value: string): void {
  if (!selected.value) return
  environmentsStore.updateVariable(selected.value.id, variable.id, { value })
}

function secretFieldValue(variable: EnvironmentVariable): string {
  if (variable.id in secretDrafts.value) return secretDrafts.value[variable.id] ?? ''
  if (variable.id in revealed.value) return revealed.value[variable.id] ?? ''
  return ''
}

function onSecretInput(variable: EnvironmentVariable, value: string): void {
  secretDrafts.value = { ...secretDrafts.value, [variable.id]: value }
}

async function commitSecret(variable: EnvironmentVariable): Promise<void> {
  if (!selected.value || !(variable.id in secretDrafts.value)) return
  const value = secretDrafts.value[variable.id] ?? ''
  try {
    const saved = await environmentsStore.saveSecretValue(selected.value.id, variable.id, value)
    if (!saved) return
    if (variable.id in revealed.value) {
      revealed.value = { ...revealed.value, [variable.id]: value }
    }
    const next = { ...secretDrafts.value }
    delete next[variable.id]
    secretDrafts.value = next
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}

async function toggleReveal(variable: EnvironmentVariable): Promise<void> {
  if (!selected.value) return
  if (variable.id in revealed.value) {
    const next = { ...revealed.value }
    delete next[variable.id]
    revealed.value = next
    return
  }
  try {
    const value = await environmentsStore.revealSecret(selected.value.id, variable.id)
    if (value === null) return
    revealed.value = { ...revealed.value, [variable.id]: value }
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}

async function toggleSecret(variable: EnvironmentVariable, secret: boolean): Promise<void> {
  if (!selected.value) return
  try {
    await environmentsStore.setVariableSecret(selected.value.id, variable.id, secret)
    const nextRevealed = { ...revealed.value }
    const nextDrafts = { ...secretDrafts.value }
    delete nextRevealed[variable.id]
    delete nextDrafts[variable.id]
    revealed.value = nextRevealed
    secretDrafts.value = nextDrafts
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}

async function removeVariable(variable: EnvironmentVariable): Promise<void> {
  if (!selected.value) return
  try {
    await environmentsStore.deleteVariable(selected.value.id, variable.id)
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}
</script>

<template>
  <div class="environments">
    <div class="environments__header">
      <n-text strong>{{ t('environments.title') }}</n-text>
      <n-button size="small" @click="addEnvironment">
        <template #icon>
          <n-icon :component="Plus" />
        </template>
        {{ t('environments.add') }}
      </n-button>
    </div>

    <div v-if="environments.length === 0" class="environments__empty">
      <n-empty :description="t('environments.empty')" />
    </div>

    <div v-else class="environments__body">
      <aside class="environments__list">
        <n-button
          v-for="environment in environments"
          :key="environment.id"
          block
          quaternary
          :type="environment.id === selectedId ? 'primary' : 'default'"
          class="environments__item"
          @click="selectedId = environment.id"
        >
          <span class="environments__item-name">{{ environment.name }}</span>
          <n-icon
            v-if="environment.id === activeEnvironmentId"
            :component="Check"
            :size="12"
            class="environments__active-mark"
          />
        </n-button>
      </aside>

      <section v-if="selected" class="environments__detail">
        <div class="environments__detail-bar">
          <n-input
            :value="selected.name"
            size="small"
            :placeholder="t('environments.name')"
            @update:value="renameSelected"
          />
          <n-button
            size="small"
            :type="selected.id === activeEnvironmentId ? 'primary' : 'default'"
            @click="environmentsStore.setActiveEnvironment(selected.id)"
          >
            {{ t('environments.use') }}
          </n-button>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" quaternary @click="askDelete">
                <template #icon>
                  <n-icon :component="TrashAlt" />
                </template>
              </n-button>
            </template>
            {{ t('environments.delete') }}
          </n-tooltip>
        </div>

        <div class="environments__variables">
          <div
            v-for="variable in selected.variables"
            :key="variable.id"
            class="environments__variable"
          >
            <div class="environments__variable-key">
              <n-input
                :value="variable.key"
                size="small"
                :placeholder="t('environments.variableKey')"
                :status="duplicateKeys.has(variable.key.trim()) ? 'warning' : undefined"
                @update:value="(key: string) => updateKey(variable, key)"
              />
              <n-text
                v-if="duplicateKeys.has(variable.key.trim())"
                depth="3"
                class="environments__hint"
              >
                {{ t('environments.duplicateKey') }}
              </n-text>
            </div>
            <n-input
              v-if="!variable.secret"
              :value="variable.value"
              size="small"
              :placeholder="t('environments.variableValue')"
              @update:value="(value: string) => updatePublicValue(variable, value)"
            />
            <n-input
              v-else
              :value="secretFieldValue(variable)"
              size="small"
              :type="variable.id in revealed ? 'text' : 'password'"
              :placeholder="t('environments.secretPlaceholder')"
              @update:value="(value: string) => onSecretInput(variable, value)"
              @blur="commitSecret(variable)"
            />
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-switch
                  :value="variable.secret"
                  size="small"
                  @update:value="(secret: boolean) => toggleSecret(variable, secret)"
                />
              </template>
              {{ t('environments.secret') }}
            </n-tooltip>
            <n-tooltip v-if="variable.secret" trigger="hover">
              <template #trigger>
                <n-button size="small" quaternary @click="toggleReveal(variable)">
                  <template #icon>
                    <n-icon :component="variable.id in revealed ? EyeSlash : Eye" />
                  </template>
                </n-button>
              </template>
              {{
                variable.id in revealed
                  ? t('environments.hideSecret')
                  : t('environments.revealSecret')
              }}
            </n-tooltip>
            <span v-else class="environments__reveal-spacer" />
            <n-button size="small" quaternary @click="removeVariable(variable)">
              <template #icon>
                <n-icon :component="TrashAlt" />
              </template>
            </n-button>
          </div>

          <n-button size="small" quaternary @click="environmentsStore.addVariable(selected.id)">
            <template #icon>
              <n-icon :component="Plus" />
            </template>
            {{ t('environments.addVariable') }}
          </n-button>
        </div>
      </section>
    </div>

    <n-modal
      :show="pendingDeleteId !== null"
      preset="dialog"
      :title="t('environments.delete')"
      :positive-text="t('common.delete')"
      :negative-text="t('common.cancel')"
      @positive-click="confirmDelete"
      @negative-click="pendingDeleteId = null"
      @update:show="(show: boolean) => !show && (pendingDeleteId = null)"
    >
      <n-space vertical>
        <n-text>{{ t('environments.deleteHint', { name: selected?.name ?? '' }) }}</n-text>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.environments {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--app-surface);
}

.environments__header,
.environments__detail-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.environments__header {
  flex-shrink: 0;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border);
}

.environments__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.environments__body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.environments__list {
  flex: 0 0 220px;
  overflow: auto;
  border-right: 1px solid var(--app-border);
  padding: 8px;
}

.environments__item {
  justify-content: flex-start;
  margin-bottom: 4px;
}

.environments__item :deep(.n-button__content) {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.environments__item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.environments__active-mark {
  flex-shrink: 0;
  color: var(--var-active-fg);
}

.environments__detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.environments__detail-bar {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border);
}

.environments__detail-bar :deep(.n-input) {
  flex: 1;
}

.environments__variables {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.environments__variable {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(160px, 1.4fr) auto auto auto;
  gap: 8px;
  align-items: start;
}

.environments__hint {
  display: block;
  margin-top: 2px;
  font-size: 12px;
}

.environments__reveal-spacer {
  width: 28px;
}
</style>
