import { getFabaoTemplate } from '@/game/constants/fabao'
import {
  findFabaoById,
  type FabaoState,
  type FabaoType,
} from '@/game/models/fabao'

export interface FabaoEquipResult {
  success: boolean
  message: string
  fabaoState?: FabaoState
}

/**
 * 装备法器到对应槽位
 */
export function equipFabao(
  fabaoState: FabaoState,
  fabaoId: string,
): FabaoEquipResult {
  const fabao = findFabaoById(fabaoState, fabaoId)
  if (!fabao) {
    return { success: false, message: '法器不存在' }
  }

  const template = getFabaoTemplate(fabao.templateId)
  if (!template) {
    return { success: false, message: '法器模板无效' }
  }

  if (template.type === '攻击') {
    return {
      success: true,
      message: `装备攻击法器「${template.name}」`,
      fabaoState: {
        ...fabaoState,
        equippedAttackFabaoId: fabaoId,
      },
    }
  }

  return {
    success: true,
    message: `装备防御法器「${template.name}」`,
    fabaoState: {
      ...fabaoState,
      equippedDefenseFabaoId: fabaoId,
    },
  }
}

/**
 * 卸下法器
 */
export function unequipFabao(
  fabaoState: FabaoState,
  type: FabaoType,
): FabaoEquipResult {
  if (type === '攻击') {
    if (!fabaoState.equippedAttackFabaoId) {
      return { success: false, message: '未装备攻击法器' }
    }
    return {
      success: true,
      message: '已卸下攻击法器',
      fabaoState: {
        ...fabaoState,
        equippedAttackFabaoId: null,
      },
    }
  }

  if (!fabaoState.equippedDefenseFabaoId) {
    return { success: false, message: '未装备防御法器' }
  }

  return {
    success: true,
    message: '已卸下防御法器',
    fabaoState: {
      ...fabaoState,
      equippedDefenseFabaoId: null,
    },
  }
}
