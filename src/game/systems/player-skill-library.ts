import { formatSkillMasteryPassiveDescription, isSkillMasteryPassiveUnlocked } from '@/game/constants/skill-mastery-passive'
import { getFabaoTemplate } from '@/game/constants/fabao'
import type { FabaoState } from '@/game/models/fabao'
import type { Gongfa } from '@/game/models/gongfa'
import {
  BATTLE_LOADOUT_FIRST_SKILL_SLOT,
  BATTLE_LOADOUT_SLOT_COUNT,
  clonePlayerSkillState,
  countEquippedSkills,
  createDefaultPlayerSkillState,
  createEmptyEquippedSkillSlots,
  getBattleLoadoutSlotKind,
  getBattleLoadoutSlotLabel,
  MAX_EQUIPPED_BATTLE_SKILLS,
  toSkillSlotArrayIndex,
  type LearnedSkillRecord,
  type PlayerSkillState,
} from '@/game/models/player-skill'
import {
  calcEffectiveSkillProficiencyGain,
  getSkillById,
  getSkillProficiency,
  getUnlockedSkills,
  isCastableSkill,
  SKILL_CATEGORY_LABEL,
  type Skill,
  type SkillProficiencyMap,
} from '@/game/models/skill'

export interface PlayerBattleSkillLoadout {
  skills: Skill[]
  proficiencyMap: SkillProficiencyMap
  gongfaById: Map<string, Gongfa>
}

export interface PlayerSkillDisplayItem {
  id: string
  name: string
  typeLabel: string
  categoryLabel: string
  sourceGongfaName: string
  sourceGongfaId: string
  sourceGongfaQuality: Gongfa['quality']
  isCastable: boolean
  isEquipped: boolean
  equippedSlotIndex: number | null
  canEquip: boolean
  equipHint: string
  proficiency: number
  /** 是否已达圆满 */
  isMasteryUnlocked: boolean
  /** 圆满永久被动文案（未圆满时为空） */
  masteryPassiveText: string
}

export interface BattleLoadoutSlotDisplayItem {
  slotIndex: number
  kind: ReturnType<typeof getBattleLoadoutSlotKind>
  label: string
  isEmpty: boolean
  name: string
  subText: string
  contentId: string | null
  slotClass: string
}

/**
 * 从旧存档 equippedSkillIds 迁移到固定技能栏
 */
export function migrateEquippedSkillIdsToSlots(
  equippedSkillIds: string[] | undefined,
): (string | null)[] {
  const slots = createEmptyEquippedSkillSlots()
  const legacyIds = equippedSkillIds ?? []

  for (let i = 0; i < legacyIds.length && i < MAX_EQUIPPED_BATTLE_SKILLS; i += 1) {
    slots[i] = legacyIds[i] ?? null
  }

  return slots
}

/**
 * 规范化玩家技能库（兼容旧存档字段）
 */
export function normalizePlayerSkillState(
  raw: Partial<PlayerSkillState> & { equippedSkillIds?: string[] } | undefined,
): PlayerSkillState {
  if (!raw) return createDefaultPlayerSkillState()

  const equippedSkillSlots = raw.equippedSkillSlots
    ? [...raw.equippedSkillSlots]
    : migrateEquippedSkillIdsToSlots(raw.equippedSkillIds)

  while (equippedSkillSlots.length < MAX_EQUIPPED_BATTLE_SKILLS) {
    equippedSkillSlots.push(null)
  }

  return {
    learned: { ...(raw.learned ?? {}) },
    equippedSkillSlots: equippedSkillSlots.slice(0, MAX_EQUIPPED_BATTLE_SKILLS),
  }
}

/**
 * 查找技能所在栏位索引（技能栏数组下标 0-3）
 */
export function findEquippedSkillSlotIndex(
  state: PlayerSkillState,
  skillId: string,
): number | null {
  const index = state.equippedSkillSlots.indexOf(skillId)
  return index >= 0 ? index : null
}

/**
 * 从功法列表同步已领悟技能（功法升级解锁后写入技能库）
 */
export function syncLearnedSkillsFromGongfaList(
  state: PlayerSkillState,
  gongfaList: Gongfa[],
): string[] {
  const newlyLearned: string[] = []

  for (const gongfa of gongfaList) {
    const unlocked = getUnlockedSkills(gongfa.id, gongfa.level)
    for (const skill of unlocked) {
      const existing = state.learned[skill.id]
      const proficiency = Math.max(
        existing?.proficiency ?? 0,
        getSkillProficiency(gongfa.skillProficiency, skill.id),
      )

      if (!existing) {
        newlyLearned.push(skill.id)
      }

      state.learned[skill.id] = {
        sourceGongfaId: gongfa.id,
        proficiency,
      }

      const gongfaProficiency = gongfa.skillProficiency[skill.id] ?? 0
      if (proficiency > gongfaProficiency) {
        gongfa.skillProficiency = {
          ...gongfa.skillProficiency,
          [skill.id]: proficiency,
        }
      } else if (proficiency > 0 && gongfaProficiency === 0) {
        gongfa.skillProficiency = {
          ...gongfa.skillProficiency,
          [skill.id]: proficiency,
        }
      }
    }
  }

  autoEquipNewCastableSkills(state, newlyLearned)
  return newlyLearned
}

/**
 * 新领悟的主动 / 绝技默认填入首个空技能栏
 */
function autoEquipNewCastableSkills(state: PlayerSkillState, skillIds: string[]): void {
  for (const skillId of skillIds) {
    const skill = getSkillById(skillId)
    if (!skill || !isCastableSkill(skill)) continue
    if (findEquippedSkillSlotIndex(state, skillId) != null) continue
    if (countEquippedSkills(state.equippedSkillSlots) >= MAX_EQUIPPED_BATTLE_SKILLS) continue

    const emptyIndex = state.equippedSkillSlots.findIndex((slot) => slot == null)
    if (emptyIndex < 0) continue
    state.equippedSkillSlots[emptyIndex] = skillId
  }
}

/**
 * 构建战斗用技能熟练度表
 */
export function buildPlayerSkillProficiencyMap(state: PlayerSkillState): SkillProficiencyMap {
  const map: SkillProficiencyMap = {}
  for (const [skillId, record] of Object.entries(state.learned)) {
    map[skillId] = record.proficiency
  }
  return map
}

/**
 * 获取战斗装配中的可释放技能（按技能栏顺序，战斗选技依此优先级）
 */
export function getEquippedBattleSkills(state: PlayerSkillState): Skill[] {
  const skills: Skill[] = []

  for (const skillId of state.equippedSkillSlots) {
    if (!skillId) continue
    const skill = getSkillById(skillId)
    const record = state.learned[skillId]
    if (!skill || !record || !isCastableSkill(skill)) continue
    skills.push(skill)
  }

  return skills
}

/**
 * 构建战斗技能装载（含来源功法映射）
 */
export function buildPlayerBattleSkillLoadout(
  state: PlayerSkillState,
  gongfaList: Gongfa[],
): PlayerBattleSkillLoadout {
  const gongfaById = new Map(gongfaList.map((gongfa) => [gongfa.id, gongfa]))
  return {
    skills: getEquippedBattleSkills(state),
    proficiencyMap: buildPlayerSkillProficiencyMap(state),
    gongfaById,
  }
}

/**
 * 将技能装配到指定技能栏
 * @param skillSlotIndex 技能栏数组下标（0-3）
 */
export function equipSkillToSlot(
  state: PlayerSkillState,
  skillId: string,
  skillSlotIndex: number,
): { success: boolean; message: string; equipped: boolean } {
  const skill = getSkillById(skillId)
  const record = state.learned[skillId]

  if (!skill || !record) {
    return { success: false, message: '尚未领悟该技能。', equipped: false }
  }
  if (!isCastableSkill(skill)) {
    return { success: false, message: '被动技能无需装配，领悟后永久生效。', equipped: false }
  }
  if (skillSlotIndex < 0 || skillSlotIndex >= MAX_EQUIPPED_BATTLE_SKILLS) {
    return { success: false, message: '技能栏位无效。', equipped: false }
  }

  const existingSlot = findEquippedSkillSlotIndex(state, skillId)
  if (existingSlot != null) {
    if (existingSlot === skillSlotIndex) {
      return { success: true, message: `「${skill.name}」已在该栏位。`, equipped: true }
    }
    state.equippedSkillSlots[existingSlot] = null
  }

  const occupiedSkillId = state.equippedSkillSlots[skillSlotIndex]
  if (occupiedSkillId && occupiedSkillId !== skillId) {
    state.equippedSkillSlots[skillSlotIndex] = skillId
    const occupiedSkill = getSkillById(occupiedSkillId)
    return {
      success: true,
      message: `「${skill.name}」已装配至${getBattleLoadoutSlotLabel(skillSlotIndex + BATTLE_LOADOUT_FIRST_SKILL_SLOT)}，替换「${occupiedSkill?.name ?? '原技能'}」。`,
      equipped: true,
    }
  }

  state.equippedSkillSlots[skillSlotIndex] = skillId
  return {
    success: true,
    message: `「${skill.name}」已装配至${getBattleLoadoutSlotLabel(skillSlotIndex + BATTLE_LOADOUT_FIRST_SKILL_SLOT)}。`,
    equipped: true,
  }
}

/**
 * 卸下指定技能栏
 * @param skillSlotIndex 技能栏数组下标（0-3）
 */
export function unequipSkillSlot(
  state: PlayerSkillState,
  skillSlotIndex: number,
): { success: boolean; message: string } {
  if (skillSlotIndex < 0 || skillSlotIndex >= MAX_EQUIPPED_BATTLE_SKILLS) {
    return { success: false, message: '技能栏位无效。' }
  }

  const skillId = state.equippedSkillSlots[skillSlotIndex]
  if (!skillId) {
    return { success: false, message: '该技能栏为空。' }
  }

  const skill = getSkillById(skillId)
  state.equippedSkillSlots[skillSlotIndex] = null
  return {
    success: true,
    message: skill ? `「${skill.name}」已从战斗配置中卸下。` : '已清空该技能栏。',
  }
}

/**
 * 切换技能战斗装配（装配到首个空栏 / 卸下）
 */
export function toggleEquippedSkill(
  state: PlayerSkillState,
  skillId: string,
): { success: boolean; message: string; equipped: boolean } {
  const skill = getSkillById(skillId)
  const record = state.learned[skillId]

  if (!skill || !record) {
    return { success: false, message: '尚未领悟该技能。', equipped: false }
  }
  if (!isCastableSkill(skill)) {
    return { success: false, message: '被动技能无需装配，领悟后永久生效。', equipped: false }
  }

  const existingSlot = findEquippedSkillSlotIndex(state, skillId)
  if (existingSlot != null) {
    return unequipSkillSlot(state, existingSlot)
      .success
      ? { success: true, message: `「${skill.name}」已从战斗配置中卸下。`, equipped: false }
      : { success: false, message: '卸下失败。', equipped: true }
  }

  if (countEquippedSkills(state.equippedSkillSlots) >= MAX_EQUIPPED_BATTLE_SKILLS) {
    return {
      success: false,
      message: `战斗最多配置 ${MAX_EQUIPPED_BATTLE_SKILLS} 个技能，请先卸下其他技能。`,
      equipped: false,
    }
  }

  const emptyIndex = state.equippedSkillSlots.findIndex((slot) => slot == null)
  if (emptyIndex < 0) {
    return { success: false, message: '技能栏已满。', equipped: false }
  }

  return equipSkillToSlot(state, skillId, emptyIndex)
}

/**
 * 按全局栏位索引操作技能栏（2-5 为技能栏）
 */
export function configureSkillLoadoutSlot(
  state: PlayerSkillState,
  globalSlotIndex: number,
  skillId: string | null,
): { success: boolean; message: string } {
  const skillSlotIndex = toSkillSlotArrayIndex(globalSlotIndex)
  if (skillSlotIndex == null) {
    return { success: false, message: '该栏位为法器位，无法配置技能。' }
  }

  if (skillId == null) {
    return unequipSkillSlot(state, skillSlotIndex)
  }

  const result = equipSkillToSlot(state, skillId, skillSlotIndex)
  return { success: result.success, message: result.message }
}

/**
 * 增加技能熟练度并同步回来源功法
 */
export function addPlayerSkillProficiency(
  state: PlayerSkillState,
  gongfaList: Gongfa[],
  skillId: string,
  gain: number,
): { record: LearnedSkillRecord; gongfa: Gongfa | undefined } | null {
  if (gain <= 0) return null

  const record = state.learned[skillId]
  const skill = getSkillById(skillId)
  if (!record || !skill) return null

  const gongfa = gongfaList.find((item) => item.id === record.sourceGongfaId)
  const quality = gongfa?.quality ?? '凡品'
  const effectiveGain = calcEffectiveSkillProficiencyGain(record.proficiency, gain, quality)
  if (effectiveGain <= 0) return null

  record.proficiency += effectiveGain
  if (gongfa) {
    gongfa.skillProficiency = {
      ...gongfa.skillProficiency,
      [skillId]: record.proficiency,
    }
  }

  return { record, gongfa }
}

/**
 * 从旧存档迁移：根据功法列表重建技能库
 */
export function migratePlayerSkillStateFromGongfaList(gongfaList: Gongfa[]): PlayerSkillState {
  const state = createDefaultPlayerSkillState()
  syncLearnedSkillsFromGongfaList(state, gongfaList)
  return state
}

/**
 * 构建 6 栏战斗配置展示（含法器预留位）
 */
export function buildBattleLoadoutDisplayItems(
  skillState: PlayerSkillState,
  fabaoState: FabaoState,
): BattleLoadoutSlotDisplayItem[] {
  const items: BattleLoadoutSlotDisplayItem[] = []

  for (let slotIndex = 0; slotIndex < BATTLE_LOADOUT_SLOT_COUNT; slotIndex += 1) {
    const kind = getBattleLoadoutSlotKind(slotIndex)
    const label = getBattleLoadoutSlotLabel(slotIndex)

    if (kind === 'attack_fabao') {
      const fabaoId = fabaoState.equippedAttackFabaoId
      const fabao = fabaoId
        ? fabaoState.owned.find((item) => item.id === fabaoId)
        : undefined
      const template = fabao ? getFabaoTemplate(fabao.templateId) : undefined
      items.push({
        slotIndex,
        kind,
        label,
        isEmpty: !fabao,
        name: template?.name ?? '未配置',
        subText: fabao
          ? `被动${template?.attack ? ` 攻+${template.attack}` : ''} · 灵力 ${fabao.lingqi}/${fabao.maxLingqi}`
          : '预留攻击法器位',
        contentId: fabaoId,
        slotClass: fabao ? 'loadout-slot loadout-slot--filled' : 'loadout-slot loadout-slot--empty',
      })
      continue
    }

    if (kind === 'defense_fabao') {
      const fabaoId = fabaoState.equippedDefenseFabaoId
      const fabao = fabaoId
        ? fabaoState.owned.find((item) => item.id === fabaoId)
        : undefined
      const template = fabao ? getFabaoTemplate(fabao.templateId) : undefined
      items.push({
        slotIndex,
        kind,
        label,
        isEmpty: !fabao,
        name: template?.name ?? '未配置',
        subText: fabao
          ? `被动${template?.defense ? ` 防+${template.defense}` : ''} · 灵力 ${fabao.lingqi}/${fabao.maxLingqi}`
          : '预留防御法器位',
        contentId: fabaoId,
        slotClass: fabao ? 'loadout-slot loadout-slot--filled' : 'loadout-slot loadout-slot--empty',
      })
      continue
    }

    const skillSlotIndex = toSkillSlotArrayIndex(slotIndex)!
    const skillId = skillState.equippedSkillSlots[skillSlotIndex]
    const skill = skillId ? getSkillById(skillId) : undefined
    items.push({
      slotIndex,
      kind,
      label,
      isEmpty: !skill,
      name: skill?.name ?? '空',
      subText: skill ? (SKILL_CATEGORY_LABEL[skill.category] ?? skill.category) : '点击装配技能',
      contentId: skillId,
      slotClass: skill ? 'loadout-slot loadout-slot--filled' : 'loadout-slot loadout-slot--empty',
    })
  }

  return items
}

/**
 * 构建技能页展示列表
 */
export function buildPlayerSkillDisplayItems(
  state: PlayerSkillState,
  gongfaList: Gongfa[],
): PlayerSkillDisplayItem[] {
  const gongfaById = new Map(gongfaList.map((gongfa) => [gongfa.id, gongfa]))
  const equippedCount = countEquippedSkills(state.equippedSkillSlots)
  const items: PlayerSkillDisplayItem[] = []

  for (const [skillId, record] of Object.entries(state.learned)) {
    const skill = getSkillById(skillId)
    if (!skill) continue

    const sourceGongfa = gongfaById.get(record.sourceGongfaId)
    const sourceGongfaQuality = sourceGongfa?.quality ?? '凡品'
    const isCastable = isCastableSkill(skill)
    const equippedSlotIndex = findEquippedSkillSlotIndex(state, skillId)
    const isEquipped = equippedSlotIndex != null
    const canEquip = isCastable
      && (isEquipped || equippedCount < MAX_EQUIPPED_BATTLE_SKILLS)
    const isMasteryUnlocked = isSkillMasteryPassiveUnlocked(record.proficiency, sourceGongfaQuality)
    const masteryPassiveText = isMasteryUnlocked
      ? formatSkillMasteryPassiveDescription(skill.category, skill.type, sourceGongfaQuality)
      : ''

    let equipHint = '被动 · 领悟后永久生效'
    if (isMasteryUnlocked && masteryPassiveText) {
      equipHint = `圆满 · ${masteryPassiveText}`
    }
    if (isCastable) {
      if (isEquipped && equippedSlotIndex != null) {
        equipHint = `已配置 · ${getBattleLoadoutSlotLabel(equippedSlotIndex + BATTLE_LOADOUT_FIRST_SKILL_SLOT)}`
      } else {
        equipHint = canEquip ? '点击装配到战斗配置' : `技能栏已满（${MAX_EQUIPPED_BATTLE_SKILLS}）`
      }
    }

    items.push({
      id: skill.id,
      name: skill.name,
      typeLabel: skill.type === 'ultimate' ? '绝技' : (skill.type === 'active' ? '主动' : '被动'),
      categoryLabel: SKILL_CATEGORY_LABEL[skill.category] ?? skill.category,
      sourceGongfaName: sourceGongfa?.name ?? skill.sourceGongfa,
      sourceGongfaId: record.sourceGongfaId,
      sourceGongfaQuality,
      isCastable,
      isEquipped,
      equippedSlotIndex,
      canEquip,
      equipHint,
      proficiency: record.proficiency,
      isMasteryUnlocked,
      masteryPassiveText,
    })
  }

  return items.sort((a, b) => {
    if (a.sourceGongfaId !== b.sourceGongfaId) {
      return a.sourceGongfaName.localeCompare(b.sourceGongfaName, 'zh-CN')
    }
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export { clonePlayerSkillState }
