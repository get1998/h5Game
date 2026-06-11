<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import GameLayout from '@/components/layout/GameLayout.vue'
import { calcBreakthroughSuccessRate } from '@/game/formulas/breakthrough-success'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { xiuweiSummary } = storeToRefs(playerStore)

const breakthroughRate = computed(() =>
  calcBreakthroughSuccessRate(
    playerStore.player,
    playerStore.activeGongfa,
    playerStore.player.breakthroughFailures,
  ),
)

const cultivationInfo = computed(() => {
  const { realm, current, required, percent, progressBarStyle } = xiuweiSummary.value
  const rate = breakthroughRate.value

  const bonusParts: string[] = []
  if (rate.comprehensionBonus > 0) {
    bonusParts.push(`悟性 +${Math.floor(rate.comprehensionBonus * 100)}%`)
  }
  if (rate.gongfaBonus > 0) {
    bonusParts.push(`功法 +${Math.floor(rate.gongfaBonus * 100)}%`)
  }
  if (rate.failurePityBonus > 0) {
    bonusParts.push(`保底 +${Math.floor(rate.failurePityBonus * 100)}%`)
  }

  return {
    realm,
    current,
    required,
    percent,
    progressBarStyle,
    canBreakthrough: current >= required && rate.nextRealm != null,
    successRateText: rate.nextRealm ? `${rate.percent}%` : '—',
    breakthroughTypeText: rate.nextRealm
      ? (rate.isMajorBreakthrough ? '大境界突破' : '小境界突破')
      : '已达顶境',
    failureCount: playerStore.player.breakthroughFailures,
    bonusText: bonusParts.length > 0 ? bonusParts.join(' · ') : '无额外加成',
    baseRateText: rate.nextRealm ? `${Math.floor(rate.baseRate * 100)}%` : '—',
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

      <div class="breakthrough-rate">
        <div class="stat-row">
          <span class="stat-label">突破类型</span>
          <span class="stat-value">{{ cultivationInfo.breakthroughTypeText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">基础成功率</span>
          <span class="stat-value">{{ cultivationInfo.baseRateText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">当前成功率</span>
          <span class="stat-value stat-value--highlight">{{ cultivationInfo.successRateText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">加成明细</span>
          <span class="stat-value">{{ cultivationInfo.bonusText }}</span>
        </div>
        <div v-if="cultivationInfo.failureCount > 0" class="stat-row">
          <span class="stat-label">连续失败</span>
          <span class="stat-value">{{ cultivationInfo.failureCount }} 次</span>
        </div>
      </div>

      <p
        v-if="cultivationInfo.canBreakthrough && !breakthroughRate.isMajorBreakthrough"
        class="cultivation-auto-hint"
      >
        小境界修为已满时将自动突破，无需手动操作。
      </p>

      <button
        class="game-btn game-btn--primary cultivation-btn"
        :disabled="isBreakthroughDisabled"
        @click="handleBreakthrough"
      >
        {{ breakthroughRate.isMajorBreakthrough ? '尝试大境界突破' : '手动突破' }}
      </button>

      <p v-if="gameStore.lastMessage" class="cultivation-message">
        {{ gameStore.lastMessage }}
      </p>
    </section>

    <section class="cultivation-card game-card">
      <div class="page-section-title">修炼说明</div>
      <p class="cultivation-tip">
        修为以洞府修炼为主；历练击杀精英及以上可获少量修为，越级挑战时普通怪物亦有收益。打怪同时可获得功法经验。当前境界修为满后将自动停止修炼。小境界满足条件时自动突破；大境界需在本页手动突破。突破存在失败风险，失败将损失部分修为；连续失败会逐步提高成功率。
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

.breakthrough-rate {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid $color-border;
}

.stat-value--highlight {
  color: $color-primary;
  font-weight: 600;
}

.cultivation-auto-hint {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: $color-text-muted;
}

.cultivation-btn {
  width: 100%;
  margin-top: 16px;
  cursor: pointer;
}

.cultivation-btn:disabled {
  cursor: not-allowed;
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
