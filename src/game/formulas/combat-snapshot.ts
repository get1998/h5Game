import type { ElementType } from '@/game/types'

/**
 * 战前聚合战斗快照（境界 + 主修功法 + 永久被动 + 后续法宝/Buff）
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
  /** 韧性，降低被暴击概率 */
  tenacity: number
  /** 受击减伤（小数） */
  damageReduction: number
  /** 受击时的防御五行（灵根主属性 → 功法主五行） */
  defenseElement: ElementType
  /** 默认攻击五行（技能无显式属性时的 fallback，普攻不参与五行克制） */
  primaryAttackElement: ElementType
}
