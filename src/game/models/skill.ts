import skillsData from '@/game/models/skills.json'
import {
  isElementType,
  pickCounterElementAgainst,
  pickRandomCounterElement,
} from '@/game/constants/elements'
import {
  getNextSkillLevelThreshold,
  getSkillLevelCoefficient,
  getSkillLevelFromProficiency,
  getSkillProficiencyCoefficient,
  SKILL_PROFICIENCY_THRESHOLDS,
  type SkillLevel,
} from '@/game/constants/skill-level'
import {
  getSkillLevelScalableParamKeys,
  getScaledSkillParams,
  getSkillParamRule,
  resolveSkillEffectDescription,
  type SkillParams,
  validateSkillCatalog,
} from '@/game/constants/skill-params'
import type { ElementType } from '@/game/types'

export type { SkillLevel } from '@/game/constants/skill-level'
export {
  getNextSkillLevelThreshold,
  getSkillLevelCoefficient,
  getSkillLevelFromProficiency,
  getSkillProficiencyCoefficient,
  SKILL_LEVEL_COEFFICIENT,
  SKILL_LEVEL_ORDER,
  SKILL_PROFICIENCY_BASE_GAIN,
  SKILL_PROFICIENCY_THRESHOLDS,
} from '@/game/constants/skill-level'
export {
  formatSkillParamDisplayFragment,
  formatSkillParamDisplayValue,
  formatSkillPercentText,
  getScaledSkillParams,
  getSkillLevelScalableParamKeys,
  getSkillParamRule,
  isSkillLevelScalableParam,
  resolveSkillEffectDescription,
  scaleSkillParamValue,
  SKILL_PARAM_RULES,
  validateSkillCatalog,
  validateSkillParams,
  type KnownSkillParamKey,
  type SkillConfigIssue,
  type SkillParamRule,
  type SkillParams,
} from '@/game/constants/skill-params'

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

/** 功法内各技能熟练度，key 为技能 id */
export type SkillProficiencyMap = Record<string, number>

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
  /** 效果描述文案（配置表基础文案，展示时用 formatSkillDescription） */
  description: string
  /** 效果参数（见 constants/skill-params.ts 填表规则） */
  params: SkillParams
  /** 来源功法 id */
  sourceGongfaId: string
  /** 来源功法名称 */
  sourceGongfa: string
  /** 解锁所需功法等级 */
  minLevel: number
}

/** 技能释放上下文（灵力、冷却、熟练度） */
export interface SkillCastContext {
  playerMp: number
  skillCooldowns: Record<string, number>
  /** 功法技能熟练度，用于按等级加权选技 */
  skillProficiency?: SkillProficiencyMap
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
  /** 可选显式分类，未填时按 params 规则自动推断 */
  category?: SkillCategory
  params: SkillParams
  source_gongfa_id: string
  source_gongfa: string
  min_level: number
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

  for (const [key, value] of Object.entries(params)) {
    const rule = getSkillParamRule(key)
    if (rule?.categoryHint && value !== undefined && value !== null) {
      return rule.categoryHint
    }
  }

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
    || typeof params.damage_reduction === 'number'
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
 * 读取技能配置中的基础伤害倍率（不含等级加成）
 */
export function getSkillBaseDamageMultiplier(skill: Skill): number {
  const percent = skill.params.damage_percent
  return typeof percent === 'number' ? percent : 1
}

/**
 * 读取技能攻击段数（多段攻击）
 */
export function getSkillHitCount(skill: Skill): number {
  const params = skill.params
  if (typeof params.hit_count === 'number' && params.hit_count > 0) {
    return Math.floor(params.hit_count)
  }
  if (typeof params.skill_count === 'number' && params.skill_count > 0) {
    return Math.floor(params.skill_count)
  }
  return 1
}

/**
 * 计算技能实际伤害倍率（基础倍率 × 等级系数）
 */
export function getSkillDamageMultiplier(
  skill: Skill,
  proficiencyOrLevel: number | SkillLevel = 0,
): number {
  const scaled = getScaledSkillParams(skill.params, proficiencyOrLevel)
  const percent = scaled.damage_percent
  return typeof percent === 'number' ? percent : getSkillBaseDamageMultiplier(skill)
}

/**
 * 计算攻击技能伤害权重（用于自动选择最高伤害技能）
 */
export function getAttackDamageWeight(skill: Skill, proficiency = 0): number {
  if (skill.category !== 'attack') return 0
  return getSkillDamageMultiplier(skill, proficiency) * getSkillHitCount(skill)
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
    .sort((a, b) => {
      const profA = getSkillProficiency(context.skillProficiency, a.id)
      const profB = getSkillProficiency(context.skillProficiency, b.id)
      return getAttackDamageWeight(b, profB) - getAttackDamageWeight(a, profA)
    })
}

/**
 * 自动选择伤害最高的可释放攻击技能
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
    params: row.params ?? {},
    sourceGongfaId: row.source_gongfa_id,
    sourceGongfa: row.source_gongfa,
    minLevel: row.min_level,
  }
}

/** 全部功法技能配置 */
export const SKILL_CATALOG: Skill[] = (skillsData.skills as unknown as SkillJsonRow[]).map(mapSkillRow)

if (import.meta.env.DEV) {
  const issues = validateSkillCatalog(SKILL_CATALOG)
  for (const issue of issues) {
    console.warn(`[skill-config] ${issue.skillId}: ${issue.message}`)
  }
}

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

/**
 * 根据技能等级生成动态效果描述
 */
export function formatSkillDescription(
  skill: Skill,
  proficiencyOrLevel: number | SkillLevel = 0,
): string {
  return resolveSkillEffectDescription(
    skill.description,
    skill.params,
    proficiencyOrLevel,
  )
}

/**
 * 读取功法中某技能的熟练度（缺省为 0）
 */
export function getSkillProficiency(
  proficiencyMap: SkillProficiencyMap | undefined,
  skillId: string,
): number {
  return proficiencyMap?.[skillId] ?? 0
}

/** 技能熟练度进度展示数据 */
export interface SkillProficiencyProgress {
  level: SkillLevel
  proficiency: number
  levelText: string
  percent: number
  barStyle: string
  progressText: string
}

/**
 * 计算技能熟练度进度（当前等级段内的百分比与展示文案）
 */
export function calcSkillProficiencyProgress(proficiency: number): SkillProficiencyProgress {
  const level = getSkillLevelFromProficiency(proficiency)
  const currentThreshold = SKILL_PROFICIENCY_THRESHOLDS[level]
  const nextThreshold = getNextSkillLevelThreshold(level)

  if (!nextThreshold) {
    return {
      level,
      proficiency,
      levelText: '圆满',
      percent: 100,
      barStyle: 'width: 100%',
      progressText: `熟练度 ${proficiency}（圆满）`,
    }
  }

  const range = nextThreshold - currentThreshold
  const progress = proficiency - currentThreshold
  const percent = Math.min(100, Math.floor((progress / range) * 100))

  return {
    level,
    proficiency,
    levelText: level,
    percent,
    barStyle: `width: ${percent}%`,
    progressText: `熟练度 ${proficiency} / ${nextThreshold}（${level}）`,
  }
}

/**
 * 解析技能攻击时的五行属性
 */
export function resolveSkillAttackElement(
  skill: Skill,
  gongfaElements: ElementType[],
  gongfaFallback: ElementType,
  targetElement: ElementType,
): ElementType | undefined {
  const raw = skill.params.element
  if (isElementType(raw)) return raw

  if (raw === 'auto_counter' || raw === '五行轮回') {
    const pool = gongfaElements.length > 0 ? gongfaElements : [gongfaFallback]
    return pickCounterElementAgainst(targetElement, pool) ?? gongfaFallback
  }

  if (raw === 'random_wuxing') {
    return pickRandomCounterElement(targetElement)
  }

  return undefined
}

/** @deprecated 使用 getSkillLevelScalableParamKeys */
export const SKILL_SCALABLE_PARAM_KEYS = getSkillLevelScalableParamKeys()

/** @deprecated 减益类 key 已合并至 SKILL_PARAM_RULES */
export const SKILL_SCALABLE_REDUCTION_PARAM_KEYS = [
  'damage_reduction',
  'physical_damage_reduction',
  'counter_damage_reduction',
  'crit_damage_reduction',
  'hit_rate_reduction',
  'weakness_attack_reduction',
] as const

/** @deprecated 使用 scaleSkillParamValue */
export function getScaledSkillParamValue(
  baseValue: number,
  proficiencyOrLevel: number | SkillLevel = 0,
): number {
  return baseValue * (
    typeof proficiencyOrLevel === 'number'
      ? getSkillProficiencyCoefficient(proficiencyOrLevel)
      : getSkillLevelCoefficient(proficiencyOrLevel)
  )
}
