import type { ElementType, RealmStage } from '@/game/types'

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

/** 地图功法掉落项 */
export interface MapGongfaDrop {
  type: 'gongfa'
  /** 功法模板 id */
  gongfaId: string
  /** 掉落概率（0~1，击败怪物后独立掷骰） */
  rate: number
}

/** 地图掉落物（可扩展更多类型） */
export type MapDropItem = MapGongfaDrop

/** 怪物模板公共字段（境界、品阶均在遇怪时随机生成） */
interface MonsterTemplateBase {
  id: string
  name: string
  element: ElementType
  /** 该怪物在池中的生成权重（默认 1，与地图种类权重相乘） */
  spawnRate?: number
  /** 个体属性修正 */
  statModifiers?: MonsterStatModifiers
}

/** 人型怪物模板（可修炼功法，遇怪时从地图掉落池按五行匹配） */
export interface HumanMonsterTemplate extends MonsterTemplateBase {
  kind: '人'
}

/** 妖兽 / 灵兽模板（无功法，依种族天赋体现差异） */
export interface BeastMonsterTemplate extends MonsterTemplateBase {
  kind: '妖兽' | '灵兽'
}

/** 怪物模板（地图怪物池） */
export type MonsterTemplate = HumanMonsterTemplate | BeastMonsterTemplate

/** 地图怪物种类生成权重 */
export interface MapMonsterKindRates {
  人: number
  妖兽: number
  灵兽: number
}

/** 地图怪物品阶生成权重 */
export interface MapMonsterTierRates {
  普通: number
  精英: number
  首领: number
  传奇: number
}

/** 历练地图 */
export interface TrainingMap {
  id: string
  name: string
  description: string
  requiredRealm: RealmStage
  /** 地图怪物最低修仙等级（遇怪时在此区间内随机） */
  minMonsterRealm: RealmStage
  /** 地图怪物最高修仙等级（遇怪时在此区间内随机） */
  maxMonsterRealm: RealmStage
  /** 怪物种类生成权重 */
  monsterKindRates: MapMonsterKindRates
  /** 怪物品阶生成权重 */
  monsterTierRates: MapMonsterTierRates
  /** 自动战斗每回合间隔（毫秒） */
  roundIntervalMs: number
  /** 击败怪物后遇下一只的间隔（毫秒） */
  encounterDelayMs: number
  /** 地图掉落表（功法等，击败怪物后结算） */
  drops: MapDropItem[]
  monsters: MonsterTemplate[]
}

/** 炼气初期：人型为主，妖兽稀少 */
const QI_EARLY_KIND_RATES: MapMonsterKindRates = { 人: 1, 妖兽: 0.2, 灵兽: 0.1 }
const QI_EARLY_TIER_RATES: MapMonsterTierRates = { 普通: 0.78, 精英: 0.18, 首领: 0.03, 传奇: 0.01 }

/** 炼气中后期 */
const QI_MID_KIND_RATES: MapMonsterKindRates = { 人: 0.85, 妖兽: 0.3, 灵兽: 0.18 }
const QI_MID_TIER_RATES: MapMonsterTierRates = { 普通: 0.74, 精英: 0.2, 首领: 0.05, 传奇: 0.01 }

/** 炼气末期 */
const QI_LATE_KIND_RATES: MapMonsterKindRates = { 人: 0.75, 妖兽: 0.35, 灵兽: 0.22 }
const QI_LATE_TIER_RATES: MapMonsterTierRates = { 普通: 0.7, 精英: 0.22, 首领: 0.06, 传奇: 0.02 }

/** 筑基期 */
const ZHUJI_KIND_RATES: MapMonsterKindRates = { 人: 0.7, 妖兽: 0.4, 灵兽: 0.25 }
const ZHUJI_TIER_RATES: MapMonsterTierRates = { 普通: 0.68, 精英: 0.22, 首领: 0.08, 传奇: 0.02 }

/** 金丹期 */
const JINDAN_KIND_RATES: MapMonsterKindRates = { 人: 0.6, 妖兽: 0.5, 灵兽: 0.3 }
const JINDAN_TIER_RATES: MapMonsterTierRates = { 普通: 0.65, 精英: 0.22, 首领: 0.1, 传奇: 0.03 }

/** 凡品五行功法掉落（炼气初期地图共用） */
const QI_EARLY_GONGFA_DROPS: MapGongfaDrop[] = [
  { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.08 },
  { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.08 },
  { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.08 },
  { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.08 },
  { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.08 },
]

/** 历练地图列表 */
export const TRAINING_MAPS: TrainingMap[] = [
  // ── 炼气期 ──────────────────────────────────────────
  {
    id: 'map_qingling',
    name: '青灵山',
    description: '宗门外围青山，小径平缓、妖兽孱弱，适合炼气初阶修士熟悉历练。',
    requiredRealm: '炼气一层',
    minMonsterRealm: '炼气一层',
    maxMonsterRealm: '炼气四层',
    monsterKindRates: QI_EARLY_KIND_RATES,
    monsterTierRates: QI_EARLY_TIER_RATES,
    roundIntervalMs: 820,
    encounterDelayMs: 1200,
    drops: QI_EARLY_GONGFA_DROPS,
    monsters: [
      {
        id: 'monster_bandit',
        name: '山贼',
        kind: '人',
        element: '金',
        spawnRate: 1.2,
        statModifiers: {
          maxHp: -15,
          defense: -2,
          hitRate: -0.05,
        },
      },
      {
        id: 'monster_wolf',
        name: '野狼',
        kind: '妖兽',
        element: '木',
        spawnRate: 0.9,
        statModifiers: {
          maxHp: -30,
          maxMp: -10,
          defense: -3,
          speed: 4,
          dodgeRate: 0.03,
        },
      },
      {
        id: 'monster_rabbit',
        name: '妖兔',
        kind: '妖兽',
        element: '木',
        spawnRate: 1,
        statModifiers: {
          maxHp: -18,
          attack: -2,
          defense: -3,
          speed: 8,
          dodgeRate: 0.06,
          critDamage: -0.1,
        },
      },
      {
        id: 'monster_wild_dog',
        name: '野犬',
        kind: '妖兽',
        element: '土',
        spawnRate: 0.85,
        statModifiers: {
          maxHp: -25,
          attack: -3,
          defense: -2,
          speed: 5,
          hitRate: -0.03,
        },
      },
    ],
  },
  {
    id: 'map_luoxing',
    name: '落星坡',
    description: '陨石坠落后形成的乱石坡，常有散修与低阶妖兽争夺灵石碎片。',
    requiredRealm: '炼气五层',
    minMonsterRealm: '炼气五层',
    maxMonsterRealm: '炼气八层',
    monsterKindRates: QI_MID_KIND_RATES,
    monsterTierRates: QI_MID_TIER_RATES,
    roundIntervalMs: 790,
    encounterDelayMs: 1250,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_liehuo', rate: 0.02 },
      { type: 'gongfa', gongfaId: 'gongfa_houdu', rate: 0.02 },
    ],
    monsters: [
      {
        id: 'monster_rouge',
        name: '流寇',
        kind: '人',
        element: '火',
        spawnRate: 1.1,
        statModifiers: {
          attack: 1,
          defense: -1,
          critRate: 0.01,
        },
      },
      {
        id: 'monster_iron_lizard',
        name: '铁甲蜥',
        kind: '妖兽',
        element: '土',
        spawnRate: 0.95,
        statModifiers: {
          maxHp: 10,
          maxMp: -15,
          defense: 4,
          speed: -3,
        },
      },
      {
        id: 'monster_wind_hawk',
        name: '风刃隼',
        kind: '妖兽',
        element: '金',
        spawnRate: 0.9,
        statModifiers: {
          maxHp: -20,
          attack: 2,
          speed: 6,
          critRate: 0.02,
          dodgeRate: 0.04,
        },
      },
      {
        id: 'monster_stone_golem',
        name: '碎石傀儡',
        kind: '灵兽',
        element: '土',
        spawnRate: 0.65,
        statModifiers: {
          maxHp: 25,
          maxMp: -20,
          attack: -2,
          defense: 6,
          speed: -5,
        },
      },
    ],
  },
  {
    id: 'map_youming',
    name: '幽冥泽',
    description: '瘴气弥漫的沼泽湿地，水属妖兽与散修盘踞，需炼气后期方可深入。',
    requiredRealm: '炼气九层',
    minMonsterRealm: '炼气九层',
    maxMonsterRealm: '炼气十二层',
    monsterKindRates: QI_MID_KIND_RATES,
    monsterTierRates: QI_MID_TIER_RATES,
    roundIntervalMs: 760,
    encounterDelayMs: 1300,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_liehuo', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_houdu', rate: 0.04 },
    ],
    monsters: [
      {
        id: 'monster_swamp_croc',
        name: '沼地鳄',
        kind: '妖兽',
        element: '水',
        spawnRate: 1,
        statModifiers: {
          maxHp: 15,
          attack: 3,
          defense: 2,
          speed: -2,
          penetration: 2,
        },
      },
      {
        id: 'monster_miasma_spider',
        name: '毒瘴蛛',
        kind: '妖兽',
        element: '木',
        spawnRate: 0.9,
        statModifiers: {
          maxHp: -10,
          attack: 2,
          speed: 4,
          critRate: 0.02,
          critDamage: 0.15,
          penetration: 3,
        },
      },
      {
        id: 'monster_water_wraith',
        name: '水魅',
        kind: '灵兽',
        element: '水',
        spawnRate: 0.7,
        statModifiers: {
          maxMp: 15,
          speed: 5,
          dodgeRate: 0.05,
          hitRate: -0.03,
        },
      },
      {
        id: 'monster_marsh_cultivator',
        name: '泽修散修',
        kind: '人',
        element: '水',
        spawnRate: 1.05,
        statModifiers: {
          attack: 2,
          defense: 1,
          speed: 2,
          penetration: 2,
        },
      },
    ],
  },
  {
    id: 'map_duanhun',
    name: '断魂崖',
    description: '炼气期最后一处险地，崖底阴风呼啸，邪修与凶兽盘踞，十五层修士方可踏足。',
    requiredRealm: '炼气十三层',
    minMonsterRealm: '炼气十三层',
    maxMonsterRealm: '炼气十五层',
    monsterKindRates: QI_LATE_KIND_RATES,
    monsterTierRates: QI_LATE_TIER_RATES,
    roundIntervalMs: 740,
    encounterDelayMs: 1400,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_liehuo', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_houdu', rate: 0.05 },
    ],
    monsters: [
      {
        id: 'monster_heretic',
        name: '邪修',
        kind: '人',
        element: '火',
        spawnRate: 1,
        statModifiers: {
          attack: 4,
          speed: 3,
          critRate: 0.02,
          critDamage: 0.15,
          penetration: 4,
        },
      },
      {
        id: 'monster_bone_spirit',
        name: '骨灵兽',
        kind: '灵兽',
        element: '金',
        spawnRate: 0.68,
        statModifiers: {
          maxMp: 20,
          attack: 3,
          speed: 4,
          dodgeRate: 0.04,
          penetration: 3,
        },
      },
      {
        id: 'monster_crimson_bat',
        name: '赤瞳蝠',
        kind: '妖兽',
        element: '火',
        spawnRate: 0.95,
        statModifiers: {
          maxHp: -15,
          attack: 5,
          speed: 7,
          critRate: 0.03,
          critDamage: 0.2,
        },
      },
      {
        id: 'monster_rock_turtle',
        name: '岩甲龟',
        kind: '妖兽',
        element: '土',
        spawnRate: 0.8,
        statModifiers: {
          maxHp: 40,
          maxMp: -25,
          attack: -3,
          defense: 8,
          speed: -6,
        },
      },
    ],
  },
  // ── 筑基期 ──────────────────────────────────────────
  {
    id: 'map_youwu',
    name: '幽雾林',
    description: '迷雾笼罩的密林，筑基低阶修士方可深入。',
    requiredRealm: '筑基前期',
    minMonsterRealm: '筑基前期',
    maxMonsterRealm: '筑基后期',
    monsterKindRates: ZHUJI_KIND_RATES,
    monsterTierRates: ZHUJI_TIER_RATES,
    roundIntervalMs: 700,
    encounterDelayMs: 1500,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_liehuo', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_houdu', rate: 0.06 },
      { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.03 },
      { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.03 },
      { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.03 },
      { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.03 },
      { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.03 },
    ],
    monsters: [
      {
        id: 'monster_spider',
        name: '雾影蛛',
        kind: '妖兽',
        element: '水',
        spawnRate: 1,
        statModifiers: {
          maxHp: -60,
          maxMp: -8,
          defense: -2,
          speed: 3,
          critRate: 0.01,
          critDamage: 0.1,
          penetration: 2,
        },
      },
      {
        id: 'monster_ghost',
        name: '林魅',
        kind: '灵兽',
        element: '木',
        spawnRate: 0.72,
        statModifiers: {
          maxMp: 20,
          speed: 6,
          dodgeRate: 0.03,
        },
      },
      {
        id: 'monster_mist_bandit',
        name: '雾林盗修',
        kind: '人',
        element: '木',
        spawnRate: 1,
        statModifiers: {
          attack: 2,
          speed: 3,
          dodgeRate: 0.02,
        },
      },
      {
        id: 'monster_poison_vine',
        name: '毒藤精',
        kind: '妖兽',
        element: '木',
        spawnRate: 0.88,
        statModifiers: {
          maxHp: -20,
          attack: 3,
          speed: 2,
          critRate: 0.02,
          penetration: 3,
        },
      },
      {
        id: 'monster_swamp_toad',
        name: '瘴蟾',
        kind: '妖兽',
        element: '水',
        spawnRate: 0.85,
        statModifiers: {
          maxHp: 20,
          maxMp: -10,
          defense: 3,
          speed: -2,
        },
      },
    ],
  },
  // ── 金丹期 ──────────────────────────────────────────
  {
    id: 'map_chiyan',
    name: '赤焰谷',
    description: '地火喷涌的险地，金丹低阶修士方能镇压妖兽。',
    requiredRealm: '金丹前期',
    minMonsterRealm: '金丹前期',
    maxMonsterRealm: '金丹后期',
    monsterKindRates: JINDAN_KIND_RATES,
    monsterTierRates: JINDAN_TIER_RATES,
    roundIntervalMs: 600,
    encounterDelayMs: 1800,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_jinfeng', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_canglang', rate: 0.04 },
      { type: 'gongfa', gongfaId: 'gongfa_liehuo', rate: 0.05 },
      { type: 'gongfa', gongfaId: 'gongfa_houdu', rate: 0.05 },
    ],
    monsters: [
      {
        id: 'monster_salamander',
        name: '火蜥蜴',
        kind: '妖兽',
        element: '火',
        spawnRate: 1,
        statModifiers: {
          attack: 4,
          speed: 2,
          critRate: 0.02,
          critDamage: 0.2,
          penetration: 5,
        },
      },
      {
        id: 'monster_scorpion',
        name: '赤尾蝎',
        element: '火',
        kind: '妖兽',
        spawnRate: 0.75,
        statModifiers: {
          maxHp: -120,
          maxMp: -40,
          attack: -7,
          defense: -12,
          speed: -5,
          critRate: 0.04,
          critDamage: 0.3,
          penetration: 8,
        },
      },
      {
        id: 'monster_lava_worm',
        name: '熔岩虫',
        kind: '妖兽',
        element: '火',
        spawnRate: 0.92,
        statModifiers: {
          maxHp: -40,
          attack: 5,
          speed: 4,
          critRate: 0.02,
          penetration: 4,
        },
      },
      {
        id: 'monster_flame_spirit',
        name: '炎灵',
        kind: '灵兽',
        element: '火',
        spawnRate: 0.65,
        statModifiers: {
          maxMp: 30,
          attack: 3,
          speed: 5,
          dodgeRate: 0.04,
        },
      },
      {
        id: 'monster_magma_golem',
        name: '熔石魔',
        kind: '妖兽',
        element: '土',
        spawnRate: 0.78,
        statModifiers: {
          maxHp: 50,
          maxMp: -30,
          attack: -2,
          defense: 10,
          speed: -4,
        },
      },
    ],
  },
]

/**
 * 根据 ID 获取历练地图
 */
export function getTrainingMapById(mapId: string): TrainingMap | undefined {
  return TRAINING_MAPS.find((map) => map.id === mapId)
}
