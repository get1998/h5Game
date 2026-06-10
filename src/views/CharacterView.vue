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
    { label: '称号', value: playerStore.equippedTitleText || '未佩戴' },
    { label: '年龄', value: `${p.age} 岁` },
    { label: '寿元', value: `${p.lifespan} 年` },
    { label: '修为', value: String(p.xiuwei) },
    { label: '神识', value: String(p.shenshi) },
    { label: '肉身强度', value: String(p.bodyStrength) },
    { label: '灵根', value: playerStore.spiritRootText },
  ]
})

const effectiveCombat = computed(() => playerStore.effectiveCombatStats.combat)
const realmCombat = computed(() => playerStore.effectiveCombatStats.breakdown.realm)

function formatBonus(current: number, base: number): string {
  const bonus = current - base
  if (bonus === 0) return String(current)
  return `${current}（+${bonus}）`
}

const combatStats = computed(() => {
  const effective = effectiveCombat.value
  const base = realmCombat.value
  return [
    {
      label: '气血',
      value: `${effective.hp} / ${effective.maxHp}`,
      hint: effective.maxHp > base.maxHp ? `境界 ${base.maxHp}` : '',
    },
    {
      label: '灵力',
      value: `${effective.mp} / ${effective.maxMp}`,
      hint: effective.maxMp > base.maxMp ? `境界 ${base.maxMp}` : '',
    },
    { label: '攻击', value: formatBonus(effective.attack, base.attack) },
    { label: '防御', value: formatBonus(effective.defense, base.defense) },
    { label: '速度', value: formatBonus(effective.speed, base.speed) },
    {
      label: '暴击率',
      value: `${Math.floor(effective.critRate * 100)}%`,
      hint: effective.critRate > base.critRate ? '含功法/被动' : '',
    },
    {
      label: '暴击伤害',
      value: `${Math.floor(effective.critDamage * 100)}%`,
    },
    { label: '命中率', value: `${Math.floor(effective.hitRate * 100)}%` },
    { label: '闪避率', value: `${Math.floor(effective.dodgeRate * 100)}%` },
    {
      label: '穿透',
      value: String(effective.penetration),
      hint: effective.penetration > base.penetration ? '含功法/被动' : '',
    },
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
      <p class="character-combat-hint">含主修功法与已领悟永久被动加成</p>
      <div
        v-for="stat in combatStats"
        :key="stat.label"
        class="stat-row"
      >
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">
          {{ stat.value }}
          <span v-if="stat.hint" class="stat-hint">{{ stat.hint }}</span>
        </span>
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

.character-combat-hint {
  margin-bottom: 8px;
  font-size: 12px;
  color: $color-text-muted;
}

.stat-hint {
  margin-left: 6px;
  font-size: 11px;
  color: $color-text-muted;
}

.character-origin {
  font-size: 14px;
  color: $color-text-muted;
  line-height: 1.8;
  text-align: justify;
}

.character-reset-btn {
  width: 100%;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
}
</style>
