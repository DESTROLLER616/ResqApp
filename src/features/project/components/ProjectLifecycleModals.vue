<script setup lang="ts">
import { NInput, NModal, NSpace } from 'naive-ui'
import { useProjectLifecycle } from '@/features/project/composables/use-project-lifecycle'

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
</script>

<template>
  <n-modal
    v-model:show="createModalOpen"
    preset="dialog"
    title="Nuevo proyecto"
    positive-text="Crear"
    negative-text="Cancelar"
    @positive-click="confirmCreate"
  >
    <n-space vertical>
      <span class="lifecycle-modals__hint">Se creará en: {{ createParentDir }}</span>
      <n-input
        v-model:value="createName"
        placeholder="Nombre del proyecto"
        @keyup.enter="confirmCreate"
      />
    </n-space>
  </n-modal>

  <n-modal
    v-model:show="initModalOpen"
    preset="dialog"
    title="Inicializar proyecto"
    positive-text="Inicializar"
    negative-text="Cancelar"
    @positive-click="confirmInit"
  >
    <n-space vertical>
      <span class="lifecycle-modals__hint">La carpeta no es un proyecto. ¿Inicializarla?</span>
      <span class="lifecycle-modals__hint">{{ initPath }}</span>
      <n-input v-model:value="initName" placeholder="Nombre del proyecto" />
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
