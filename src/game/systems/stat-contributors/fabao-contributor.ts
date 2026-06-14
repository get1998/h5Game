import { getFabaoCombatContribution } from '@/game/systems/fabao-combat'
import type { StatContributor } from '@/game/systems/stat-contributors/types'

export const FABAO_STAT_CONTRIBUTOR_ID = 'fabao'

/** 法器被动属性贡献者（装备即生效，不消耗灵力） */
export const fabaoStatContributor: StatContributor = {
  id: FABAO_STAT_CONTRIBUTOR_ID,
  isActive(context) {
    const fabaoState = context.loadout.fabaoState
    if (!fabaoState) return false
    return Boolean(
      fabaoState.equippedAttackFabaoId || fabaoState.equippedDefenseFabaoId,
    )
  },
  getCombatContribution(context) {
    if (!context.loadout.fabaoState) {
      return getFabaoCombatContribution({
        owned: [],
        unlockedTemplateIds: [],
        equippedAttackFabaoId: null,
        equippedDefenseFabaoId: null,
      })
    }
    return getFabaoCombatContribution(context.loadout.fabaoState)
  },
}
