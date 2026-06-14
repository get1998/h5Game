<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { MAP_EDGES, MAP_NODE_VISUALS, getMapNodeVisual } from '@/game/constants/map-visual'

/** 地图节点交互数据 */
export interface MapCanvasNode {
  id: string
  name: string
  unlocked: boolean
  selected: boolean
}

const props = defineProps<{
  nodes: MapCanvasNode[]
  selectedId: string | null
  interactionDisabled?: boolean
}>()

const emit = defineEmits<{
  select: [mapId: string]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const NODE_RADIUS = 22
const HIT_RADIUS = 30
const PADDING = 36

let resizeObserver: ResizeObserver | null = null
let animationFrameId = 0
let pulsePhase = 0
let hoveredNodeId: string | null = null

/** 将相对坐标转为 Canvas 像素坐标 */
function toPixel(x: number, y: number, width: number, height: number) {
  return {
    px: PADDING + x * (width - PADDING * 2),
    py: PADDING + y * (height - PADDING * 2),
  }
}

/** 根据 ID 查找节点交互状态 */
function findNodeState(mapId: string): MapCanvasNode | undefined {
  return props.nodes.find((node) => node.id === mapId)
}

/** 绘制整张地图 */
function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  const dpr = window.devicePixelRatio || 1

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
  bgGradient.addColorStop(0, '#1e1e32')
  bgGradient.addColorStop(1, '#141422')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height)
  drawEdges(ctx, width, height)
  drawNodes(ctx, width, height)
}

/** 绘制背景网格 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = 'rgba(61, 61, 92, 0.35)'
  ctx.lineWidth = 1
  const step = 28
  for (let x = step; x < width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

/** 绘制节点间连线 */
function drawEdges(ctx: CanvasRenderingContext2D, width: number, height: number) {
  for (const edge of MAP_EDGES) {
    const fromVisual = getMapNodeVisual(edge.from)
    const toVisual = getMapNodeVisual(edge.to)
    if (!fromVisual || !toVisual) continue

    const fromState = findNodeState(edge.from)
    const toState = findNodeState(edge.to)
    const fromPos = toPixel(fromVisual.x, fromVisual.y, width, height)
    const toPos = toPixel(toVisual.x, toVisual.y, width, height)
    const bothUnlocked = Boolean(fromState?.unlocked && toState?.unlocked)

    ctx.beginPath()
    ctx.moveTo(fromPos.px, fromPos.py)
    ctx.lineTo(toPos.px, toPos.py)
    ctx.strokeStyle = bothUnlocked
      ? 'rgba(201, 162, 39, 0.55)'
      : 'rgba(61, 61, 92, 0.7)'
    ctx.lineWidth = bothUnlocked ? 2 : 1.5
    if (!bothUnlocked) {
      ctx.setLineDash([6, 4])
    } else {
      ctx.setLineDash([])
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
}

/** 绘制单个地图节点 */
function drawNodes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  for (const visual of MAP_NODE_VISUALS) {
    const state = findNodeState(visual.mapId)
    if (!state) continue

    const { px, py } = toPixel(visual.x, visual.y, width, height)
    const isSelected = state.selected || props.selectedId === visual.mapId
    const isHovered = hoveredNodeId === visual.mapId
    const canInteract = state.unlocked && !props.interactionDisabled
    const pulse = isSelected ? 1 + Math.sin(pulsePhase) * 0.08 : 1
    const radius = NODE_RADIUS * pulse

    if (isSelected) {
      ctx.beginPath()
      ctx.arc(px, py, radius + 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(201, 162, 39, 0.12)'
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = state.unlocked
      ? 'rgba(37, 37, 66, 0.95)'
      : 'rgba(26, 26, 46, 0.9)'
    ctx.fill()

    ctx.lineWidth = isSelected ? 3 : 2
    ctx.strokeStyle = isSelected
      ? '#c9a227'
      : state.unlocked
        ? visual.color
        : 'rgba(154, 149, 144, 0.5)'
    ctx.stroke()

    ctx.font = '600 14px STKaiti, KaiTi, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = state.unlocked ? visual.color : 'rgba(154, 149, 144, 0.6)'
    ctx.fillText(visual.icon, px, py)

    ctx.font = '12px system-ui, sans-serif'
    ctx.fillStyle = isSelected
      ? '#e8e6e3'
      : state.unlocked
        ? '#c9c5c0'
        : 'rgba(154, 149, 144, 0.55)'
    ctx.fillText(state.name, px, py + radius + 14)

    if (!state.unlocked) {
      ctx.font = '10px system-ui, sans-serif'
      ctx.fillStyle = '#c94a4a'
      ctx.fillText('未解锁', px, py + radius + 28)
    } else if (isHovered && canInteract) {
      ctx.font = '10px system-ui, sans-serif'
      ctx.fillStyle = '#c9a227'
      ctx.fillText('点击选择', px, py + radius + 28)
    }
  }
}

/** 根据点击坐标命中节点 */
function hitTest(clientX: number, clientY: number): string | null {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return null

  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const width = rect.width
  const height = rect.height

  for (const visual of MAP_NODE_VISUALS) {
    const state = findNodeState(visual.mapId)
    if (!state?.unlocked) continue

    const { px, py } = toPixel(visual.x, visual.y, width, height)
    const dx = x - px
    const dy = y - py
    if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
      return visual.mapId
    }
  }
  return null
}

/** 更新悬停节点与光标样式 */
function updateHover(clientX: number, clientY: number) {
  if (props.interactionDisabled) {
    hoveredNodeId = null
    if (containerRef.value) {
      containerRef.value.style.cursor = 'default'
    }
    return
  }

  const hitId = hitTest(clientX, clientY)
  hoveredNodeId = hitId
  if (containerRef.value) {
    containerRef.value.style.cursor = hitId ? 'pointer' : 'default'
  }
}

/** 处理点击选择地图 */
function handlePointerDown(event: PointerEvent) {
  if (props.interactionDisabled) return
  const hitId = hitTest(event.clientX, event.clientY)
  if (hitId) {
    emit('select', hitId)
  }
}

function handlePointerMove(event: PointerEvent) {
  updateHover(event.clientX, event.clientY)
}

function handlePointerLeave() {
  hoveredNodeId = null
  if (containerRef.value) {
    containerRef.value.style.cursor = 'default'
  }
}

/** 选中节点呼吸动画 */
function startAnimation() {
  const tick = () => {
    pulsePhase += 0.06
    draw()
    animationFrameId = window.requestAnimationFrame(tick)
  }
  animationFrameId = window.requestAnimationFrame(tick)
}

function stopAnimation() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }
}

watch(
  () => [props.nodes, props.selectedId, props.interactionDisabled],
  () => draw(),
  { deep: true },
)

onMounted(() => {
  draw()
  startAnimation()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => draw())
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  stopAnimation()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="containerRef"
    class="map-canvas"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="map-canvas__stage" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.map-canvas {
  width: 100%;
  height: 220px;
  border-radius: $radius-sm;
  border: 1px solid $color-border;
  overflow: hidden;
  touch-action: manipulation;
}

.map-canvas__stage {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
