import type { LingshiByElement } from '@/game/models/lingshi'
import { createEmptyLingshi } from '@/game/models/lingshi'
import { ALL_ELEMENTS } from '@/game/constants/elements'

/** 阵法等级配置 */
export interface ZhenfaLevelConfig {
  level: number
  name: string
  /** 每秒聚灵恢复（闭关时生效，非闭关时与洞府恢复叠加） */
  recoveryPerSec: number
  /** 布阵/升阵时每系灵石消耗（0 级无花费） */
  setupLingshiPerElement?: number
  /** 布阵所需宝物 id */
  setupTreasureId?: string
  /** 解锁所需图纸 id */
  blueprintItemId?: string
  /** 运转消耗：每 interval 秒每系灵石 */
  maintainLingshiPerElement?: number
  maintainIntervalSec?: number
}

/** 阵法等级表（0 为未布置） */
export const ZHENFA_LEVEL_CONFIG: ZhenfaLevelConfig[] = [
  { level: 0, name: '无阵法', recoveryPerSec: 0 },
  {
    level: 1,
    name: '一品聚灵阵',
    recoveryPerSec: 10,
    setupLingshiPerElement: 10,
    setupTreasureId: 'item_zhenfa_treasure_01',
    blueprintItemId: 'item_zhenfa_blueprint_01',
    maintainLingshiPerElement: 1,
    maintainIntervalSec: 10,
  },
  {
    level: 2,
    name: '二品聚灵阵',
    recoveryPerSec: 20,
    setupLingshiPerElement: 20,
    setupTreasureId: 'item_zhenfa_treasure_02',
    blueprintItemId: 'item_zhenfa_blueprint_02',
    maintainLingshiPerElement: 2,
    maintainIntervalSec: 10,
  },
  {
    level: 3,
    name: '三品聚灵阵',
    recoveryPerSec: 40,
    setupLingshiPerElement: 40,
    setupTreasureId: 'item_zhenfa_treasure_03',
    blueprintItemId: 'item_zhenfa_blueprint_03',
    maintainLingshiPerElement: 4,
    maintainIntervalSec: 10,
  },
  {
    level: 4,
    name: '四品聚灵阵',
    recoveryPerSec: 80,
    setupLingshiPerElement: 80,
    setupTreasureId: 'item_zhenfa_treasure_04',
    blueprintItemId: 'item_zhenfa_blueprint_04',
    maintainLingshiPerElement: 8,
    maintainIntervalSec: 10,
  },
  {
    level: 5,
    name: '五品聚灵阵',
    recoveryPerSec: 160,
    setupLingshiPerElement: 160,
    setupTreasureId: 'item_zhenfa_treasure_05',
    blueprintItemId: 'item_zhenfa_blueprint_05',
    maintainLingshiPerElement: 16,
    maintainIntervalSec: 10,
  },
]

export const ZHENFA_MAX_LEVEL = ZHENFA_LEVEL_CONFIG.length - 1

/**
 * 根据阵法等级获取配置
 */
export function getZhenfaLevelConfig(level: number): ZhenfaLevelConfig {
  const clamped = Math.max(0, Math.min(level, ZHENFA_MAX_LEVEL))
  return ZHENFA_LEVEL_CONFIG[clamped]
}

/**
 * 获取下一级阵法布阵目标
 */
export function getZhenfaSetupTarget(currentLevel: number): ZhenfaLevelConfig | null {
  if (currentLevel >= ZHENFA_MAX_LEVEL) return null
  return getZhenfaLevelConfig(currentLevel + 1)
}

/**
 * 获取下一级待解锁阵法（图纸参悟目标）
 */
export function getZhenfaUnlockTarget(unlockedMaxLevel: number): ZhenfaLevelConfig | null {
  if (unlockedMaxLevel >= ZHENFA_MAX_LEVEL) return null
  return getZhenfaLevelConfig(unlockedMaxLevel + 1)
}

/**
 * 构建布阵所需的五行灵石消耗
 */
export function buildZhenfaSetupLingshiCost(perElement: number): LingshiByElement {
  const cost = createEmptyLingshi()
  if (perElement <= 0) return cost
  for (const element of ALL_ELEMENTS) {
    cost[element] = perElement
  }
  return cost
}

/**
 * 格式化五行灵石消耗文案
 */
export function formatZhenfaLingshiCost(perElement: number): string {
  if (perElement <= 0) return ''
  return `金木水火土各 ${perElement}（共 ${perElement * ALL_ELEMENTS.length}）`
}
