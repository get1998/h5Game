import { getTitleDefinition } from '@/game/constants/titles'
import {
  createEmptyCombatContribution,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import type { StatContributor } from '@/game/systems/stat-contributors/types'

export const TITLE_STAT_CONTRIBUTOR_ID = 'title'

/**
 * 将称号加成转为战斗属性贡献
 */
export function getTitleCombatContribution(
  titleId: string | null | undefined,
): CombatStatContribution {
  if (!titleId) return createEmptyCombatContribution()

  const definition = getTitleDefinition(titleId)
  if (!definition?.combatBonus) return createEmptyCombatContribution()

  const base = createEmptyCombatContribution()
  const bonus = definition.combatBonus

  return {
    ...base,
    attack: bonus.attack ?? 0,
    defense: bonus.defense ?? 0,
    maxHp: bonus.maxHp ?? 0,
    maxMp: bonus.maxMp ?? 0,
    speed: bonus.speed ?? 0,
    critRate: bonus.critRate ?? 0,
    critDamage: bonus.critDamage ?? 0,
    penetration: bonus.penetration ?? 0,
    tenacity: bonus.tenacity ?? 0,
    attackPercent: bonus.attackPercent ?? 0,
    defensePercent: bonus.defensePercent ?? 0,
    maxHpPercent: bonus.maxHpPercent ?? 0,
    maxMpPercent: bonus.maxMpPercent ?? 0,
    speedPercent: bonus.speedPercent ?? 0,
    damageReduction: bonus.damageReduction ?? 0,
  }
}

/** 称号属性贡献者（佩戴称号时生效） */
export const titleStatContributor: StatContributor = {
  id: TITLE_STAT_CONTRIBUTOR_ID,
  isActive(context) {
    return Boolean(context.loadout.equippedTitleId)
  },
  getCombatContribution(context) {
    return getTitleCombatContribution(context.loadout.equippedTitleId)
  },
}
