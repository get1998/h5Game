<script setup lang="ts">
import { computed } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import { REALM_BREAKTHROUGH_XIUWEI } from '@/game/constants/realm'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const playerStore = usePlayerStore()
const gameStore = useGameStore()

const cultivationInfo = computed(() => {
  const realm = playerStore.player.realm
  const required = REALM_BREAKTHROUGH_XIUWEI[realm]
  const current = playerStore.player.xiuwei
  const percent = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 0
  return {
    realm,
    current,
    required,
    percent,
    progressBarStyle: `width: ${percent}%`,
    canBreakthrough: current >= required,
  }
})

const isBreakthroughDisabled = computed(() =>
  !cultivationInfo.value.canBreakthrough
  || gameStore.isRecoveryLocked
  || gameStore.isCultivationLocked,
)

function handleBreakthrough() {
  if (isBreakthroughDisabled.value) return
  gameStore.attemptBreakthrough()
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">修炼</h1>
    </header>

    <section class="cultivation-card game-card">
      <div class="page-section-title">境界进度</div>
      <div class="stat-row">
        <span class="stat-label">当前境界</span>
        <span class="stat-value">{{ cultivationInfo.realm }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">修为</span>
        <span class="stat-value">{{ cultivationInfo.current }} / {{ cultivationInfo.required }}</span>
      </div>

      <div class="progress-bar">
        <div
          class="progress-bar__fill"
          :style="cultivationInfo.progressBarStyle"
        />
      </div>
      <p class="progress-text">突破进度 {{ cultivationInfo.percent }}%</p>

      <button
        class="game-btn game-btn--primary cultivation-btn"
        :disabled="isBreakthroughDisabled"
        @click="handleBreakthrough"
      >
        尝试突破
      </button>

      <p v-if="gameStore.lastMessage" class="cultivation-message">
        {{ gameStore.lastMessage }}
      </p>
    </section>

    <section class="cultivation-card game-card">
      <div class="page-section-title">闭关说明</div>
      <p class="cultivation-tip">
        修为仅能通过洞府闭关获取。闭关消耗灵气转化修为，灵气由洞府等级恢复；闭关中仅阵法可持续聚灵。打怪可获得功法经验，不增加修为。
      </p>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 16px;
}

.cultivation-card + .cultivation-card {
  margin-top: 16px;
}

.progress-bar {
  height: 8px;
  background: $color-bg-elevated;
  border-radius: 4px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary-dim, $color-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 6px;
  font-size: 12px;
  color: $color-text-muted;
  text-align: right;
}

.cultivation-btn {
  width: 100%;
  margin-top: 16px;
}

.cultivation-message {
  margin-top: 10px;
  font-size: 13px;
  color: $color-primary;
}

.cultivation-tip {
  font-size: 13px;
  color: $color-text-muted;
  line-height: 1.7;
}
</style>
