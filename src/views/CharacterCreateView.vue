<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasReincarnationBonus } from '@/game/models/reincarnation'
import {
  buildSpiritRootDisplay,
  generateRandomName,
  generateSpiritRoot,
} from '@/game/systems/spirit-root'
import {
  generateCharacterOrigin,
  withGongfaChoiceSelection,
  type CharacterOriginResult,
} from '@/game/systems/character-origin'
import { usePlayerStore } from '@/stores/player'
import { useGameStore } from '@/stores/game'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const isReincarnateMode = computed(
  () => route.query.reincarnate === '1' && playerStore.isAwaitingReincarnation,
)
const reincarnationGeneration = computed(() => playerStore.nextReincarnationGeneration)
const hasInheritedBonus = computed(() => hasReincarnationBonus(playerStore.reincarnation))

type CreateStep = 'spirit-root' | 'origin'

const step = ref<CreateStep>('spirit-root')
const playerName = ref(generateRandomName())
const spiritRootResult = ref(generateSpiritRoot())
const isRolling = ref(false)
const originResult = ref<CharacterOriginResult | null>(null)
const selectedGongfaTemplateId = ref('')

const spiritRootDisplay = computed(() => buildSpiritRootDisplay(spiritRootResult.value))

const gongfaChoices = computed(() => {
  if (!originResult.value) return []
  return withGongfaChoiceSelection(
    originResult.value.gongfaOptions,
    selectedGongfaTemplateId.value,
  )
})

/**
 * 重新随机测定灵根
 */
function handleReroll() {
  if (isRolling.value) return
  isRolling.value = true
  setTimeout(() => {
    spiritRootResult.value = generateSpiritRoot()
    isRolling.value = false
  }, 400)
}

/**
 * 重新随机道号
 */
function handleRandomName() {
  playerName.value = generateRandomName()
}

/**
 * 生成角色经历与功法选项，进入第二步
 */
function handleEnterOrigin() {
  const name = playerName.value.trim() || '无名修士'
  const result = generateCharacterOrigin({
    name,
    spiritRootType: spiritRootResult.value.spiritRootType,
    spiritRootElements: [...spiritRootResult.value.spiritRootElements],
  })
  originResult.value = result
  const recommended = result.gongfaOptions.find((item) => item.recommended)
  selectedGongfaTemplateId.value = recommended?.templateId ?? result.gongfaOptions[0]?.templateId ?? ''
  step.value = 'origin'
}

/**
 * 重新生成角色经历
 */
function handleRerollOrigin() {
  const name = playerName.value.trim() || '无名修士'
  const result = generateCharacterOrigin({
    name,
    spiritRootType: spiritRootResult.value.spiritRootType,
    spiritRootElements: [...spiritRootResult.value.spiritRootElements],
  })
  originResult.value = result
  const stillValid = result.gongfaOptions.some(
    (item) => item.templateId === selectedGongfaTemplateId.value,
  )
  if (!stillValid) {
    const recommended = result.gongfaOptions.find((item) => item.recommended)
    selectedGongfaTemplateId.value = recommended?.templateId ?? result.gongfaOptions[0]?.templateId ?? ''
  }
}

/**
 * 返回灵根测定步骤
 */
function handleBackToSpiritRoot() {
  step.value = 'spirit-root'
}

/**
 * 选择入门功法
 */
function handleSelectGongfa(templateId: string) {
  selectedGongfaTemplateId.value = templateId
}

/**
 * 确认创建角色，正式踏入仙途
 */
function handleConfirm() {
  if (!originResult.value || !selectedGongfaTemplateId.value) return
  const name = playerName.value.trim() || '无名修士'
  const payload = {
    name,
    spiritRootType: spiritRootResult.value.spiritRootType,
    spiritRootElements: [...spiritRootResult.value.spiritRootElements],
    originTitle: originResult.value.originTitle,
    originSummary: originResult.value.originSummary,
    starterGongfaTemplateId: selectedGongfaTemplateId.value,
  }

  if (isReincarnateMode.value) {
    gameStore.resetGame()
    playerStore.reincarnateCharacter(payload)
  } else {
    playerStore.createCharacter(payload)
  }
  router.push('/home')
}
</script>

<template>
  <div class="create-page">
    <div class="create-page__bg" />

    <div class="create-page__content">
      <section v-if="isReincarnateMode" class="create-reincarnation">
        <p class="create-reincarnation__title">再入轮回 · 第 {{ reincarnationGeneration }} 世</p>
        <p class="create-reincarnation__desc">
          继承前世各世 10% 基础属性，轮回加成已累加
          <template v-if="hasInheritedBonus">，新一世将携因果再踏仙途</template>
        </p>
      </section>

      <!-- 第一步：灵根测定 -->
      <template v-if="step === 'spirit-root'">
        <header class="create-header">
          <h1 class="create-header__title">灵根测定</h1>
          <p class="create-header__desc">天地灵气汇聚，测定你的修仙资质</p>
        </header>

        <section class="create-card game-card" :class="isRolling ? 'create-card--rolling' : ''">
          <div class="create-card__header">
            <span class="create-card__label">灵根品阶</span>
            <span :class="spiritRootDisplay.rarityClass">{{ spiritRootDisplay.rarityText }}</span>
          </div>

          <div class="spirit-root-type">{{ spiritRootDisplay.type }}</div>

          <div class="spirit-root-elements">
            <span
              v-for="el in spiritRootDisplay.elements"
              :key="el.name"
              class="spirit-root-element"
              :style="el.tagStyle"
            >
              {{ el.name }}
            </span>
          </div>

          <p class="spirit-root-desc">{{ spiritRootDisplay.description }}</p>
        </section>

        <section class="create-form game-card">
          <div class="create-form__row">
            <label class="create-form__label" for="player-name">道号</label>
            <div class="create-form__input-group">
              <input
                id="player-name"
                v-model="playerName"
                class="create-form__input"
                type="text"
                maxlength="8"
                placeholder="请输入道号"
              />
              <button class="create-form__random-btn" type="button" @click="handleRandomName">
                随机
              </button>
            </div>
          </div>
        </section>

        <div class="create-actions">
          <button
            class="game-btn game-btn--secondary create-actions__btn"
            :disabled="isRolling"
            @click="handleReroll"
          >
            {{ isRolling ? '测定中…' : '重新测定' }}
          </button>
          <button class="game-btn game-btn--primary create-actions__btn" @click="handleEnterOrigin">
            踏入仙途
          </button>
        </div>
      </template>

      <!-- 第二步：角色经历 -->
      <template v-else-if="originResult">
        <header class="create-header">
          <h1 class="create-header__title">角色经历</h1>
          <p class="create-header__desc">仙途之前，你曾走过怎样的凡尘</p>
        </header>

        <section class="origin-card game-card">
          <div class="origin-card__header">
            <span class="origin-card__label">凡尘出身</span>
            <span class="origin-card__title">{{ originResult.originTitle }}</span>
          </div>
          <p class="origin-card__summary">{{ originResult.originSummary }}</p>
          <button class="origin-card__reroll" type="button" @click="handleRerollOrigin">
            换一个经历
          </button>
        </section>

        <section class="origin-gongfa-section">
          <div class="origin-gongfa-section__title">择法入门</div>
          <p class="origin-gongfa-section__desc">根据你的灵根，择一功法作为仙途根基</p>

          <div
            v-for="option in gongfaChoices"
            :key="option.templateId"
            :class="option.cardClass"
            @click="handleSelectGongfa(option.templateId)"
          >
            <div class="origin-gongfa__header">
              <span class="origin-gongfa__name">{{ option.name }}</span>
              <span :class="option.qualityClass">{{ option.quality }}</span>
            </div>
            <div class="origin-gongfa__meta">
              <span class="origin-gongfa__element" :style="option.elementTagStyle">
                {{ option.element }}
              </span>
              <span
                v-if="option.recommended"
                class="origin-gongfa__badge"
              >
                推荐
              </span>
            </div>
            <p class="origin-gongfa__desc">{{ option.description }}</p>
            <p class="origin-gongfa__adapt">{{ option.adaptHint }}</p>
            <p class="origin-gongfa__passive">圆满被动：{{ option.permanentPassive }}</p>
          </div>
        </section>

        <div class="create-actions">
          <button
            class="game-btn game-btn--secondary create-actions__btn"
            @click="handleBackToSpiritRoot"
          >
            返回
          </button>
          <button
            class="game-btn game-btn--primary create-actions__btn"
            :disabled="!selectedGongfaTemplateId"
            @click="handleConfirm"
          >
            确认仙途
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.create-page {
  position: relative;
  min-height: 100%;
  padding: 32px 16px;
  overflow: hidden;
}

.create-page__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 50% 20%, rgba($color-primary, 0.1) 0%, transparent 55%),
    $color-bg;
  pointer-events: none;
}

.create-page__content {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
}

.create-header {
  text-align: center;
  margin-bottom: 24px;
}

.create-header__title {
  font-family: $font-title;
  font-size: 28px;
  color: $color-primary;
  letter-spacing: 0.1em;
}

.create-header__desc {
  margin-top: 8px;
  font-size: 13px;
  color: $color-text-muted;
}

.create-card {
  text-align: center;
  transition: opacity 0.3s, transform 0.3s;
}

.create-card--rolling {
  opacity: 0.5;
  transform: scale(0.97);
}

.create-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.create-card__label {
  font-size: 12px;
  color: $color-text-muted;
}

.spirit-root-rarity--legendary {
  font-size: 13px;
  font-weight: 600;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(#ffd700, 0.4);
}

.spirit-root-rarity--rare {
  font-size: 13px;
  font-weight: 600;
  color: $color-info;
}

.spirit-root-rarity--common {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-muted;
}

.spirit-root-type {
  font-family: $font-title;
  font-size: 32px;
  color: $color-primary;
  letter-spacing: 0.15em;
  margin-bottom: 16px;
}

.spirit-root-elements {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.spirit-root-element {
  padding: 4px 14px;
  border: 1px solid;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
  margin-bottom: 8px;
}

.spirit-root-desc {
  margin-top: 12px;
  font-size: 13px;
  color: $color-text-muted;
  line-height: 1.6;
}

.create-form {
  margin-top: 16px;
}

.create-form__row {
  display: flex;
  flex-direction: column;
}

.create-form__label {
  font-size: 13px;
  color: $color-text-muted;
  margin-bottom: 8px;
}

.create-form__input-group {
  display: flex;
}

.create-form__input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  background: $color-bg-elevated;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  color: $color-text;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: $color-primary;
  }
}

.create-form__random-btn {
  margin-left: 8px;
  padding: 0 14px;
  height: 40px;
  background: $color-bg-elevated;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:active {
    opacity: 0.8;
  }
}

.origin-card {
  line-height: 1.7;
}

.origin-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.origin-card__label {
  font-size: 12px;
  color: $color-text-muted;
}

.origin-card__title {
  font-family: $font-title;
  font-size: 18px;
  color: $color-primary;
  letter-spacing: 0.08em;
}

.origin-card__summary {
  font-size: 14px;
  color: $color-text;
  line-height: 1.8;
  text-align: justify;
}

.origin-card__reroll {
  display: block;
  margin-top: 14px;
  margin-left: auto;
  padding: 0;
  background: none;
  border: none;
  color: $color-info;
  font-size: 13px;
  cursor: pointer;

  &:active {
    opacity: 0.8;
  }
}

.origin-gongfa-section {
  margin-top: 16px;
}

.origin-gongfa-section__title {
  font-family: $font-title;
  font-size: 18px;
  color: $color-primary;
  letter-spacing: 0.08em;
}

.origin-gongfa-section__desc {
  margin-top: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: $color-text-muted;
}

.origin-gongfa {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  border: 1px solid $color-border;
}

.origin-gongfa + .origin-gongfa {
  margin-top: 12px;
}

.origin-gongfa--selected {
  border-color: $color-primary;
  box-shadow: 0 0 0 1px rgba($color-primary, 0.25);
}

.origin-gongfa__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.origin-gongfa__name {
  font-size: 16px;
  font-weight: 600;
  color: $color-text;
}

.origin-gongfa__quality--common {
  font-size: 12px;
  color: $color-text-muted;
}

.origin-gongfa__quality--rare {
  font-size: 12px;
  color: $color-info;
}

.origin-gongfa__quality--epic {
  font-size: 12px;
  color: #b07cff;
}

.origin-gongfa__quality--legendary {
  font-size: 12px;
  color: #ffd700;
}

.origin-gongfa__meta {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.origin-gongfa__element {
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 14px;
  font-size: 12px;
}

.origin-gongfa__badge {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba($color-primary, 0.15);
  color: $color-primary;
  font-size: 11px;
}

.origin-gongfa__desc {
  margin-top: 10px;
  font-size: 13px;
  color: $color-text-muted;
  line-height: 1.6;
}

.origin-gongfa__adapt {
  margin-top: 8px;
  font-size: 12px;
  color: $color-info;
}

.origin-gongfa__passive {
  margin-top: 6px;
  font-size: 12px;
  color: $color-success;
}

.create-reincarnation {
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid rgba($color-primary, 0.35);
  border-radius: 8px;
  background: rgba($color-primary, 0.06);
  text-align: left;
}

.create-reincarnation__title {
  font-size: 15px;
  color: $color-primary;
  font-weight: 600;
}

.create-reincarnation__desc {
  margin-top: 8px;
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
}

.create-actions {
  display: flex;
  margin-top: 24px;
}

.create-actions > * + * {
  margin-left: 12px;
}

.create-actions__btn {
  flex: 1;
  min-height: 48px;
  font-size: 15px;
  cursor: pointer;
}
</style>
