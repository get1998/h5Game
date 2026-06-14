<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameStatusBar from '@/components/layout/GameStatusBar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import RecoveryOverlay from '@/components/RecoveryOverlay.vue'
import { bindH5PageUnload } from '@/game/systems/time'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'
import { useGameStore } from '@/stores/game'

const WORLD_TIME_TICK_MS = 1000

const playerStore = usePlayerStore()
const dongfuStore = useDongfuStore()
const gameStore = useGameStore()

let worldTimeTimer: ReturnType<typeof setInterval> | null = null
let unbindPageUnload: (() => void) | null = null
let isGameClockRunning = false

/** 启动世界时间、灵气与修炼等在线计时 */
function startGameClocks() {
  if (isGameClockRunning) return
  isGameClockRunning = true

  const now = Date.now()
  playerStore.resumeWorldTimeClock(now)
  dongfuStore.resumeLingqiRecoveryClock(now)
  gameStore.resumeCultivation()
  gameStore.restartIdleTimerIfNeeded()

  worldTimeTimer = setInterval(() => {
    playerStore.tickWorldTime()
    dongfuStore.tickLingqiRecovery()
    gameStore.tryAutoStartDongfuCultivation()
  }, WORLD_TIME_TICK_MS)
}

/** 暂停所有在线计时（关闭标签/浏览器或路由离开时调用） */
function stopGameClocks() {
  if (!isGameClockRunning) return
  isGameClockRunning = false

  if (worldTimeTimer) {
    clearInterval(worldTimeTimer)
    worldTimeTimer = null
  }

  const now = Date.now()
  playerStore.pauseWorldTimeClock(now)
  dongfuStore.pauseLingqiRecoveryClock(now)
  gameStore.pauseIdleTimer()
}

onMounted(() => {
  startGameClocks()

  unbindPageUnload = bindH5PageUnload(stopGameClocks)
})

onUnmounted(() => {
  unbindPageUnload?.()
  unbindPageUnload = null
  stopGameClocks()
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
