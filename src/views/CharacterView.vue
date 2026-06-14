<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import GameLayout from '@/components/layout/GameLayout.vue'
import SkillLibraryPanel from '@/components/skill/SkillLibraryPanel.vue'
import {
  ACHIEVEMENT_CATEGORY_LABEL,
  ACHIEVEMENT_DEFINITIONS,
  calcUpgradeAchievementLevel,
  isUpgradeAchievement,
} from '@/game/constants/achievements'
import { TITLE_DEFINITIONS, TITLE_RARITY_LABEL } from '@/game/constants/titles'
import { FABAO_TIER_COLOR } from '@/game/constants/fabao'
import { calcAchievementProgress } from '@/game/systems/achievement'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'

type CharacterTab = 'profile' | 'skill' | 'fabao' | 'achievement' | 'title'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const { xiuweiSummary } = storeToRefs(playerStore)

const activeTab = ref<CharacterTab>('profile')

const tabItems: Array<{ id: CharacterTab; label: string }> = [
  { id: 'profile', label: '概览' },
  { id: 'skill', label: '技能' },
  { id: 'fabao', label: '法器' },
  { id: 'achievement', label: '成就' },
  { id: 'title', label: '称号' },
]

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'skill' || tab === 'fabao' || tab === 'achievement' || tab === 'title' || tab === 'profile') {
      activeTab.value = tab
    }
  },
  { immediate: true },
)

function switchTab(tab: CharacterTab) {
  activeTab.value = tab
  router.replace({ path: '/character', query: tab === 'profile' ? {} : { tab } })
}

const characterStats = computed(() => {
  const p = playerStore.player
  const activeGongfa = playerStore.activeGongfa
  const stats = [
    { label: '道号', value: p.name },
    { label: '境界', value: p.realm },
    { label: '出身', value: p.originTitle || '未知' },
    { label: '称号', value: playerStore.equippedTitleText || '未佩戴' },
    { label: '主修功法', value: activeGongfa ? `${activeGongfa.name}（${activeGongfa.quality}）` : '未装备' },
    { label: '年龄', value: `${p.age} 岁` },
    { label: '寿元', value: `${p.lifespan} 年` },
    { label: '修为', value: xiuweiSummary.value.text },
    { label: '神识', value: String(p.shenshi) },
    { label: '肉身强度', value: String(p.bodyStrength) },
    { label: '灵根', value: playerStore.spiritRootText },
  ]

  if (playerStore.reincarnation.generation > 1) {
    stats.splice(4, 0, {
      label: '轮回',
      value: `第 ${playerStore.reincarnation.generation} 世`,
    })
  }

  return stats
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

const achievementSummary = computed(() => {
  const total = ACHIEVEMENT_DEFINITIONS.length
  const unlocked = ACHIEVEMENT_DEFINITIONS.filter((item) => {
    if (isUpgradeAchievement(item)) {
      const record = playerStore.achievements.records[item.id]
      const level = record?.level
        ?? calcUpgradeAchievementLevel(item, playerStore.achievements.counters.fleeFailures)
      return level >= 1
    }
    return playerStore.achievements.records[item.id]?.unlockedAtDay != null
  }).length
  return { total, unlocked }
})

function formatTitleBonus(titleId: string): string {
  const definition = TITLE_DEFINITIONS.find((item) => item.id === titleId)
  const bonus = definition?.combatBonus
  if (!bonus) return '无战斗加成'

  const parts: string[] = []
  if (bonus.attackPercent) parts.push(`攻击 +${Math.floor(bonus.attackPercent * 100)}%`)
  if (bonus.defensePercent) parts.push(`防御 +${Math.floor(bonus.defensePercent * 100)}%`)
  if (bonus.maxHpPercent) parts.push(`气血 +${Math.floor(bonus.maxHpPercent * 100)}%`)
  if (bonus.critRate) parts.push(`暴击 +${Math.floor(bonus.critRate * 100)}%`)
  if (bonus.critDamage) parts.push(`暴伤 +${Math.floor(bonus.critDamage * 100)}%`)
  if (bonus.speedPercent) parts.push(`速度 +${Math.floor(bonus.speedPercent * 100)}%`)
  return parts.length > 0 ? parts.join(' · ') : '无战斗加成'
}

const achievementItems = computed(() =>
  ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const record = playerStore.achievements.records[definition.id]
    const isUpgrade = isUpgradeAchievement(definition)
    const level = isUpgrade
      ? (record?.level ?? calcUpgradeAchievementLevel(
        definition,
        playerStore.achievements.counters.fleeFailures,
      ))
      : 0
    const isUnlocked = isUpgrade
      ? level >= 1
      : record?.unlockedAtDay != null
    const isHidden = definition.hidden && !isUnlocked
    const { progress, target } = calcAchievementProgress(
      definition,
      playerStore.achievements,
      playerStore.buildAchievementContext(),
    )
    const maxLevel = definition.maxLevel ?? 99
    const perLevel = definition.progressPerLevel ?? 1
    const speedBonusPercent = isUpgrade
      ? Math.floor((definition.combatBonusPerLevel?.speedPercent ?? 0) * level * 100)
      : 0
    const barPercent = isUpgrade
      ? (level >= maxLevel
        ? 100
        : Math.min(100, Math.floor((progress % perLevel) / perLevel * 100)))
      : (isUnlocked ? 100 : (target > 0 ? Math.min(100, Math.floor((progress / target) * 100)) : 0))
    const progressText = isUnlocked
      ? (isUpgrade
        ? `Lv.${level} / ${maxLevel}${speedBonusPercent > 0 ? ` · 速度 +${speedBonusPercent}%` : ''}`
        : '已达成')
      : (isUpgrade
        ? `${progress} / ${perLevel}（距 Lv.1）`
        : `${progress} / ${target}`)

    return {
      id: definition.id,
      name: isHidden ? '？？？' : definition.name,
      description: isHidden ? '达成后揭晓' : definition.description,
      categoryLabel: ACHIEVEMENT_CATEGORY_LABEL[definition.category],
      isUnlocked,
      progressText,
      barStyle: `width: ${barPercent}%`,
      itemClass: isUnlocked
        ? 'achievement-item achievement-item--unlocked'
        : 'achievement-item',
    }
  }),
)

const titleItems = computed(() =>
  TITLE_DEFINITIONS.map((definition) => {
    const isUnlocked = playerStore.titles.unlockedTitleIds.includes(definition.id)
    const isEquipped = playerStore.titles.equippedTitleId === definition.id

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      rarityLabel: TITLE_RARITY_LABEL[definition.rarity],
      bonusText: formatTitleBonus(definition.id),
      isUnlocked,
      isEquipped,
      itemClass: isEquipped
        ? 'title-item title-item--equipped'
        : isUnlocked
          ? 'title-item title-item--unlocked'
          : 'title-item title-item--locked',
      actionText: isEquipped ? '已佩戴' : isUnlocked ? '佩戴' : '未解锁',
      actionDisabled: !isUnlocked || isEquipped,
    }
  }),
)

const fabaoItems = computed(() =>
  playerStore.fabaoDisplayItems.map((item) => {
    const isAttackEquipped = playerStore.fabao.equippedAttackFabaoId === item.id
    const isDefenseEquipped = playerStore.fabao.equippedDefenseFabaoId === item.id
    const isEquipped = isAttackEquipped || isDefenseEquipped

    return {
      ...item,
      tierColor: FABAO_TIER_COLOR[item.tier as '下品' | '中品' | '上品'],
      lingqiBarStyle: `width: ${item.lingqiPercent}%`,
      isEquipped,
      equipText: isEquipped ? '已装备' : '装备',
      equipDisabled: isEquipped,
      statText: item.type === '攻击'
        ? `攻击 +${item.attack}${item.skillName ? ` · 技能「${item.skillName}」(${item.skillLingqiCost}灵力)` : ''}`
        : `防御 +${item.defense}${item.skillName ? ` · 技能「${item.skillName}」(${item.skillLingqiCost}灵力)` : ''}`,
    }
  }),
)

const equippedAttackFabao = computed(() =>
  fabaoItems.value.find((f) => f.id === playerStore.fabao.equippedAttackFabaoId),
)

const equippedDefenseFabao = computed(() =>
  fabaoItems.value.find((f) => f.id === playerStore.fabao.equippedDefenseFabaoId),
)

function handleEquipFabao(fabaoId: string) {
  playerStore.equipFabaoItem(fabaoId)
}

function handleUnequipFabao(type: '攻击' | '防御') {
  playerStore.unequipFabaoItem(type)
}

const isResetDisabled = computed(() => gameStore.isCultivationLocked)

function handleEquipTitle(titleId: string) {
  playerStore.setEquippedTitle(titleId)
}

function handleUnequipTitle() {
  playerStore.setEquippedTitle(null)
}

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
      <p v-if="activeTab === 'achievement'" class="page-subtitle">
        已达成 {{ achievementSummary.unlocked }} / {{ achievementSummary.total }}
      </p>
    </header>

    <nav class="character-tabs">
      <button
        v-for="tab in tabItems"
        :key="tab.id"
        type="button"
        :class="activeTab === tab.id ? 'character-tab character-tab--active' : 'character-tab'"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <template v-if="activeTab === 'profile'">
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
    </template>

    <SkillLibraryPanel v-else-if="activeTab === 'skill'" />

    <section v-else-if="activeTab === 'fabao'" class="fabao-list">
      <div class="fabao-equipped game-card">
        <p class="fabao-equipped__row">
          <span class="fabao-equipped__label">攻击法器</span>
          <span class="fabao-equipped__value">
            {{ equippedAttackFabao ? equippedAttackFabao.name : '未装备' }}
          </span>
          <button
            v-if="equippedAttackFabao"
            type="button"
            class="fabao-equipped__unequip"
            @click="handleUnequipFabao('攻击')"
          >
            卸下
          </button>
        </p>
        <p class="fabao-equipped__row">
          <span class="fabao-equipped__label">防御法器</span>
          <span class="fabao-equipped__value">
            {{ equippedDefenseFabao ? equippedDefenseFabao.name : '未装备' }}
          </span>
          <button
            v-if="equippedDefenseFabao"
            type="button"
            class="fabao-equipped__unequip"
            @click="handleUnequipFabao('防御')"
          >
            卸下
          </button>
        </p>
      </div>
      <p v-if="fabaoItems.length === 0" class="fabao-empty">暂无法器，可在洞府炼器台炼制。</p>
      <article
        v-for="item in fabaoItems"
        :key="item.id"
        :class="item.isEquipped ? 'fabao-item fabao-item--equipped' : 'fabao-item'"
      >
        <div class="fabao-item__head">
          <span class="fabao-item__name">
            <span class="fabao-tier" :style="{ color: item.tierColor }">{{ item.tier }}</span>
            {{ item.name }}
          </span>
          <span class="fabao-item__type">{{ item.type }}法器</span>
        </div>
        <p class="fabao-item__stat">{{ item.statText }} · 灵力 {{ item.lingqi }} / {{ item.maxLingqi }}</p>
        <div class="fabao-item__bar">
          <div class="fabao-item__bar-fill" :style="item.lingqiBarStyle" />
        </div>
        <p v-if="!item.canCastSkill && item.skillName" class="fabao-item__warn">灵力不足，技能攻击无法释放（被动属性仍生效）</p>
        <button
          type="button"
          class="fabao-item__action game-btn"
          :disabled="item.equipDisabled"
          @click="handleEquipFabao(item.id)"
        >
          {{ item.equipText }}
        </button>
      </article>
    </section>

    <section v-else-if="activeTab === 'achievement'" class="achievement-list">
      <article
        v-for="item in achievementItems"
        :key="item.id"
        :class="item.itemClass"
      >
        <div class="achievement-item__head">
          <span class="achievement-item__name">{{ item.name }}</span>
          <span class="achievement-item__category">{{ item.categoryLabel }}</span>
        </div>
        <p class="achievement-item__desc">{{ item.description }}</p>
        <div class="achievement-item__progress-row">
          <span class="achievement-item__progress-text">{{ item.progressText }}</span>
        </div>
        <div class="achievement-item__bar">
          <div class="achievement-item__bar-fill" :style="item.barStyle" />
        </div>
      </article>
    </section>

    <section v-else class="title-list">
      <div v-if="playerStore.equippedTitleText" class="title-equipped game-card">
        <span class="title-equipped__label">当前佩戴</span>
        <span class="title-equipped__value">{{ playerStore.equippedTitleText }}</span>
        <button type="button" class="title-equipped__unequip" @click="handleUnequipTitle">
          卸下
        </button>
      </div>

      <article
        v-for="item in titleItems"
        :key="item.id"
        :class="item.itemClass"
      >
        <div class="title-item__head">
          <span class="title-item__name">{{ item.name }}</span>
          <span class="title-item__rarity">{{ item.rarityLabel }}</span>
        </div>
        <p class="title-item__desc">{{ item.description }}</p>
        <p class="title-item__bonus">{{ item.bonusText }}</p>
        <button
          type="button"
          class="title-item__action game-btn"
          :disabled="item.actionDisabled"
          @click="handleEquipTitle(item.id)"
        >
          {{ item.actionText }}
        </button>
      </article>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 12px;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: $color-text-muted;
}

.character-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-bottom: 16px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  overflow: hidden;
  background: $color-bg-card;
}

.character-tab {
  min-width: 0;
  padding: 10px 4px;
  font-size: 12px;
  text-align: center;
  color: $color-text-muted;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.character-tab + .character-tab {
  margin-left: 0;
  border-left: 1px solid $color-border;
}

.character-tab--active {
  color: $color-primary;
  background: rgba($color-primary, 0.12);
  box-shadow: inset 0 -2px 0 $color-primary;
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

.achievement-item,
.title-item {
  padding: 14px;
  background: $color-bg-card;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.achievement-item + .achievement-item,
.title-item + .title-item {
  margin-top: 12px;
}

.achievement-item--unlocked {
  border-color: rgba($color-success, 0.4);
}

.title-item--equipped {
  border-color: $color-primary;
}

.title-item--locked {
  opacity: 0.55;
}

.achievement-item__head,
.title-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.achievement-item__name,
.title-item__name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text;
}

.achievement-item__category,
.title-item__rarity {
  font-size: 11px;
  color: $color-primary;
}

.achievement-item__desc,
.title-item__desc {
  margin-top: 6px;
  font-size: 13px;
  color: $color-text-muted;
  line-height: 1.6;
}

.title-item__bonus {
  margin-top: 4px;
  font-size: 12px;
  color: $color-info;
}

.achievement-item__progress-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.achievement-item__progress-text {
  font-size: 12px;
  color: $color-text-muted;
}

.achievement-item__bar {
  height: 4px;
  margin-top: 6px;
  background: rgba($color-border, 0.6);
  border-radius: 2px;
  overflow: hidden;
}

.achievement-item__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary-dim, $color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.title-equipped {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.title-equipped__label {
  font-size: 12px;
  color: $color-text-muted;
}

.title-equipped__value {
  flex: 1;
  margin-left: 8px;
  font-size: 14px;
  color: $color-primary;
}

.title-equipped__unequip {
  padding: 4px 10px;
  font-size: 12px;
  color: $color-text-muted;
  background: transparent;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  cursor: pointer;
}

.title-item__action {
  width: 100%;
  margin-top: 10px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.fabao-list {
  margin-top: 4px;
}

.fabao-equipped {
  padding: 12px 14px;
  margin-bottom: 12px;
}

.fabao-equipped__row {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.fabao-equipped__row + .fabao-equipped__row {
  margin-top: 8px;
}

.fabao-equipped__label {
  color: $color-text-muted;
}

.fabao-equipped__value {
  flex: 1;
  margin-left: 8px;
  color: $color-primary;
}

.fabao-equipped__unequip {
  padding: 4px 10px;
  font-size: 12px;
  color: $color-text-muted;
  background: transparent;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  cursor: pointer;
}

.fabao-empty {
  font-size: 13px;
  color: $color-text-muted;
  padding: 12px 0;
}

.fabao-item {
  padding: 14px;
  background: $color-bg-card;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.fabao-item + .fabao-item {
  margin-top: 12px;
}

.fabao-item--equipped {
  border-color: $color-primary;
}

.fabao-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fabao-item__name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text;
}

.fabao-tier {
  font-weight: 600;
}

.fabao-item__type {
  font-size: 11px;
  color: $color-primary;
}

.fabao-item__stat {
  margin-top: 6px;
  font-size: 13px;
  color: $color-text-muted;
}

.fabao-item__bar {
  height: 4px;
  margin-top: 8px;
  background: rgba($color-border, 0.6);
  border-radius: 2px;
  overflow: hidden;
}

.fabao-item__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, $color-info, $color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.fabao-item__warn {
  margin-top: 6px;
  font-size: 12px;
  color: #e67e22;
}

.fabao-item__action {
  width: 100%;
  margin-top: 10px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
