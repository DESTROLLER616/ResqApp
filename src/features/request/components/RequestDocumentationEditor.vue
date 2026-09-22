<script setup lang="ts">
import { computed } from 'vue'
import { NText } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useProjectStore } from '@/stores/project'
import { useUiStore } from '@/stores/ui'
import '@/features/project/md-editor-setup'

const projectStore = useProjectStore()
const { activeDraft } = storeToRefs(projectStore)
const { resolvedTheme } = storeToRefs(useUiStore())
const { t, locale } = useI18n()

const editorLanguage = computed(() => (locale.value.startsWith('es') ? 'es-ES' : 'en-US'))
const editorTheme = computed(() => resolvedTheme.value)
const excludedToolbars = ['github', 'save'] as const

const editorId = computed(() => {
  const id = activeDraft.value?.id ?? 'none'
  return `request-documentation-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
})

const documentation = computed(() => activeDraft.value?.documentation ?? '')

function onUpdateDocumentation(value: string): void {
  projectStore.updateActiveRequest({ documentation: value })
}
</script>

<template>
  <div v-if="activeDraft" class="request-documentation">
    <n-text v-if="!documentation" depth="3" class="request-documentation__hint">
      {{ t('request.documentationPlaceholder') }}
    </n-text>
    <div class="request-documentation__editor">
      <MdEditor
        :id="editorId"
        :key="activeDraft.id"
        :model-value="documentation"
        :theme="editorTheme"
        :language="editorLanguage"
        :toolbars-exclude="[...excludedToolbars]"
        :style="{ height: '100%' }"
        no-upload-img
        @update:model-value="onUpdateDocumentation"
      />
    </div>
  </div>
</template>

<style scoped src="@/styles/request-documentation.css"></style>
