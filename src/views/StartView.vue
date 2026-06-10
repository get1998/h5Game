<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { hasReincarnationBonus } from '@/game/models/reincarnation'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const hasSave = computed(() => playerStore.hasSave)
const isAwaitingReincarnation = computed(() => playerStore.isAwaitingReincarnation)
const lastLife = computed(() => playerStore.reincarnation.lastLife)
const nextGeneration = computed(() => playerStore.nextReincarnationGeneration)
const hasInheritedBonus = computed(() => hasReincarnationBonus(playerStore.reincarnation))

const inheritedCombatText = computed(() => {
  const bonus = playerStore.reincarnation.combat
  const parts: string[] = []
  if (bonus.attack > 0) parts.push(`攻击 +${bonus.attack}`)
  if (bonus.maxHp > 0) parts.push(`气血 +${bonus.maxHp}`)
  if (bonus.defense > 0) parts.push(`防御 +${bonus.defense}`)
  return parts.join(' · ') || '暂无战斗加成'
})

const inheritedCultivationText = computed(() => {
  const bonus = playerStore.reincarnation.cultivation
  const parts: string[] = []
  if (bonus.absorptionRate > 0) parts.push(`吸收 +${bonus.absorptionRate}`)
  if (bonus.conversionRate > 0) parts.push(`转化 +${bonus.conversionRate}`)
  return parts.join(' · ') || '暂无修炼加成'
})

onMounted(() => {
  playerStore.checkAndSettleLifespanEnd()
})

/**
 * 进入游戏：有存档且寿元未尽则进洞府，无存档则去角色创建
 */
function handleEnterGame() {
  if (isAwaitingReincarnation.value) return
  if (hasSave.value) {
    router.push('/home')
  } else {
    router.push('/create')
  }
}

/**
 * 寿元用尽后再入轮回
 */
function handleReincarnate() {
  if (!isAwaitingReincarnation.value) return
  router.push({ path: '/create', query: { reincarnate: '1' } })
}

/**
 * 重新开始：清除存档与游戏状态，重新创建角色
 */
function handleRestart() {
  if (hasSave.value) {
    const confirmed = window.confirm('确定重新开始？当前存档与轮回记录将被清除，此操作不可恢复。')
    if (!confirmed) return
  }
  playerStore.resetSave()
  gameStore.resetGame()
  router.push('/create')
}
</script>

<template>
  <div class="start-page">
    <div class="start-page__bg" />
    <div class="start-page__content">
      <header class="start-header">
        <p class="start-header__eyebrow">文字修仙 · 挂机修炼</p>
        <h1 class="start-header__title">修仙挂机</h1>
        <p class="start-header__desc">踏入仙途，修炼悟道，斩妖除魔</p>
      </header>

      <section v-if="isAwaitingReincarnation" class="start-reincarnation">
        <p class="start-reincarnation__title">寿元已尽，道消身陨</p>
        <p v-if="lastLife" class="start-reincarnation__life">
          上一世「{{ lastLife.name }}」修行至 {{ lastLife.realm }}，享年 {{ lastLife.age }} 岁
        </p>
        <p class="start-reincarnation__hint">
          可再入轮回，开启第 {{ nextGeneration }} 世；各世继承前世基础属性 10%，多世累加
        </p>
        <div v-if="hasInheritedBonus" class="start-reincarnation__bonus">
          <p class="start-reincarnation__bonus-line">轮回战斗加成：{{ inheritedCombatText }}</p>
          <p class="start-reincarnation__bonus-line">轮回修炼加成：{{ inheritedCultivationText }}</p>
        </div>
      </section>

      <div class="start-actions">
        <button
          v-if="isAwaitingReincarnation"
          class="game-btn game-btn--primary start-actions__btn"
          @click="handleReincarnate"
        >
          再入轮回
        </button>
        <button
          v-else
          class="game-btn game-btn--primary start-actions__btn"
          @click="handleEnterGame"
        >
          进入游戏
        </button>
        <button class="game-btn game-btn--secondary start-actions__btn" @click="handleRestart">
          重新开始
        </button>
      </div>

      <p v-if="hasSave && !isAwaitingReincarnation" class="start-hint">检测到已有存档，可直接进入游戏</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.start-page {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  overflow: hidden;
}

.start-page__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba($color-primary, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba($color-info, 0.08) 0%, transparent 50%),
    $color-bg;
  pointer-events: none;
}

.start-page__content {
  position: relative;
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.start-header__eyebrow {
  font-size: 12px;
  color: $color-text-muted;
  letter-spacing: 0.2em;
  margin-bottom: 12px;
}

.start-header__title {
  font-family: $font-title;
  font-size: 42px;
  color: $color-primary;
  letter-spacing: 0.15em;
  line-height: 1.2;
  text-shadow: 0 0 40px rgba($color-primary, 0.3);
}

.start-header__desc {
  margin-top: 12px;
  font-size: 14px;
  color: $color-text-muted;
}

.start-reincarnation {
  margin-top: 28px;
  padding: 16px;
  border: 1px solid rgba($color-primary, 0.35);
  border-radius: 8px;
  background: rgba($color-primary, 0.06);
  text-align: left;
}

.start-reincarnation__title {
  font-size: 15px;
  color: $color-primary;
  font-weight: 600;
}

.start-reincarnation__life {
  margin-top: 10px;
  font-size: 13px;
  color: $color-text;
  line-height: 1.6;
}

.start-reincarnation__hint {
  margin-top: 8px;
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
}

.start-reincarnation__bonus {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba($color-primary, 0.2);
}

.start-reincarnation__bonus-line {
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
}

.start-reincarnation__bonus-line + .start-reincarnation__bonus-line {
  margin-top: 4px;
}

.start-actions {
  display: flex;
  flex-direction: column;
  margin-top: 48px;
}

.start-actions > * + * {
  margin-top: 14px;
}

.start-actions__btn {
  width: 100%;
  min-height: 48px;
  font-size: 16px;
  cursor: pointer;
}

.start-hint {
  margin-top: 20px;
  font-size: 12px;
  color: $color-primary;
  opacity: 0.8;
}
</style>
