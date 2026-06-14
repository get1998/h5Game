import { getRealmDiff } from '@/game/constants/realm'
import {
  getMonsterBattleRewardMultiplier,
  type MonsterKind,
  type MonsterTier,
} from '@/game/models/monster'
import {
  getSkillProficiencyRealmMultiplierByDiff,
  SKILL_KILL_PROFICIENCY_BONUS_RATIO,
  SKILL_PROFICIENCY_BASE_GAIN,
  SKILL_PROFICIENCY_MIN_GAIN,
  type SkillLevel,
} from '@/game/constants/skill-level'
import type { RealmStage } from '@/game/types'

export interface SkillProficiencyGainInput {
  /** 玩家当前境界 */
  playerRealm: RealmStage
  /** 怪物境界 */
  monsterRealm: RealmStage
  /** 怪物种类 */
  monsterKind: MonsterKind
  /** 怪物品阶 */
  monsterTier: MonsterTier
}

/**
 * 计算境界差熟练度倍率
 *
 * 规则（见 SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF）：
 * - 怪物低于玩家：倍率降低，但仍可获熟练度（最终由 MIN_GAIN 保底为 1）
 * - 同境：1.0；怪物更高：倍率递增，上限 2.5
 */
export function calcSkillProficiencyRealmMultiplier(
  playerRealm: RealmStage,
  monsterRealm: RealmStage,
): number {
  return getSkillProficiencyRealmMultiplierByDiff(
    getRealmDiff(playerRealm, monsterRealm),
  )
}

/**
 * 计算单次施展技能可获得的熟练度（至少 MIN_GAIN）
 */
export function calcSkillProficiencyGain(input: SkillProficiencyGainInput): number {
  const multiplier = calcSkillProficiencyRealmMultiplier(
    input.playerRealm,
    input.monsterRealm,
  )
  const rewardMultiplier = getMonsterBattleRewardMultiplier(
    input.monsterKind,
    input.monsterTier,
  )
  const raw = SKILL_PROFICIENCY_BASE_GAIN * multiplier * rewardMultiplier
  return Math.max(SKILL_PROFICIENCY_MIN_GAIN, Math.floor(raw))
}

/**
 * 以技能击杀怪物时的额外熟练度（在施展增量之外再结算）
 */
export function calcSkillKillProficiencyBonus(input: SkillProficiencyGainInput): number {
  const baseGain = calcSkillProficiencyGain(input)
  const bonus = Math.floor(baseGain * SKILL_KILL_PROFICIENCY_BONUS_RATIO)
  return Math.max(SKILL_PROFICIENCY_MIN_GAIN, bonus)
}

/** 熟练度等级晋升结果 */
export interface SkillProficiencyLevelUpResult {
  skillId: string
  skillName: string
  previousLevel: SkillLevel
  newLevel: SkillLevel
  proficiency: number
  message: string
}
