/** 大境界 */
export const REALM_MAJORS = ['炼气', '筑基', '金丹', '元婴', '化神'] as const
export type RealmMajor = (typeof REALM_MAJORS)[number]

/** 炼气层数（1~15 层） */
export const QI_REFINING_LAYERS = [
  '一层',
  '二层',
  '三层',
  '四层',
  '五层',
  '六层',
  '七层',
  '八层',
  '九层',
  '十层',
  '十一层',
  '十二层',
  '十三层',
  '十四层',
  '十五层',
] as const

/** 筑基及以上小境界 */
export const REALM_SUB_STAGES = ['前期', '中期', '后期', '大圆满'] as const
export type RealmSubStage = (typeof REALM_SUB_STAGES)[number]

/** 完整境界阶段 */
export type RealmStage =
  | `炼气${(typeof QI_REFINING_LAYERS)[number]}`
  | `筑基${RealmSubStage}`
  | `金丹${RealmSubStage}`
  | `元婴${RealmSubStage}`
  | `化神${RealmSubStage}`

/** 旧版境界名 → 新版最低阶段（存档兼容） */
const LEGACY_REALM_MAP: Record<string, RealmStage> = {
  炼气期: '炼气一层',
  筑基期: '筑基前期',
  金丹期: '金丹前期',
  元婴期: '元婴前期',
  化神期: '化神前期',
}

function buildRealmOrder(): RealmStage[] {
  const order: RealmStage[] = []

  for (const layer of QI_REFINING_LAYERS) {
    order.push(`炼气${layer}`)
  }

  for (const major of REALM_MAJORS.slice(1)) {
    for (const sub of REALM_SUB_STAGES) {
      order.push(`${major}${sub}` as RealmStage)
    }
  }

  return order
}

/** 境界顺序（炼气 1~15 层，其后各境前/中/后/大圆满） */
export const REALM_ORDER: RealmStage[] = buildRealmOrder()

/** 各大大境界基础寿元（年） */
export const REALM_MAJOR_LIFESPAN: Record<RealmMajor, number> = {
  炼气: 100,
  筑基: 200,
  金丹: 500,
  元婴: 1000,
  化神: 3000,
}

/** 各境界基础寿元（年，同一大境界内一致） */
export const REALM_LIFESPAN: Record<RealmStage, number> = Object.fromEntries(
  REALM_ORDER.map((realm) => [realm, REALM_MAJOR_LIFESPAN[getRealmMajor(realm)]]),
) as Record<RealmStage, number>

/**
 * 各大境界内累计修为增量（对齐 docs/game_introduce.md 第六节）
 * 炼气 0→1000、筑基 +4000、金丹 +15000、元婴 +80000、化神 +200000
 */
const REALM_MAJOR_XIUWEI_TOTAL: Record<RealmMajor, number> = {
  炼气: 1000,
  筑基: 4000,
  金丹: 15000,
  元婴: 80000,
  化神: 200000,
}

function buildBreakthroughXiuwei(): Record<RealmStage, number> {
  const result = {} as Record<RealmStage, number>

  for (const major of REALM_MAJORS) {
    const stages = REALM_ORDER.filter((realm) => getRealmMajor(realm) === major)
    const total = REALM_MAJOR_XIUWEI_TOTAL[major]
    const perStage = Math.floor(total / stages.length)
    let remainder = total - perStage * stages.length

    stages.forEach((realm, index) => {
      const isLastInMajor = index === stages.length - 1
      const isLastOverall = realm === REALM_ORDER[REALM_ORDER.length - 1]
      if (isLastOverall) {
        result[realm] = 999999
        return
      }
      const extra = isLastInMajor ? remainder : 0
      result[realm] = perStage + extra
    })
  }

  return result
}

/** 各小境界突破所需修为 */
export const REALM_BREAKTHROUGH_XIUWEI: Record<RealmStage, number> = buildBreakthroughXiuwei()

/**
 * 境界闭关基础参数（洞府修为计算核心）
 * - absorptionRate：每秒吸入灵气（境界固定属性）
 * - conversionRate：灵气转化率，每点灵气可转化的修为
 * 灵根 / 功法 / 隐藏属性叠加在转化率上；灵气池余量仅限制实际可吸入量
 */
export interface RealmCultivationBase {
  absorptionRate: number
  conversionRate: number
}

/** 炼气 1 层 ~ 15 层闭关参数区间 */
const QI_REFINING_CULTIVATION_ANCHOR: {
  start: RealmCultivationBase
  end: RealmCultivationBase
} = {
  start: { absorptionRate: 1.6, conversionRate: 0.48 },
  end: { absorptionRate: 2.4, conversionRate: 0.52 },
}

/** 筑基及以上各境前期 ~ 大圆满闭关参数区间 */
const MAJOR_CULTIVATION_ANCHORS: Record<
  Exclude<RealmMajor, '炼气'>,
  { start: RealmCultivationBase; end: RealmCultivationBase }
> = {
  筑基: {
    start: { absorptionRate: 3.2, conversionRate: 0.48 },
    end: { absorptionRate: 4.8, conversionRate: 0.52 },
  },
  金丹: {
    start: { absorptionRate: 8, conversionRate: 0.48 },
    end: { absorptionRate: 12, conversionRate: 0.52 },
  },
  元婴: {
    start: { absorptionRate: 19.2, conversionRate: 0.48 },
    end: { absorptionRate: 28.8, conversionRate: 0.52 },
  },
  化神: {
    start: { absorptionRate: 48, conversionRate: 0.48 },
    end: { absorptionRate: 72, conversionRate: 0.52 },
  },
}

function lerpCultivationBase(
  start: RealmCultivationBase,
  end: RealmCultivationBase,
  t: number,
): RealmCultivationBase {
  return {
    absorptionRate: Number(lerpValue(start.absorptionRate, end.absorptionRate, t).toFixed(2)),
    conversionRate: Number(lerpValue(start.conversionRate, end.conversionRate, t).toFixed(3)),
  }
}

function buildRealmCultivationBase(): Record<RealmStage, RealmCultivationBase> {
  const result = {} as Record<RealmStage, RealmCultivationBase>

  for (const realm of REALM_ORDER) {
    if (realm.startsWith('炼气')) {
      const layerIndex = QI_REFINING_LAYERS.findIndex((layer) => realm === `炼气${layer}`)
      const t = layerIndex / (QI_REFINING_LAYERS.length - 1)
      result[realm] = lerpCultivationBase(
        QI_REFINING_CULTIVATION_ANCHOR.start,
        QI_REFINING_CULTIVATION_ANCHOR.end,
        t,
      )
    } else {
      const major = getRealmMajor(realm) as Exclude<RealmMajor, '炼气'>
      const subIndex = REALM_SUB_STAGES.findIndex((sub) => realm === `${major}${sub}`)
      const t = subIndex / (REALM_SUB_STAGES.length - 1)
      result[realm] = lerpCultivationBase(
        MAJOR_CULTIVATION_ANCHORS[major].start,
        MAJOR_CULTIVATION_ANCHORS[major].end,
        t,
      )
    }
  }

  return result
}

/** 各境界默认吸收率与灵气转化率 */
export const REALM_CULTIVATION_BASE: Record<RealmStage, RealmCultivationBase> =
  buildRealmCultivationBase()

/** 境界基础属性（战斗 + 神识/肉身，不含功法/装备加成） */
export interface RealmBaseStats {
  maxHp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  critRate: number
  critDamage: number
  hitRate: number
  dodgeRate: number
  penetration: number
  shenshi: number
  bodyStrength: number
}

/** 核心属性锚点（参考 docs/game_introduce.md 第四节） */
interface RealmCoreAnchor {
  maxHp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  shenshi: number
  bodyStrength: number
}

/** 炼气 1 层 ~ 15 层属性区间 */
const QI_REFINING_ANCHOR: { start: RealmCoreAnchor; end: RealmCoreAnchor } = {
  start: { maxHp: 100, maxMp: 50, attack: 10, defense: 5, speed: 10, shenshi: 1, bodyStrength: 1 },
  end: { maxHp: 300, maxMp: 150, attack: 30, defense: 15, speed: 30, shenshi: 15, bodyStrength: 15 },
}

/** 筑基及以上各境前期 ~ 大圆满属性区间 */
const MAJOR_SUB_ANCHORS: Record<Exclude<RealmMajor, '炼气'>, { start: RealmCoreAnchor; end: RealmCoreAnchor }> = {
  筑基: {
    start: { maxHp: 500, maxMp: 300, attack: 50, defense: 30, speed: 40, shenshi: 20, bodyStrength: 20 },
    end: { maxHp: 1000, maxMp: 600, attack: 100, defense: 60, speed: 80, shenshi: 40, bodyStrength: 40 },
  },
  金丹: {
    start: { maxHp: 2000, maxMp: 1000, attack: 150, defense: 100, speed: 80, shenshi: 50, bodyStrength: 50 },
    end: { maxHp: 4000, maxMp: 2000, attack: 300, defense: 200, speed: 150, shenshi: 80, bodyStrength: 80 },
  },
  元婴: {
    start: { maxHp: 5000, maxMp: 3000, attack: 400, defense: 250, speed: 150, shenshi: 100, bodyStrength: 100 },
    end: { maxHp: 10000, maxMp: 6000, attack: 800, defense: 500, speed: 250, shenshi: 150, bodyStrength: 150 },
  },
  化神: {
    start: { maxHp: 12000, maxMp: 7000, attack: 900, defense: 550, speed: 260, shenshi: 180, bodyStrength: 180 },
    end: { maxHp: 20000, maxMp: 12000, attack: 1500, defense: 900, speed: 350, shenshi: 250, bodyStrength: 250 },
  },
}

/** 战斗概率属性随境界全程渐变 */
const COMBAT_RATE_ANCHOR = {
  start: { critRate: 0.05, critDamage: 1.5, hitRate: 0.9, dodgeRate: 0.05, penetration: 0 },
  end: { critRate: 0.12, critDamage: 2.0, hitRate: 0.92, dodgeRate: 0.15, penetration: 50 },
}

function lerpValue(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function lerpCoreAnchor(start: RealmCoreAnchor, end: RealmCoreAnchor, t: number): RealmCoreAnchor {
  return {
    maxHp: Math.floor(lerpValue(start.maxHp, end.maxHp, t)),
    maxMp: Math.floor(lerpValue(start.maxMp, end.maxMp, t)),
    attack: Math.floor(lerpValue(start.attack, end.attack, t)),
    defense: Math.floor(lerpValue(start.defense, end.defense, t)),
    speed: Math.floor(lerpValue(start.speed, end.speed, t)),
    shenshi: Math.floor(lerpValue(start.shenshi, end.shenshi, t)),
    bodyStrength: Math.floor(lerpValue(start.bodyStrength, end.bodyStrength, t)),
  }
}

function buildRealmBaseStats(): Record<RealmStage, RealmBaseStats> {
  const result = {} as Record<RealmStage, RealmBaseStats>
  const maxIndex = REALM_ORDER.length - 1

  for (let index = 0; index < REALM_ORDER.length; index++) {
    const realm = REALM_ORDER[index]
    const rateT = maxIndex > 0 ? index / maxIndex : 0
    let core: RealmCoreAnchor

    if (realm.startsWith('炼气')) {
      const layerIndex = QI_REFINING_LAYERS.findIndex((layer) => realm === `炼气${layer}`)
      const t = layerIndex / (QI_REFINING_LAYERS.length - 1)
      core = lerpCoreAnchor(QI_REFINING_ANCHOR.start, QI_REFINING_ANCHOR.end, t)
    } else {
      const major = getRealmMajor(realm) as Exclude<RealmMajor, '炼气'>
      const subIndex = REALM_SUB_STAGES.findIndex((sub) => realm === `${major}${sub}`)
      const t = subIndex / (REALM_SUB_STAGES.length - 1)
      core = lerpCoreAnchor(MAJOR_SUB_ANCHORS[major].start, MAJOR_SUB_ANCHORS[major].end, t)
    }

    result[realm] = {
      ...core,
      critRate: Number(lerpValue(COMBAT_RATE_ANCHOR.start.critRate, COMBAT_RATE_ANCHOR.end.critRate, rateT).toFixed(3)),
      critDamage: Number(lerpValue(COMBAT_RATE_ANCHOR.start.critDamage, COMBAT_RATE_ANCHOR.end.critDamage, rateT).toFixed(2)),
      hitRate: Number(lerpValue(COMBAT_RATE_ANCHOR.start.hitRate, COMBAT_RATE_ANCHOR.end.hitRate, rateT).toFixed(3)),
      dodgeRate: Number(lerpValue(COMBAT_RATE_ANCHOR.start.dodgeRate, COMBAT_RATE_ANCHOR.end.dodgeRate, rateT).toFixed(3)),
      penetration: Math.floor(lerpValue(COMBAT_RATE_ANCHOR.start.penetration, COMBAT_RATE_ANCHOR.end.penetration, rateT)),
    }
  }

  return result
}

/** 各境界基础属性表 */
export const REALM_BASE_STATS: Record<RealmStage, RealmBaseStats> = buildRealmBaseStats()

/**
 * 获取境界所属大境界
 */
export function getRealmMajor(realm: RealmStage): RealmMajor {
  if (realm.startsWith('炼气')) return '炼气'
  if (realm.startsWith('筑基')) return '筑基'
  if (realm.startsWith('金丹')) return '金丹'
  if (realm.startsWith('元婴')) return '元婴'
  return '化神'
}

/**
 * 获取大境界的入门阶段（炼气一层 / 各境前期）
 */
export function getRealmMajorEntry(major: RealmMajor): RealmStage {
  if (major === '炼气') return '炼气一层'
  return `${major}前期` as RealmStage
}

/**
 * 兼容旧存档或旧配置中的境界名
 */
export function normalizeRealm(realm: string): RealmStage {
  if (LEGACY_REALM_MAP[realm]) {
    return LEGACY_REALM_MAP[realm]
  }
  if ((REALM_ORDER as string[]).includes(realm)) {
    return realm as RealmStage
  }
  return '炼气一层'
}

/**
 * 获取境界基础属性
 */
export function getRealmBaseStats(realm: RealmStage): RealmBaseStats {
  return REALM_BASE_STATS[realm]
}

/**
 * 获取境界闭关基础吸收率与灵气转化率
 */
export function getRealmCultivationBase(realm: RealmStage): RealmCultivationBase {
  return REALM_CULTIVATION_BASE[realm]
}

/**
 * 判断当前境界是否达到要求
 */
export function isRealmAtLeast(current: RealmStage, required: RealmStage): boolean {
  return REALM_ORDER.indexOf(current) >= REALM_ORDER.indexOf(required)
}
