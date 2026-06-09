import skillsData from '@/game/models/skills.json'

/** 技能释放类型（主动 / 被动 / 绝技） */
export type SkillType = 'active' | 'passive' | 'ultimate'

/**
 * 技能效果分类
 * - attack：攻击技能
 * - defense：防御技能
 * - heal：回复技能
 * - buff：增益 / 状态技能
 * - passive：被动（不参与主动释放选择）
 */
export type SkillCategory = 'attack' | 'defense' | 'heal' | 'buff' | 'passive'

/** 技能等级 */
export type SkillLevel = '小成' | '大成' | '圆满'

/** 技能等级对应的系数 */
export const SKILL_LEVEL_COEFFICIENT: Record<SkillLevel, number> = {
  小成: 1.2,
  大成: 1.5,
  圆满: 1.8,
}

/** 技能效果分类中文 */
export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  attack: '攻击',
  defense: '防御',
  heal: '回复',
  buff: '增益',
  passive: '被动',
}

/** 功法技能实体（配置表） */
export interface Skill {
  /** 技能唯一标识 */
  id: string
  /** 技能名称 */
  name: string
  /** 释放类型（主动 / 被动 / 绝技） */
  type: SkillType
  /** 效果分类 */
  category: SkillCategory
  /** 释放消耗灵力 */
  costMp: number
  /** 冷却回合数 */
  cooldown: number
  /** 效果描述文案 */
  description: string
  /** 效果参数（伤害倍率、持续回合等） */
  params: Record<string, unknown>
  /** 来源功法 id */
  sourceGongfaId: string
  /** 来源功法名称 */
  sourceGongfa: string
  /** 解锁所需功法等级 */
  minLevel: number
  /** 技能等级 */
  level: SkillLevel
}

/** 技能释放上下文（灵力、冷却） */
export interface SkillCastContext {
  playerMp: number
  skillCooldowns: Record<string, number>
}

/** skills.json 原始行结构（蛇形命名，映射前） */
interface SkillJsonRow {
  id: string
  name: string
  type: SkillType
  cost_mp: number
  cooldown: number
  /** 效果描述文案 */
  effect: string
  /** 可选显式分类，未填时自动推断 */
  category?: SkillCategory
  params: Record<string, unknown>
  source_gongfa_id: string
  source_gongfa: string
  min_level: number
  level?: SkillLevel
}

/**
 * 根据配置推断技能效果分类
 */
export function inferSkillCategory(row: SkillJsonRow): SkillCategory {
  if (row.category) {
    return row.category
  }
  if (row.type === 'passive') {
    return 'passive'
  }

  const params = row.params ?? {}
  const effectText = row.effect ?? ''

  if (typeof params.damage_percent === 'number') {
    return 'attack'
  }

  if (
    typeof params.hp_regen_percent === 'number'
    || typeof params.mp_regen_percent === 'number'
  ) {
    if (effectText.includes('恢复') || effectText.includes('回血') || effectText.includes('回灵')) {
      return 'heal'
    }
  }

  if (
    typeof params.defense_bonus_percent === 'number'
    || typeof params.damage_reduction_percent === 'number'
    || effectText.includes('防御')
    || effectText.includes('受到伤害')
    || effectText.includes('伤害-')
  ) {
    return 'defense'
  }

  return 'buff'
}

/**
 * 是否为可主动释放的技能（主动 / 绝技）
 */
export function isCastableSkill(skill: Skill): boolean {
  return skill.type === 'active' || skill.type === 'ultimate'
}

/**
 * 计算攻击技能伤害权重（用于自动选择最高伤害技能）
 * 多段攻击按段数 × 倍率估算总伤害
 */
export function getAttackDamageWeight(skill: Skill): number {
  const multiplier = typeof skill.params.damage_percent === 'number'
    ? skill.params.damage_percent
    : 0
  const hitCount = typeof skill.params.hit_count === 'number'
    ? skill.params.hit_count
    : typeof skill.params.skill_count === 'number'
      ? skill.params.skill_count
      : 1
  return multiplier * hitCount
}

/**
 * 判断技能当前是否可释放（灵力足够且不在冷却）
 */
export function canCastSkill(skill: Skill, context: SkillCastContext): boolean {
  if (!isCastableSkill(skill)) return false
  if (context.playerMp < skill.costMp) return false
  return (context.skillCooldowns[skill.id] ?? 0) <= 0
}

/**
 * 获取当前可释放的攻击技能，按伤害权重降序
 */
export function getCastableAttackSkills(
  skills: Skill[],
  context: SkillCastContext,
): Skill[] {
  return skills
    .filter((skill) => skill.category === 'attack' && canCastSkill(skill, context))
    .sort((a, b) => getAttackDamageWeight(b) - getAttackDamageWeight(a))
}

/**
 * 自动选择伤害最高的可释放攻击技能
 * 灵力不足或冷却中时顺延下一个符合条件的攻击技能
 */
export function selectBestAttackSkill(
  skills: Skill[],
  context: SkillCastContext,
): Skill | undefined {
  return getCastableAttackSkills(skills, context)[0]
}

function mapSkillRow(row: SkillJsonRow): Skill {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    category: inferSkillCategory(row),
    costMp: row.cost_mp,
    cooldown: row.cooldown,
    description: row.effect,
    params: row.params,
    sourceGongfaId: row.source_gongfa_id,
    sourceGongfa: row.source_gongfa,
    minLevel: row.min_level,
    level: row.level ?? '小成',
  }
}

/** 全部功法技能配置 */
export const SKILL_CATALOG: Skill[] = (skillsData.skills as unknown as SkillJsonRow[]).map(mapSkillRow)

const skillById = new Map(SKILL_CATALOG.map((skill) => [skill.id, skill]))
const skillsByGongfaId = new Map<string, Skill[]>()

for (const skill of SKILL_CATALOG) {
  const list = skillsByGongfaId.get(skill.sourceGongfaId) ?? []
  list.push(skill)
  skillsByGongfaId.set(skill.sourceGongfaId, list)
}

for (const [, list] of skillsByGongfaId) {
  list.sort((a, b) => a.minLevel - b.minLevel || a.id.localeCompare(b.id))
}

/**
 * 按 id 获取技能配置
 */
export function getSkillById(skillId: string): Skill | undefined {
  return skillById.get(skillId)
}

/**
 * 获取功法关联的全部技能（按解锁等级排序）
 */
export function getSkillsByGongfaId(gongfaId: string): Skill[] {
  return skillsByGongfaId.get(gongfaId) ?? []
}

/**
 * 获取功法在指定等级已解锁的技能
 */
export function getUnlockedSkills(gongfaId: string, gongfaLevel: number): Skill[] {
  return getSkillsByGongfaId(gongfaId).filter((skill) => skill.minLevel <= gongfaLevel)
}

/**
 * 按效果分类筛选已解锁技能
 */
export function getUnlockedSkillsByCategory(
  gongfaId: string,
  gongfaLevel: number,
  category: SkillCategory,
): Skill[] {
  return getUnlockedSkills(gongfaId, gongfaLevel).filter((skill) => skill.category === category)
}

/**
 * 获取功法下一档待解锁技能
 */
export function getNextSkillUnlock(gongfaId: string, gongfaLevel: number): Skill | undefined {
  return getSkillsByGongfaId(gongfaId).find((skill) => skill.minLevel > gongfaLevel)
}
