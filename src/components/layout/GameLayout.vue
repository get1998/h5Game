<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameStatusBar from '@/components/layout/GameStatusBar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import RecoveryOverlay from '@/components/RecoveryOverlay.vue'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useGameStore } from '@/stores/game'

const WORLD_TIME_TICK_MS = 1000

const playerStore = usePlayerStore()
const dongfuStore = useDongfuStore()
const gameStore = useGameStore()
let worldTimeTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  playerStore.resumeWorldTimeClock()
  gameStore.resumeCultivation()
  worldTimeTimer = setInterval(() => {
    playerStore.tickWorldTime()
    dongfuStore.tickLingqiRecovery()
  }, WORLD_TIME_TICK_MS)
})

onUnmounted(() => {
  if (worldTimeTimer) {
    clearInterval(worldTimeTimer)
    worldTimeTimer = null
  }
  playerStore.pauseWorldTimeClock()
})
</script>

<template>
  <div class="game-layout">
    <GameStatusBar />
    <main class="game-layout__content">
      <slot />
    </main>
    <TabBar />
    <RecoveryOverlay />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.game-layout {
  min-height: 100%;
  background: $color-bg;
}

.game-layout__content {
  min-height: 100%;
  padding: 16px;
  padding-bottom: calc(#{$tabbar-height} + #{$safe-bottom} + 16px);
  max-width: 480px;
  margin: 0 auto;
}
</style>
