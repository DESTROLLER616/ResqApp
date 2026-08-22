import { onMounted, onUnmounted, useTemplateRef, watch, type WatchSource } from 'vue'
import { useResizableSize } from '@/composables/use-resizable-size'

const RESPONSE_MIN = 120
const REQUEST_MIN = 180
const RESPONSE_INITIAL = 220

export function useResponsePanelSize(activeDraft: WatchSource) {
  const panelRef = useTemplateRef<HTMLElement>('panel')
  const {
    size: responseHeight,
    resizeBy,
    setMax,
  } = useResizableSize({
    initial: RESPONSE_INITIAL,
    min: RESPONSE_MIN,
    max: 600,
  })

  function updateResponseMax(): void {
    const panelHeight = panelRef.value?.clientHeight ?? 0
    if (panelHeight <= 0) return
    setMax(Math.max(RESPONSE_MIN, panelHeight - REQUEST_MIN))
  }

  function onResponseDrag(delta: number): void {
    updateResponseMax()
    resizeBy(-delta)
  }

  onMounted(() => {
    updateResponseMax()
    window.addEventListener('resize', updateResponseMax)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateResponseMax)
  })

  watch(activeDraft, () => {
    requestAnimationFrame(updateResponseMax)
  })

  return { responseHeight, onResponseDrag }
}
