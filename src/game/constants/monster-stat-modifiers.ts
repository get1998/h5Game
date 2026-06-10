import type { ElementType } from '@/game/types'

/** 怪物个体属性修正（叠加在境界+功法+品阶之后） */
export interface MonsterStatModifiers {
  maxHp?: number
  maxMp?: number
  attack?: number
  defense?: number
  speed?: number
  critRate?: number
  critDamage?: number
  hitRate?: number
  dodgeRate?: number
  penetration?: number
}

const STAT_MODIFIER_KEYS = [
  'maxHp',
  'maxMp',
  'attack',
  'defense',
  'speed',
  'critRate',
  'critDamage',
  'hitRate',
  'dodgeRate',
  'penetration',
] as const satisfies readonly (keyof MonsterStatModifiers)[]

/**
 * 五行基础修正：人型与妖兽/灵兽共用
 * - 土：高防慢速
 * - 木：高血高速低攻
 * - 火：高攻暴击偏脆
 * - 金：锐利命中穿透
 * - 水：灵动闪避法力
 */
export const ELEMENT_STAT_MODIFIERS: Record<ElementType, MonsterStatModifiers> = {
  金: {
    attack: 3,
    hitRate: 0.03,
    penetration: 2,
    maxHp: -8,
  },
  木: {
    maxHp: 15,
    attack: -2,
    speed: 4,
    dodgeRate: 0.02,
  },
  水: {
    maxMp: 10,
    attack: -1,
    speed: 3,
    dodgeRate: 0.03,
  },
  火: {
    attack: 4,
    defense: -2,
    speed: 2,
    critRate: 0.02,
    critDamage: 0.1,
  },
  土: {
    maxHp: 20,
    defense: 5,
    speed: -4,
    attack: -1,
  },
}

/** 妖兽 / 灵兽种族天赋（叠加在五行基础之上） */
export const BEAST_ARCHETYPE = {
  /** 掠食者：狼等，追击撕咬 */
  predator: {
    speed: 2,
    attack: 1,
    hitRate: 0.02,
  },
  /** 敏捷：兔等，极致闪避 */
  agile: {
    speed: 5,
    attack: -2,
    defense: -2,
    dodgeRate: 0.04,
  },
  /** 护卫：犬等，稳守反击 */
  guard: {
    defense: 2,
    hitRate: 0.02,
  },
  /** 甲胄爬行：蜥蜴等 */
  shell: {
    maxHp: 8,
    defense: 3,
    speed: -2,
    maxMp: -10,
  },
  /** 石质傀儡：极肉极慢 */
  golem: {
    maxHp: 25,
    defense: 6,
    speed: -4,
    maxMp: -15,
    attack: -2,
  },
  /** 猛禽：隼等，俯冲斩击 */
  raptor: {
    maxHp: -12,
    attack: 2,
    speed: 3,
    critRate: 0.01,
    hitRate: 0.02,
  },
  /** 沼泽巨兽：鳄等，蛮力撕扯 */
  swamp: {
    maxHp: 5,
    penetration: 2,
  },
  /** 毒虫：蛛蝎等，剧毒穿透 */
  venom: {
    penetration: 3,
    critDamage: 0.12,
  },
  /** 魅影：水魅林魅等，飘忽难捉 */
  wraith: {
    maxMp: 12,
    attack: -2,
    dodgeRate: 0.04,
  },
  /** 蝙蝠：高速暴击 */
  bat: {
    maxHp: -12,
    speed: 5,
    critRate: 0.02,
    critDamage: 0.15,
  },
  /** 玄龟：极致肉盾 */
  turtle: {
    maxHp: 30,
    defense: 5,
    speed: -4,
    attack: -2,
    maxMp: -15,
  },
  /** 毒藤：木系缠斗 */
  vine: {
    maxHp: 8,
    attack: 2,
    penetration: 2,
  },
  /** 蟾蜍：水土两栖偏肉 */
  toad: {
    maxHp: 10,
    defense: 2,
    speed: -1,
  },
  /** 火蜥：焰系穿透 */
  salamander: {
    attack: 2,
    penetration: 4,
    critDamage: 0.1,
  },
  /** 赤蝎：脆但暴 */
  scorpion: {
    maxHp: -25,
    maxMp: -15,
    attack: 3,
    defense: -3,
    speed: 3,
    critRate: 0.03,
    critDamage: 0.25,
    penetration: 5,
  },
  /** 熔虫：均衡火攻 */
  worm: {
    maxHp: 5,
    attack: 2,
  },
  /** 炎灵：法力灵动 */
  spirit: {
    maxMp: 22,
    dodgeRate: 0.03,
    penetration: 2,
  },
  /** 骨灵：金系灵兽 */
  boneSpirit: {
    maxMp: 15,
    penetration: 3,
    critRate: 0.01,
  },
} as const satisfies Record<string, MonsterStatModifiers>

/** 人型修士额外修正（叠加在五行基础之上） */
export const HUMAN_ARCHETYPE = {
  /** 邪修：暴烈杀伤 */
  heretic: {
    attack: 2,
    critDamage: 0.1,
    penetration: 3,
  },
} as const satisfies Record<string, MonsterStatModifiers>

/**
 * 合并多段属性修正（同字段累加）
 */
export function mergeStatModifiers(
  ...parts: (MonsterStatModifiers | undefined)[]
): MonsterStatModifiers {
  const result: MonsterStatModifiers = {}

  for (const part of parts) {
    if (!part) continue
    for (const key of STAT_MODIFIER_KEYS) {
      const value = part[key]
      if (value !== undefined) {
        result[key] = (result[key] ?? 0) + value
      }
    }
  }

  return result
}

/**
 * 人型怪物修正：五行基础 + 可选个体修正
 */
export function humanMonsterStats(
  element: ElementType,
  extra?: MonsterStatModifiers,
): MonsterStatModifiers {
  return mergeStatModifiers(ELEMENT_STAT_MODIFIERS[element], extra)
}

/**
 * 妖兽 / 灵兽修正：五行基础 + 种族天赋
 */
export function beastMonsterStats(
  element: ElementType,
  archetype?: MonsterStatModifiers,
): MonsterStatModifiers {
  return mergeStatModifiers(ELEMENT_STAT_MODIFIERS[element], archetype)
}
