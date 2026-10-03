import { referencedSecretIds, resolveDraft } from '@/features/environments/resolve'
import { sendHttpRequest } from '@/services/http'
import { useEnvironmentsStore, VaultUnlockCancelled } from '@/stores/environments'
import type { HttpResponse, RequestDraft } from '@/types/http'

export async function makeRequest(
  request: RequestDraft,
  projectRoot: string,
): Promise<{ response: HttpResponse; unresolved: string[] }> {
  const environments = useEnvironmentsStore()
  const secretIds = environments.catalog.secretIds
  const neededIds = new Set(referencedSecretIds(request, secretIds))
  const needed = new Map<string, string>()
  for (const [name, id] of secretIds) {
    if (neededIds.has(id)) needed.set(name, id)
  }
  const secretValues = await environments.loadSecretValues(needed)
  const values = new Map(environments.catalog.publicValues)
  for (const [name, value] of secretValues) values.set(name, value)
  const resolved = resolveDraft(request, values)
  const response = await sendHttpRequest(resolved.draft, projectRoot)
  return { response, unresolved: resolved.unresolved }
}

export { VaultUnlockCancelled }

export default makeRequest
