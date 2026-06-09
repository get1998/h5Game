/** 五行属性 */
export type ElementType = '金' | '木' | '水' | '火' | '土'

/** 境界阶段（炼气 1~15 层，筑基及以上前/中/后/大圆满） */
export type { RealmMajor, RealmStage, RealmSubStage } from '@/game/constants/realm'

/** 功法品质 */
export type GongfaQuality = '凡品' | '黄品' | '玄品' | '地品' | '天品' | '仙品' | '神品'

/** 灵根类型 */
export type SpiritRootType = '单灵根' | '双灵根' | '杂灵根'

/** 战斗日志条目 */
export interface BattleLogEntry {
  id: string
  text: string
  type: 'info' | 'damage' | 'heal' | 'crit' | 'miss' | 'system'
  timestamp: number
}

/** 挂机状态 */
export interface IdleState {
  isRunning: boolean
  lastTickAt: number
  accumulatedSeconds: number
  /** 未结算的小数修为（跨 tick 累积，避免每秒取整丢进度） */
  xiuweiRemainder: number
}
