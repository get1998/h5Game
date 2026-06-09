<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const hasSave = computed(() => playerStore.hasSave)

/**
 * 进入游戏：有存档则进洞府，无存档则去角色创建
 */
function handleEnterGame() {
  if (hasSave.value) {
    router.push('/home')
  } else {
    router.push('/create')
  }
}

/**
 * 重新开始：清除存档与游戏状态，重新创建角色
 */
function handleRestart() {
  if (hasSave.value) {
    const confirmed = window.confirm('确定重新开始？当前存档将被清除，此操作不可恢复。')
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
        <p class="start-header__desc">踏入仙途，闭关悟道，斩妖除魔</p>
      </header>

      <div class="start-actions">
        <button class="game-btn game-btn--primary start-actions__btn" @click="handleEnterGame">
          进入游戏
        </button>
        <button class="game-btn game-btn--secondary start-actions__btn" @click="handleRestart">
          重新开始
        </button>
      </div>

      <p v-if="hasSave" class="start-hint">检测到已有存档，可直接进入游戏</p>
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
}

.start-hint {
  margin-top: 20px;
  font-size: 12px;
  color: $color-primary;
  opacity: 0.8;
}
</style>
