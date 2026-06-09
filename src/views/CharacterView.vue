<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import GameLayout from '@/components/layout/GameLayout.vue'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const characterStats = computed(() => {
  const p = playerStore.player
  return [
    { label: '道号', value: p.name },
    { label: '境界', value: p.realm },
    { label: '出身', value: p.originTitle || '未知' },
    { label: '年龄', value: `${p.age} 岁` },
    { label: '寿元', value: `${p.lifespan} 年` },
    { label: '修为', value: String(p.xiuwei) },
    { label: '神识', value: String(p.shenshi) },
    { label: '肉身强度', value: String(p.bodyStrength) },
    { label: '灵根', value: playerStore.spiritRootText },
  ]
})

const combatStats = computed(() => {
  const c = playerStore.player.combat
  return [
    { label: '气血', value: `${c.hp} / ${c.maxHp}` },
    { label: '灵力', value: `${c.mp} / ${c.maxMp}` },
    { label: '攻击', value: String(c.attack) },
    { label: '防御', value: String(c.defense) },
    { label: '速度', value: String(c.speed) },
    { label: '暴击率', value: `${Math.floor(c.critRate * 100)}%` },
    { label: '暴击伤害', value: `${Math.floor(c.critDamage * 100)}%` },
    { label: '命中率', value: `${Math.floor(c.hitRate * 100)}%` },
    { label: '闪避率', value: `${Math.floor(c.dodgeRate * 100)}%` },
  ]
})

const isResetDisabled = computed(() => gameStore.isCultivationLocked)

function resetSave() {
  if (isResetDisabled.value) return
  if (window.confirm('确定重置存档？此操作不可恢复。')) {
    playerStore.resetSave()
    gameStore.resetGame()
    router.push('/create')
  }
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">角色</h1>
    </header>

    <section class="character-card game-card">
      <div class="page-section-title">基础属性</div>
      <div
        v-for="stat in characterStats"
        :key="stat.label"
        class="stat-row"
      >
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ stat.value }}</span>
      </div>
    </section>

    <section v-if="playerStore.player.originSummary" class="character-card game-card">
      <div class="page-section-title">凡尘经历</div>
      <p class="character-origin">{{ playerStore.player.originSummary }}</p>
    </section>

    <section class="character-card game-card">
      <div class="page-section-title">战斗属性</div>
      <div
        v-for="stat in combatStats"
        :key="stat.label"
        class="stat-row"
      >
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ stat.value }}</span>
      </div>
    </section>

    <section class="character-card game-card">
      <div class="page-section-title">存档</div>
      <button
        class="game-btn game-btn--danger character-reset-btn"
        :disabled="isResetDisabled"
        @click="resetSave"
      >
        重置存档
      </button>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 16px;
}

.character-card + .character-card {
  margin-top: 16px;
}

.character-origin {
  font-size: 14px;
  color: $color-text-muted;
  line-height: 1.8;
  text-align: justify;
}

.character-reset-btn {
  width: 100%;
}
</style>
