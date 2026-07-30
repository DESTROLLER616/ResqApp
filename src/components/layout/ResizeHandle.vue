<script setup lang="ts">
const props = defineProps<{
  /** `vertical` = barra vertical (cambia ancho). `horizontal` = barra horizontal (cambia alto). */
  orientation: 'vertical' | 'horizontal'
}>()

const emit = defineEmits<{
  drag: [delta: number]
}>()

function onPointerDown(event: PointerEvent): void {
  event.preventDefault()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)

  let last =
    props.orientation === 'vertical' ? event.clientX : event.clientY

  document.body.classList.add(
    props.orientation === 'vertical'
      ? 'is-resizing-col'
      : 'is-resizing-row',
  )

  function onPointerMove(moveEvent: PointerEvent): void {
    const current =
      props.orientation === 'vertical'
        ? moveEvent.clientX
        : moveEvent.clientY
    const delta = current - last
    last = current
    if (delta !== 0) emit('drag', delta)
  }

  function onPointerUp(upEvent: PointerEvent): void {
    handle.releasePointerCapture(upEvent.pointerId)
    handle.removeEventListener('pointermove', onPointerMove)
    handle.removeEventListener('pointerup', onPointerUp)
    handle.removeEventListener('pointercancel', onPointerUp)
    document.body.classList.remove('is-resizing-col', 'is-resizing-row')
  }

  handle.addEventListener('pointermove', onPointerMove)
  handle.addEventListener('pointerup', onPointerUp)
  handle.addEventListener('pointercancel', onPointerUp)
}
</script>

<template>
  <div
    class="resize-handle"
    :class="`resize-handle--${orientation}`"
    role="separator"
    :aria-orientation="orientation"
    @pointerdown="onPointerDown"
  />
</template>

<style scoped>
.resize-handle {
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  background: transparent;
  touch-action: none;
}

.resize-handle::after {
  content: '';
  position: absolute;
  background: transparent;
  transition: background-color 0.15s ease;
}

.resize-handle:hover::after,
.resize-handle:active::after {
  background: #2563eb;
}

.resize-handle--vertical {
  width: 5px;
  margin: 0 -2px;
  cursor: col-resize;
}

.resize-handle--vertical::after {
  top: 0;
  bottom: 0;
  left: 2px;
  width: 1px;
}

.resize-handle--horizontal {
  height: 5px;
  margin: -2px 0;
  cursor: row-resize;
}

.resize-handle--horizontal::after {
  left: 0;
  right: 0;
  top: 2px;
  height: 1px;
}
</style>
