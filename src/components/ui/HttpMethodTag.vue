<script setup lang="ts">
import type { HttpMethod } from '@/types/http'

const props = defineProps<{
  method: HttpMethod
}>()

const methodClass: Record<HttpMethod, string> = {
  GET: 'method--get',
  POST: 'method--post',
  PUT: 'method--put',
  PATCH: 'method--patch',
  DELETE: 'method--delete',
  HEAD: 'method--head',
  OPTIONS: 'method--options',
}
</script>

<template>
  <span class="method" :class="methodClass[props.method]">{{ props.method }}</span>
</template>

<style scoped>
.method {
  display: inline-block;
  min-width: 3.25rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.method--get {
  color: #16a34a;
}

.method--post {
  color: #ca8a04;
}

.method--put {
  color: #2563eb;
}

.method--patch {
  color: #7c3aed;
}

.method--delete {
  color: #dc2626;
}

.method--head,
.method--options {
  color: #6b7280;
}
</style>
