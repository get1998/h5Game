import {
  getNextGongfaQuality,
  getWuxingSummaryCurrentStep,
  WUXING_SUMMARY_GONGFA_ID,
  WUXING_SUMMARY_REQUIRED_STEPS,
} from '@/game/constants/wuxing-summary'
import { calcExpToNextLevel } from '@/game/formulas/gongfa-exp'
import {
  getFullWuxingGongfaTemplateByQuality,
  getGongfaTemplate,
  isWuxingSummaryGongfa,
  syncGongfaLevelBonuses,
  type Gongfa,
} from '@/game/models/gongfa'
import type { ReincarnationState } from '@/game/models/reincarnation'
import type { GongfaQuality } from '@/game/types'

type WuxingSummaryTrackState = Pick<
  ReincarnationState,
  'wuxingSummaryProgress' | 'wuxingSummaryLifeStepDone' | 'wuxingSummaryUnlocked'
>

export interface WuxingSummaryProgressInfo {
  progress: number
  requiredSteps: number
  unlocked: boolean
  lifeStepDone: boolean
  currentStepText: string
  nextStepText: string
  canUpgradeQuality: boolean
}

/** 五行归元诀升品阶状态 */
export interface WuxingSummaryUpgradeStatus {
  canUpgrade: boolean
  nextQuality?: GongfaQuality
  prerequisiteMet: boolean
  prerequisiteName: string
  prerequisiteQuality: GongfaQuality
  blockReason: string
  upgradeHint: string
}

/**
 * 是否已将指定品阶的完整五行功法修炼至圆满
 */
export function hasMaxedFullWuxingGongfaAtQuality(
  gongfaList: Gongfa[],
  quality: GongfaQuality,
): boolean {
  const prerequisite = getFullWuxingGongfaTemplateByQuality(quality)
  if (!prerequisite) return false

  const owned = gongfaList.find((item) => item.id === prerequisite.id)
  if (!owned) return false
  return owned.level >= owned.maxLevel && owned.quality === prerequisite.quality
}

/**
 * 构建升品至下一品阶的前置条件说明
 */
export function buildWuxingSummaryUpgradeStatus(
  gongfa: Gongfa,
  gongfaList: Gongfa[],
): WuxingSummaryUpgradeStatus {
  const empty: WuxingSummaryUpgradeStatus = {
    canUpgrade: false,
    prerequisiteMet: false,
    prerequisiteName: '',
    prerequisiteQuality: '凡品',
    blockReason: '',
    upgradeHint: '',
  }

  if (!isWuxingSummaryGongfa(gongfa)) return empty

  const nextQuality = getNextGongfaQuality(gongfa.quality)
  if (!nextQuality) {
    return {
      ...empty,
      blockReason: `${gongfa.name} 已达最高品阶。`,
    }
  }

  const prerequisite = getFullWuxingGongfaTemplateByQuality(nextQuality)
  const prerequisiteName = prerequisite?.name ?? `${nextQuality}五行功法`
  const prerequisiteMet = hasMaxedFullWuxingGongfaAtQuality(gongfaList, nextQuality)

  if (gongfa.level < gongfa.maxLevel) {
    return {
      canUpgrade: false,
      nextQuality,
      prerequisiteMet,
      prerequisiteName,
      prerequisiteQuality: nextQuality,
      blockReason: `${gongfa.name} 需先修炼至圆满。`,
      upgradeHint: `圆满 + 《${prerequisiteName}》(${nextQuality}) 圆满后可升「${nextQuality}」`,
    }
  }

  if (!prerequisiteMet) {
    return {
      canUpgrade: false,
      nextQuality,
      prerequisiteMet: false,
      prerequisiteName,
      prerequisiteQuality: nextQuality,
      blockReason: `升「${nextQuality}」需先将《${prerequisiteName}》(${nextQuality}) 修炼至圆满。`,
      upgradeHint: `需《${prerequisiteName}》(${nextQuality}) 圆满`,
    }
  }

  return {
    canUpgrade: true,
    nextQuality,
    prerequisiteMet: true,
    prerequisiteName,
    prerequisiteQuality: nextQuality,
    blockReason: '',
    upgradeHint: `可升品至「${nextQuality}」`,
  }
}

/**
 * 本世是否满足当前步骤的凡品圆满条件
 */
export function isWuxingSummaryStepGongfaComplete(gongfa: Gongfa): boolean {
  const step = getWuxingSummaryCurrentStep(0)
  if (!step) return false
  return (
    gongfa.id === step.templateId
    && gongfa.quality === '凡品'
    && gongfa.level >= gongfa.maxLevel
  )
}

/**
 * 检测功法圆满是否完成当前世相生步骤
 */
export function tryMarkWuxingSummaryLifeStep(
  gongfa: Gongfa,
  state: WuxingSummaryTrackState,
): boolean {
  if (state.wuxingSummaryUnlocked || state.wuxingSummaryProgress >= WUXING_SUMMARY_REQUIRED_STEPS) {
    return false
  }

  const step = getWuxingSummaryCurrentStep(state.wuxingSummaryProgress)
  if (!step) return false

  const matched = (
    gongfa.id === step.templateId
    && gongfa.quality === '凡品'
    && gongfa.level >= gongfa.maxLevel
  )

  if (matched) {
    state.wuxingSummaryLifeStepDone = true
  }
  return matched
}

/**
 * 寿元尽 / 再入轮回时结算五行汇总进度
 * @returns 是否刚解锁五行归元诀
 */
export function settleWuxingSummaryOnLifeEnd(state: WuxingSummaryTrackState): boolean {
  let justUnlocked = false

  if (
    !state.wuxingSummaryUnlocked
    && state.wuxingSummaryLifeStepDone
    && state.wuxingSummaryProgress < WUXING_SUMMARY_REQUIRED_STEPS
  ) {
    state.wuxingSummaryProgress += 1
    if (state.wuxingSummaryProgress >= WUXING_SUMMARY_REQUIRED_STEPS) {
      state.wuxingSummaryUnlocked = true
      justUnlocked = true
    }
  }

  state.wuxingSummaryLifeStepDone = false
  return justUnlocked
}

/**
 * 是否允许领悟五行归元诀
 */
export function canObtainWuxingSummaryGongfa(state: ReincarnationState): boolean {
  return state.wuxingSummaryUnlocked
}

/**
 * 是否禁止通过掉落等方式直接获取
 */
export function isWuxingSummaryGongfaLocked(templateId: string, state: ReincarnationState): boolean {
  if (templateId !== WUXING_SUMMARY_GONGFA_ID) return false
  return !state.wuxingSummaryUnlocked
}

/**
 * 五行汇总功法是否可升品阶
 */
export function canUpgradeWuxingSummaryQuality(gongfa: Gongfa, gongfaList: Gongfa[]): boolean {
  return buildWuxingSummaryUpgradeStatus(gongfa, gongfaList).canUpgrade
}

/**
 * 升品阶：圆满 + 同品阶五行功法圆满后突破至下一品质，等级重置为 1
 */
export function upgradeWuxingSummaryQuality(
  gongfa: Gongfa,
  gongfaList: Gongfa[],
): {
  success: boolean
  message: string
  newQuality?: Gongfa['quality']
} {
  const status = buildWuxingSummaryUpgradeStatus(gongfa, gongfaList)
  if (!status.canUpgrade || !status.nextQuality) {
    return { success: false, message: status.blockReason || '无法升品阶。' }
  }

  const template = getGongfaTemplate(gongfa.id)
  if (!template?.isWuxingSummary) {
    return { success: false, message: '该功法不支持升品阶。' }
  }

  const nextQuality = status.nextQuality
  gongfa.quality = nextQuality
  gongfa.level = 1
  gongfa.exp = 0
  gongfa.expToNext = calcExpToNextLevel(1)
  syncGongfaLevelBonuses(gongfa)

  return {
    success: true,
    message: `${gongfa.name} 升品至「${nextQuality}」！`,
    newQuality: nextQuality,
  }
}

/**
 * 构建五行汇总解锁进度展示信息
 */
export function buildWuxingSummaryProgressInfo(
  state: ReincarnationState,
  activeGongfa?: Gongfa | null,
  gongfaList: Gongfa[] = [],
): WuxingSummaryProgressInfo {
  const { wuxingSummaryProgress, wuxingSummaryUnlocked, wuxingSummaryLifeStepDone } = state
  const currentStep = getWuxingSummaryCurrentStep(wuxingSummaryProgress)
  const nextStep = getWuxingSummaryCurrentStep(wuxingSummaryProgress + 1)

  let currentStepText = '已全部完成'
  if (!wuxingSummaryUnlocked && currentStep) {
    currentStepText = `第 ${wuxingSummaryProgress + 1} 世：凡品《${currentStep.name}》(${currentStep.element}) 修炼至圆满`
    if (wuxingSummaryLifeStepDone) {
      currentStepText += '（本世已达成，再入轮回后计入进度）'
    }
  }

  const nextStepText = wuxingSummaryUnlocked
    ? '已领悟《五行归元诀》'
    : (nextStep
      ? `下一步：凡品《${nextStep.name}》(${nextStep.element})`
      : '完成五世相生修炼后可领悟')

  return {
    progress: wuxingSummaryProgress,
    requiredSteps: WUXING_SUMMARY_REQUIRED_STEPS,
    unlocked: wuxingSummaryUnlocked,
    lifeStepDone: wuxingSummaryLifeStepDone,
    currentStepText,
    nextStepText,
    canUpgradeQuality: activeGongfa
      ? canUpgradeWuxingSummaryQuality(activeGongfa, gongfaList)
      : false,
  }
}
