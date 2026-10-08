<template>
  <nav class="pagination" aria-label="排行榜分页">
    <div class="pagination-summary" v-if="totalItems !== undefined || pageSize !== undefined">
      <span v-if="totalItems !== undefined" class="result-count" role="status">
        共 {{ totalItems }} 条<span v-if="totalItems > 0 && pageSize !== undefined">
          · 当前 {{ rangeStart }}–{{ rangeEnd }} 条</span
        >
      </span>
      <label v-if="pageSize !== undefined" class="page-size">
        每页
        <PrimarySelect
          v-model="selectedPageSize"
          :options="sizeOptions"
          :disabled="disabled"
          aria-label="每页显示条数"
        />
      </label>
    </div>

    <div class="pagination-controls">
      <button
        type="button"
        class="control boundary-control"
        aria-label="第一页"
        @click="changePage(1)"
        :disabled="disabled || currentPage <= 1"
      >
        首页
      </button>
      <button
        type="button"
        class="control"
        aria-label="上一页"
        @click="changePage(currentPage - 1)"
        :disabled="disabled || currentPage <= 1"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <div class="page-info" aria-live="polite" aria-atomic="true">
        <span class="page-number">{{ currentPage }}</span>
        <span class="page-separator">/</span>
        <span class="total-pages">{{ safeTotalPages }}</span>
        <span class="sr-only">页</span>
      </div>
      <button
        type="button"
        class="control"
        aria-label="下一页"
        @click="changePage(currentPage + 1)"
        :disabled="disabled || currentPage >= safeTotalPages"
      >
        <span aria-hidden="true">›</span>
      </button>
      <button
        type="button"
        class="control boundary-control"
        aria-label="最后一页"
        @click="changePage(safeTotalPages)"
        :disabled="disabled || currentPage >= safeTotalPages"
      >
        末页
      </button>
      <form class="page-jump" novalidate @submit.prevent="handleJumpPage">
        <input
          type="number"
          class="page-input"
          v-model="jumpPage"
          :min="1"
          :max="safeTotalPages"
          :step="1"
          :disabled="disabled"
          aria-label="跳转页码"
          inputmode="numeric"
          placeholder="页码"
        />
        <button type="submit" class="jump-button" :disabled="disabled">跳转</button>
      </form>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination';

interface Props {
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  totalItems?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });
const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'update:pageSize', size: number): void;
}>();

const safeTotalPages = computed(() => Math.max(1, props.totalPages));
const jumpPage = ref<number | string>(props.currentPage);
const sizeOptions = PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: `${size} 条` }));
const selectedPageSize = computed({
  get: () => String(props.pageSize),
  set: (value: string) => {
    const size = Number(value);
    if (!props.disabled && PAGE_SIZE_OPTIONS.some((option) => option === size)) {
      emit('update:pageSize', size);
    }
  },
});
const rangeStart = computed(() => (props.currentPage - 1) * (props.pageSize ?? 10) + 1);
const rangeEnd = computed(() =>
  Math.min(props.currentPage * (props.pageSize ?? 10), props.totalItems ?? 0)
);

watch(
  () => props.currentPage,
  (page) => {
    jumpPage.value = page;
  }
);

const changePage = (page: number) => {
  if (!props.disabled && page >= 1 && page <= safeTotalPages.value && page !== props.currentPage) {
    emit('update:currentPage', page);
  }
};

const handleJumpPage = () => {
  const value = Number(jumpPage.value);
  if (!Number.isSafeInteger(value) || value < 1) {
    jumpPage.value = props.currentPage;
    return;
  }
  const page = Math.min(value, safeTotalPages.value);
  changePage(page);
  jumpPage.value = page;
};
</script>

<style scoped>
.pagination {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  width: 100%;
  max-width: 1200px;
  margin-top: 20px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid #444;
  border-radius: 12px;
}
.pagination-summary,
.pagination-controls,
.page-size,
.page-info,
.page-jump {
  display: flex;
  align-items: center;
}
.pagination-summary {
  flex-wrap: wrap;
  gap: 12px 24px;
}
.result-count {
  color: #ccc;
  font-size: 14px;
}
.result-count span {
  color: inherit;
}
.page-size {
  gap: 8px;
  color: #ccc;
  font-size: 14px;
}
.page-size :deep(select) {
  min-width: 80px;
  appearance: auto;
}
.pagination-controls {
  gap: 12px;
}
.page-info {
  justify-content: center;
  gap: 8px;
  min-width: 64px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.page-number {
  color: #00bcd4;
  font-weight: 600;
}
.page-separator {
  color: #999;
}
.total-pages {
  color: #ccc;
}
.page-jump {
  gap: 8px;
}

.control,
.jump-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #555;
  border-radius: 8px;
  background: #333;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}
.control {
  font-size: 24px;
}
.boundary-control {
  font-size: 14px;
}
.control:hover:not(:disabled),
.jump-button:hover:not(:disabled) {
  background: #444;
  border-color: #00bcd4;
}
.control:active:not(:disabled),
.jump-button:active:not(:disabled) {
  background: #222;
}
.control:disabled,
.jump-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.page-input {
  box-sizing: border-box;
  width: 64px;
  height: 40px;
  padding: 8px;
  border: 1px solid #555;
  border-radius: 8px;
  background: #333;
  color: #fff;
  text-align: center;
  font-size: 14px;
}
.control:focus-visible,
.jump-button:focus-visible,
.page-input:focus-visible {
  outline: 2px solid #00bcd4;
  outline-offset: 3px;
}
.page-input:disabled {
  opacity: 0.6;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 780px) {
  .pagination {
    justify-content: center;
    gap: 16px;
    padding: 12px;
  }
  .pagination-summary {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
  }
  .pagination-controls {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .page-jump {
    flex-basis: 100%;
    justify-content: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .control,
  .jump-button {
    transition: none;
  }
}
</style>
