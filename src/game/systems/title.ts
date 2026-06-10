import { getTitleDefinition } from '@/game/constants/titles'
import type { TitleState } from '@/game/models/title'

/** 称号操作结果 */
export interface TitleActionResult {
  success: boolean
  message: string
}

/**
 * 解锁称号（已拥有则跳过）
 */
export function unlockTitle(state: TitleState, titleId: string): boolean {
  const definition = getTitleDefinition(titleId)
  if (!definition) return false
  if (state.unlockedTitleIds.includes(titleId)) return false
  state.unlockedTitleIds.push(titleId)
  return true
}

/**
 * 批量解锁称号
 */
export function unlockTitles(state: TitleState, titleIds: string[]): string[] {
  const newlyUnlocked: string[] = []
  for (const titleId of titleIds) {
    if (unlockTitle(state, titleId)) {
      newlyUnlocked.push(titleId)
    }
  }
  return newlyUnlocked
}

/**
 * 佩戴称号
 */
export function equipTitle(state: TitleState, titleId: string | null): TitleActionResult {
  if (titleId === null) {
    state.equippedTitleId = null
    return { success: true, message: '已卸下称号。' }
  }

  const definition = getTitleDefinition(titleId)
  if (!definition) {
    return { success: false, message: '称号不存在。' }
  }
  if (!state.unlockedTitleIds.includes(titleId)) {
    return { success: false, message: '尚未解锁该称号。' }
  }

  state.equippedTitleId = titleId
  return { success: true, message: `已佩戴称号「${definition.name}」。` }
}

/**
 * 获取当前佩戴称号名称
 */
export function getEquippedTitleName(state: TitleState): string | null {
  if (!state.equippedTitleId) return null
  return getTitleDefinition(state.equippedTitleId)?.name ?? null
}
