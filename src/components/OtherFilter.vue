<template>
  <div class="other-filter">
    <div class="filter-group">
      <PrimaryCheckBox v-model="isNewRecord" label="新纪录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PrimaryCheckBox from '@/components/common/PrimaryCheckBox.vue';
import { computed, defineEmits } from 'vue';

const emit = defineEmits<{
  (e: 'confirmFilter', value: boolean): void;
}>();

const props = withDefaults(
  defineProps<{
    initialIsNewRecord: boolean;
  }>(),
  {
    initialIsNewRecord: false,
  }
);

const isNewRecord = computed({
  get: () => props.initialIsNewRecord,
  set: (value: boolean) => emit('confirmFilter', value),
});
</script>

<style scoped>
.other-filter {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid #444;
  margin-bottom: 20px;
}
</style>