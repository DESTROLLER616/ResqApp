<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NEmpty, NIcon, NTabPane, NTabs, NTooltip } from 'naive-ui'
import { Plus } from '@vicons/fa'
import { storeToRefs } from 'pinia'
import { useCollectionsStore } from '@/stores/collections'
import { useWorkspaceStore } from '@/stores/workspace'

const collectionsStore = useCollectionsStore()
const workspaceStore = useWorkspaceStore()
const { openTabs, activeCollectionId } = storeToRefs(workspaceStore)

const tabNames = computed(() => {
  const names = new Map<string, string>()
  for (const tab of openTabs.value) {
    const collection = collectionsStore.collectionById.get(tab.collectionId)
    names.set(tab.collectionId, collection?.name ?? 'Colección')
  }
  return names
})

function onUpdateValue(value: string) {
  workspaceStore.setActiveCollection(value)
}

function onClose(name: string | number) {
  workspaceStore.closeCollection(String(name))
}

function openFirstClosed() {
  const openIds = new Set(openTabs.value.map((tab) => tab.collectionId))
  const next = collectionsStore.collections.find(
    (collection) => !openIds.has(collection.id),
  )
  if (next) {
    workspaceStore.openCollection(next.id)
  }
}
</script>

<template>
  <div class="collection-tabs">
    <n-tabs
      v-if="openTabs.length > 0"
      type="card"
      size="small"
      closable
      :value="activeCollectionId ?? undefined"
      @update:value="onUpdateValue"
      @close="onClose"
    >
      <n-tab-pane
        v-for="tab in openTabs"
        :key="tab.collectionId"
        :name="tab.collectionId"
        :tab="tabNames.get(tab.collectionId) ?? 'Colección'"
      />
    </n-tabs>

    <div v-else class="collection-tabs__empty">
      <n-empty description="Abre una colección desde el panel izquierdo" size="small" />
    </div>

    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button
          quaternary
          size="tiny"
          class="collection-tabs__add"
          :disabled="collectionsStore.collections.length === 0"
          @click="openFirstClosed"
        >
          <template #icon>
            <n-icon :component="Plus" />
          </template>
        </n-button>
      </template>
      Abrir otra colección
    </n-tooltip>
  </div>
</template>

<style scoped>
.collection-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
}

.collection-tabs :deep(.n-tabs) {
  flex: 1;
  min-width: 0;
}

.collection-tabs :deep(.n-tabs-nav) {
  padding-left: 0 !important;
}

.collection-tabs :deep(.n-tabs-pad),
.collection-tabs :deep(.n-tabs-pane-wrapper) {
  display: none;
}

.collection-tabs__empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px 8px 10px;
}

.collection-tabs__add {
  flex-shrink: 0;
  margin-bottom: 6px;
}
</style>
