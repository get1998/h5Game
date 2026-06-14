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

/** 各境界顺序（炼气 1~15 层，其后各境前/中/后/大圆满） */
export const REALM_ORDER: RealmStage[] = buildRealmOrder()

/** 小境界完整配置（修为 / 寿元 / 核心战斗属性） */
interface RealmStageData {
  breakthroughXiuwei: number
  lifespan: number
  maxHp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  shenshi: number
  bodyStrength: number
}

/**
 * 炼气 1~15 层（累计修为约 6000；寿元 100→115）
 * 战斗属性 ×2.5、突破修为基准 ×3 × 全局倍率，与凡品功法等级等比成长对齐
 */
const QI_REFINING_STAGE_DATA: readonly RealmStageData[] = [
  { breakthroughXiuwei: 108, lifespan: 100, maxHp: 250, maxMp: 125, attack: 25, defense: 13, speed: 25, shenshi: 1, bodyStrength: 1 },
  { breakthroughXiuwei: 123, lifespan: 101, maxHp: 285, maxMp: 143, attack: 28, defense: 15, speed: 28, shenshi: 2, bodyStrength: 2 },
  { breakthroughXiuwei: 138, lifespan: 102, maxHp: 323, maxMp: 160, attack: 30, defense: 18, speed: 33, shenshi: 3, bodyStrength: 3 },
  { breakthroughXiuwei: 153, lifespan: 103, maxHp: 358, maxMp: 178, attack: 33, defense: 20, speed: 35, shenshi: 4, bodyStrength: 4 },
  { breakthroughXiuwei: 162, lifespan: 104, maxHp: 393, maxMp: 198, attack: 35, defense: 23, speed: 40, shenshi: 5, bodyStrength: 5 },
  { breakthroughXiuwei: 174, lifespan: 105, maxHp: 428, maxMp: 215, attack: 38, defense: 25, speed: 43, shenshi: 6, bodyStrength: 6 },
  { breakthroughXiuwei: 186, lifespan: 106, maxHp: 465, maxMp: 233, attack: 40, defense: 28, speed: 48, shenshi: 7, bodyStrength: 7 },
  { breakthroughXiuwei: 198, lifespan: 107, maxHp: 500, maxMp: 250, attack: 43, defense: 30, speed: 50, shenshi: 8, bodyStrength: 8 },
  { breakthroughXiuwei: 210, lifespan: 108, maxHp: 535, maxMp: 268, attack: 45, defense: 33, speed: 53, shenshi: 9, bodyStrength: 9 },
  { breakthroughXiuwei: 222, lifespan: 109, maxHp: 573, maxMp: 285, attack: 48, defense: 33, speed: 58, shenshi: 10, bodyStrength: 10 },
  { breakthroughXiuwei: 234, lifespan: 110, maxHp: 608, maxMp: 303, attack: 53, defense: 35, speed: 60, shenshi: 11, bodyStrength: 11 },
  { breakthroughXiuwei: 246, lifespan: 111, maxHp: 643, maxMp: 323, attack: 55, defense: 38, speed: 65, shenshi: 12, bodyStrength: 12 },
  { breakthroughXiuwei: 258, lifespan: 112, maxHp: 678, maxMp: 340, attack: 58, defense: 40, speed: 68, shenshi: 13, bodyStrength: 13 },
  { breakthroughXiuwei: 273, lifespan: 113, maxHp: 715, maxMp: 358, attack: 63, defense: 43, speed: 73, shenshi: 14, bodyStrength: 14 },
  { breakthroughXiuwei: 315, lifespan: 115, maxHp: 750, maxMp: 375, attack: 75, defense: 45, speed: 75, shenshi: 15, bodyStrength: 15 },
]

/**
 * 筑基各小境（累计修为约 +24000；寿元 200→300）
 */
const FOUNDATION_STAGE_DATA: readonly RealmStageData[] = [
  { breakthroughXiuwei: 2400, lifespan: 200, maxHp: 1250, maxMp: 750, attack: 125, defense: 75, speed: 100, shenshi: 20, bodyStrength: 20 },
  { breakthroughXiuwei: 2700, lifespan: 230, maxHp: 1668, maxMp: 1000, attack: 168, defense: 100, speed: 133, shenshi: 27, bodyStrength: 27 },
  { breakthroughXiuwei: 3300, lifespan: 260, maxHp: 2083, maxMp: 1250, attack: 208, defense: 125, speed: 168, shenshi: 33, bodyStrength: 33 },
  { breakthroughXiuwei: 3600, lifespan: 300, maxHp: 2500, maxMp: 1500, attack: 250, defense: 150, speed: 200, shenshi: 40, bodyStrength: 40 },
]

/**
 * 金丹各小境（累计修为约 +90000；寿元 500→860）
 */
const GOLDEN_CORE_STAGE_DATA: readonly RealmStageData[] = [
  { breakthroughXiuwei: 9000, lifespan: 500, maxHp: 5000, maxMp: 2500, attack: 375, defense: 250, speed: 200, shenshi: 50, bodyStrength: 50 },
  { breakthroughXiuwei: 10500, lifespan: 600, maxHp: 6668, maxMp: 3333, attack: 500, defense: 333, speed: 258, shenshi: 60, bodyStrength: 60 },
  { breakthroughXiuwei: 12000, lifespan: 720, maxHp: 8333, maxMp: 4168, attack: 625, defense: 418, speed: 318, shenshi: 70, bodyStrength: 70 },
  { breakthroughXiuwei: 13500, lifespan: 860, maxHp: 10000, maxMp: 5000, attack: 750, defense: 500, speed: 375, shenshi: 80, bodyStrength: 80 },
]

/**
 * 元婴各小境（累计修为约 +480000；寿元 1000→2200）
 */
const NASCENT_SOUL_STAGE_DATA: readonly RealmStageData[] = [
  { breakthroughXiuwei: 45000, lifespan: 1000, maxHp: 12500, maxMp: 7500, attack: 1000, defense: 625, speed: 375, shenshi: 100, bodyStrength: 100 },
  { breakthroughXiuwei: 54000, lifespan: 1300, maxHp: 16668, maxMp: 10000, attack: 1333, defense: 833, speed: 458, shenshi: 117, bodyStrength: 117 },
  { breakthroughXiuwei: 63000, lifespan: 1700, maxHp: 20833, maxMp: 12500, attack: 1668, defense: 1043, speed: 543, shenshi: 133, bodyStrength: 133 },
  { breakthroughXiuwei: 78000, lifespan: 2200, maxHp: 25000, maxMp: 15000, attack: 2000, defense: 1250, speed: 625, shenshi: 150, bodyStrength: 150 },
]

/**
 * 化神各小境（累计修为约 +1200000；寿元 3000→6000）
 * 化神大圆满为当前版本顶境，突破所需修为设为极大值
 */
const SPIRIT_SEVERANCE_STAGE_DATA: readonly RealmStageData[] = [
  { breakthroughXiuwei: 120000, lifespan: 3000, maxHp: 30000, maxMp: 17500, attack: 2250, defense: 1375, speed: 650, shenshi: 180, bodyStrength: 180 },
  { breakthroughXiuwei: 135000, lifespan: 3600, maxHp: 36668, maxMp: 21668, attack: 2750, defense: 1668, speed: 725, shenshi: 203, bodyStrength: 203 },
  { breakthroughXiuwei: 150000, lifespan: 4400, maxHp: 43333, maxMp: 25833, attack: 3250, defense: 1958, speed: 800, shenshi: 227, bodyStrength: 227 },
  { breakthroughXiuwei: 195000, lifespan: 5400, maxHp: 50000, maxMp: 30000, attack: 3750, defense: 2250, speed: 875, shenshi: 250, bodyStrength: 250 },
]

const MAJOR_STAGE_DATA: Record<
  Exclude<RealmMajor, '炼气'>,
  readonly RealmStageData[]
> = {
  筑基: FOUNDATION_STAGE_DATA,
  金丹: GOLDEN_CORE_STAGE_DATA,
  元婴: NASCENT_SOUL_STAGE_DATA,
  化神: SPIRIT_SEVERANCE_STAGE_DATA,
}

/** 化神大圆满突破所需修为（当前版本顶境） */
const SPIRIT_SEVERANCE_PEAK_XIUWEI = 999999

/** 突破修为全局倍率（表内基准 × 该系数 = 实际突破所需） */
export const REALM_BREAKTHROUGH_XIUWEI_SCALE = 2

function scaleBreakthroughXiuwei(base: number): number {
  if (base >= SPIRIT_SEVERANCE_PEAK_XIUWEI) return base
  return Math.round(base * REALM_BREAKTHROUGH_XIUWEI_SCALE)
}

function buildRealmStageDataMap(): Record<RealmStage, RealmStageData> {
  const result = {} as Record<RealmStage, RealmStageData>

  QI_REFINING_LAYERS.forEach((layer, index) => {
    result[`炼气${layer}`] = QI_REFINING_STAGE_DATA[index]
  })

  for (const major of REALM_MAJORS.slice(1)) {
    REALM_SUB_STAGES.forEach((sub, index) => {
      result[`${major}${sub}` as RealmStage] = MAJOR_STAGE_DATA[major as Exclude<RealmMajor, '炼气'>][index]
    })
  }

  result['化神大圆满'] = {
    ...SPIRIT_SEVERANCE_STAGE_DATA[3],
    breakthroughXiuwei: SPIRIT_SEVERANCE_PEAK_XIUWEI,
    lifespan: 6000,
  }

  return result
}

const REALM_STAGE_DATA = buildRealmStageDataMap()

/** 各大大境界基础寿元（年，取该境大圆满寿元，供展示/兼容） */
export const REALM_MAJOR_LIFESPAN: Record<RealmMajor, number> = {
  炼气: QI_REFINING_STAGE_DATA[QI_REFINING_STAGE_DATA.length - 1].lifespan,
  筑基: FOUNDATION_STAGE_DATA[FOUNDATION_STAGE_DATA.length - 1].lifespan,
  金丹: GOLDEN_CORE_STAGE_DATA[GOLDEN_CORE_STAGE_DATA.length - 1].lifespan,
  元婴: NASCENT_SOUL_STAGE_DATA[NASCENT_SOUL_STAGE_DATA.length - 1].lifespan,
  化神: 6000,
}

/** 各小境界寿元（年） */
export const REALM_LIFESPAN: Record<RealmStage, number> = Object.fromEntries(
  REALM_ORDER.map((realm) => [realm, REALM_STAGE_DATA[realm].lifespan]),
) as Record<RealmStage, number>

/** 各小境界突破所需修为 */
export const REALM_BREAKTHROUGH_XIUWEI: Record<RealmStage, number> = Object.fromEntries(
  REALM_ORDER.map((realm) => [
    realm,
    scaleBreakthroughXiuwei(REALM_STAGE_DATA[realm].breakthroughXiuwei),
  ]),
) as Record<RealmStage, number>

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
  start: { absorptionRate: 4, conversionRate: 0.46 },
  end: { absorptionRate: 6, conversionRate: 0.54 },
}

/** 筑基及以上各境前期 ~ 大圆满闭关参数区间 */
const MAJOR_CULTIVATION_ANCHORS: Record<
  Exclude<RealmMajor, '炼气'>,
  { start: RealmCultivationBase; end: RealmCultivationBase }
> = {
  筑基: {
    start: { absorptionRate: 8, conversionRate: 0.46 },
    end: { absorptionRate: 12, conversionRate: 0.54 },
  },
  金丹: {
    start: { absorptionRate: 20, conversionRate: 0.44 },
    end: { absorptionRate: 30, conversionRate: 0.56 },
  },
  元婴: {
    start: { absorptionRate: 48, conversionRate: 0.42 },
    end: { absorptionRate: 72, conversionRate: 0.58 },
  },
  化神: {
    start: { absorptionRate: 120, conversionRate: 0.4 },
    end: { absorptionRate: 180, conversionRate: 0.6 },
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

/** 战斗概率属性随境界全程渐变 */
const COMBAT_RATE_ANCHOR = {
  start: { critRate: 0.05, critDamage: 1.5, hitRate: 0.9, dodgeRate: 0.05, penetration: 0 },
  end: { critRate: 0.12, critDamage: 2.0, hitRate: 0.92, dodgeRate: 0.15, penetration: 50 },
}

function lerpValue(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function buildRealmBaseStats(): Record<RealmStage, RealmBaseStats> {
  const result = {} as Record<RealmStage, RealmBaseStats>
  const maxIndex = REALM_ORDER.length - 1

  for (let index = 0; index < REALM_ORDER.length; index++) {
    const realm = REALM_ORDER[index]
    const data = REALM_STAGE_DATA[realm]
    const rateT = maxIndex > 0 ? index / maxIndex : 0

    result[realm] = {
      maxHp: data.maxHp,
      maxMp: data.maxMp,
      attack: data.attack,
      defense: data.defense,
      speed: data.speed,
      shenshi: data.shenshi,
      bodyStrength: data.bodyStrength,
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
 * 获取境界寿元上限
 */
export function getRealmLifespan(realm: RealmStage): number {
  return REALM_LIFESPAN[realm]
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
 * 获取境界在全局顺序中的索引（炼气一层 = 0）
 */
export function getRealmIndex(realm: RealmStage): number {
  return REALM_ORDER.indexOf(realm)
}

/**
 * 获取偏移若干小境界后的境界（越界时钳制到边界）
 */
export function getRealmAtOffset(realm: RealmStage, offset: number): RealmStage {
  const index = getRealmIndex(realm) + offset
  if (index <= 0) return REALM_ORDER[0]
  if (index >= REALM_ORDER.length) return REALM_ORDER[REALM_ORDER.length - 1]
  return REALM_ORDER[index]
}

/**
 * 与境界等比的推荐功法等级（凡品校准基准：炼气一层≈1级，化神大圆满≈满级）
 * @param realm 当前境界
 * @param maxLevel 功法最高等级，默认 10
 */
export function getRealmProportionalGongfaLevel(realm: RealmStage, maxLevel = 10): number {
  const realmIndex = getRealmIndex(realm)
  if (realmIndex < 0) return 1
  const totalStages = REALM_ORDER.length
  return Math.max(1, Math.min(maxLevel, Math.round((realmIndex + 1) * maxLevel / totalStages)))
}

/**
 * 计算怪物境界相对玩家境界的差值（怪物索引 − 玩家索引）
 * - 正值：怪物境界更高
 * - 0：同境
 * - 负值：怪物境界低于玩家
 */
export function getRealmDiff(playerRealm: RealmStage, monsterRealm: RealmStage): number {
  return getRealmIndex(monsterRealm) - getRealmIndex(playerRealm)
}

/**
 * 判断当前境界是否达到要求
 */
export function isRealmAtLeast(current: RealmStage, required: RealmStage): boolean {
  return getRealmIndex(current) >= getRealmIndex(required)
}

/**
 * 当前境界突破所需修为
 */
export function getRealmBreakthroughXiuwei(realm: RealmStage): number {
  return REALM_BREAKTHROUGH_XIUWEI[realm]
}

/**
 * 当前境界还可积累的修为余量
 */
export function getRealmXiuweiRoom(player: { realm: RealmStage; xiuwei: number }): number {
  return Math.max(0, REALM_BREAKTHROUGH_XIUWEI[player.realm] - player.xiuwei)
}

/**
 * 当前境界修为是否已满（达到突破所需）
 */
export function isRealmXiuweiFull(player: { realm: RealmStage; xiuwei: number }): boolean {
  return getRealmXiuweiRoom(player) <= 0
}

/**
 * 在 [minRealm, maxRealm] 闭区间内随机选取一个境界（含两端，均匀分布）
 */
export function pickRandomRealmInRange(
  minRealm: RealmStage,
  maxRealm: RealmStage,
): RealmStage {
  const minIndex = getRealmIndex(minRealm)
  const maxIndex = getRealmIndex(maxRealm)
  const low = Math.min(minIndex, maxIndex)
  const high = Math.max(minIndex, maxIndex)
  const index = low + Math.floor(Math.random() * (high - low + 1))
  return REALM_ORDER[index]
}

/**
 * 在 [minRealm, maxRealm] 闭区间内按权重随机选取境界（低境界权重更高）
 * 权重规则：区间内从低到高依次为 span²、(span-1)²、…、1²
 * 例：span=4 时权重 16,9,4,1 → 约 53% / 30% / 13% / 3%（线性递减约 40% / 30% / 20% / 10%）
 */
export function pickRandomRealmInRangeWeighted(
  minRealm: RealmStage,
  maxRealm: RealmStage,
): RealmStage {
  const minIndex = getRealmIndex(minRealm)
  const maxIndex = getRealmIndex(maxRealm)
  const low = Math.min(minIndex, maxIndex)
  const high = Math.max(minIndex, maxIndex)
  const span = high - low + 1

  if (span <= 1) {
    return REALM_ORDER[low]
  }

  let totalWeight = 0
  for (let i = 0; i < span; i++) {
    const tier = span - i
    totalWeight += tier * tier
  }

  let roll = Math.random() * totalWeight
  for (let i = 0; i < span; i++) {
    const tier = span - i
    roll -= tier * tier
    if (roll <= 0) {
      return REALM_ORDER[low + i]
    }
  }

  return REALM_ORDER[low]
}
