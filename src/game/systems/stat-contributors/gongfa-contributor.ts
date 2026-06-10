import {
  createEmptyCombatContribution,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import type { Gongfa } from '@/game/models/gongfa'
import type { StatContributor, StatContributorContext } from '@/game/systems/stat-contributors/types'

export const GONGFA_STAT_CONTRIBUTOR_ID = 'gongfa'

/**
 * 从主修功法实例读取战斗贡献
 */
export function getGongfaCombatContribution(gongfa: Gongfa): CombatStatContribution {
  return {
    ...createEmptyCombatContribution(),
    attack: gongfa.attackBonus,
    defense: gongfa.defenseBonus,
    maxHp: gongfa.hpBonus,
    maxMp: gongfa.mpBonus,
    speed: gongfa.speedBonus,
    critRate: gongfa.critRateBonus,
    critDamage: gongfa.critDamageBonus,
    penetration: gongfa.penetrationBonus,
    tenacity: gongfa.tenacityBonus,
  }
}

/** 主修功法贡献者（仅装备时生效） */
export const gongfaStatContributor: StatContributor = {
  id: GONGFA_STAT_CONTRIBUTOR_ID,

  isActive(context: StatContributorContext): boolean {
    return Boolean(context.loadout.activeGongfa)
  },

  getCombatContribution(context: StatContributorContext): CombatStatContribution {
    const gongfa = context.loadout.activeGongfa
    if (!gongfa) return createEmptyCombatContribution()
    return getGongfaCombatContribution(gongfa)
  },
}
