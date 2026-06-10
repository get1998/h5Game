/**
 * 计算最终伤害（文档 8.1 简化版）
 * 最终伤害 = 攻击力 × 技能倍率 × (暴击？暴击伤害 : 1) × 随机波动(0.9~1.1) - 目标防御 × (1 - 穿透/100)
 */
export interface DamageInput {
  attack: number
  skillMultiplier?: number
  isCrit?: boolean
  critDamage?: number
  targetDefense: number
  penetration?: number
  /** 五行克制倍率（默认 1） */
  elementMultiplier?: number
  randomFactor?: number
  /** 受击减伤（小数） */
  damageReduction?: number
}

export function calcFinalDamage(input: DamageInput): number {
  const {
    attack,
    skillMultiplier = 1,
    isCrit = false,
    critDamage = 1.5,
    targetDefense,
    penetration = 0,
    elementMultiplier = 1,
    randomFactor = 0.9 + Math.random() * 0.2,
    damageReduction = 0,
  } = input

  const critMultiplier = isCrit ? critDamage : 1
  const effectiveDefense = targetDefense * (1 - penetration / 100)
  const raw = attack * skillMultiplier * critMultiplier * elementMultiplier * randomFactor
  const afterDefense = Math.max(1, Math.floor(raw - effectiveDefense))
  const reduction = Math.min(0.9, Math.max(0, damageReduction))
  return Math.max(1, Math.floor(afterDefense * (1 - reduction)))
}

/**
 * 判定是否暴击
 */
export function rollCrit(critRate: number): boolean {
  return Math.random() < critRate
}

/**
 * 判定是否命中（文档 8.3 简化）
 * 最终命中率 = 基础命中率 + (己方速度 - 敌方速度) × 0.1%，限制在 20%~100%
 */
export function calcHitRate(
  baseHitRate: number,
  attackerSpeed: number,
  defenderSpeed: number,
): number {
  const rate = baseHitRate + (attackerSpeed - defenderSpeed) * 0.001
  return Math.min(1, Math.max(0.2, rate))
}

export function rollHit(hitRate: number): boolean {
  return Math.random() < hitRate
}
