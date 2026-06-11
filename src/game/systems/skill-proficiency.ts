import type { SkillProficiencyLevelUpResult } from '@/game/formulas/skill-proficiency'
import type { Gongfa } from '@/game/models/gongfa'
import {
  getSkillById,
  getSkillLevelFromProficiency,
  type SkillLevel,
  type SkillProficiencyMap,
} from '@/game/models/skill'

/**
 * 为功法内指定技能增加熟练度，并在跨越门槛时返回等级晋升信息
 */
export function addSkillProficiency(
  gongfa: Gongfa,
  skillId: string,
  gain: number,
): SkillProficiencyLevelUpResult | null {
  if (gain <= 0) return null

  const skill = getSkillById(skillId)
  if (!skill || skill.sourceGongfaId !== gongfa.id) return null

  const map: SkillProficiencyMap = { ...gongfa.skillProficiency }
  const previousProficiency = map[skillId] ?? 0
    const previousLevel = getSkillLevelFromProficiency(previousProficiency, gongfa.quality)

    const nextProficiency = previousProficiency + gain
    map[skillId] = nextProficiency
    gongfa.skillProficiency = map

    const newLevel = getSkillLevelFromProficiency(nextProficiency, gongfa.quality)
  if (newLevel === previousLevel) return null

  return {
    skillId,
    skillName: skill.name,
    previousLevel,
    newLevel,
    proficiency: nextProficiency,
    message: `「${skill.name}」熟练度提升，达到${newLevel}！`,
  }
}

/**
 * 批量增加多技能熟练度（同一场战斗多次施法）
 */
export function addSkillProficiencyBatch(
  gongfa: Gongfa,
  gains: Array<{ skillId: string; amount: number }>,
): SkillProficiencyLevelUpResult[] {
  const results: SkillProficiencyLevelUpResult[] = []
  const levelUps = new Map<string, SkillLevel>()

  for (const { skillId, amount } of gains) {
    if (amount <= 0) continue

    const skill = getSkillById(skillId)
    if (!skill || skill.sourceGongfaId !== gongfa.id) continue

    const map: SkillProficiencyMap = { ...gongfa.skillProficiency }
    const previousProficiency = map[skillId] ?? 0
    const previousLevel = levelUps.get(skillId)
      ?? getSkillLevelFromProficiency(previousProficiency, gongfa.quality)

    const nextProficiency = previousProficiency + amount
    map[skillId] = nextProficiency
    gongfa.skillProficiency = map

    const newLevel = getSkillLevelFromProficiency(nextProficiency, gongfa.quality)
    if (newLevel !== previousLevel) {
      levelUps.set(skillId, newLevel)
      results.push({
        skillId,
        skillName: skill.name,
        previousLevel,
        newLevel,
        proficiency: nextProficiency,
        message: `「${skill.name}」熟练度提升，达到${newLevel}！`,
      })
    }
  }

  return results
}
