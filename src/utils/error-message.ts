/** Convert any genneric value to a message error in a text */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
