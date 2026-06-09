# 修仙挂机 · H5

Vue 3 + Vite + TypeScript + Pinia 文字修仙挂机游戏框架。

## 技术栈

- **Vue 3** — 界面层
- **Vite** — 构建工具
- **TypeScript** — 类型安全
- **Pinia** — 状态管理
- **Vue Router** — 路由
- **Sass** — 样式

## 目录结构

```
src/
├── game/                 # 纯游戏逻辑（无 UI 依赖，可复用于服务端校验 / 3D 引擎）
│   ├── constants/        # 境界、五行、功法常量
│   ├── formulas/         # 伤害、功法经验等公式
│   ├── models/           # 玩家、功法、怪物实体
│   ├── systems/          # 修炼、战斗、功法系统
│   └── types/            # 类型定义
├── stores/               # Pinia 状态
├── views/                # 页面
├── components/           # 组件
│   ├── layout/           # 布局、TabBar
│   └── BattleCanvas/     # 战斗渲染占位（后续接入 Three.js）
├── router/
└── styles/
docs/                     # 游戏设计文档
```

## 开发

```powershell
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产包
npm run build
```

## 已实现功能（框架级）

- 洞府：闭关挂机、离线收益结算
- 修炼：境界进度、突破
- 功法：列表展示、切换主修功法
- 历练：文字回合战斗、战斗日志
- 角色：属性面板、本地存档

## 后续扩展

- 接入 Three.js 实现 `IBattleRenderer` 3D 战斗渲染
- 对接后端 API 做存档同步与数值校验
- 补充丹药、法宝、随机事件等系统
