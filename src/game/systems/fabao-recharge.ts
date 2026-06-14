import { getDongfuLevelConfig } from '@/game/constants/dongfu'
import type { Dongfu } from '@/game/models/dongfu'
import {
  findFabaoById,
  type Fabao,
  type FabaoState,
} from '@/game/models/fabao'

export interface FabaoRechargeCheck {
  canRecharge: boolean
  reason?: string
  fabao?: Fabao
  /** 本次可充入的灵力 */
  rechargeAmount?: number
}

export interface FabaoRechargeResult {
  success: boolean
  message: string
  dongfu?: Dongfu
  fabaoState?: FabaoState
  recharged?: number
}

/**
 * 检测是否可用洞府灵气为法器充能
 */
export function checkFabaoRecharge(
  dongfu: Dongfu,
  fabaoState: FabaoState,
  fabaoId: string,
): FabaoRechargeCheck {
  const fabao = findFabaoById(fabaoState, fabaoId)
  if (!fabao) {
    return { canRecharge: false, reason: '法器不存在' }
  }

  if (fabao.lingqi >= fabao.maxLingqi) {
    return { canRecharge: false, reason: '法器灵力已满', fabao }
  }

  if (dongfu.lingqi <= 0) {
    return { canRecharge: false, reason: '洞府灵气不足', fabao }
  }

  const needed = fabao.maxLingqi - fabao.lingqi
  const rechargeAmount = Math.min(needed, Math.floor(dongfu.lingqi))

  if (rechargeAmount <= 0) {
    return { canRecharge: false, reason: '洞府灵气不足', fabao }
  }

  return { canRecharge: true, fabao, rechargeAmount }
}

/**
 * 用洞府灵气为法器充能（1:1 转化）
 */
export function rechargeFabaoFromDongfu(
  dongfu: Dongfu,
  fabaoState: FabaoState,
  fabaoId: string,
): FabaoRechargeResult {
  const check = checkFabaoRecharge(dongfu, fabaoState, fabaoId)
  if (!check.canRecharge || !check.fabao || !check.rechargeAmount) {
    return { success: false, message: check.reason ?? '无法充能' }
  }

  const fabao = check.fabao
  const amount = check.rechargeAmount
  const newLingqi = fabao.lingqi + amount

  const updatedOwned = fabaoState.owned.map((item) =>
    item.id === fabaoId ? { ...item, lingqi: newLingqi } : item,
  )

  return {
    success: true,
    message: `为法器充入 ${amount} 点灵力`,
    recharged: amount,
    dongfu: {
      ...dongfu,
      lingqi: dongfu.lingqi - amount,
    },
    fabaoState: {
      ...fabaoState,
      owned: updatedOwned,
    },
  }
}

/**
 * 为全部法器充能至满（优先装备中的法器）
 */
export function rechargeAllFabaosFromDongfu(
  dongfu: Dongfu,
  fabaoState: FabaoState,
): FabaoRechargeResult {
  let currentDongfu = dongfu
  let currentState = fabaoState
  let totalRecharged = 0

  const priorityIds = [
    fabaoState.equippedAttackFabaoId,
    fabaoState.equippedDefenseFabaoId,
    ...fabaoState.owned.map((f) => f.id),
  ].filter((id): id is string => Boolean(id))

  const seen = new Set<string>()
  for (const fabaoId of priorityIds) {
    if (seen.has(fabaoId)) continue
    seen.add(fabaoId)

    const result = rechargeFabaoFromDongfu(currentDongfu, currentState, fabaoId)
    if (result.success && result.dongfu && result.fabaoState && result.recharged) {
      currentDongfu = result.dongfu
      currentState = result.fabaoState
      totalRecharged += result.recharged
    }
  }

  if (totalRecharged <= 0) {
    return { success: false, message: '无需充能或洞府灵气不足' }
  }

  return {
    success: true,
    message: `共为法器充入 ${totalRecharged} 点灵力`,
    recharged: totalRecharged,
    dongfu: currentDongfu,
    fabaoState: currentState,
  }
}

/**
 * 法器充能提示文案
 */
export function buildFabaoRechargeHint(dongfu: Dongfu): string {
  const config = getDongfuLevelConfig(dongfu.level)
  return `洞府灵气 ${Math.floor(dongfu.lingqi)} / ${config.maxLingqi}，可 1:1 为法器充能`
}
