import { getFabaoTemplate } from '@/game/constants/fabao'

/** 法器品阶 */
export type FabaoTier = '下品' | '中品' | '上品'

/** 法器类型 */
export type FabaoType = '攻击' | '防御'

/** 玩家法器实例 */
export interface Fabao {
  /** 实例唯一 id */
  id: string
  /** 模板 id */
  templateId: string
  /** 当前灵力 */
  lingqi: number
  /** 灵力上限 */
  maxLingqi: number
}

/** 法器存档状态 */
export interface FabaoState {
  /** 已拥有的法器实例 */
  owned: Fabao[]
  /** 已参悟可炼制的模板 id */
  unlockedTemplateIds: string[]
  /** 装备的攻击法器实例 id */
  equippedAttackFabaoId: string | null
  /** 装备的防御法器实例 id */
  equippedDefenseFabaoId: string | null
}

let fabaoIdCounter = 0

/**
 * 生成法器实例 id
 */
export function generateFabaoId(): string {
  fabaoIdCounter += 1
  return `fabao_${Date.now()}_${fabaoIdCounter}`
}

/** 创建默认法器状态 */
export function createDefaultFabaoState(): FabaoState {
  return {
    owned: [],
    unlockedTemplateIds: [],
    equippedAttackFabaoId: null,
    equippedDefenseFabaoId: null,
  }
}

/**
 * 规范化法器存档（兼容旧存档）
 */
export function normalizeFabaoState(raw?: Partial<FabaoState> | null): FabaoState {
  if (!raw) return createDefaultFabaoState()

  const owned = (raw.owned ?? []).map((item) => {
    const template = getFabaoTemplate(item.templateId)
    const maxLingqi = item.maxLingqi ?? template?.maxLingqi ?? 80
    return {
      id: item.id,
      templateId: item.templateId,
      maxLingqi,
      lingqi: Math.max(0, Math.min(item.lingqi ?? maxLingqi, maxLingqi)),
    }
  })

  return {
    owned,
    unlockedTemplateIds: [...(raw.unlockedTemplateIds ?? [])],
    equippedAttackFabaoId: raw.equippedAttackFabaoId ?? null,
    equippedDefenseFabaoId: raw.equippedDefenseFabaoId ?? null,
  }
}

/**
 * 从模板创建法器实例（满灵力）
 */
export function createFabaoFromTemplate(templateId: string): Fabao | null {
  const template = getFabaoTemplate(templateId)
  if (!template) return null

  return {
    id: generateFabaoId(),
    templateId,
    lingqi: template.maxLingqi,
    maxLingqi: template.maxLingqi,
  }
}

/**
 * 按实例 id 查找法器
 */
export function findFabaoById(state: FabaoState, fabaoId: string): Fabao | undefined {
  return state.owned.find((f) => f.id === fabaoId)
}

/**
 * 获取装备的攻击法器
 */
export function getEquippedAttackFabao(state: FabaoState): Fabao | undefined {
  if (!state.equippedAttackFabaoId) return undefined
  return findFabaoById(state, state.equippedAttackFabaoId)
}

/**
 * 获取装备的防御法器
 */
export function getEquippedDefenseFabao(state: FabaoState): Fabao | undefined {
  if (!state.equippedDefenseFabaoId) return undefined
  return findFabaoById(state, state.equippedDefenseFabaoId)
}

/**
 * 法器是否可释放技能攻击（灵力充足）
 */
export function isFabaoSkillReady(fabao: Fabao | undefined, lingqiCost: number): boolean {
  return Boolean(fabao && lingqiCost > 0 && fabao.lingqi >= lingqiCost)
}

/**
 * @deprecated 使用 isFabaoSkillReady；保留兼容旧引用
 */
export function isFabaoActive(fabao: Fabao | undefined): boolean {
  return Boolean(fabao && fabao.lingqi > 0)
}
