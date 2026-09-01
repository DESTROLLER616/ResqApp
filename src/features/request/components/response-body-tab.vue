<script setup lang="ts">
import { computed } from 'vue'
import { NCode, NEmpty } from 'naive-ui'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import { detectBodyLanguage, formatResponseBody } from '@/utils/select-body-language'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)

const props = defineProps<{
  responseBody: string
  contentType?: string
}>()

const language = computed(() => detectBodyLanguage(props.contentType))
const formatted = computed(() => formatResponseBody(props.responseBody, language.value))
</script>

<template>
  <div v-if="responseBody === ''">
    <n-empty :description="t('request.empty.body')" size="small" />
  </div>
  <n-code
    v-else
    :code="formatted"
    :language="language === 'plain' ? undefined : language"
    :hljs="hljs"
    word-wrap
  />
</template>
