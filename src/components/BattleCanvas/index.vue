<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { TextBattleRenderer } from '@/game'

const canvasRef = ref<HTMLElement | null>(null)
let renderer: TextBattleRenderer | null = null

onMounted(() => {
  if (canvasRef.value) {
    renderer = new TextBattleRenderer()
    renderer.mount(canvasRef.value)
  }
})

onUnmounted(() => {
  renderer?.unmount()
  renderer = null
})
</script>

<template>
  <div class="battle-canvas game-card">
    <div class="battle-canvas__title">战斗场景</div>
    <div ref="canvasRef" class="battle-canvas__stage">
      <div class="battle-canvas__placeholder">
        <span class="battle-canvas__icon">⚔️</span>
        <p>文字战斗模式</p>
        <p class="battle-canvas__hint">后续可接入 Three.js / Cocos 3D 渲染</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.battle-canvas__title {
  font-family: $font-title;
  color: $color-primary;
  margin-bottom: 10px;
}

.battle-canvas__stage {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg-elevated;
  border-radius: $radius-sm;
  border: 1px dashed $color-border;
}

.battle-canvas__placeholder {
  text-align: center;
  color: $color-text-muted;
  font-size: 13px;
}

.battle-canvas__icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.battle-canvas__hint {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.7;
}
</style>
