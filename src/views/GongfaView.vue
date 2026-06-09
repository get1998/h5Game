<script setup lang="ts">
import { computed, ref } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import { getSkillsByGongfaId, SKILL_CATEGORY_LABEL } from '@/game/models/skill'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'

const SKILL_TYPE_LABEL: Record<string, string> = {
  active: '主动',
  passive: '被动',
  ultimate: '绝技',
}

const playerStore = usePlayerStore()
const gameStore = useGameStore()

/** 功法技能区折叠状态，默认展开 */
const skillsExpandedMap = ref<Record<string, boolean>>({})

const gongfaItems = computed(() =>
  playerStore.gongfaList.map((gongfa) => {
    const skills = getSkillsByGongfaId(gongfa.id).map((skill) => ({
      id: skill.id,
      name: skill.name,
      typeLabel: SKILL_TYPE_LABEL[skill.type] ?? skill.type,
      categoryLabel: SKILL_CATEGORY_LABEL[skill.category] ?? skill.category,
      effect: skill.description,
      minLevel: skill.minLevel,
      isUnlocked: gongfa.level >= skill.minLevel,
      itemClass: gongfa.level >= skill.minLevel
        ? 'gongfa-skill gongfa-skill--unlocked'
        : 'gongfa-skill gongfa-skill--locked',
    }))

    return {
      ...gongfa,
      isActive: gongfa.id === playerStore.activeGongfaId,
      cardClass: gongfa.id === playerStore.activeGongfaId
        ? 'gongfa-item game-card gongfa-item--active'
        : 'gongfa-item game-card',
      expPercent: gongfa.maxLevel <= gongfa.level || gongfa.expToNext <= 0
        ? 100
        : Math.floor((gongfa.exp / gongfa.expToNext) * 100),
      expBarStyle: gongfa.maxLevel <= gongfa.level || gongfa.expToNext <= 0
        ? 'width: 100%'
        : `width: ${Math.min(100, Math.floor((gongfa.exp / gongfa.expToNext) * 100))}%`,
      levelText: gongfa.level >= gongfa.maxLevel
        ? '圆满'
        : `${gongfa.level} / ${gongfa.maxLevel}`,
      skills,
      skillsExpanded: skillsExpandedMap.value[gongfa.id] ?? true,
      skillsBodyClass: (skillsExpandedMap.value[gongfa.id] ?? true)
        ? 'gongfa-skills__body gongfa-skills__body--expanded'
        : 'gongfa-skills__body',
      skillsChevronClass: (skillsExpandedMap.value[gongfa.id] ?? true)
        ? 'gongfa-skills__chevron gongfa-skills__chevron--expanded'
        : 'gongfa-skills__chevron',
    }
  }),
)

function selectGongfa(gongfaId: string) {
  if (gameStore.isCultivationLocked) return
  playerStore.switchGongfa(gongfaId)
}

/**
 * 切换功法技能列表折叠状态
 * @param gongfaId 功法 id
 */
function toggleSkills(gongfaId: string) {
  const expanded = skillsExpandedMap.value[gongfaId] ?? true
  skillsExpandedMap.value = {
    ...skillsExpandedMap.value,
    [gongfaId]: !expanded,
  }
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">功法</h1>
    </header>

    <section
      v-for="item in gongfaItems"
      :key="item.id"
      :class="item.cardClass"
      @click="selectGongfa(item.id)"
    >
      <div class="gongfa-item__header">
        <span class="gongfa-item__name">{{ item.name }}</span>
        <span class="gongfa-item__quality">{{ item.quality }}</span>
      </div>
      <p class="gongfa-item__desc">{{ item.description }}</p>
      <div class="stat-row">
        <span class="stat-label">五行</span>
        <span class="stat-value">{{ item.element }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">等级</span>
        <span class="stat-value">{{ item.levelText }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="item.expBarStyle" />
      </div>
      <p class="gongfa-item__exp">功法经验 {{ item.expPercent }}%</p>
      <div
        v-if="item.skills.length"
        class="gongfa-skills"
        @click.stop
      >
        <div
          class="gongfa-skills__title-row"
          @click="toggleSkills(item.id)"
        >
          <p class="gongfa-skills__title">功法技能</p>
          <span :class="item.skillsChevronClass" aria-hidden="true" />
        </div>
        <div :class="item.skillsBodyClass">
          <div class="gongfa-skills__body-inner">
            <div
              v-for="skill in item.skills"
              :key="skill.id"
              :class="skill.itemClass"
            >
              <div class="gongfa-skill__header">
                <span class="gongfa-skill__name">{{ skill.name }}</span>
                <span class="gongfa-skill__type">{{ skill.typeLabel }} · {{ skill.categoryLabel }}</span>
              </div>
              <p class="gongfa-skill__effect">{{ skill.effect }}</p>
              <p class="gongfa-skill__level">
                {{ skill.isUnlocked ? '已领悟' : `功法 ${skill.minLevel} 级领悟` }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p v-if="item.permanentPassive" class="gongfa-item__passive">
        圆满被动：{{ item.permanentPassive }}
      </p>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 16px;
}

.gongfa-item {
  cursor: pointer;
  transition: border-color 0.15s;
}

.gongfa-item + .gongfa-item {
  margin-top: 12px;
}

.gongfa-item--active {
  border-color: $color-primary;
}

.gongfa-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.gongfa-item__name {
  font-family: $font-title;
  font-size: 16px;
  color: $color-text;
}

.gongfa-item__quality {
  font-size: 12px;
  color: $color-primary;
  padding: 2px 8px;
  border: 1px solid $color-primary-dim;
  border-radius: 4px;
}

.gongfa-item__desc {
  font-size: 13px;
  color: $color-text-muted;
  margin-bottom: 10px;
}

.progress-bar {
  height: 6px;
  background: $color-bg-elevated;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: $color-primary;
  border-radius: 3px;
}

.gongfa-item__exp {
  margin-top: 4px;
  font-size: 11px;
  color: $color-text-muted;
  text-align: right;
}

.gongfa-skills {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid $color-bg-elevated;
}

.gongfa-skills__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.gongfa-skills__title {
  font-size: 12px;
  color: $color-text-muted;
  margin-bottom: 0;
}

.gongfa-skills__chevron {
  flex-shrink: 0;
  width: 0;
  height: 0;
  margin-left: 8px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid $color-text-muted;
  transition: transform 0.2s ease;
}

.gongfa-skills__chevron--expanded {
  transform: rotate(90deg);
}

.gongfa-skills__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}

.gongfa-skills__body--expanded {
  grid-template-rows: 1fr;
}

.gongfa-skills__body-inner {
  overflow: hidden;
}

.gongfa-skills__body--expanded .gongfa-skills__body-inner {
  margin-top: 8px;
}

.gongfa-skill {
  padding: 8px;
  border-radius: 4px;
  background: $color-bg-elevated;
}

.gongfa-skill + .gongfa-skill {
  margin-top: 8px;
}

.gongfa-skill--unlocked {
  border-left: 2px solid $color-primary;
}

.gongfa-skill--locked {
  opacity: 0.55;
}

.gongfa-skill__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gongfa-skill__name {
  font-size: 13px;
  color: $color-text;
}

.gongfa-skill__type {
  font-size: 11px;
  color: $color-primary;
}

.gongfa-skill__effect {
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.4;
}

.gongfa-skill__level {
  margin-top: 4px;
  font-size: 11px;
  color: $color-text-muted;
  text-align: right;
}

.gongfa-item__passive {
  margin-top: 10px;
  font-size: 12px;
  color: $color-primary-dim;
}
</style>
