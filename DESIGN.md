---
version: alpha
name: MCSR-CN Leaderboard
description: 中国我的世界 Java 版速通榜单，以成绩比较和快速查找为主。
colors:
  primary: '#4caf50'
  nav: '#43a047'
  background: '#131a15'
  surface: '#1d2a21'
  raised: '#243428'
  border: '#31463a'
  text: '#ffffff'
  secondary: '#b5c2b9'
rounded:
  DEFAULT: '8px'
  panel: '12px'
spacing:
  page-gutter: '16px'
  page-max: '1280px'
omitted:
  - section: typography
    reason: 保留现有浏览器字体继承；IGT 使用 RankCard 已有的 Courier New。
components:
  pagination: {}
  select: {}
  navigation: {}
---

# 视觉约定

面向中文速通社区。榜单属于数据产品，重点是玩家、排名和 IGT；保留前三名矿锭图标作为识别特征。整体布局对齐 speedrun.com：绿色导航栏吸顶，榜单页由游戏信息面板、页签栏、类别胶囊（RSG/SSG/FSG）、版本范围选择、榜单表格和右侧边栏组成。

## 样式来源

本文件记录已有运行时约定，不生成 CSS。主题变量（面板、边框、强调绿、导航绿）由 `src/assets/main.css` 维护；`src/App.vue` 维护导航与页脚；`src/views/Rank/Rank.vue` 维护游戏面板、页签与榜单面板；`components/RankCard.vue` 维护表格行；`src/components/Pagination.vue` 维护分页。

基础控件复用 `src/components/common`。色值变更应先修改 `main.css` 中的变量，再更新本文；不新增一套平行主题。

## 布局与层次

页面主列加侧栏最大宽度 1280px，页面左右留 16px。面板圆角 12px，分页控件圆角 8px。主导航绿色吸顶（56px），在 1024px 及以下使用现有抽屉，为登录后的额外入口预留空间。

榜单页由三段组成：游戏信息面板（封面方块、标题、标签、提交成绩按钮）、页签栏（排行榜/统计数据/年度对比，当前页签绿色下划线）、榜单面板（类别胶囊 + 版本选择 + 筛选行 + 表格 + 分页）。侧栏含快捷入口、榜单说明和年度回顾卡片，1100px 及以下移到主列下方。

榜单桌面表头与行共享 Rank.vue 的 `--leaderboard-columns` 和 `--leaderboard-column-gap`：排名 52px、玩家 minmax(0, 1fr)、IGT minmax(120px, 0.55fr)、日期 112px、版本 88px、视频 72px，列间距 12px，两侧内边距 12px。玩家列左对齐，斑马纹区分偶数行。780px 及以下为排名 36px、玩家自适应、IGT 104px，列间距 8px；日期、版本和视频通过每条成绩的原生 details 展开，玩家名可换行。分页在手机上分行，页码、条数和操作按钮保持可见。

## 控件与反馈

分页按钮使用现有深色表面、青色 hover/focus、禁用透明度和明确文字。首页、上一页、页码、下一页、末页顺序排列；手机上跳转输入单独成行。每页条数复用 `PrimarySelect`，接受操作系统提供的原生选择菜单；不自制弹出层。

IGT 保留等宽数字。新纪录含文字提示；筛选无结果时显示原因和调整提示。刷新入口使用 `PrimaryButton`，位于榜单上方；加载进度和失败提示使用同一工具栏。首次加载复用 `Loading`；后续刷新保留已有成绩，失败提供文字说明和重试入口。

新交互提供可见键盘焦点。分页、导航和年度入口的新增动画处理尊重 reduced-motion。历史页面的其他样式仍由各自组件维护，后续统一时再迁移。

## 个人资料与账号信息（2026-11-11）

个人空间将账号信息合并到“个人资料”。页面采用已有深绿主题变量：左右两个等宽面板分别放基本信息（昵称、Minecraft 用户名）与公开链接，1050px 以下上下排列。面板为 12px 圆角、24px 内边距，手机为 20px；字段标签在输入框上方，输入区域统一为 44px 高。保存与重置在面板下方右对齐，“查看我的主页”位于标题右侧。

解释性内容复用 `InfoHint` 的 Element Plus 信息图标与 tooltip，不常驻长说明。昵称及链接由同一个“保存资料”操作提交，Minecraft 绑定和刷新保留独立入口。共享输入框的 stacked 变体仅用于这类资料表单，原有 inline 布局保持不变。

## 榜单控件细节（2026-11-11）

原生下拉框继续由浏览器管理选项弹层。所有单选 select 的箭头与文本内边距由 `main.css` 统一控制：箭头距右边框等于文本距左边框，表单和窄屏使用各自已有的 16px / 14px 留白，普通控件为 12px。各页面只定义上下内边距，避免覆盖共享箭头规则。

榜单工具栏左侧为“只看新成绩”，右侧刷新图标、规则、提交成绩共用同一底色、边框、圆角与 36px 最小高度。刷新使用项目已安装的 Element Plus Icons 的 `RefreshRight`，通用图标优先复用现有资源。图标按钮为 36px 方形，提供 tooltip、可访问名称和忙碌状态；减少动态效果时停止旋转。新成绩只在玩家名后显示一个紧凑的 NEW 方角标记，取消排名角落的斜向文字，桌面和手机共用。
