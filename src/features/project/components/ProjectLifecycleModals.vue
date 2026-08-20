<script setup lang="ts">
import { NInput, NModal, NSpace } from 'naive-ui'
import { useProjectLifecycle } from '@/features/project/composables/use-project-lifecycle'
import { useI18n } from 'vue-i18n'

const {
  createModalOpen,
  createName,
  createParentDir,
  initModalOpen,
  initPath,
  initName,
  confirmCreate,
  confirmInit,
} = useProjectLifecycle()

const { t } = useI18n()
</script>

<template>
  <n-modal
    v-model:show="createModalOpen"
    preset="dialog"
    :title="t('project.modal.new')"
    :positive-text="t('common.create')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmCreate"
  >
    <n-space vertical>
      <span class="lifecycle-modals__hint">{{
        t('project.modal.willCreateFolder', { path: createParentDir })
      }}</span>
      <n-input
        v-model:value="createName"
        :placeholder="t('project.modal.name')"
        @keyup.enter="confirmCreate"
      />
    </n-space>
  </n-modal>

  <n-modal
    v-model:show="initModalOpen"
    preset="dialog"
    :title="t('project.modal.initProject')"
    :positive-text="t('common.init')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmInit"
  >
    <n-space vertical>
      <span class="lifecycle-modals__hint">{{ t('project.modal.initFolderToProject') }}</span>
      <span class="lifecycle-modals__hint">{{ initPath }}</span>
      <n-input v-model:value="initName" :placeholder="t('project.modal.name')" />
    </n-space>
  </n-modal>
</template>

<style scoped>
.lifecycle-modals__hint {
  font-size: 12px;
  color: var(--app-muted);
  word-break: break-all;
}
</style>
