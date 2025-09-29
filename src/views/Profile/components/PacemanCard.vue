<template>
  <div class="paceman-card">
    <div class="paceman-card-title">
      <h3>Paceman</h3>
    </div>
    <div class="paceman-card-content">
      <div class="paceman-card-content-item">
        <span>Nether </span>
        <span>{{ pacemanStats?.nether.count }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePacemanStore, type PacemanStats } from '@/stores/paceman';
import { ref, watch } from 'vue';

interface Props {
  ingamename: string;
}

const props = defineProps<Props>();

const pacemanStore = usePacemanStore();
const pacemanStats = ref<PacemanStats | null>(null);

watch(
  () => props.ingamename,
  () => {
    pacemanStore.fetchPacemanStats(props.ingamename, 24, 2).then((stats) => {
      pacemanStats.value = stats;
    });
  }
);
</script>

<style scoped>
.paceman-card {
  width: 100%;
  height: 100%;
}
</style>
