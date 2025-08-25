<template>
  <div class="pagination">
    <button 
      class="control prev" 
      @click="handlePrevPage" 
      :disabled="currentPage <= 1"
    >
      <span>&lt;</span>
    </button>
    
    <div class="page-info">
      <span class="page-number">{{ currentPage }}</span>
      <span class="page-separator">/</span>
      <span class="total-pages">{{ totalPages }}</span>
    </div>
    
    <div class="page-jump">
      <input
        type="number"
        class="page-input"
        v-model="jumpPage"
        :min="1"
        :max="totalPages"
        placeholder="页码"
        @keyup.enter="handleJumpPage"
      />
      <button class="jump-button" @click="handleJumpPage">跳转</button>
    </div>
    
    <button 
      class="control next" 
      @click="handleNextPage" 
      :disabled="currentPage >= totalPages"
    >
      <span>&gt;</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  currentPage: number;
  totalPages: number;
}

interface Emits {
  (e: 'update:currentPage', page: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const jumpPage = ref<number>(props.currentPage);

// 监听当前页码变化，同步输入框
watch(() => props.currentPage, (newPage) => {
  jumpPage.value = newPage;
});

const handlePrevPage = () => {
  if (props.currentPage > 1) {
    emit('update:currentPage', props.currentPage - 1);
  }
};

const handleNextPage = () => {
  if (props.currentPage < props.totalPages) {
    emit('update:currentPage', props.currentPage + 1);
  }
};

const handleJumpPage = () => {
  const targetPage = Math.max(1, Math.min(props.totalPages, jumpPage.value));
  if (targetPage !== props.currentPage) {
    emit('update:currentPage', targetPage);
  }
  jumpPage.value = targetPage;
};
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid #444;
}

.control {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control:hover:not(:disabled) {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.control:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.6;
}

.control:active:not(:disabled) {
  transform: translateY(0);
}

.page-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #fff;
  min-width: 80px;
  justify-content: center;
}

.page-number {
  font-weight: 600;
  color: #00bcd4;
}

.page-separator {
  color: #666;
}

.total-pages {
  color: #ccc;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input {
  width: 60px;
  padding: 8px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  text-align: center;
  transition: all 0.2s ease;
}

.page-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.page-input::-webkit-inner-spin-button,
.page-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.jump-button {
  background: linear-gradient(135deg, #666, #555);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.jump-button:hover {
  background: linear-gradient(135deg, #777, #666);
  transform: translateY(-1px);
}

.jump-button:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .pagination {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .page-jump {
    order: -1;
    width: 100%;
    justify-content: center;
  }
  
  .page-input {
    width: 80px;
  }
  
  .jump-button {
    padding: 8px 16px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .pagination {
    gap: 8px;
    padding: 8px;
  }
  
  .control {
    padding: 10px 12px;
    min-width: 40px;
    height: 40px;
    font-size: 14px;
  }
  
  .page-info {
    font-size: 14px;
    min-width: 60px;
  }
  
  .page-input {
    width: 60px;
    padding: 6px 10px;
    font-size: 13px;
  }
  
  .jump-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
