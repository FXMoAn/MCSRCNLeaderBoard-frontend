<template>
  <div class="page-layout">
    <section class="page-header">
      <div class="header-icon" aria-hidden="true">📢</div>
      <div class="header-meta">
        <h1 class="page-title">公告</h1>
        <p class="page-sub">站点更新、规则调整与国内比赛信息</p>
      </div>
    </section>

    <section class="content-panel">
      <div class="empty-state" role="status">
        <strong>暂无公告</strong>
        <p>站点更新、规则调整和比赛信息会在这里发布，敬请关注。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';
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
  padding: 16px;
}

.empty-state {
  padding: 72px 24px;
  text-align: center;
}

.empty-state strong {
  display: block;
  font-size: 16px;
  color: #fff;
}

.empty-state p {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
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
}
</style>
