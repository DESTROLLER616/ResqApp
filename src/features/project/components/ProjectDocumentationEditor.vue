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
const { documentation } = storeToRefs(projectStore)
const { resolvedTheme } = storeToRefs(useUiStore())
const { t, locale } = useI18n()

const editorLanguage = computed(() => (locale.value.startsWith('es') ? 'es-ES' : 'en-US'))
const editorTheme = computed(() => resolvedTheme.value)
const excludedToolbars = ['github', 'save'] as const

function onUpdateDocumentation(value: string): void {
  projectStore.updateDocumentation(value)
}
</script>

<template>
  <div class="project-documentation">
    <div class="project-documentation__header">
      <n-text strong>{{ t('project.documentation.title') }}</n-text>
      <n-text v-if="!documentation" depth="3">
        {{ t('project.documentation.placeholder') }}
      </n-text>
    </div>
    <div class="project-documentation__editor">
      <MdEditor
        id="project-documentation"
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

<style scoped src="@/styles/project-documentation.css"></style>
