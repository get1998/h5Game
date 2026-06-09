import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import type { Player } from '@/game/models/player'
import type { ElementType } from '@/game/types'

/**
 * 战前聚合战斗快照（境界 + 功法 + 后续法宝/Buff 的统一入口）
 * 遇怪或回合开始前构建，回合内只读
 */
export interface CombatSnapshot {
  /** 有效攻击力 */
  attack: number
  /** 有效防御力 */
  defense: number
  /** 出手速度 */
  speed: number
  /** 暴击率 */
  critRate: number
  /** 暴击伤害倍率 */
  critDamage: number
  /** 命中率 */
  hitRate: number
  /** 穿透 */
  penetration: number
  /** 受击时的防御五行（灵根主属性 → 功法主五行） */
  defenseElement: ElementType
  /** 默认攻击五行（普攻 / 技能 fallback） */
  primaryAttackElement: ElementType
}

/**
 * 根据玩家与当前主修功法构建战斗快照
 * @param player 玩家实体
 * @param gongfa 当前装备功法
 */
export function buildCombatSnapshot(player: Player, gongfa: Gongfa): CombatSnapshot {
  const { combat } = player
  const primaryAttackElement = getGongfaPrimaryElement(gongfa)

  return {
    attack: combat.attack + gongfa.attackBonus,
    defense: combat.defense + gongfa.defenseBonus,
    speed: combat.speed,
    critRate: combat.critRate,
    critDamage: combat.critDamage,
    hitRate: combat.hitRate,
    penetration: combat.penetration,
    defenseElement: player.spiritRootElements[0] ?? primaryAttackElement,
    primaryAttackElement,
  }
}
