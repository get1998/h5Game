import {
  getDongfuUpgradeTreasureId,
} from '@/game/constants/dongfu-treasure'
import {
  getRealmCultivationBase,
  type RealmStage,
} from '@/game/constants/realm'

/** 洞府灵气池目标可支撑闭关秒数（与锚点境界吸收率相乘） */
export const DONGFU_LINGQI_BUFFER_SECONDS = 90

/** 非闭关时洞府基础恢复 = 锚点吸收率 × 该比例 */
export const DONGFU_RECOVERY_RATIO = 0.12

/** 洞府等级原始配置（灵气数值由锚点境界推算） */
interface DongfuLevelSpec {
  level: number
  name: string
  /** 灵气上限/恢复速率的锚点境界 */
  anchorRealm: RealmStage
  /** 升级至本级所需灵石（1 级为初始洞府，无花费） */
  upgradeCostLingshi?: number
}

/** 洞府等级配置 */
export interface DongfuLevelConfig {
  level: number
  name: string
  /** 灵气上限 */
  maxLingqi: number
  /** 非闭关时每秒基础聚灵恢复 */
  recoveryPerSec: number
  /** 锚点境界（展示用） */
  anchorRealm: RealmStage
  /** 升级至本级所需灵石 */
  upgradeCostLingshi?: number
  /** 升级至本级所需宝物 id */
  upgradeTreasureId?: string
}

const DONGFU_LEVEL_SPECS: DongfuLevelSpec[] = [
  { level: 1, name: '简陋洞府', anchorRealm: '炼气一层' },
  { level: 2, name: '清幽洞府', anchorRealm: '炼气三层', upgradeCostLingshi: 200 },
  { level: 3, name: '灵气洞府', anchorRealm: '炼气五层', upgradeCostLingshi: 500 },
  { level: 4, name: '聚灵洞府', anchorRealm: '炼气八层', upgradeCostLingshi: 1200 },
  { level: 5, name: '仙家洞府', anchorRealm: '炼气十一层', upgradeCostLingshi: 3000 },
  { level: 6, name: '福地洞天', anchorRealm: '筑基中期', upgradeCostLingshi: 8000 },
  { level: 7, name: '灵脉洞府', anchorRealm: '金丹前期', upgradeCostLingshi: 20000 },
  { level: 8, name: '仙府', anchorRealm: '金丹大圆满', upgradeCostLingshi: 50000 },
  { level: 9, name: '洞天福地', anchorRealm: '元婴中期', upgradeCostLingshi: 120000 },
  { level: 10, name: '无上仙府', anchorRealm: '化神前期', upgradeCostLingshi: 300000 },
]

/**
 * 根据锚点境界推算洞府灵气参数
 */
export function calcDongfuLingqiStats(anchorRealm: RealmStage): {
  maxLingqi: number
  recoveryPerSec: number
} {
  const { absorptionRate } = getRealmCultivationBase(anchorRealm)
  return {
    maxLingqi: Math.round(absorptionRate * DONGFU_LINGQI_BUFFER_SECONDS),
    recoveryPerSec: Number((absorptionRate * DONGFU_RECOVERY_RATIO).toFixed(2)),
  }
}

function buildDongfuLevelConfig(spec: DongfuLevelSpec): DongfuLevelConfig {
  const lingqiStats = calcDongfuLingqiStats(spec.anchorRealm)
  return {
    level: spec.level,
    name: spec.name,
    anchorRealm: spec.anchorRealm,
    maxLingqi: lingqiStats.maxLingqi,
    recoveryPerSec: lingqiStats.recoveryPerSec,
    upgradeCostLingshi: spec.upgradeCostLingshi,
    upgradeTreasureId: getDongfuUpgradeTreasureId(spec.level),
  }
}

/** 洞府等级表（1 级起） */
export const DONGFU_LEVEL_CONFIG: DongfuLevelConfig[] = DONGFU_LEVEL_SPECS.map(buildDongfuLevelConfig)

export const DONGFU_MAX_LEVEL = DONGFU_LEVEL_CONFIG.length

/**
 * 根据洞府等级获取配置
 */
export function getDongfuLevelConfig(level: number): DongfuLevelConfig {
  const clamped = Math.max(1, Math.min(level, DONGFU_MAX_LEVEL))
  return DONGFU_LEVEL_CONFIG[clamped - 1]
}

/**
 * 获取洞府灵气上限
 */
export function getDongfuMaxLingqi(level: number): number {
  return getDongfuLevelConfig(level).maxLingqi
}

/**
 * 获取下一级洞府升级条件（已满级时返回 null）
 */
export function getDongfuUpgradeTarget(currentLevel: number): DongfuLevelConfig | null {
  if (currentLevel >= DONGFU_MAX_LEVEL) return null
  return getDongfuLevelConfig(currentLevel + 1)
}
