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

<style scoped src="@/styles/http-method-tag.css"></style>
