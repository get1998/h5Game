import { getRealmDiff } from '@/game/constants/realm'
import {
  SKILL_PROFICIENCY_BASE_GAIN,
  type SkillLevel,
} from '@/game/models/skill'
import type { RealmStage } from '@/game/types'

export interface SkillProficiencyGainInput {
  /** 玩家当前境界 */
  playerRealm: RealmStage
  /** 怪物境界 */
  monsterRealm: RealmStage
}

/**
 * 计算境界差熟练度倍率
 *
 * 规则：
 * - 怪物境界低于玩家（diff < 0）：倍率为 0，无法获得熟练度
 * - 同境（diff = 0）：1.0
 * - 每高 1 个小境界：+0.35，上限 2.5（约等于高 5 境封顶）
 *
 * 示例（玩家筑基前期）：
 * - 炼气十五层怪：0（无法获取）
 * - 筑基前期怪：1.0
 * - 筑基中期怪：1.35
 * - 金丹前期怪：约 2.15
 */
export function calcSkillProficiencyRealmMultiplier(
  playerRealm: RealmStage,
  monsterRealm: RealmStage,
): number {
  const diff = getRealmDiff(playerRealm, monsterRealm)
  if (diff < 0) return 0
  return Math.min(2.5, 1 + diff * 0.35)
}

/**
 * 计算单次施展技能可获得的熟练度
 * @returns 0 表示当前怪物无法提供熟练度
 */
export function calcSkillProficiencyGain(input: SkillProficiencyGainInput): number {
  const multiplier = calcSkillProficiencyRealmMultiplier(
    input.playerRealm,
    input.monsterRealm,
  )
  if (multiplier <= 0) return 0

  const raw = SKILL_PROFICIENCY_BASE_GAIN * multiplier
  const floored = Math.floor(raw)
  if (floored > 0) return floored
  return raw > 0 ? 1 : 0
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
