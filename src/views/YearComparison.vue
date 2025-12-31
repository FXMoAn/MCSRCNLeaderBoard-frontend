<template>
  <div class="year-comparison-container">
    <div class="comparison-header">
      <h1>2024年 - 2025年 榜单变化</h1>
    </div>
    <div class="comparison-content">
      <div class="year-section">
        <h2 class="year-title">2024/12/31</h2>
        <div class="image-wrapper">
          <img src="@/assets/picture/2024.png" alt="2024年榜单" class="year-image" />
        </div>
      </div>
      <div class="year-section">
        <h2 class="year-title">2025/12/31</h2>
        <div class="image-wrapper">
          <img src="@/assets/picture/2025.png" alt="2025年榜单" class="year-image" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  // 页面加载时滚动到顶部
  window.scrollTo(0, 0);
});
</script>

<style scoped>
.year-comparison-container {
  width: 100%;
  min-height: calc(100vh - 80px);
  padding: 40px 20px;
  background-color: var(--bgcolor);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  overflow-x: hidden;
}

.comparison-header {
  width: 100%;
  max-width: 1400px;
  text-align: center;
  margin-bottom: 40px;
  box-sizing: border-box;
}

.comparison-header h1 {
  font-size: 2.5em;
  color: #00bcd4;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 188, 212, 0.3);
}

.comparison-content {
  width: 100%;
  max-width: 1400px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
  box-sizing: border-box;
}

.year-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  min-width: 0;
  box-sizing: border-box;
  width: 100%;
}

.year-title {
  font-size: 2em;
  color: #fff;
  font-weight: 600;
  margin: 0;
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.2), rgba(0, 151, 167, 0.2));
  border: 1px solid rgba(0, 188, 212, 0.3);
  border-radius: 8px;
  width: 100%;
  max-width: 100%;
  text-align: center;
  box-sizing: border-box;
}

.image-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #444;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  overflow: hidden;
}

.year-image {
  width: 100%;
  height: auto;
  max-width: 100%;
  border-radius: 8px;
  display: block;
  object-fit: contain;
}

@media (max-width: 1200px) {
  .comparison-content {
    grid-template-columns: 1fr;
    gap: 60px;
    max-width: 100%;
  }

  .comparison-header {
    max-width: 100%;
  }

  .comparison-header h1 {
    font-size: 2em;
  }

  .year-title {
    font-size: 1.5em;
  }
}

@media (max-width: 780px) {
  .year-comparison-container {
    padding: 20px 10px;
  }

  .comparison-header {
    margin-bottom: 30px;
  }

  .comparison-header h1 {
    font-size: 1.5em;
  }

  .year-title {
    font-size: 1.2em;
    padding: 10px 16px;
  }

  .image-wrapper {
    padding: 10px;
  }

  .comparison-content {
    gap: 40px;
  }
}
</style>

