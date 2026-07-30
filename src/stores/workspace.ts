import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useCollectionsStore } from '@/stores/collections'

export interface OpenCollectionTab {
  collectionId: string
  activeRequestId: string | null
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const openTabs = ref<OpenCollectionTab[]>([])
  const activeCollectionId = ref<string | null>(null)

  const activeTab = computed(() =>
    openTabs.value.find((tab) => tab.collectionId === activeCollectionId.value),
  )

  const activeRequestId = computed(
    () => activeTab.value?.activeRequestId ?? null,
  )

  function openCollection(collectionId: string): void {
    const collectionsStore = useCollectionsStore()
    const collection = collectionsStore.collectionById.get(collectionId)
    if (!collection) return

    const existing = openTabs.value.find(
      (tab) => tab.collectionId === collectionId,
    )
    if (!existing) {
      openTabs.value.push({
        collectionId,
        activeRequestId: collection.requests[0]?.id ?? null,
      })
    }

    activeCollectionId.value = collectionId
  }

  function closeCollection(collectionId: string): void {
    const index = openTabs.value.findIndex(
      (tab) => tab.collectionId === collectionId,
    )
    if (index === -1) return

    openTabs.value.splice(index, 1)

    if (activeCollectionId.value !== collectionId) return

    const next =
      openTabs.value[index] ?? openTabs.value[index - 1] ?? null
    activeCollectionId.value = next?.collectionId ?? null
  }

  function setActiveCollection(collectionId: string): void {
    if (!openTabs.value.some((tab) => tab.collectionId === collectionId)) {
      return
    }
    activeCollectionId.value = collectionId
  }

  function selectRequest(requestId: string): void {
    const tab = activeTab.value
    if (!tab) return
    tab.activeRequestId = requestId
  }

  return {
    openTabs,
    activeCollectionId,
    activeTab,
    activeRequestId,
    openCollection,
    closeCollection,
    setActiveCollection,
    selectRequest,
  }
})
