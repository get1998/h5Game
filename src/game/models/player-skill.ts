/** 已领悟技能记录（来源功法决定解锁与熟练度品质） */
export interface LearnedSkillRecord {
  /** 来源功法模板 id */
  sourceGongfaId: string
  /** 技能熟练度 */
  proficiency: number
}

/** 战斗栏位类型 */
export type BattleLoadoutSlotKind = 'attack_fabao' | 'defense_fabao' | 'skill'

/** 战斗栏位总数（含攻击 / 防御法器位） */
export const BATTLE_LOADOUT_SLOT_COUNT = 6

/** 攻击法器栏位索引 */
export const BATTLE_LOADOUT_ATTACK_FABAO_SLOT = 0

/** 防御法器栏位索引 */
export const BATTLE_LOADOUT_DEFENSE_FABAO_SLOT = 1

/** 技能栏起始索引 */
export const BATTLE_LOADOUT_FIRST_SKILL_SLOT = 2

/** 可装配技能栏数量 */
export const MAX_EQUIPPED_BATTLE_SKILLS = BATTLE_LOADOUT_SLOT_COUNT - BATTLE_LOADOUT_FIRST_SKILL_SLOT

/** 玩家技能库（与主修功法解耦，切换功法后仍保留） */
export interface PlayerSkillState {
  /** 已领悟技能，key 为技能 id */
  learned: Record<string, LearnedSkillRecord>
  /** 技能栏配置（固定 4 位），null 表示空栏；仅在此配置的技能可在战斗中使用 */
  equippedSkillSlots: (string | null)[]
}

/** 创建空的技能栏配置 */
export function createEmptyEquippedSkillSlots(): (string | null)[] {
  return Array.from({ length: MAX_EQUIPPED_BATTLE_SKILLS }, () => null)
}

/** 统计已配置的技能栏数量 */
export function countEquippedSkills(slots: (string | null)[]): number {
  return slots.filter((skillId): skillId is string => Boolean(skillId)).length
}

/**
 * 获取战斗栏位类型
 * @param slotIndex 全局栏位索引（0-5）
 */
export function getBattleLoadoutSlotKind(slotIndex: number): BattleLoadoutSlotKind {
  if (slotIndex === BATTLE_LOADOUT_ATTACK_FABAO_SLOT) return 'attack_fabao'
  if (slotIndex === BATTLE_LOADOUT_DEFENSE_FABAO_SLOT) return 'defense_fabao'
  return 'skill'
}

/**
 * 获取战斗栏位展示名称
 * @param slotIndex 全局栏位索引（0-5）
 */
export function getBattleLoadoutSlotLabel(slotIndex: number): string {
  if (slotIndex === BATTLE_LOADOUT_ATTACK_FABAO_SLOT) return '攻击法器'
  if (slotIndex === BATTLE_LOADOUT_DEFENSE_FABAO_SLOT) return '防御法器'
  return `技能 ${slotIndex - BATTLE_LOADOUT_FIRST_SKILL_SLOT + 1}`
}

/**
 * 将全局栏位索引转为技能栏数组索引
 */
export function toSkillSlotArrayIndex(globalSlotIndex: number): number | null {
  if (globalSlotIndex < BATTLE_LOADOUT_FIRST_SKILL_SLOT) return null
  const arrayIndex = globalSlotIndex - BATTLE_LOADOUT_FIRST_SKILL_SLOT
  if (arrayIndex < 0 || arrayIndex >= MAX_EQUIPPED_BATTLE_SKILLS) return null
  return arrayIndex
}

/** 克隆玩家技能库状态（用于 store 不可变更新） */
export function clonePlayerSkillState(state: PlayerSkillState): PlayerSkillState {
  return {
    learned: { ...state.learned },
    equippedSkillSlots: [...state.equippedSkillSlots],
  }
}

export function createDefaultPlayerSkillState(): PlayerSkillState {
  return {
    learned: {},
    equippedSkillSlots: createEmptyEquippedSkillSlots(),
  }
}
