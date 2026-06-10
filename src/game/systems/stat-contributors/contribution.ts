import type { CombatStats } from '@/game/models/player'

/** 战斗属性加成贡献（flat 加算 + percent 乘算） */
export interface CombatStatContribution {
  attack: number
  defense: number
  maxHp: number
  maxMp: number
  speed: number
  critRate: number
  critDamage: number
  penetration: number
  tenacity: number
  attackPercent: number
  defensePercent: number
  maxHpPercent: number
  maxMpPercent: number
  speedPercent: number
  /** 受击减伤（小数，如 0.03 表示 3%） */
  damageReduction: number
}

/** 属性加成拆分（境界底 + 各贡献者） */
export interface CombatStatBreakdown {
  /** 境界基础面板（不含加成，hp/mp 为当前值） */
  realm: CombatStats
  /** 主修功法贡献（仅装备生效） */
  gongfa: CombatStatContribution
  /** 永久被动贡献（全功法已领悟被动） */
  passive: CombatStatContribution
  /** 各贡献者明细，key 为 contributor.id，便于扩展法器/宠物 */
  byContributor: Record<string, CombatStatContribution>
}

/** 创建空贡献 */
export function createEmptyCombatContribution(): CombatStatContribution {
  return {
    attack: 0,
    defense: 0,
    maxHp: 0,
    maxMp: 0,
    speed: 0,
    critRate: 0,
    critDamage: 0,
    penetration: 0,
    tenacity: 0,
    attackPercent: 0,
    defensePercent: 0,
    maxHpPercent: 0,
    maxMpPercent: 0,
    speedPercent: 0,
    damageReduction: 0,
  }
}

/**
 * 合并多项属性贡献
 */
export function mergeCombatContributions(
  ...items: CombatStatContribution[]
): CombatStatContribution {
  const result = createEmptyCombatContribution()
  for (const item of items) {
    result.attack += item.attack
    result.defense += item.defense
    result.maxHp += item.maxHp
    result.maxMp += item.maxMp
    result.speed += item.speed
    result.critRate += item.critRate
    result.critDamage += item.critDamage
    result.penetration += item.penetration
    result.tenacity += item.tenacity
    result.attackPercent += item.attackPercent
    result.defensePercent += item.defensePercent
    result.maxHpPercent += item.maxHpPercent
    result.maxMpPercent += item.maxMpPercent
    result.speedPercent += item.speedPercent
    result.damageReduction += item.damageReduction
  }
  return result
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

/**
 * 将境界基础与贡献合成为有效战斗属性
 */
export function applyCombatContributions(
  base: CombatStats,
  contribution: CombatStatContribution,
): CombatStats {
  let attack = base.attack + contribution.attack
  let defense = base.defense + contribution.defense
  let maxHp = base.maxHp + contribution.maxHp
  let maxMp = base.maxMp + contribution.maxMp
  let speed = base.speed + contribution.speed

  attack = Math.max(1, Math.floor(attack * (1 + contribution.attackPercent)))
  defense = Math.max(0, Math.floor(defense * (1 + contribution.defensePercent)))
  maxHp = Math.max(1, Math.floor(maxHp * (1 + contribution.maxHpPercent)))
  maxMp = Math.max(0, Math.floor(maxMp * (1 + contribution.maxMpPercent)))
  speed = Math.max(1, Math.floor(speed * (1 + contribution.speedPercent)))

  return {
    hp: Math.min(base.hp, maxHp),
    maxHp,
    mp: Math.min(base.mp, maxMp),
    maxMp,
    attack,
    defense,
    speed,
    critRate: clampRate(base.critRate + contribution.critRate),
    critDamage: Math.max(1, Number((base.critDamage + contribution.critDamage).toFixed(2))),
    hitRate: base.hitRate,
    dodgeRate: base.dodgeRate,
    penetration: Math.max(0, Math.floor(base.penetration + contribution.penetration)),
  }
}
