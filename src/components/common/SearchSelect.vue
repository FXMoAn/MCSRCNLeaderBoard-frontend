<template>
  <div class="search-select-container">
    <input
      type="text"
      class="search-select-input"
      :placeholder="placeholder"
      v-model="searchKeyword"
      @focus="showDropdown = true"
      @blur="handleBlur"
      @input="handleSearch"
      :disabled="disabled"
    />
    
    <!-- 下拉选项列表 -->
    <div class="search-dropdown" v-show="showDropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">{{ title }}</span>
        <span class="dropdown-count">{{ filteredOptions.length }} 个选项</span>
      </div>
      
      <div class="dropdown-options">
        <div
          v-for="option in filteredOptions"
          :key="getOptionKey(option)"
          class="dropdown-option"
          :class="{ 'selected': isOptionSelected(option) }"
          @click="selectOption(option)"
        >
          {{ getOptionLabel(option) }}
        </div>
        
        <div v-if="filteredOptions.length === 0" class="no-results">
          {{ noResultsText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

/**
 * 搜索选择器组件的属性定义
 */
interface Props {
  /** 选项列表 */
  options: any[];
  /** 当前选中的值 */
  modelValue: any;
  /** 占位符文本 */
  placeholder?: string;
  /** 下拉框标题 */
  title?: string;
  /** 无结果时显示的文本 */
  noResultsText?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 选项的键字段名 */
  optionKey?: string;
  /** 选项的标签字段名 */
  optionLabel?: string;
  /** 搜索字段名（支持多个字段） */
  searchFields?: string[];
  /** 是否支持多选 */
  multiple?: boolean;
  /** 最大显示选项数量 */
  maxOptions?: number;
}

/**
 * 搜索选择器组件的事件定义
 */
interface Emits {
  /** 值变化事件 */
  (e: 'update:modelValue', value: any): void;
  /** 选项选择事件 */
  (e: 'select', option: any): void;
  /** 搜索事件 */
  (e: 'search', keyword: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  title: '选择选项',
  noResultsText: '没有找到匹配的选项',
  disabled: false,
  optionKey: 'id',
  optionLabel: 'label',
  searchFields: () => ['label'],
  multiple: false,
  maxOptions: 100
});

const emit = defineEmits<Emits>();

// 内部状态
const searchKeyword = ref<string>('');
const showDropdown = ref<boolean>(false);

// 监听外部值变化，同步搜索关键词
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const selectedOption = props.options.find(option => 
      getOptionKey(option) === getOptionKey(newValue)
    );
    if (selectedOption) {
      searchKeyword.value = getOptionLabel(selectedOption);
    }
  } else {
    searchKeyword.value = '';
  }
}, { immediate: true });

/**
 * 获取选项的键值
 */
const getOptionKey = (option: any): any => {
  if (typeof option === 'object' && option !== null) {
    return option[props.optionKey];
  }
  return option;
};

/**
 * 获取选项的标签文本
 */
const getOptionLabel = (option: any): string => {
  if (typeof option === 'object' && option !== null) {
    return option[props.optionLabel] || String(option);
  }
  return String(option);
};

/**
 * 检查选项是否被选中
 */
const isOptionSelected = (option: any): boolean => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    return props.modelValue.some(value => getOptionKey(value) === getOptionKey(option));
  }
  return getOptionKey(props.modelValue) === getOptionKey(option);
};

/**
 * 根据搜索关键词筛选选项
 */
const filteredOptions = computed(() => {
  let filtered = props.options;
  
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    filtered = props.options.filter(option => {
      return props.searchFields.some(field => {
        const value = option[field];
        return value && String(value).toLowerCase().includes(keyword);
      });
    });
  }
  
  // 限制最大显示数量
  if (props.maxOptions && filtered.length > props.maxOptions) {
    filtered = filtered.slice(0, props.maxOptions);
  }
  
  return filtered;
});

/**
 * 选择选项
 */
const selectOption = (option: any) => {
  if (props.multiple) {
    const currentValue = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const optionKey = getOptionKey(option);
    
    const existingIndex = currentValue.findIndex(value => 
      getOptionKey(value) === optionKey
    );
    
    if (existingIndex >= 0) {
      // 如果已存在，则移除
      currentValue.splice(existingIndex, 1);
    } else {
      // 如果不存在，则添加
      currentValue.push(option);
    }
    
    emit('update:modelValue', currentValue);
    emit('select', option);
  } else {
    // 单选模式
    emit('update:modelValue', option);
    emit('select', option);
    searchKeyword.value = getOptionLabel(option);
    showDropdown.value = false;
  }
};

/**
 * 处理搜索输入
 */
const handleSearch = () => {
  showDropdown.value = true;
  emit('search', searchKeyword.value);
};

/**
 * 处理失焦事件
 */
const handleBlur = () => {
  // 延迟关闭，让用户有时间点击选项
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};
</script>

<style scoped>
.search-select-container {
  position: relative;
  width: 100%;
}

.search-select-input {
  width: 100%;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  cursor: pointer;
}

.search-select-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.search-select-input:disabled {
  background-color: #2a2a2a;
  color: #666;
  cursor: not-allowed;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #444;
  background-color: #2a2a2a;
}

.dropdown-title {
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.dropdown-count {
  color: #666;
  font-size: 12px;
}

.dropdown-options {
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #2a2a2a;
}

.dropdown-option:hover {
  background-color: #3a3a3a;
}

.dropdown-option.selected {
  background-color: rgba(0, 188, 212, 0.1);
  color: #00bcd4;
}

.dropdown-option:last-child {
  border-bottom: none;
}

.no-results {
  padding: 20px 16px;
  text-align: center;
  color: #666;
  font-style: italic;
}

/* 滚动条样式 */
.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.dropdown-options::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-dropdown {
    max-height: 250px;
  }
  
  .dropdown-options {
    max-height: 200px;
  }
}

@media (max-width: 480px) {
  .search-select-input {
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .dropdown-header {
    padding: 10px 14px;
  }
  
  .dropdown-option {
    padding: 10px 14px;
  }
}
</style>
