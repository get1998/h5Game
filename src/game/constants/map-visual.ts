/** 地图节点视觉配置（Canvas 渲染用，坐标为 0~1 相对值） */
export interface MapNodeVisual {
  mapId: string
  x: number
  y: number
  /** 节点主题色 */
  color: string
  /** 节点内展示的简短标识 */
  icon: string
}

/** 地图节点连线 */
export interface MapEdgeVisual {
  from: string
  to: string
}

/** 历练地图节点布局（由低到高、自东向西推进，高阶区域向北延伸） */
export const MAP_NODE_VISUALS: MapNodeVisual[] = [
  { mapId: 'map_qingling', x: 0.14, y: 0.74, color: '#5cb87a', icon: '山' },
  { mapId: 'map_luoxing', x: 0.34, y: 0.56, color: '#9a9590', icon: '石' },
  { mapId: 'map_youming', x: 0.54, y: 0.62, color: '#4a9ec9', icon: '泽' },
  { mapId: 'map_duanhun', x: 0.74, y: 0.46, color: '#9b7fd4', icon: '崖' },
  { mapId: 'map_youwu', x: 0.54, y: 0.24, color: '#6b9e8a', icon: '林' },
  { mapId: 'map_chiyan', x: 0.84, y: 0.2, color: '#e8724a', icon: '焰' },
]

/** 地图推进路线连线 */
export const MAP_EDGES: MapEdgeVisual[] = [
  { from: 'map_qingling', to: 'map_luoxing' },
  { from: 'map_luoxing', to: 'map_youming' },
  { from: 'map_youming', to: 'map_duanhun' },
  { from: 'map_duanhun', to: 'map_youwu' },
  { from: 'map_youwu', to: 'map_chiyan' },
]

/**
 * 根据地图 ID 获取节点视觉配置
 */
export function getMapNodeVisual(mapId: string): MapNodeVisual | undefined {
  return MAP_NODE_VISUALS.find((node) => node.mapId === mapId)
}
