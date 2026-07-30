import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Collection, RequestDraft } from '@/types/http'

const seedCollections: Collection[] = [
  {
    id: 'col-auth',
    name: 'Auth API',
    requests: [
      {
        id: 'req-login',
        name: 'Login',
        method: 'POST',
        url: 'https://api.example.com/auth/login',
        params: [],
        headers: [
          {
            id: 'h1',
            key: 'Content-Type',
            value: 'application/json',
            enabled: true,
          },
        ],
        body: '{\n  "email": "user@example.com",\n  "password": "secret"\n}',
      },
      {
        id: 'req-refresh',
        name: 'Refresh token',
        method: 'POST',
        url: 'https://api.example.com/auth/refresh',
        params: [],
        headers: [],
        body: '',
      },
    ],
  },
  {
    id: 'col-users',
    name: 'Users',
    requests: [
      {
        id: 'req-list-users',
        name: 'List users',
        method: 'GET',
        url: 'https://api.example.com/users',
        params: [
          {
            id: 'p1',
            key: 'page',
            value: '1',
            enabled: true,
          },
        ],
        headers: [],
        body: '',
      },
      {
        id: 'req-get-user',
        name: 'Get user',
        method: 'GET',
        url: 'https://api.example.com/users/1',
        params: [],
        headers: [],
        body: '',
      },
      {
        id: 'req-delete-user',
        name: 'Delete user',
        method: 'DELETE',
        url: 'https://api.example.com/users/1',
        params: [],
        headers: [],
        body: '',
      },
    ],
  },
]

function ensureRequestShape(request: RequestDraft): void {
  if (!request.params) request.params = []
  if (!request.headers) request.headers = []
}

export const useCollectionsStore = defineStore('collections', () => {
  const collections = ref<Collection[]>(structuredClone(seedCollections))

  for (const collection of collections.value) {
    for (const request of collection.requests) {
      ensureRequestShape(request)
    }
  }

  const collectionById = computed(() => {
    const map = new Map<string, Collection>()
    for (const collection of collections.value) {
      map.set(collection.id, collection)
    }
    return map
  })

  function findRequest(
    collectionId: string,
    requestId: string,
  ): RequestDraft | undefined {
    return collectionById.value.get(collectionId)?.requests.find(
      (item) => item.id === requestId,
    )
  }

  function updateRequest(
    collectionId: string,
    requestId: string,
    patch: Partial<Omit<RequestDraft, 'id'>>,
  ): void {
    const collection = collections.value.find((item) => item.id === collectionId)
    if (!collection) return
    const request = collection.requests.find((item) => item.id === requestId)
    if (!request) return
    ensureRequestShape(request)
    Object.assign(request, patch)
  }

  return {
    collections,
    collectionById,
    findRequest,
    updateRequest,
  }
})
