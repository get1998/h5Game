import {
  getRealmBaseStats,
  getRealmCultivationBase,
  REALM_LIFESPAN,
} from '@/game/constants/realm'
import {
  calcRealmBreakthroughStatMultiplier,
  scaleRealmBaseStatsByMultiplier,
} from '@/game/formulas/realm-breakthrough'
import type { Gongfa } from '@/game/models/gongfa'
import type { ElementType, RealmStage, SpiritRootType } from '@/game/types'

/** 玩家修炼属性（由境界同步，闭关结算读取） */
export interface CultivationStats {
  /** 每秒吸入灵气 */
  absorptionRate: number
  /** 基础灵气转化率（修为/灵气） */
  conversionRate: number
  /** 功法转化率 影响功法修炼效率 */
  gongfaConversionRate: number
  /** 功法经验获取倍率，影响修炼该功法的速度 */
  gongfaExpMultiplier: number
  /** 技能熟练度获取倍率，影响修炼技能的速度 */
  skillProficiencyMultiplier: number
}

/** 玩家战斗属性 */
export interface CombatStats {
  /** 当前气血 */
  hp: number
  /** 气血上限 */
  maxHp: number
  /** 当前灵力 */
  mp: number
  /** 灵力上限 */
  maxMp: number
  /** 攻击力 */
  attack: number
  /** 防御力 */
  defense: number
  /** 出手速度 */
  speed: number
  /** 暴击率（小数，如 0.05 表示 5%） */
  critRate: number
  /** 暴击伤害倍率（如 1.5 表示 150%） */
  critDamage: number
  /** 命中率（小数） */
  hitRate: number
  /** 闪避率（小数） */
  dodgeRate: number
  /** 穿透，无视目标部分防御 */
  penetration: number
}

/** 玩家特殊属性 */
export interface SpecialStats {
  /** 悟性，影响功法修炼效率 */
  comprehension: number
  /** 丹毒累积值，过高会影响服药效果 */
  pillPoison: number
  /** 因果值，影响奇遇与劫难触发 */
  karma: number
}

/** 玩家实体 */
export interface Player {
  /** 角色姓名 */
  name: string
  /** 当前境界 */
  realm: RealmStage
  /** 灵根类型（单灵根 / 双灵根等） */
  spiritRootType: SpiritRootType
  /** 灵根五行属性列表 */
  spiritRootElements: ElementType[]
  /** 角色经历标题，如「山村猎户」 */
  originTitle: string
  /** 角色经历简介 */
  originSummary: string
  /** 当前年龄 */
  age: number
  /** 寿元上限 */
  lifespan: number
  /** 修为值，用于突破境界 */
  xiuwei: number
  /** 当前境界连续突破失败次数（成功后清零） */
  breakthroughFailures: number
  /** 修炼属性（吸收率、转化率，随境界同步） */
  cultivation: CultivationStats
  /** 神识强度 */
  shenshi: number
  /** 肉身强度 */
  bodyStrength: number
  /** 战斗属性 */
  combat: CombatStats
  /** 特殊属性 */
  special: SpecialStats
}

/**
 * 按当前境界同步玩家修炼属性（吸收率、转化率）
 */
export function resyncPlayerCultivationStats(player: Player): void {
  const cultivationBase = getRealmCultivationBase(player.realm)
  player.cultivation = {
    absorptionRate: cultivationBase.absorptionRate,
    gongfaConversionRate: 1,
    gongfaExpMultiplier: 1,
    skillProficiencyMultiplier: 1,
    conversionRate: cultivationBase.conversionRate,
  }
}

/**
 * 按当前境界重算玩家基础属性
 * @param options.preserveResourceRatio 为 true 时按原气血、灵力比例保留当前值
 * @param options.gongfa 突破时传入主修功法，按品阶×突破灵根×突破五行缩放战斗属性（与闭关倍率独立）
 * @param options.resetCombat 为 true 时重算战斗/神识/肉身（突破或境界表强制刷新）
 */
export function resyncPlayerRealmStats(
  player: Player,
  options: {
    preserveResourceRatio?: boolean
    gongfa?: Gongfa
    resetCombat?: boolean
  } = {},
): void {
  const { preserveResourceRatio = false, gongfa, resetCombat = false } = options

  resyncPlayerCultivationStats(player)
  if (!resetCombat) return

  const realmBase = getRealmBaseStats(player.realm)
  const multiplier = calcRealmBreakthroughStatMultiplier(player, gongfa)
  const base = scaleRealmBaseStatsByMultiplier(realmBase, multiplier)

  const hpRatio = preserveResourceRatio && player.combat.maxHp > 0
    ? player.combat.hp / player.combat.maxHp
    : 1
  const mpRatio = preserveResourceRatio && player.combat.maxMp > 0
    ? player.combat.mp / player.combat.maxMp
    : 1

  player.lifespan = REALM_LIFESPAN[player.realm]
  player.shenshi = base.shenshi
  player.bodyStrength = base.bodyStrength
  player.combat = {
    hp: Math.max(1, Math.min(base.maxHp, Math.floor(base.maxHp * hpRatio))),
    maxHp: base.maxHp,
    mp: Math.max(0, Math.min(base.maxMp, Math.floor(base.maxMp * mpRatio))),
    maxMp: base.maxMp,
    attack: base.attack,
    defense: base.defense,
    speed: base.speed,
    critRate: base.critRate,
    critDamage: base.critDamage,
    hitRate: base.hitRate,
    dodgeRate: base.dodgeRate,
    penetration: base.penetration,
  }
}

/**
 * 将境界基础属性应用到玩家（突破时调用，气血/灵力回满）
 * @param gongfa 主修功法，用于计算突破属性增幅
 */
export function applyRealmBaseToPlayer(
  player: Player,
  realm: RealmStage,
  gongfa?: Gongfa,
): void {
  player.realm = realm
  resyncPlayerRealmStats(player, { gongfa, resetCombat: true })
}

/** 创建新角色默认数据 */
export function createDefaultPlayer(name = '无名修士'): Player {
  const player: Player = {
    name,
    realm: '炼气一层',
    spiritRootType: '单灵根',
    spiritRootElements: ['火'],
    originTitle: '',
    originSummary: '',
    age: 16,
    lifespan: 100,
    xiuwei: 0,
    breakthroughFailures: 0,
    cultivation: {
      absorptionRate: 4,
      conversionRate: 0.46,
      gongfaConversionRate: 1,
      gongfaExpMultiplier: 1,
      skillProficiencyMultiplier: 1,
    },
    shenshi: 1,
    bodyStrength: 1,
    combat: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 10,
      defense: 5,
      speed: 10,
      critRate: 0.05,
      critDamage: 1.5,
      hitRate: 0.9,
      dodgeRate: 0.05,
      penetration: 0,
    },
    special: {
      comprehension: 10,
      pillPoison: 0,
      karma: 0,
    },
  }

  applyRealmBaseToPlayer(player, '炼气一层')
  return player
}
