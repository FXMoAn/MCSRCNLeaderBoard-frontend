---
version: alpha
name: MCSR-CN Leaderboard
description: 中国我的世界 Java 版速通榜单，以成绩比较和快速查找为主。
colors:
  primary: '#00bcd4'
  background: '#222222'
  surface: '#333333'
  raised: '#444444'
  border: '#555555'
  text: '#ffffff'
  secondary: '#cccccc'
rounded:
  DEFAULT: '8px'
  panel: '12px'
spacing:
  page-gutter: '16px'
  page-max: '1200px'
omitted:
  - section: typography
    reason: 保留现有浏览器字体继承；IGT 使用 RankCard 已有的 Courier New。
components:
  pagination: {}
  select: {}
  navigation: {}
---

# 视觉约定

面向中文速通社区。榜单属于数据产品，重点是玩家、排名和 IGT；保留前三名矿锭图标作为识别特征。新功能沿用深色表面与青色交互提示，不引入新的字体或主题。

## 样式来源

本文件记录已有运行时约定，不生成 CSS。`src/assets/main.css` 维护页面底色；`src/App.vue` 维护导航；`src/views/Rank/Rank.vue` 与 `components/RankCard.vue` 维护榜单；`src/components/Pagination.vue` 维护分页。

基础控件复用 `src/components/common`。色值变更应先修改对应运行时来源，再更新本文；目前不新增一套平行主题。

## 布局与层次

榜单和筛选最大宽度 1200px，页面左右留 16px。面板圆角 12px，分页控件圆角 8px。主导航在 1024px 及以下使用现有抽屉，为登录后的额外入口预留空间。

榜单在 780px 及以下显示排名、玩家、IGT 三列，宽度分别为 44px、自适应、112px，列间距 8px。日期和视频通过每条成绩的原生 details 展开，玩家名可换行。年度榜单入口在 1400px 及以下进入正常文档流，避免覆盖内容。分页在手机上分行，页码、条数和操作按钮保持可见。

## 控件与反馈

分页按钮使用现有深色表面、青色 hover/focus、禁用透明度和明确文字。每页条数复用 `PrimarySelect`，接受操作系统提供的原生选择菜单；不自制弹出层。

IGT 保留等宽数字。新纪录含文字提示；筛选无结果时显示原因和调整提示。刷新入口使用 `PrimaryButton`，与最近成功加载时间一起位于榜单上方。首次加载复用 `Loading`；后续刷新保留已有成绩，失败提供文字说明和重试入口。

新交互提供可见键盘焦点。分页、导航和年度入口的新增动画处理尊重 reduced-motion。历史页面的其他样式仍由各自组件维护，后续统一时再迁移。
