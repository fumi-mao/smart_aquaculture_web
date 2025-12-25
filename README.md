# 智能水产养殖 Web 端 (Smart Aquaculture Web)

用于塘口管理的商业级 Web 应用程序。

## 功能特性

- **用户认证**: 支持通过 OpenID 进行安全登录。
- **仪表盘**: 
  - 塘口概览，实时监控关键指标（pH 值、盐度、氨氮等）。
  - 养殖场信息与员工列表展示。
  - 系统事件动态时间轴。
- **塘口详情**:
  - 水质趋势图表（pH、溶解氧、温度等趋势分析）。
  - AI 智能分析报告（养殖情况检测）。
  - 历史数据查看。
- **数据导出**: 支持导出养殖数据报表。

## 技术栈

- **前端框架**: React, TypeScript, Vite
- **样式方案**: Tailwind CSS
- **状态管理**: Zustand
- **路由管理**: React Router DOM
- **图表组件**: Recharts
- **图标库**: Lucide React
- **HTTP 客户端**: Axios

## 安装与运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   应用将在 `http://localhost:5173` 启动。

3. **构建生产版本**
   ```bash
   npm run build
   ```

## 配置说明

- **API 代理**: 在 `vite.config.ts` 中配置，将 `/api` 请求转发至 `https://api.pondrobotics.com`。
- **环境配置**: 
  - 基础 API 路径: `/api/v1`
  - 登录接口: `/api/v1/auth/login/apifox`

## 注意事项

- 部分数据（如侧边栏信息、动态时间轴）使用模拟数据进行演示，因为具体 API 在当前上下文中尚未完全详细说明。
- `getPondList` 和 `login` 函数已连接到后端 API 结构。
- 项目遵循严格的前端代码规范，禁止使用硬编码配置。
