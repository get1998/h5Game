<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BATTLE_LOADOUT_SLOT_COUNT,
  MAX_EQUIPPED_BATTLE_SKILLS,
} from '@/game/models/player-skill'
import {
  calcSkillProficiencyProgress,
  formatSkillDescription,
  getSkillById,
  SKILL_CATEGORY_LABEL,
} from '@/game/models/skill'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const gameStore = useGameStore()

/** 当前选中的技能栏全局索引（2-5），用于指定装配位置 */
const selectedSkillSlotIndex = ref<number | null>(null)

const loadoutSlots = computed(() =>
  playerStore.battleLoadoutSlots.map((slot) => ({
    ...slot,
    kindClass: slot.kind === 'attack_fabao'
      ? 'loadout-slot--attack'
      : slot.kind === 'defense_fabao'
        ? 'loadout-slot--defense'
        : 'loadout-slot--skill',
    isSelected: selectedSkillSlotIndex.value === slot.slotIndex,
  })),
)

const fabaoSlots = computed(() => loadoutSlots.value.filter((slot) => slot.kind !== 'skill'))
const skillSlots = computed(() => loadoutSlots.value.filter((slot) => slot.kind === 'skill'))

const skillItems = computed(() =>
  playerStore.skillLibraryItems.map((item) => {
    const skill = getSkillById(item.id)
    const progress = skill
      ? calcSkillProficiencyProgress(item.proficiency, item.sourceGongfaQuality)
      : null

    return {
      ...item,
      categoryLabel: skill
        ? (SKILL_CATEGORY_LABEL[skill.category] ?? skill.category)
        : item.categoryLabel,
      effect: skill ? formatSkillDescription(skill, item.proficiency) : '',
      proficiencyBarStyle: progress?.barStyle ?? 'width: 0%',
      proficiencyText: progress?.progressText ?? '',
      levelText: progress?.levelText ?? '',
      masteryPassiveText: item.masteryPassiveText,
      isMasteryUnlocked: item.isMasteryUnlocked,
      itemClass: item.isEquipped ? 'skill-item skill-item--equipped' : 'skill-item',
      toggleClass: item.isCastable
        ? (item.isEquipped ? 'skill-toggle skill-toggle--on' : 'skill-toggle skill-toggle--off')
        : 'skill-toggle skill-toggle--passive',
      toggleLabel: item.isCastable
        ? (item.isEquipped ? '已配置' : '装配')
        : '永久',
    }
  }),
)

const equippedCountText = computed(
  () => `${playerStore.equippedSkillCount} / ${MAX_EQUIPPED_BATTLE_SKILLS}`,
)

const selectedSlotHint = computed(() => {
  if (selectedSkillSlotIndex.value == null) return ''
  const slot = loadoutSlots.value.find((item) => item.slotIndex === selectedSkillSlotIndex.value)
  return slot ? `正在配置 ${slot.label}` : ''
})

function handleToggleSkill(skillId: string) {
  if (selectedSkillSlotIndex.value != null) {
    const result = playerStore.assignSkillToLoadoutSlot(selectedSkillSlotIndex.value, skillId)
    gameStore.lastMessage = result.message
    if (result.success) {
      selectedSkillSlotIndex.value = null
    }
    return
  }

  const result = playerStore.toggleSkillEquip(skillId)
  gameStore.lastMessage = result.message
}

function handleLoadoutSlotClick(slotIndex: number, kind: string, isEmpty: boolean) {
  if (kind === 'attack_fabao' || kind === 'defense_fabao') {
    gameStore.lastMessage = '法器请在「法器」页装备或卸下。'
    return
  }

  if (isEmpty) {
    selectedSkillSlotIndex.value = selectedSkillSlotIndex.value === slotIndex ? null : slotIndex
    gameStore.lastMessage = selectedSkillSlotIndex.value == null
      ? '已取消栏位选择。'
      : `请选择要装配到「${loadoutSlots.value[slotIndex]?.label}」的技能。`
    return
  }

  const result = playerStore.clearSkillLoadoutSlot(slotIndex)
  gameStore.lastMessage = result.message
  if (selectedSkillSlotIndex.value === slotIndex) {
    selectedSkillSlotIndex.value = null
  }
}
</script>

<template>
  <div class="skill-library">
    <section class="loadout-panel game-card">
      <div class="loadout-panel__head">
        <div>
          <div class="page-section-title">战斗配置</div>
          <p class="loadout-panel__desc">
            共 {{ BATTLE_LOADOUT_SLOT_COUNT }} 栏，按栏位顺序优先释放；灵力或冷却不足时使用下一栏
          </p>
        </div>
        <div class="loadout-panel__count">
          <span class="loadout-panel__count-label">技能</span>
          <span class="loadout-panel__count-value">{{ equippedCountText }}</span>
        </div>
      </div>

      <p v-if="selectedSlotHint" class="loadout-panel__selected">{{ selectedSlotHint }}</p>

      <div class="loadout-group">
        <p class="loadout-group__title">法器</p>
        <div class="loadout-group__row">
          <button
            v-for="slot in fabaoSlots"
            :key="slot.slotIndex"
            type="button"
            :class="[
              'loadout-slot',
              slot.kindClass,
              slot.isEmpty ? 'loadout-slot--empty' : 'loadout-slot--filled',
            ]"
            @click="handleLoadoutSlotClick(slot.slotIndex, slot.kind, slot.isEmpty)"
          >
            <span class="loadout-slot__badge">{{ slot.label }}</span>
            <span class="loadout-slot__name">{{ slot.name }}</span>
            <span class="loadout-slot__sub">{{ slot.subText }}</span>
          </button>
        </div>
      </div>

      <div class="loadout-group">
        <p class="loadout-group__title">技能</p>
        <div class="loadout-group__row loadout-group__row--skills">
          <button
            v-for="slot in skillSlots"
            :key="slot.slotIndex"
            type="button"
            :class="[
              'loadout-slot',
              slot.kindClass,
              slot.isEmpty ? 'loadout-slot--empty' : 'loadout-slot--filled',
              slot.isSelected ? 'loadout-slot--selected' : '',
            ]"
            @click="handleLoadoutSlotClick(slot.slotIndex, slot.kind, slot.isEmpty)"
          >
            <span class="loadout-slot__badge">{{ slot.label }}</span>
            <span class="loadout-slot__name">{{ slot.name }}</span>
            <span class="loadout-slot__sub">{{ slot.subText }}</span>
          </button>
        </div>
      </div>
    </section>

    <section
      v-for="item in skillItems"
      :key="item.id"
      :class="item.itemClass"
      class="game-card"
    >
      <div class="skill-item__header">
        <div>
          <span class="skill-item__name">{{ item.name }}</span>
          <span class="skill-item__meta">
            {{ item.typeLabel }} · {{ item.categoryLabel }} · 来源《{{ item.sourceGongfaName }}》
          </span>
        </div>
        <button
          type="button"
          :class="item.toggleClass"
          :disabled="item.isCastable && !item.isEquipped && !item.canEquip"
          @click="handleToggleSkill(item.id)"
        >
          {{ item.toggleLabel }}
        </button>
      </div>

      <p class="skill-item__effect">{{ item.effect }}</p>
      <p v-if="item.masteryPassiveText" class="skill-item__mastery">
        圆满被动：{{ item.masteryPassiveText }}
      </p>
      <p class="skill-item__hint">{{ item.equipHint }}</p>

      <p v-if="item.levelText" class="skill-item__level">{{ item.levelText }}</p>
      <div class="progress-bar progress-bar--skill">
        <div
          class="progress-bar__fill progress-bar__fill--skill"
          :style="item.proficiencyBarStyle"
        />
      </div>
      <p class="skill-item__proficiency">{{ item.proficiencyText }}</p>
    </section>

    <p v-if="skillItems.length === 0" class="skill-empty">
      尚未领悟技能。修炼功法升级后，对应技能会自动进入技能库。
    </p>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.loadout-panel {
  margin-bottom: 12px;
}

.loadout-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.loadout-panel__desc {
  margin-top: 4px;
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.4;
}

.loadout-panel__count {
  flex-shrink: 0;
  margin-left: 12px;
  padding: 6px 10px;
  text-align: center;
  border: 1px solid rgba($color-primary, 0.35);
  border-radius: $radius-sm;
  background: rgba($color-primary, 0.08);
}

.loadout-panel__count-label {
  display: block;
  font-size: 10px;
  color: $color-text-muted;
}

.loadout-panel__count-value {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 600;
  color: $color-primary;
}

.loadout-panel__selected {
  margin-top: 10px;
  padding: 6px 10px;
  font-size: 12px;
  color: $color-primary;
  background: rgba($color-primary, 0.1);
  border-radius: $radius-sm;
}

.loadout-group + .loadout-group {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba($color-border, 0.6);
}

.loadout-group__title {
  margin-bottom: 8px;
  font-size: 11px;
  color: $color-text-muted;
  letter-spacing: 0.08em;
}

.loadout-group__row {
  display: flex;
}

.loadout-group__row--skills .loadout-slot {
  flex: 1;
  min-width: 0;
}

.loadout-slot + .loadout-slot {
  margin-left: 8px;
}

.loadout-slot {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  text-align: left;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: $color-bg-elevated;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.loadout-slot--attack {
  border-color: rgba(#e67e22, 0.35);
}

.loadout-slot--defense {
  border-color: rgba($color-info, 0.35);
}

.loadout-slot--skill.loadout-slot--empty {
  border-style: dashed;
}

.loadout-slot--filled {
  background: rgba($color-primary, 0.06);
}

.loadout-slot--attack.loadout-slot--filled {
  background: rgba(#e67e22, 0.08);
}

.loadout-slot--defense.loadout-slot--filled {
  background: rgba($color-info, 0.08);
}

.loadout-slot--selected {
  border-color: $color-primary;
  box-shadow: 0 0 0 1px rgba($color-primary, 0.35);
}

.loadout-slot__badge {
  display: block;
  font-size: 10px;
  color: $color-text-muted;
}

.loadout-slot__name {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  font-family: $font-title;
  color: $color-text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loadout-slot__sub {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: $color-primary-dim;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-item + .skill-item {
  margin-top: 12px;
}

.skill-item--equipped {
  border-color: $color-primary;
}

.skill-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.skill-item__name {
  display: block;
  font-family: $font-title;
  font-size: 16px;
  color: $color-text;
}

.skill-item__meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: $color-text-muted;
}

.skill-toggle {
  flex-shrink: 0;
  margin-left: 12px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid $color-primary-dim;
}

.skill-toggle--on {
  color: $color-text;
  background: rgba($color-primary, 0.25);
}

.skill-toggle--off {
  color: $color-primary;
  background: transparent;
}

.skill-toggle--passive {
  color: $color-text-muted;
  background: $color-bg-elevated;
  cursor: default;
}

.skill-toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.skill-item__effect {
  font-size: 13px;
  color: $color-text-muted;
  line-height: 1.4;
}

.skill-item__mastery {
  margin-top: 6px;
  font-size: 12px;
  color: $color-primary-dim;
  line-height: 1.4;
}

.skill-item__hint {
  margin-top: 6px;
  font-size: 11px;
  color: $color-primary-dim;
}

.progress-bar {
  height: 6px;
  background: $color-bg-elevated;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-bar--skill {
  margin-top: 6px;
}

.progress-bar__fill {
  height: 100%;
  background: $color-primary;
  border-radius: 3px;
}

.progress-bar__fill--skill {
  background: #9b7fd4;
}

.skill-item__level {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: $color-primary;
}

.skill-item__proficiency {
  margin-top: 4px;
  font-size: 11px;
  color: $color-text-muted;
  text-align: right;
}

.skill-empty {
  font-size: 13px;
  color: $color-text-muted;
  text-align: center;
  padding: 24px 0;
}
</style>
