import { ref, type Ref } from 'vue'

interface UseResizableSizeOptions {
  initial: number
  min: number
  max: number
}

export function useResizableSize(
  options: UseResizableSizeOptions,
): {
  size: Ref<number>
  resizeBy: (delta: number) => void
  setMax: (max: number) => void
} {
  const size = ref(options.initial)
  let max = options.max

  function clamp(value: number): number {
    return Math.min(max, Math.max(options.min, value))
  }

  function resizeBy(delta: number): void {
    size.value = clamp(size.value + delta)
  }

  function setMax(nextMax: number): void {
    max = Math.max(options.min, nextMax)
    size.value = clamp(size.value)
  }

  return { size, resizeBy, setMax }
}
