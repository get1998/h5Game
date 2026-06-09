/** 游戏逻辑层统一导出 */
export * from '@/game/types'
export * from '@/game/constants/realm'
export * from '@/game/constants/elements'
export * from '@/game/constants/gongfa'
export * from '@/game/constants/maps'
export * from '@/game/constants/time'
export * from '@/game/constants/dongfu'
export * from '@/game/constants/zhenfa'
export * from '@/game/models/player'
export * from '@/game/models/dongfu'
export * from '@/game/models/gongfa'
export * from '@/game/models/skill'
export * from '@/game/models/monster'
export * from '@/game/formulas/damage'
export * from '@/game/formulas/gongfa-exp'
export * from '@/game/systems/cultivation'
export * from '@/game/systems/lingqi'
export * from '@/game/systems/gongfa'
export * from '@/game/systems/battle'
export * from '@/game/systems/map-loot'
export * from '@/game/systems/monster-combat'
export * from '@/game/systems/skill-combat'
export * from '@/game/systems/time'

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
