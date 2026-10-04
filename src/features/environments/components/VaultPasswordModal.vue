<script setup lang="ts">
import { NInput, NModal, NSpace, NText } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useEnvironmentsStore } from '@/stores/environments'
import { toErrorMessage } from '@/utils/error-message'

const environmentsStore = useEnvironmentsStore()
const { vaultPrompt } = storeToRefs(environmentsStore)
const { t } = useI18n()

const password = ref('')
const confirmation = ref('')
const errorMessage = ref('')
const submitting = ref(false)

watch(vaultPrompt, () => {
  password.value = ''
  confirmation.value = ''
  errorMessage.value = ''
  submitting.value = false
})

async function submit(): Promise<boolean> {
  errorMessage.value = ''
  if (!password.value) {
    errorMessage.value = t('environments.vault.passwordRequired')
    return false
  }
  if (vaultPrompt.value?.mode === 'create' && password.value !== confirmation.value) {
    errorMessage.value = t('environments.vault.passwordMismatch')
    return false
  }
  submitting.value = true
  try {
    await environmentsStore.submitVaultPassword(password.value)
    password.value = ''
    confirmation.value = ''
    return true
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
    return false
  } finally {
    submitting.value = false
  }
}

function cancel(): void {
  password.value = ''
  confirmation.value = ''
  environmentsStore.cancelVaultPrompt()
}
</script>

<template>
  <n-modal
    :show="vaultPrompt !== null"
    preset="dialog"
    :title="
      vaultPrompt?.mode === 'create'
        ? t('environments.vault.createTitle')
        : t('environments.vault.unlockTitle')
    "
    :positive-text="
      vaultPrompt?.mode === 'create'
        ? t('environments.vault.create')
        : t('environments.vault.unlock')
    "
    :negative-text="t('common.cancel')"
    :positive-button-props="{ loading: submitting }"
    @positive-click="submit"
    @negative-click="cancel"
    @update:show="(show: boolean) => !show && cancel()"
  >
    <n-space vertical>
      <n-text depth="3">
        {{
          vaultPrompt?.mode === 'create'
            ? t('environments.vault.createHint')
            : t('environments.vault.unlockHint')
        }}
      </n-text>
      <n-input
        v-model:value="password"
        type="password"
        show-password-on="click"
        :placeholder="t('environments.vault.password')"
        @keyup.enter="submit"
      />
      <n-input
        v-if="vaultPrompt?.mode === 'create'"
        v-model:value="confirmation"
        type="password"
        show-password-on="click"
        :placeholder="t('environments.vault.confirm')"
        @keyup.enter="submit"
      />
      <n-text v-if="errorMessage" type="error">{{ errorMessage }}</n-text>
    </n-space>
  </n-modal>
</template>
