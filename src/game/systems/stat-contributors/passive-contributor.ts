import { getSkillMasteryPassiveContribution, isSkillMasteryPassiveUnlocked } from '@/game/constants/skill-mastery-passive'
import { getScaledSkillParams } from '@/game/constants/skill-params'
import type { Gongfa } from '@/game/models/gongfa'
import {
  getSkillProficiency,
  getSkillsByGongfaId,
  getUnlockedSkills,
  isPermanentPassiveSkill,
  type Skill,
} from '@/game/models/skill'
import {
  createEmptyCombatContribution,
  mergeCombatContributions,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import type { StatContributor, StatContributorContext } from '@/game/systems/stat-contributors/types'

export const PASSIVE_STAT_CONTRIBUTOR_ID = 'passive'

/**
 * 获取功法在指定等级已领悟的永久被动技能
 */
export function getUnlockedPassiveSkills(gongfa: Gongfa): Skill[] {
  return getSkillsByGongfaId(gongfa.id).filter(
    (skill) => isPermanentPassiveSkill(skill) && gongfa.level >= skill.minLevel,
  )
}

/**
 * 从单条被动技能 params 提取面板加成（按熟练度缩放）
 */
export function extractPassiveSkillContribution(
  skill: Skill,
  proficiency: number,
): CombatStatContribution {
  const contribution = createEmptyCombatContribution()
  const params = getScaledSkillParams(skill.params, proficiency)

  if (typeof params.crit_rate_bonus === 'number') {
    contribution.critRate += params.crit_rate_bonus
  }
  if (typeof params.crit_damage_bonus === 'number') {
    contribution.critDamage += params.crit_damage_bonus
  }
  if (typeof params.penetration_bonus === 'number') {
    contribution.penetration += params.penetration_bonus
  }
  if (typeof params.speed_bonus === 'number') {
    contribution.speed += params.speed_bonus
  }
  if (typeof params.tenacity_bonus === 'number') {
    contribution.tenacity += params.tenacity_bonus
  }
  if (typeof params.defense_bonus_percent === 'number') {
    contribution.defensePercent += params.defense_bonus_percent
  }
  if (typeof params.max_hp_bonus_percent === 'number') {
    contribution.maxHpPercent += params.max_hp_bonus_percent
  }
  if (typeof params.all_stat_bonus === 'number') {
    contribution.attackPercent += params.all_stat_bonus
    contribution.defensePercent += params.all_stat_bonus
    contribution.maxHpPercent += params.all_stat_bonus
    contribution.speedPercent += params.all_stat_bonus
  }
  if (typeof params.global_defense_ignore === 'number') {
    contribution.penetration += params.global_defense_ignore * 100
  }
  if (typeof params.damage_reduction === 'number') {
    contribution.damageReduction += params.damage_reduction
  }
  if (typeof params.physical_damage_reduction === 'number') {
    contribution.damageReduction += params.physical_damage_reduction
  }

  return contribution
}

/**
 * 汇总全部功法中已达圆满技能的永久被动加成
 */
export function aggregateSkillMasteryPassiveContributions(
  gongfaList: Gongfa[],
): CombatStatContribution {
  const items: CombatStatContribution[] = []

  for (const gongfa of gongfaList) {
    for (const skill of getUnlockedSkills(gongfa.id, gongfa.level)) {
      const proficiency = getSkillProficiency(gongfa.skillProficiency, skill.id)
      if (!isSkillMasteryPassiveUnlocked(proficiency, gongfa.quality)) continue
      items.push(getSkillMasteryPassiveContribution(skill.category, skill.type, gongfa.quality))
    }
  }

  return mergeCombatContributions(...items)
}

/**
 * 汇总全部功法已领悟永久被动对面板的加成（含圆满技能额外被动）
 */
export function aggregatePermanentPassiveContributions(
  gongfaList: Gongfa[],
): CombatStatContribution {
  const items: CombatStatContribution[] = []

  for (const gongfa of gongfaList) {
    for (const skill of getUnlockedPassiveSkills(gongfa)) {
      const proficiency = getSkillProficiency(gongfa.skillProficiency, skill.id)
      items.push(extractPassiveSkillContribution(skill, proficiency))
    }
  }

  items.push(aggregateSkillMasteryPassiveContributions(gongfaList))
  return mergeCombatContributions(...items)
}

/** 永久被动贡献者（全功法已领悟被动，换主修不消失） */
export const passiveStatContributor: StatContributor = {
  id: PASSIVE_STAT_CONTRIBUTOR_ID,

  isActive(context: StatContributorContext): boolean {
    return context.loadout.gongfaList.length > 0
  },

  getCombatContribution(context: StatContributorContext): CombatStatContribution {
    return aggregatePermanentPassiveContributions(context.loadout.gongfaList)
  },
}
