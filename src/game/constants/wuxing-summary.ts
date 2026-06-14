import { GONGFA_QUALITY_ORDER } from '@/game/constants/gongfa'
import type { GongfaQuality } from '@/game/types'
import type { ElementType } from '@/game/types'

/** 五行汇总功法模板 id */
export const WUXING_SUMMARY_GONGFA_ID = 'gongfa_wuxingguiyuan'

/** 五世解锁所需完成的相生步骤数 */
export const WUXING_SUMMARY_REQUIRED_STEPS = 5

/** 相生修炼链：金 → 水 → 木 → 火 → 土 */
export const WUXING_SUMMARY_GENERATING_CHAIN: ReadonlyArray<{
  element: ElementType
  templateId: string
  name: string
}> = [
  { element: '金', templateId: 'gongfa_ruijin', name: '锐金诀' },
  { element: '水', templateId: 'gongfa_runquan', name: '润泉诀' },
  { element: '木', templateId: 'gongfa_qingmu', name: '青木长生功' },
  { element: '火', templateId: 'gongfa_chiyan', name: '赤炎诀' },
  { element: '土', templateId: 'gongfa_jiantu', name: '坚土诀' },
]

/** 凡品入门五行功法 id 集合（用于校验） */
export const WUXING_SUMMARY_STARTER_TEMPLATE_IDS = new Set(
  WUXING_SUMMARY_GENERATING_CHAIN.map((step) => step.templateId),
)

/** 五行汇总功法各品阶基础战斗属性（升品后显著增强） */
export interface WuxingSummaryBaseStats {
  attackBonus: number
  defenseBonus: number
  hpBonus: number
  mpBonus: number
  speedBonus: number
  critRateBonus: number
  penetrationBonus: number
  tenacityBonus: number
  expMultiplier: number
}

/** 五行汇总功法品阶基础值（凡品起步，神品极强） */
export const WUXING_SUMMARY_BASE_BY_QUALITY: Record<GongfaQuality, WuxingSummaryBaseStats> = {
  凡品: {
    attackBonus: 12,
    defenseBonus: 10,
    hpBonus: 60,
    mpBonus: 40,
    speedBonus: 4,
    critRateBonus: 0.01,
    penetrationBonus: 0,
    tenacityBonus: 0,
    expMultiplier: 1.3,
  },
  黄品: {
    attackBonus: 35,
    defenseBonus: 28,
    hpBonus: 180,
    mpBonus: 120,
    speedBonus: 10,
    critRateBonus: 0.02,
    penetrationBonus: 8,
    tenacityBonus: 5,
    expMultiplier: 1.8,
  },
  玄品: {
    attackBonus: 80,
    defenseBonus: 60,
    hpBonus: 420,
    mpBonus: 280,
    speedBonus: 22,
    critRateBonus: 0.04,
    penetrationBonus: 20,
    tenacityBonus: 15,
    expMultiplier: 2.4,
  },
  地品: {
    attackBonus: 160,
    defenseBonus: 120,
    hpBonus: 850,
    mpBonus: 550,
    speedBonus: 38,
    critRateBonus: 0.06,
    penetrationBonus: 45,
    tenacityBonus: 30,
    expMultiplier: 3.2,
  },
  天品: {
    attackBonus: 320,
    defenseBonus: 240,
    hpBonus: 1600,
    mpBonus: 1000,
    speedBonus: 58,
    critRateBonus: 0.1,
    penetrationBonus: 80,
    tenacityBonus: 55,
    expMultiplier: 4.5,
  },
  仙品: {
    attackBonus: 520,
    defenseBonus: 380,
    hpBonus: 2600,
    mpBonus: 1600,
    speedBonus: 72,
    critRateBonus: 0.12,
    penetrationBonus: 120,
    tenacityBonus: 80,
    expMultiplier: 6,
  },
  神品: {
    attackBonus: 900,
    defenseBonus: 650,
    hpBonus: 4500,
    mpBonus: 2800,
    speedBonus: 100,
    critRateBonus: 0.18,
    penetrationBonus: 200,
    tenacityBonus: 130,
    expMultiplier: 8.5,
  },
}

/**
 * 读取五行汇总功法指定品阶的基础属性
 */
export function getWuxingSummaryBaseStats(quality: GongfaQuality): WuxingSummaryBaseStats {
  return { ...WUXING_SUMMARY_BASE_BY_QUALITY[quality] }
}

/**
 * 获取下一品阶（已是神品则返回 undefined）
 */
export function getNextGongfaQuality(quality: GongfaQuality): GongfaQuality | undefined {
  const index = GONGFA_QUALITY_ORDER.indexOf(quality)
  if (index < 0 || index >= GONGFA_QUALITY_ORDER.length - 1) return undefined
  return GONGFA_QUALITY_ORDER[index + 1]
}

/**
 * 获取当前解锁步骤对应的凡品功法要求
 */
export function getWuxingSummaryCurrentStep(progress: number) {
  if (progress < 0 || progress >= WUXING_SUMMARY_REQUIRED_STEPS) return undefined
  return WUXING_SUMMARY_GENERATING_CHAIN[progress]
}
