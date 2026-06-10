import {
  createEmptyCombatContribution,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import { toReincarnationCombatContribution } from '@/game/models/reincarnation'
import type {
  StatContributor,
  StatContributorContext,
} from '@/game/systems/stat-contributors/types'

export const REINCARNATION_STAT_CONTRIBUTOR_ID = 'reincarnation'

/**
 * 轮回累积战斗属性贡献者（多世 10% 基础属性加成）
 */
export const reincarnationStatContributor: StatContributor = {
  id: REINCARNATION_STAT_CONTRIBUTOR_ID,

  isActive(context: StatContributorContext): boolean {
    return Boolean(context.reincarnationCombat && (
      context.reincarnationCombat.maxHp > 0
      || context.reincarnationCombat.attack > 0
      || context.reincarnationCombat.defense > 0
    ))
  },

  getCombatContribution(context: StatContributorContext): CombatStatContribution {
    if (!context.reincarnationCombat) {
      return createEmptyCombatContribution()
    }
    return toReincarnationCombatContribution(context.reincarnationCombat)
  },
}
