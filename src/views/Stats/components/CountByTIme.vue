<template>
  <section class="count-by-time-container">
    <div class="title">1.16.1速通记录按时间分布图</div>
    <Loading v-if="statsStore.isLoading" />
    <div ref="chartRef" class="chart" v-else></div>
  </section>
</template>

<script setup>
import { useStatsStore } from '@/stores/stats';
import Loading from '@/components/common/Loading.vue';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, TitleComponent, TooltipComponent, GridComponent, CanvasRenderer]);

const chartRef = ref(null);
let chartInst = null;
const statsStore = useStatsStore();
const TARGET_VERSION = '1.16.1';
const TARGET_TYPE = 'RSG';
const TARGET_STATUS = 'verified';
const chartData = ref([]);
const resizeHandler = () => {
  if (chartInst) {
    chartInst.resize();
  }
};

// 将 mm:ss.ms 格式转换为总秒数
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const [timePart, msPart = '0'] = timeStr.split('.');
  const [minutes, seconds] = timePart.split(':').map(Number);
  const milliseconds = Number(msPart);
  return minutes * 60 + seconds + milliseconds / 1000;
}

// 将总秒数转换为分钟数
function secondsToMinutes(seconds) {
  return seconds / 60;
}

// 根据时间（秒数）判断属于哪个区间
function getTimeRange(seconds) {
  const minutes = secondsToMinutes(seconds);
  if (minutes < 9) {
    return '9分钟以下';
  } else if (minutes < 10) {
    return '9-10分钟';
  } else if (minutes < 13) {
    return '10-13分钟';
  } else if (minutes < 15) {
    return '13-15分钟';
  } else if (minutes < 17) {
    return '15-17分钟';
  } else if (minutes < 20) {
    return '17-20分钟';
  } else if (minutes < 30) {
    return '20-30分钟';
  } else {
    return '30分钟以上';
  }
}

// 统计各时间区间的数量
function calculateTimeDistribution(runs) {
  const distribution = {
    '9分钟以下': 0,
    '9-10分钟': 0,
    '10-13分钟': 0,
    '13-15分钟': 0,
    '15-17分钟': 0,
    '17-20分钟': 0,
    '20-30分钟': 0,
    '30分钟以上': 0,
  };

  runs.forEach((run) => {
    if (run.igt) {
      const seconds = timeToSeconds(run.igt);
      const range = getTimeRange(seconds);
      distribution[range]++;
    }
  });

  return distribution;
}

function renderChart() {
  if (!chartInst) return;
  const distribution = calculateTimeDistribution(chartData.value);

  const categories = Object.keys(distribution);
  const values = Object.values(distribution);

  const option = {
    backgroundColor: '#333',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: '#444',
      borderColor: '#00bcd4',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 14,
      },
      formatter(params) {
        const param = params[0];
        return `${param.name}<br/>数量：${param.value}`;
      },
    },
    grid: {
      left: 80,
      right: 40,
      top: 60,
      bottom: 80,
      backgroundColor: 'transparent',
    },
    xAxis: {
      type: 'category',
      data: categories,
      name: '时间区间',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
      },
      axisLabel: {
        color: '#ccc',
        fontSize: 12,
        rotate: 0,
        interval: 0,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#555',
        },
      },
      axisTick: {
        lineStyle: {
          color: '#555',
        },
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
      },
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        color: '#ccc',
        fontSize: 12,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#555',
        },
      },
      axisTick: {
        lineStyle: {
          color: '#555',
        },
      },
      splitLine: {
        lineStyle: {
          color: '#444',
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00bcd4' },
            { offset: 1, color: '#0097a7' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#26c6da' },
              { offset: 1, color: '#00acc1' },
            ]),
          },
        },
        label: {
          show: true,
          position: 'top',
          color: '#fff',
          fontSize: 12,
        },
      },
    ],
  };

  chartInst.setOption(option);
}

async function loadRuns() {
  const data = (await statsStore.fetchStats(TARGET_VERSION, TARGET_TYPE, TARGET_STATUS)) || [];
  chartData.value = data;
}

watch(
  chartData,
  () => {
    renderChart();
  },
  { deep: true }
);

onMounted(async () => {
  chartInst = echarts.init(chartRef.value);
  window.addEventListener('resize', resizeHandler);
  await loadRuns();
  renderChart();
});

onBeforeUnmount(() => {
  if (chartInst) {
    chartInst.dispose();
  }
  window.removeEventListener('resize', resizeHandler);
});
</script>

<style scoped>
.count-by-time-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding: 20px 0;
  background-color: var(--bgcolor);
}

.title {
  font-size: 1.8em;
  font-weight: 600;
  margin-bottom: 30px;
  color: #fff;
  text-align: center;
}

.chart {
  width: 90%;
  max-width: 1200px;
  height: 500px;
  background-color: #333;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid #444;
}

@media (max-width: 780px) {
  .count-by-time-container {
    padding: 10px 0 80px 0;
  }

  .title {
    font-size: 1.5em;
    margin-bottom: 20px;
  }

  .chart {
    width: 95%;
    height: 400px;
    padding: 15px;
  }
}
</style>
