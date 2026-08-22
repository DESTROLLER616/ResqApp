<script setup lang="ts">
import { NInput, NModal, NSelect, NSpace, NText } from 'naive-ui'
import { useProjectTreeActions } from '@/features/project/composables/use-project-tree-actions'
import { useI18n } from 'vue-i18n'

const {
  createModal,
  createName,
  createHttpMethod,
  methodOptions,
  closeCreate,
  confirmCreate,
  renameModal,
  renameName,
  closeRename,
  confirmRename,
  deleteModal,
  closeDelete,
  confirmDelete,
} = useProjectTreeActions()

const { t } = useI18n()
</script>

<template>
  <n-modal
    :show="createModal !== null"
    preset="dialog"
    :title="
      createModal?.type === 'folder'
        ? t('project.actions.newFolder')
        : t('project.actions.newRequest')
    "
    :positive-text="t('common.create')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmCreate"
    @negative-click="closeCreate"
    @close="closeCreate"
    @update:show="(show) => !show && closeCreate()"
  >
    <n-space vertical size="medium">
      <n-input
        v-model:value="createName"
        :placeholder="
          createModal?.type === 'folder'
            ? t('project.modal.folderName')
            : t('project.modal.requestName')
        "
        @keyup.enter="confirmCreate"
      />

      <n-select
        v-if="createModal?.type === 'request'"
        v-model:value="createHttpMethod"
        :options="methodOptions"
      />
    </n-space>
  </n-modal>

  <n-modal
    :show="renameModal !== null"
    preset="dialog"
    :title="t('common.rename')"
    :positive-text="t('common.save')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmRename"
    @negative-click="closeRename"
    @close="closeRename"
    @update:show="(show) => !show && closeRename()"
  >
    <n-input
      v-model:value="renameName"
      :placeholder="
        renameModal?.kind === 'folder'
          ? t('project.modal.folderName')
          : t('project.modal.requestName')
      "
      @keyup.enter="confirmRename"
    />
  </n-modal>

  <n-modal
    :show="deleteModal !== null"
    preset="dialog"
    type="warning"
    :title="t('common.delete')"
    :positive-text="t('common.delete')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmDelete"
    @negative-click="closeDelete"
    @close="closeDelete"
    @update:show="(show) => !show && closeDelete()"
  >
    <n-text>
      {{
        deleteModal?.kind === 'folder'
          ? t('project.modal.deleteFolderHint', { name: deleteModal.name })
          : t('project.modal.deleteRequestHint', { name: deleteModal?.name ?? '' })
      }}
    </n-text>
  </n-modal>
</template>
