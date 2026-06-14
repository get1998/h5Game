/** 游戏逻辑层统一导出 */
export * from '@/game/types'
export * from '@/game/constants/realm'
export * from '@/game/constants/elements'
export * from '@/game/constants/skill-level'
export * from '@/game/constants/skill-mastery-passive'
export * from '@/game/constants/skill-params'
export * from '@/game/constants/gongfa-cultivation'
export * from '@/game/constants/gongfa'
export * from '@/game/constants/maps'
export * from '@/game/constants/monster-stat-modifiers'
export * from '@/game/constants/time'
export * from '@/game/constants/dongfu'
export * from '@/game/constants/dongfu-treasure'
export * from '@/game/models/market'
export * from '@/game/systems/dongfu-treasure-loot'
export * from '@/game/systems/market-refresh'
export * from '@/game/constants/breakthrough'
export * from '@/game/constants/combat-balance'
export * from '@/game/systems/human-monster-combat'
export * from '@/game/systems/dongfu-upgrade'
export * from '@/game/formulas/breakthrough-success'
export * from '@/game/constants/zhenfa'
export * from '@/game/constants/zhenfa-treasure'
export * from '@/game/systems/zhenfa-setup'
export * from '@/game/systems/zhenfa-loot'
export * from '@/game/systems/zhenfa-maintain'
export * from '@/game/constants/fabao'
export * from '@/game/models/fabao'
export * from '@/game/systems/fabao-craft'
export * from '@/game/systems/fabao-recharge'
export * from '@/game/systems/fabao-combat'
export * from '@/game/systems/fabao-equip'
export * from '@/game/models/player'
export * from '@/game/models/dongfu'
export * from '@/game/models/gongfa'
export * from '@/game/models/skill'
export * from '@/game/models/monster'
export * from '@/game/models/reincarnation'
export * from '@/game/constants/battle-reward'
export * from '@/game/formulas/battle-xiuwei'
export * from '@/game/formulas/damage'
export * from '@/game/formulas/combat-snapshot'
export * from '@/game/formulas/combat-power'
export * from '@/game/systems/stat-contributors'
export * from '@/game/formulas/gongfa-exp'
export * from '@/game/formulas/realm-breakthrough'
export * from '@/game/formulas/skill-proficiency'
export * from '@/game/systems/cultivation'
export * from '@/game/systems/lingqi'
export * from '@/game/systems/gongfa-cultivation'
export * from '@/game/systems/gongfa'
export * from '@/game/systems/battle'
export * from '@/game/systems/combat-context'
export * from '@/game/systems/combat-resolve'
export * from '@/game/systems/map-loot'
export * from '@/game/systems/monster-combat'
export * from '@/game/systems/skill-combat'
export * from '@/game/systems/player-skill-library'
export * from '@/game/systems/monster-skill-combat'
export * from '@/game/systems/battle-debuffs'
export * from '@/game/systems/skill-proficiency'
export * from '@/game/systems/time'
export * from '@/game/constants/achievements'
export * from '@/game/constants/titles'
export * from '@/game/models/achievement'
export * from '@/game/models/title'
export * from '@/game/systems/achievement'
export * from '@/game/systems/title'
export * from '@/game/constants/items'
export * from '@/game/constants/market'
export * from '@/game/models/item'
export * from '@/game/models/lingshi'
export * from '@/game/systems/inventory'
export * from '@/game/systems/market'
export * from '@/game/formulas/battle-lingshi'

/** 3D 战斗渲染器接口（后期接入 Three.js / Cocos） */
export interface IBattleRenderer {
  mount(container: HTMLElement): void
  unmount(): void
  playAttack?(attacker: 'player' | 'monster'): Promise<void>
  playHit?(target: 'player' | 'monster'): Promise<void>
}

/** 文字战斗渲染器（当前默认实现） */
export class TextBattleRenderer implements IBattleRenderer {
  mount(_container: HTMLElement): void {
    // 文字模式无需 Canvas
  }

  unmount(): void {
    // noop
  }
}
