<template>
  <div class="page-layout">
    <section class="page-header">
      <div class="header-icon" aria-hidden="true">📦</div>
      <div class="header-meta">
        <h1 class="page-title">资源</h1>
        <p class="page-sub">规则文档、速通工具与常用站点，集中放在这里</p>
      </div>
    </section>

    <section class="content-panel">
      <div v-for="group in groups" :key="group.title" class="group">
        <h2 class="group-title">{{ group.title }}</h2>
        <p class="group-desc">{{ group.desc }}</p>

        <div class="card-grid">
          <template v-for="item in group.items" :key="item.name">
            <router-link v-if="item.to" :to="item.to" class="res-card">
              <span class="res-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="res-body">
                <span class="res-name">{{ item.name }}</span>
                <span class="res-desc">{{ item.desc }}</span>
              </span>
              <span class="res-arrow" aria-hidden="true">→</span>
            </router-link>
            <a
              v-else
              :href="item.href"
              class="res-card"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="res-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="res-body">
                <span class="res-name">{{ item.name }}</span>
                <span class="res-desc">{{ item.desc }}</span>
              </span>
              <span class="res-arrow" aria-hidden="true">↗</span>
            </a>
          </template>
        </div>
      </div>

      <p class="panel-note">
        有想补充的资源？在社区群里告诉管理员。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';

interface ResourceItem {
  name: string;
  desc: string;
  icon: string;
  to?: string;
  href?: string;
}

interface ResourceGroup {
  title: string;
  desc: string;
  items: ResourceItem[];
}

const groups: ResourceGroup[] = [
  {
    title: '本站',
    desc: '站内已有的规则与提交入口。',
    items: [
      {
        name: '速通 Wiki',
        desc: '版本差异、路线讲解与判定标准',
        icon: '📖',
        href: 'https://wiki.mcspeedrun.cn',
      },
      {
        name: '提交成绩',
        desc: '上传录屏与计时数据，等待审核',
        icon: '⬆️',
        to: '/user-upload',
      },
      {
        name: '排行榜',
        desc: '按版本与类别查看各项目排序',
        icon: '🏆',
        to: '/rank',
      },
    ],
  },
  {
    title: '官方与规则',
    desc: '游戏本体、国际榜单与计时规则来源。',
    items: [
      {
        name: 'Minecraft 官网',
        desc: '正版购买与 Java 版启动器下载',
        icon: '🟩',
        href: 'https://www.minecraft.net/zh-hans/download',
      },
      {
        name: 'speedrun.com / mc',
        desc: '国际 Minecraft 速通榜单与规则页',
        icon: '🌍',
        href: 'https://www.speedrun.com/mc',
      },
    ],
  },
  {
    title: '工具',
    desc: '跑图、录制与查资料常用的外部工具。',
    items: [
      {
        name: 'Chunkbase 种子地图',
        desc: '按种子查看结构、生物群系分布',
        icon: '🗺️',
        href: 'https://www.chunkbase.com',
      },
      {
        name: 'OBS Studio',
        desc: '免费录屏与直播推流，用于成绩录屏',
        icon: '🎥',
        href: 'https://obsproject.com',
      },
      {
        name: 'Modrinth',
        desc: '查找 Fabric 模组与计时相关插件',
        icon: '🧩',
        href: 'https://modrinth.com',
      },
    ],
  },
];
</script>

<style scoped>
.page-layout {
  box-sizing: border-box;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px 32px;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
}

.header-icon {
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  line-height: 1;
  background: var(--panel-raised);
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.page-sub {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.content-panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0 0 12px 12px;
  padding: 8px 16px 20px;
}

.group {
  padding-top: 20px;
}

.group + .group {
  margin-top: 4px;
  border-top: 1px solid var(--border);
}

.group-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  letter-spacing: 0.2px;
}

.group-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 4px 0 14px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.res-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--panel-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.res-card:hover {
  border-color: var(--accent);
  background: rgba(76, 175, 80, 0.08);
  transform: translateY(-1px);
}

.res-card:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 2px;
}

.res-icon {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.res-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.res-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.res-desc {
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.5;
}

.res-arrow {
  flex: 0 0 auto;
  color: var(--accent-bright);
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.res-card:hover .res-arrow {
  opacity: 1;
}

.panel-note {
  margin: 22px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12.5px;
}

@media (max-width: 780px) {
  .page-header {
    padding: 16px;
    gap: 14px;
  }

  .header-icon {
    flex: 0 0 56px;
    width: 56px;
    height: 56px;
    font-size: 26px;
  }

  .page-title {
    font-size: 20px;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .res-card,
  .res-arrow {
    transition: none;
  }
}
</style>
