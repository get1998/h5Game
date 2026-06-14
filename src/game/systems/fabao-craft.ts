import {
  buildZhenfaSetupLingshiCost,
  formatZhenfaLingshiCost,
} from '@/game/constants/zhenfa'
import {
  formatFabaoCraftLingshiCost,
  getFabaoTemplate,
  getFabaoTemplateByBlueprint,
  type FabaoTemplate,
} from '@/game/constants/fabao'
import { getItemDefinition } from '@/game/constants/items'
import type { Dongfu } from '@/game/models/dongfu'
import {
  createFabaoFromTemplate,
  type Fabao,
  type FabaoState,
} from '@/game/models/fabao'
import type { InventoryState } from '@/game/models/item'
import {
  getItemCount,
  hasLingshiBreakdown,
  removeItemFromInventory,
  spendLingshiBreakdown,
} from '@/game/systems/inventory'

export interface FabaoUnlockCheck {
  canUnlock: boolean
  reason?: string
  template?: FabaoTemplate
}

export interface FabaoUnlockResult {
  success: boolean
  message: string
  fabaoState?: FabaoState
}

export interface FabaoCraftCheck {
  canCraft: boolean
  reason?: string
  template?: FabaoTemplate
}

export interface FabaoCraftResult {
  success: boolean
  message: string
  fabaoState?: FabaoState
  craftedFabao?: Fabao
}

/**
 * 检测是否可参悟法器图纸
 */
export function checkFabaoBlueprintUnlock(
  fabaoState: FabaoState,
  inventory: InventoryState,
  blueprintItemId?: string,
): FabaoUnlockCheck {
  const template = blueprintItemId
    ? getFabaoTemplateByBlueprint(blueprintItemId)
    : undefined

  if (blueprintItemId && !template) {
    return { canUnlock: false, reason: '无效的法器图纸' }
  }

  if (!template) {
    return { canUnlock: false, reason: '请指定法器图纸' }
  }

  if (fabaoState.unlockedTemplateIds.includes(template.id)) {
    return { canUnlock: false, reason: `已参悟「${template.name}」图纸`, template }
  }

  const blueprintName = getItemDefinition(template.blueprintItemId)?.name ?? '法器图纸'
  if (getItemCount(inventory, template.blueprintItemId) < 1) {
    return { canUnlock: false, reason: `缺少「${blueprintName}」`, template }
  }

  return { canUnlock: true, template }
}

/**
 * 参悟法器图纸：消耗图纸，解锁炼制资格
 */
export function unlockFabaoFromBlueprint(
  fabaoState: FabaoState,
  inventory: InventoryState,
  blueprintItemId: string,
): FabaoUnlockResult {
  const check = checkFabaoBlueprintUnlock(fabaoState, inventory, blueprintItemId)
  if (!check.canUnlock || !check.template) {
    return { success: false, message: check.reason ?? '无法参悟图纸' }
  }

  const template = check.template
  if (!removeItemFromInventory(inventory, template.blueprintItemId, 1)) {
    return { success: false, message: '图纸数量不足' }
  }

  return {
    success: true,
    message: `参悟「${template.name}」图纸，可在洞府炼器台炼制`,
    fabaoState: {
      ...fabaoState,
      unlockedTemplateIds: [...fabaoState.unlockedTemplateIds, template.id],
    },
  }
}

/**
 * 检测是否可在洞府炼制法器
 */
export function checkFabaoCraft(
  dongfu: Dongfu,
  fabaoState: FabaoState,
  inventory: InventoryState,
  templateId: string,
): FabaoCraftCheck {
  const template = getFabaoTemplate(templateId)
  if (!template) {
    return { canCraft: false, reason: '无效的法器模板' }
  }

  if (!fabaoState.unlockedTemplateIds.includes(templateId)) {
    return { canCraft: false, reason: `尚未参悟「${template.name}」图纸`, template }
  }

  if (dongfu.level < template.minDongfuLevel) {
    return {
      canCraft: false,
      reason: `洞府等级不足（需 Lv.${template.minDongfuLevel}）`,
      template,
    }
  }

  const lingshiCost = buildZhenfaSetupLingshiCost(template.craftLingshiPerElement)
  if (!hasLingshiBreakdown(inventory, lingshiCost)) {
    return {
      canCraft: false,
      reason: `五行灵石不足（需 ${formatZhenfaLingshiCost(template.craftLingshiPerElement)}）`,
      template,
    }
  }

  for (const material of template.craftMaterials) {
    const materialName = getItemDefinition(material.itemId)?.name ?? material.itemId
    if (getItemCount(inventory, material.itemId) < material.count) {
      return {
        canCraft: false,
        reason: `缺少「${materialName}」×${material.count}`,
        template,
      }
    }
  }

  return { canCraft: true, template }
}

/**
 * 在洞府炼制法器
 */
export function craftFabao(
  dongfu: Dongfu,
  fabaoState: FabaoState,
  inventory: InventoryState,
  templateId: string,
): FabaoCraftResult {
  const check = checkFabaoCraft(dongfu, fabaoState, inventory, templateId)
  if (!check.canCraft || !check.template) {
    return { success: false, message: check.reason ?? '无法炼制' }
  }

  const template = check.template
  const lingshiCost = buildZhenfaSetupLingshiCost(template.craftLingshiPerElement)
  if (!spendLingshiBreakdown(inventory, lingshiCost).success) {
    return { success: false, message: '五行灵石不足' }
  }

  for (const material of template.craftMaterials) {
    if (!removeItemFromInventory(inventory, material.itemId, material.count)) {
      return { success: false, message: '炼制材料不足' }
    }
  }

  const craftedFabao = createFabaoFromTemplate(templateId)
  if (!craftedFabao) {
    return { success: false, message: '炼制失败' }
  }

  return {
    success: true,
    message: `炼制成功：${template.tier}${template.type}法器「${template.name}」`,
    craftedFabao,
    fabaoState: {
      ...fabaoState,
      owned: [...fabaoState.owned, craftedFabao],
    },
  }
}

/**
 * 构建炼制条件摘要文案
 */
export function buildFabaoCraftSummary(template: FabaoTemplate): string {
  const materials = template.craftMaterials
    .map((m) => {
      const name = getItemDefinition(m.itemId)?.name ?? m.itemId
      return `${name}×${m.count}`
    })
    .join('、')
  return `${template.tier}${template.type} · ${formatFabaoCraftLingshiCost(template.craftLingshiPerElement)} · ${materials}`
}
