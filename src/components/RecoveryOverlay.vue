<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { formatRecoveryCountdown } from '@/game/systems/battle'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

const countdownText = computed(() =>
  formatRecoveryCountdown(gameStore.recoveryRemainingMs),
)

const titleText = computed(() => {
  if (gameStore.recoveryPhase === 'severe_injury') {
    return '重伤昏迷'
  }
  return '调息恢复'
})

const descText = computed(() => {
  if (gameStore.recoveryPhase === 'severe_injury') {
    return '连续战败五次，神魂受损，暂无法行动。'
  }
  return `连续第 ${gameStore.consecutiveDefeatCount} 次战败调息，气血缓缓恢复中……`
})

const progressPercent = computed(() => {
  const total = gameStore.recoveryTotalMs
  if (total <= 0) return 0
  const elapsed = total - gameStore.recoveryRemainingMs
  return Math.min(100, Math.floor((elapsed / total) * 100))
})

const progressBarStyle = computed(() => `width: ${progressPercent.value}%`)

let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickTimer = setInterval(() => {
    gameStore.tickRecoveryCountdown()
  }, 200)
})

onUnmounted(() => {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})
</script>

<template>
  <div v-if="gameStore.isRecoveryLocked" class="recovery-overlay">
    <div class="recovery-overlay__panel game-card">
      <div class="recovery-overlay__icon">🧘</div>
      <h2 class="recovery-overlay__title">{{ titleText }}</h2>
      <p class="recovery-overlay__desc">{{ descText }}</p>
      <p class="recovery-overlay__countdown">剩余 {{ countdownText }}</p>
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="progressBarStyle" />
      </div>
      <p class="recovery-overlay__hint">调息期间无法操作</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.recovery-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 15, 26, 0.88);
  pointer-events: all;
}

.recovery-overlay__panel {
  width: 100%;
  max-width: 360px;
  padding: 28px 20px;
  text-align: center;
}

.recovery-overlay__icon {
  font-size: 40px;
  line-height: 1;
}

.recovery-overlay__title {
  margin-top: 12px;
  font-family: $font-title;
  font-size: 22px;
  color: $color-primary;
}

.recovery-overlay__desc {
  margin-top: 10px;
  font-size: 14px;
  color: $color-text-muted;
  line-height: 1.5;
}

.recovery-overlay__countdown {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 600;
  color: $color-text;
}

.progress-bar {
  height: 8px;
  margin-top: 16px;
  background: $color-bg-elevated;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: $color-primary;
  border-radius: 4px;
  transition: width 0.2s;
}

.recovery-overlay__hint {
  margin-top: 14px;
  font-size: 12px;
  color: $color-danger;
}
</style>
