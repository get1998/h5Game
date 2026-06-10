/** 玩家称号存档 */
export interface TitleState {
  /** 已解锁称号 id 列表 */
  unlockedTitleIds: string[]
  /** 当前佩戴的称号 id，null 表示未佩戴 */
  equippedTitleId: string | null
}

/** 创建默认称号状态 */
export function createDefaultTitleState(): TitleState {
  return {
    unlockedTitleIds: [],
    equippedTitleId: null,
  }
}
