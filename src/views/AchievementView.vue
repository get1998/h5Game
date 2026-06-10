<script setup lang="ts">
import { computed, ref } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import {
  ACHIEVEMENT_CATEGORY_LABEL,
  ACHIEVEMENT_DEFINITIONS,
} from '@/game/constants/achievements'
import { TITLE_DEFINITIONS, TITLE_RARITY_LABEL } from '@/game/constants/titles'
import { calcAchievementProgress } from '@/game/systems/achievement'
import { usePlayerStore } from '@/stores/player'

type PageTab = 'achievement' | 'title'

const playerStore = usePlayerStore()
const activeTab = ref<PageTab>('achievement')

const tabItems = computed(() => [
  {
    id: 'achievement' as const,
    label: '成就',
    tabClass: activeTab.value === 'achievement'
      ? 'achievement-tab achievement-tab--active'
      : 'achievement-tab',
  },
  {
    id: 'title' as const,
    label: '称号',
    tabClass: activeTab.value === 'title'
      ? 'achievement-tab achievement-tab--active'
      : 'achievement-tab',
  },
])

const achievementSummary = computed(() => {
  const total = ACHIEVEMENT_DEFINITIONS.length
  const unlocked = ACHIEVEMENT_DEFINITIONS.filter(
    (item) => playerStore.achievements.records[item.id]?.unlockedAtDay != null,
  ).length
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
    const isUnlocked = record?.unlockedAtDay != null
    const isHidden = definition.hidden && !isUnlocked
    const { progress, target } = calcAchievementProgress(
      definition,
      playerStore.achievements,
      playerStore.buildAchievementContext(),
    )
    const percent = target > 0 ? Math.min(100, Math.floor((progress / target) * 100)) : 0

    return {
      id: definition.id,
      name: isHidden ? '？？？' : definition.name,
      description: isHidden ? '达成后揭晓' : definition.description,
      categoryLabel: ACHIEVEMENT_CATEGORY_LABEL[definition.category],
      isUnlocked,
      progressText: isUnlocked ? '已达成' : `${progress} / ${target}`,
      percent,
      barStyle: `width: ${isUnlocked ? 100 : percent}%`,
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

function switchTab(tab: PageTab) {
  activeTab.value = tab
}

function handleEquipTitle(titleId: string) {
  playerStore.setEquippedTitle(titleId)
}

function handleUnequipTitle() {
  playerStore.setEquippedTitle(null)
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">成就</h1>
      <p class="page-subtitle">
        已达成 {{ achievementSummary.unlocked }} / {{ achievementSummary.total }}
      </p>
    </header>

    <nav class="achievement-tabs">
      <button
        v-for="tab in tabItems"
        :key="tab.id"
        type="button"
        :class="tab.tabClass"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'achievement'" class="achievement-list">
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
          <div
            class="achievement-item__bar-fill"
            :style="item.barStyle"
          />
        </div>
      </article>
    </section>

    <section v-else class="title-list">
      <div v-if="playerStore.equippedTitleText" class="title-equipped game-card">
        <span class="title-equipped__label">当前佩戴</span>
        <span class="title-equipped__value">{{ playerStore.equippedTitleText }}</span>
        <button
          type="button"
          class="title-equipped__unequip"
          @click="handleUnequipTitle"
        >
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

.achievement-tabs {
  display: flex;
  margin-bottom: 16px;
}

.achievement-tab {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  color: $color-text-muted;
  background: $color-bg-card;
  border: 1px solid $color-border;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.achievement-tab + .achievement-tab {
  margin-left: 8px;
}

.achievement-tab--active {
  color: $color-primary;
  border-color: $color-primary-dim;
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
</style>
