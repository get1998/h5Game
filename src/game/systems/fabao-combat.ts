import { getFabaoTemplate } from '@/game/constants/fabao'
import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import { getMonsterCombatElement, type Monster } from '@/game/models/monster'
import {
  getEquippedAttackFabao,
  getEquippedDefenseFabao,
  isFabaoSkillReady,
  type Fabao,
  type FabaoState,
} from '@/game/models/fabao'
import { appendElementHint, resolveAttack } from '@/game/systems/combat-resolve'
import {
  createEmptyCombatContribution,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'

/** 法器技能攻击结算结果 */
export interface FabaoSkillAttackResult {
  /** 是否成功释放 */
  executed: boolean
  /** 造成伤害 */
  damage: number
  /** 是否暴击 */
  isCrit: boolean
  /** 技能名称 */
  skillName: string
  /** 消耗灵力 */
  consumed: number
  /** 灵力是否耗尽 */
  depleted: boolean
  /** 五行克制提示 */
  elementHint: string | null
  /** 更新后的法器状态 */
  state: FabaoState
}

/**
 * 计算装备法器的被动属性贡献（装备即生效，不依赖灵力）
 */
export function getFabaoCombatContribution(fabaoState: FabaoState): CombatStatContribution {
  const base = createEmptyCombatContribution()
  const attackFabao = getEquippedAttackFabao(fabaoState)
  const defenseFabao = getEquippedDefenseFabao(fabaoState)

  if (attackFabao) {
    const template = getFabaoTemplate(attackFabao.templateId)
    if (template?.attack) {
      base.attack += template.attack
    }
  }

  if (defenseFabao) {
    const template = getFabaoTemplate(defenseFabao.templateId)
    if (template?.defense) {
      base.defense += template.defense
    }
  }

  return base
}

/**
 * 判断法器是否可释放技能攻击
 */
export function canCastFabaoSkill(fabao: Fabao | undefined): boolean {
  if (!fabao) return false
  const template = getFabaoTemplate(fabao.templateId)
  const cost = template?.skillAttack?.lingqiCost ?? 0
  return isFabaoSkillReady(fabao, cost)
}

/**
 * 消耗法器灵力（技能攻击释放后）
 */
export function consumeFabaoSkillLingqi(
  fabaoState: FabaoState,
  fabaoId: string,
  cost: number,
): { state: FabaoState; consumed: number; depleted: boolean } {
  if (cost <= 0) {
    return { state: fabaoState, consumed: 0, depleted: false }
  }

  const fabao = fabaoState.owned.find((item) => item.id === fabaoId)
  if (!isFabaoSkillReady(fabao, cost)) {
    return { state: fabaoState, consumed: 0, depleted: false }
  }

  const newLingqi = Math.max(0, fabao!.lingqi - cost)
  const depleted = newLingqi <= 0 && fabao!.lingqi > 0

  const updatedOwned = fabaoState.owned.map((item) =>
    item.id === fabaoId ? { ...item, lingqi: newLingqi } : item,
  )

  return {
    state: { ...fabaoState, owned: updatedOwned },
    consumed: cost,
    depleted,
  }
}

function buildFabaoAttacker(snapshot: CombatSnapshot) {
  return {
    attack: snapshot.attack,
    critRate: snapshot.critRate,
    critDamage: snapshot.critDamage,
    penetration: snapshot.penetration,
    hitRate: snapshot.hitRate,
    speed: snapshot.speed,
  }
}

/**
 * 释放攻击法器技能攻击（玩家回合追加伤害）
 */
export function executeAttackFabaoSkill(
  fabaoState: FabaoState,
  snapshot: CombatSnapshot,
  monster: Monster,
): FabaoSkillAttackResult {
  const empty: FabaoSkillAttackResult = {
    executed: false,
    damage: 0,
    isCrit: false,
    skillName: '',
    consumed: 0,
    depleted: false,
    elementHint: null,
    state: fabaoState,
  }

  const attackFabao = getEquippedAttackFabao(fabaoState)
  if (!attackFabao) return empty

  const template = getFabaoTemplate(attackFabao.templateId)
  const skillAttack = template?.skillAttack
  if (!skillAttack || !canCastFabaoSkill(attackFabao)) return empty

  const monsterElement = getMonsterCombatElement(monster)
  const attackResult = resolveAttack({
    source: 'fabao_active',
    attacker: buildFabaoAttacker(snapshot),
    defender: {
      defense: monster.combat.defense,
      speed: monster.combat.speed,
      element: monsterElement,
    },
    attackElement: skillAttack.element ?? snapshot.primaryAttackElement,
    skillMultiplier: skillAttack.damageMultiplier,
  })

  const consume = consumeFabaoSkillLingqi(
    fabaoState,
    attackFabao.id,
    skillAttack.lingqiCost,
  )

  return {
    executed: attackResult.hit,
    damage: attackResult.damage,
    isCrit: attackResult.isCrit,
    skillName: skillAttack.name,
    consumed: consume.consumed,
    depleted: consume.depleted,
    elementHint: attackResult.elementHint,
    state: consume.state,
  }
}

/**
 * 释放防御法器技能攻击（受击后反击）
 */
export function executeDefenseFabaoSkill(
  fabaoState: FabaoState,
  snapshot: CombatSnapshot,
  monster: Monster,
): FabaoSkillAttackResult {
  const empty: FabaoSkillAttackResult = {
    executed: false,
    damage: 0,
    isCrit: false,
    skillName: '',
    consumed: 0,
    depleted: false,
    elementHint: null,
    state: fabaoState,
  }

  const defenseFabao = getEquippedDefenseFabao(fabaoState)
  if (!defenseFabao) return empty

  const template = getFabaoTemplate(defenseFabao.templateId)
  const skillAttack = template?.skillAttack
  if (!skillAttack || !canCastFabaoSkill(defenseFabao)) return empty

  const monsterElement = getMonsterCombatElement(monster)
  const attackResult = resolveAttack({
    source: 'fabao_active',
    attacker: buildFabaoAttacker(snapshot),
    defender: {
      defense: monster.combat.defense,
      speed: monster.combat.speed,
      element: monsterElement,
    },
    attackElement: skillAttack.element ?? snapshot.primaryAttackElement,
    skillMultiplier: skillAttack.damageMultiplier,
  })

  const consume = consumeFabaoSkillLingqi(
    fabaoState,
    defenseFabao.id,
    skillAttack.lingqiCost,
  )

  return {
    executed: attackResult.hit,
    damage: attackResult.damage,
    isCrit: attackResult.isCrit,
    skillName: skillAttack.name,
    consumed: consume.consumed,
    depleted: consume.depleted,
    elementHint: attackResult.elementHint,
    state: consume.state,
  }
}

/**
 * 格式化法器技能攻击日志
 */
export function formatFabaoSkillAttackLog(
  fabaoName: string,
  result: FabaoSkillAttackResult,
  elementHint: string | null = null,
): string {
  if (!result.executed) {
    return `攻击法器「${fabaoName}」施放「${result.skillName}」，但未命中。`
  }
  const critText = result.isCrit ? '暴击！' : ''
  const base = `攻击法器「${fabaoName}」施放「${result.skillName}」，造成 ${result.damage} 点伤害${critText ? `（${critText}）` : ''}。`
  return appendElementHint(base, elementHint)
}

/**
 * 格式化防御法器技能反击日志
 */
export function formatDefenseFabaoSkillLog(
  fabaoName: string,
  result: FabaoSkillAttackResult,
): string {
  if (!result.executed) {
    return `防御法器「${fabaoName}」发动「${result.skillName}」，但未命中。`
  }
  const critText = result.isCrit ? '（暴击）' : ''
  return `防御法器「${fabaoName}」发动「${result.skillName}」，反击 ${result.damage} 点伤害${critText}。`
}

/**
 * 更新法器实例灵力
 */
export function updateFabaoLingqi(
  fabaoState: FabaoState,
  fabaoId: string,
  lingqi: number,
): FabaoState {
  const owned = fabaoState.owned.map((item) => {
    if (item.id !== fabaoId) return item
    return { ...item, lingqi: Math.max(0, Math.min(lingqi, item.maxLingqi)) }
  })
  return { ...fabaoState, owned }
}

/**
 * 获取法器展示信息
 */
export function buildFabaoDisplayItem(fabao: Fabao) {
  const template = getFabaoTemplate(fabao.templateId)
  const lingqiPercent = fabao.maxLingqi > 0
    ? Math.floor((fabao.lingqi / fabao.maxLingqi) * 100)
    : 0
  const skillCost = template?.skillAttack?.lingqiCost ?? 0
  const canCastSkill = isFabaoSkillReady(fabao, skillCost)

  return {
    id: fabao.id,
    name: template?.name ?? '未知法器',
    tier: template?.tier ?? '下品',
    type: template?.type ?? '攻击',
    lingqi: Math.floor(fabao.lingqi),
    maxLingqi: fabao.maxLingqi,
    lingqiPercent,
    /** 是否可释放技能攻击 */
    canCastSkill,
    /** @deprecated 使用 canCastSkill */
    isActive: canCastSkill,
    attack: template?.attack ?? 0,
    defense: template?.defense ?? 0,
    skillName: template?.skillAttack?.name ?? '',
    skillLingqiCost: skillCost,
    templateId: fabao.templateId,
  }
}
