<template>
  <div class="ranked-filter">
    <div class="filter-group">
      <label class="filter-label">IGT筛选</label>
      <select v-model="igt" class="filter-select">
        <option value="0,99" selected>全部</option>
        <option value="0,10">sub10</option>
        <option value="10,13">sub10-13</option>
        <option value="13,15">sub13-15</option>
        <option value="15,20">sub15-20</option>
        <option value="20,99">20min+</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label class="filter-label">用户名</label>
      <input 
        type="text" 
        v-model="nickname" 
        class="filter-input"
        placeholder="输入用户名筛选"
      />
    </div>
    
    <div class="filter-actions">
      <button @click="confirmFilter" class="filter-button confirm">
        确定
      </button>
      <button @click="clearFilter" class="filter-button clear">
        清空
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const nickname = ref('');
const igt = ref('0,99');
const emit = defineEmits(['confirmFilter']);

const clearFilter = () => {
  igt.value = '0,99';
  nickname.value = '';
  emit('confirmFilter', {
    igt: igt.value,
    nickname: nickname.value,
  });
};

const confirmFilter = () => {
  emit('confirmFilter', {
    igt: igt.value,
    nickname: nickname.value,
  });
};


</script>

<style scoped>
.ranked-filter {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid #444;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.filter-label {
  color: #ccc;
  font-size: 0.85em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select,
.filter-input {
  padding: 10px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  min-width: 120px;
}

.filter-input::placeholder {
  color: #666;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.filter-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-button.confirm {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
}

.filter-button.confirm:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.filter-button.clear {
  background-color: transparent;
  color: #ccc;
  border: 1px solid #555;
}

.filter-button.clear:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
  border-color: #666;
  transform: translateY(-2px);
}

.filter-button:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .ranked-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .filter-actions {
    margin-left: 0;
    justify-content: center;
  }
  
  .filter-button {
    flex: 1;
    max-width: 120px;
  }
}

@media (max-width: 480px) {
  .ranked-filter {
    padding: 12px;
    gap: 12px;
  }
  
  .filter-select,
  .filter-input {
    padding: 8px 10px;
    font-size: 13px;
  }
  
  .filter-button {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>