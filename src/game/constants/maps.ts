import type { ElementType, RealmStage } from '@/game/types'
import type { MonsterTier } from '@/game/models/monster'

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

/** 怪物模板公共字段 */
interface MonsterTemplateBase {
  id: string
  name: string
  realm: RealmStage
  element: ElementType
  tier: MonsterTier
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

/** 历练地图 */
export interface TrainingMap {
  id: string
  name: string
  description: string
  requiredRealm: RealmStage
  /** 自动战斗每回合间隔（毫秒） */
  roundIntervalMs: number
  /** 击败怪物后遇下一只的间隔（毫秒） */
  encounterDelayMs: number
  /** 地图掉落表（功法等，击败怪物后结算） */
  drops: MapDropItem[]
  monsters: MonsterTemplate[]
}

/** 历练地图列表 */
export const TRAINING_MAPS: TrainingMap[] = [
  {
    id: 'map_qingling',
    name: '青灵山',
    description: '山脚小径，适合炼气低阶修士初入历练。',
    requiredRealm: '炼气一层',
    roundIntervalMs: 800,
    encounterDelayMs: 1200,
    drops: [
      { type: 'gongfa', gongfaId: 'gongfa_ruijin', rate: 0.08 },
      { type: 'gongfa', gongfaId: 'gongfa_qingmu', rate: 0.08 },
      { type: 'gongfa', gongfaId: 'gongfa_chiyan', rate: 0.08 },
      { type: 'gongfa', gongfaId: 'gongfa_runquan', rate: 0.08 },
      { type: 'gongfa', gongfaId: 'gongfa_jiantu', rate: 0.08 },
    ],
    monsters: [
      {
        id: 'monster_bandit',
        name: '山贼',
        kind: '人',
        realm: '炼气三层',
        element: '金',
        tier: '普通',
        statModifiers: {
          defense: -2,
          hitRate: -0.05,
        },
      },
      {
        id: 'monster_wolf',
        name: '野狼',
        kind: '妖兽',
        realm: '炼气五层',
        element: '木',
        tier: '普通',
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
        realm: '炼气二层',
        element: '木',
        tier: '普通',
        statModifiers: {
          maxHp: -18,
          attack: -2,
          defense: -3,
          speed: 8,
          dodgeRate: 0.06,
          critDamage: -0.1,
        },
      },
    ],
  },
  {
    id: 'map_youwu',
    name: '幽雾林',
    description: '迷雾笼罩的密林，筑基低阶修士方可深入。',
    requiredRealm: '筑基前期',
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
        realm: '筑基中期',
        element: '水',
        tier: '精英',
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
        realm: '筑基前期',
        element: '木',
        tier: '普通',
        statModifiers: {
          maxMp: 20,
          speed: 6,
          dodgeRate: 0.03,
        },
      },
    ],
  },
  {
    id: 'map_chiyan',
    name: '赤焰谷',
    description: '地火喷涌的险地，金丹低阶修士方能镇压妖兽。',
    requiredRealm: '金丹前期',
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
        realm: '金丹中期',
        element: '火',
        tier: '精英',
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
        realm: '金丹后期',
        element: '火',
        tier: '首领',
        kind: '妖兽',
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
    ],
  },
]

/**
 * 根据 ID 获取历练地图
 */
export function getTrainingMapById(mapId: string): TrainingMap | undefined {
  return TRAINING_MAPS.find((map) => map.id === mapId)
}
