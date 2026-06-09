import {
  getSkillLevelCoefficient,
  getSkillProficiencyCoefficient,
  type SkillLevel,
} from '@/game/constants/skill-level'

/** 技能效果分类（与 models/skill 保持一致） */
type SkillCategoryHint = 'attack' | 'defense' | 'heal' | 'buff' | 'passive'

/**
 * 技能 params 填表规则（skills.json）
 *
 * 1. params 只使用本文件 `SKILL_PARAM_RULES` 中声明的 key
 * 2. 数值为配置表基础值（对应功法品阶下的基数，不含熟练度加成）
 * 3. effect 文案中的展示数值须与 params 一致：
 *    - 比例类：params 用小数，文案用百分比（damage_percent: 1.0 → "100%"）
 *    - 整数类：穿透+10 ↔ penetration_bonus: 10
 * 4. 熟练度等级（小成/大成/圆满）由运行时自动乘 `SKILL_LEVEL_COEFFICIENT`，无需重复填写
 * 5. scaleMode 为 none 的参数（回合数、段数等）不随熟练度变化
 */

/** 参数值在描述中的展示格式 */
export type SkillParamDisplayFormat =
  | 'percent'
  | 'flat'
  | 'reduction'
  | 'count'
  | 'duration'

/** 参数是否随技能熟练度等级缩放 */
export type SkillParamScaleMode = 'skill_level' | 'none'

/** 单条技能参数规则 */
export interface SkillParamRule {
  /** params 字段名，与 skills.json 一致 */
  key: string
  /** 中文说明（策划 / 填表参考） */
  label: string
  /** 描述文案中的数值展示格式 */
  displayFormat: SkillParamDisplayFormat
  /** 是否随小成/大成/圆满缩放 */
  scaleMode: SkillParamScaleMode
  /** 用于自动推断技能 category 的提示 */
  categoryHint?: SkillCategoryHint
}

/** 全部已知技能参数规则（新增技能效果时在此登记） */
export const SKILL_PARAM_RULES = {
  damage_percent: {
    key: 'damage_percent',
    label: '伤害倍率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
    categoryHint: 'attack',
  },
  chain_damage_percent: {
    key: 'chain_damage_percent',
    label: '弹射伤害倍率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  hp_regen_percent: {
    key: 'hp_regen_percent',
    label: '气血恢复比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
    categoryHint: 'heal',
  },
  mp_regen_percent: {
    key: 'mp_regen_percent',
    label: '灵力恢复比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
    categoryHint: 'heal',
  },
  defense_bonus_percent: {
    key: 'defense_bonus_percent',
    label: '防御加成比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
    categoryHint: 'defense',
  },
  max_hp_bonus_percent: {
    key: 'max_hp_bonus_percent',
    label: '气血上限加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  burn_hp_percent: {
    key: 'burn_hp_percent',
    label: '灼烧伤害比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  poison_damage_percent: {
    key: 'poison_damage_percent',
    label: '中毒伤害比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  slow_amount: {
    key: 'slow_amount',
    label: '减速幅度',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  slow_chance: {
    key: 'slow_chance',
    label: '减速概率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  defense_ignore: {
    key: 'defense_ignore',
    label: '忽视防御比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  defense_ignore_percent: {
    key: 'defense_ignore_percent',
    label: '忽视防御比例',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  global_defense_ignore: {
    key: 'global_defense_ignore',
    label: '攻击忽视防御',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  crit_rate_bonus: {
    key: 'crit_rate_bonus',
    label: '暴击率加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  crit_damage_bonus: {
    key: 'crit_damage_bonus',
    label: '暴击伤害加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  metal_damage_bonus: {
    key: 'metal_damage_bonus',
    label: '金系技能伤害加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  fire_damage_bonus: {
    key: 'fire_damage_bonus',
    label: '火系技能伤害加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  thunder_damage_bonus: {
    key: 'thunder_damage_bonus',
    label: '雷系技能伤害加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  all_resistance_bonus: {
    key: 'all_resistance_bonus',
    label: '全属性抗性',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  all_stat_bonus: {
    key: 'all_stat_bonus',
    label: '全属性加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  shenshi_bonus_percent: {
    key: 'shenshi_bonus_percent',
    label: '神识加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  cultivation_speed_bonus: {
    key: 'cultivation_speed_bonus',
    label: '修炼速度加成',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  damage_reduction: {
    key: 'damage_reduction',
    label: '受到伤害减免',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
    categoryHint: 'defense',
  },
  physical_damage_reduction: {
    key: 'physical_damage_reduction',
    label: '物理伤害减免',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
    categoryHint: 'defense',
  },
  counter_damage_reduction: {
    key: 'counter_damage_reduction',
    label: '反击伤害减免',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
  },
  crit_damage_reduction: {
    key: 'crit_damage_reduction',
    label: '暴击伤害减免',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
  },
  hit_rate_reduction: {
    key: 'hit_rate_reduction',
    label: '命中降低',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
  },
  weakness_attack_reduction: {
    key: 'weakness_attack_reduction',
    label: '攻击降低（虚弱）',
    displayFormat: 'reduction',
    scaleMode: 'skill_level',
  },
  on_hit_heal_chance: {
    key: 'on_hit_heal_chance',
    label: '受击回血概率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  stun_chance: {
    key: 'stun_chance',
    label: '眩晕概率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  paralyze_chance: {
    key: 'paralyze_chance',
    label: '麻痹概率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  poison_chance: {
    key: 'poison_chance',
    label: '中毒概率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  penetration_bonus: {
    key: 'penetration_bonus',
    label: '穿透',
    displayFormat: 'flat',
    scaleMode: 'skill_level',
  },
  speed_bonus: {
    key: 'speed_bonus',
    label: '速度',
    displayFormat: 'flat',
    scaleMode: 'skill_level',
  },
  tenacity_bonus: {
    key: 'tenacity_bonus',
    label: '韧性',
    displayFormat: 'flat',
    scaleMode: 'skill_level',
  },
  cost_mp_percent: {
    key: 'cost_mp_percent',
    label: '灵力消耗比例',
    displayFormat: 'percent',
    scaleMode: 'none',
  },
  defense_multiplier: {
    key: 'defense_multiplier',
    label: '防御倍率',
    displayFormat: 'percent',
    scaleMode: 'skill_level',
  },
  duration: {
    key: 'duration',
    label: '持续回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  hit_count: {
    key: 'hit_count',
    label: '攻击段数',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  skill_count: {
    key: 'skill_count',
    label: '同时释放技能数',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  chain_count: {
    key: 'chain_count',
    label: '弹射目标数',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  cooldown_reduce: {
    key: 'cooldown_reduce',
    label: '冷却减少回合',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  water_cooldown_reduce: {
    key: 'water_cooldown_reduce',
    label: '水系冷却减少',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  burn_duration: {
    key: 'burn_duration',
    label: '灼烧回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  stun_duration: {
    key: 'stun_duration',
    label: '眩晕回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  paralyze_duration: {
    key: 'paralyze_duration',
    label: '麻痹回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  weakness_duration: {
    key: 'weakness_duration',
    label: '虚弱回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  control_immunity_duration: {
    key: 'control_immunity_duration',
    label: '控制免疫回合',
    displayFormat: 'duration',
    scaleMode: 'none',
  },
  extra_skill_slots: {
    key: 'extra_skill_slots',
    label: '额外技能栏',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  free_stat_per_level: {
    key: 'free_stat_per_level',
    label: '每级自由属性',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  hp_threshold: {
    key: 'hp_threshold',
    label: '气血阈值比例',
    displayFormat: 'percent',
    scaleMode: 'none',
  },
  element: {
    key: 'element',
    label: '攻击五行',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  elements: {
    key: 'elements',
    label: '五行列表',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  target: {
    key: 'target',
    label: '目标范围',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  damage_type: {
    key: 'damage_type',
    label: '伤害类型',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  damage_formula: {
    key: 'damage_formula',
    label: '伤害公式',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  auto_counter_element: {
    key: 'auto_counter_element',
    label: '自动克制五行',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  beast_kind: {
    key: 'beast_kind',
    label: '兽类',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  cleanse: {
    key: 'cleanse',
    label: '清除负面状态',
    displayFormat: 'count',
    scaleMode: 'none',
  },
  no_cooldown: {
    key: 'no_cooldown',
    label: '无冷却',
    displayFormat: 'count',
    scaleMode: 'none',
  },
} as const satisfies Record<string, SkillParamRule>

export type KnownSkillParamKey = keyof typeof SKILL_PARAM_RULES

/** 技能 params 类型（已知 key + 扩展预留） */
export type SkillParams = Partial<Record<KnownSkillParamKey, unknown>> & Record<string, unknown>

const skillLevelScalableKeys = Object.values(SKILL_PARAM_RULES)
  .filter((rule) => rule.scaleMode === 'skill_level')
  .map((rule) => rule.key)

const skillLevelScalableKeySet = new Set<string>(skillLevelScalableKeys)

/**
 * 获取参数规则；未知 key 返回 undefined
 */
export function getSkillParamRule(key: string): SkillParamRule | undefined {
  return SKILL_PARAM_RULES[key as KnownSkillParamKey]
}

/**
 * 是否随技能熟练度等级缩放
 */
export function isSkillLevelScalableParam(key: string): boolean {
  return skillLevelScalableKeySet.has(key)
}

/**
 * 全部随熟练度等级缩放的 params key
 */
export function getSkillLevelScalableParamKeys(): string[] {
  return [...skillLevelScalableKeys]
}

/**
 * 将小数比例格式化为描述用百分比文本（0.005 → "0.5"，1.0 → "100"）
 */
export function formatSkillPercentText(decimal: number): string {
  const percent = decimal * 100
  const rounded = Math.round(percent * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * 将参数值格式化为描述文案中的数值片段（不含后缀符号）
 */
export function formatSkillParamDisplayValue(key: string, value: number): string | null {
  const rule = getSkillParamRule(key)
  if (!rule) return null

  switch (rule.displayFormat) {
    case 'percent':
      return formatSkillPercentText(value)
    case 'reduction':
      return formatSkillPercentText(value)
    case 'flat':
      return String(Math.round(value))
    case 'count':
    case 'duration':
      return String(Math.round(value))
    default:
      return null
  }
}

/**
 * 将参数值格式化为描述文案中的可检索片段（含 % 或 + 前缀）
 */
export function formatSkillParamDisplayFragment(key: string, value: number): string | null {
  const rule = getSkillParamRule(key)
  const displayValue = formatSkillParamDisplayValue(key, value)
  if (!rule || displayValue === null) return null

  switch (rule.displayFormat) {
    case 'percent':
      return `${displayValue}%`
    case 'reduction':
      return `-${displayValue}%`
    case 'flat':
      return `+${displayValue}`
    default:
      return displayValue
  }
}

/**
 * 获取技能等级缩放系数
 */
export function resolveSkillLevelCoefficient(
  proficiencyOrLevel: number | SkillLevel,
): number {
  return typeof proficiencyOrLevel === 'number'
    ? getSkillProficiencyCoefficient(proficiencyOrLevel)
    : getSkillLevelCoefficient(proficiencyOrLevel)
}

/**
 * 按规则缩放单个参数值
 */
export function scaleSkillParamValue(
  key: string,
  baseValue: number,
  proficiencyOrLevel: number | SkillLevel = 0,
): number {
  if (!isSkillLevelScalableParam(key)) return baseValue
  return baseValue * resolveSkillLevelCoefficient(proficiencyOrLevel)
}

/**
 * 获取按技能等级缩放后的 params（战斗结算、描述生成统一入口）
 */
export function getScaledSkillParams(
  params: SkillParams,
  proficiencyOrLevel: number | SkillLevel = 0,
): SkillParams {
  const scaled: SkillParams = { ...params }
  for (const key of skillLevelScalableKeys) {
    const base = params[key]
    if (typeof base === 'number') {
      scaled[key] = scaleSkillParamValue(key, base, proficiencyOrLevel)
    }
  }
  return scaled
}

interface SkillDescriptionReplacement {
  from: string
  to: string
}

/**
 * 收集描述文案中需替换的数值片段
 */
function collectSkillDescriptionReplacements(
  params: SkillParams,
  coefficient: number,
): SkillDescriptionReplacement[] {
  const replacements: SkillDescriptionReplacement[] = []

  for (const key of skillLevelScalableKeys) {
    const base = params[key]
    if (typeof base !== 'number') continue

    const rule = getSkillParamRule(key)
    if (!rule) continue

    const scaled = base * coefficient
    const fromFragment = formatSkillParamDisplayFragment(key, base)
    const toFragment = formatSkillParamDisplayFragment(key, scaled)
    if (!fromFragment || !toFragment || fromFragment === toFragment) continue

    replacements.push({ from: fromFragment, to: toFragment })
  }

  return replacements.sort((a, b) => b.from.length - a.from.length)
}

/**
 * 根据技能等级生成动态效果描述（替换文案中的数值为缩放后结果）
 */
export function resolveSkillEffectDescription(
  baseDescription: string,
  params: SkillParams,
  proficiencyOrLevel: number | SkillLevel = 0,
): string {
  const coefficient = resolveSkillLevelCoefficient(proficiencyOrLevel)
  if (coefficient === 1) return baseDescription

  let description = baseDescription
  for (const { from, to } of collectSkillDescriptionReplacements(params, coefficient)) {
    description = description.split(from).join(to)
  }
  return description
}

/** 技能配置校验问题 */
export interface SkillConfigIssue {
  skillId: string
  message: string
}

/**
 * 校验单条技能 params 是否符合规则表
 */
export function validateSkillParams(
  skillId: string,
  params: SkillParams,
  effectText: string,
): SkillConfigIssue[] {
  const issues: SkillConfigIssue[] = []

  for (const key of Object.keys(params)) {
    const rule = getSkillParamRule(key)
    if (!rule) {
      issues.push({
        skillId,
        message: `未知 params key「${key}」，请先在 SKILL_PARAM_RULES 中登记`,
      })
      continue
    }

    const value = params[key]
    if (value === undefined || value === null) continue

    if (rule.displayFormat === 'percent'
      || rule.displayFormat === 'reduction'
      || rule.displayFormat === 'flat') {
      if (typeof value !== 'number') {
        issues.push({
          skillId,
          message: `params.${key} 应为 number，当前为 ${typeof value}`,
        })
        continue
      }

      const fragment = formatSkillParamDisplayFragment(key, value)
      if (fragment && !effectText.includes(fragment)) {
        issues.push({
          skillId,
          message: `effect 文案未包含 params.${key} 对应数值「${fragment}」`,
        })
      }
    }
  }

  return issues
}

/**
 * 批量校验技能表（开发环境加载时调用）
 */
export function validateSkillCatalog(
  skills: Array<{ id: string; params: SkillParams; description: string }>,
): SkillConfigIssue[] {
  return skills.flatMap((skill) =>
    validateSkillParams(skill.id, skill.params, skill.description),
  )
}
