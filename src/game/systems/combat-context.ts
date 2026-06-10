import { buildEffectiveCombatStats } from '@/game/systems/stat-contributors'
import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import type { Gongfa } from '@/game/models/gongfa'
import type { Monster } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import type { BattleSkillState } from '@/game/systems/skill-combat'

/** 单场战斗上下文（后续可扩展法宝状态、Buff 列表等） */
export interface BattleContext {
  player: Player
  monster: Monster
  gongfa: Gongfa
  /** 战前聚合的有效战斗属性 */
  snapshot: CombatSnapshot
  /** 功法技能运行时状态 */
  skillState: BattleSkillState
}

/**
 * 构建单场战斗上下文
 */
export function createBattleContext(
  player: Player,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
  gongfaList: Gongfa[] = [],
): BattleContext {
  const { snapshot } = buildEffectiveCombatStats(player, {
    activeGongfa: gongfa,
    gongfaList,
  })

  return {
    player,
    monster,
    gongfa,
    snapshot,
    skillState,
  }
}
