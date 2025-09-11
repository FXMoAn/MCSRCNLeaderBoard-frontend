<template>
  <section class="stats-container">
    <div class="title">中国速通纪录变迁史</div>
    <div ref="chartRef" class="chart"></div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  CanvasRenderer,
  DataZoomComponent,
]);

const history = [
  { date: '2020-11-26', time: '17:37', player: 'PluginL', bv: '' },
  { date: '2021-06-18', time: '16:48', player: '-2x-', bv: '' },
  { date: '2021-06-22', time: '13:22', player: 'PluginL', bv: '' },
  { date: '2021-10-14', time: '12:52', player: 'PluginL', bv: '' },
  { date: '2021-11-07', time: '12:01', player: 'PluginL', bv: '' },
  { date: '2022-04-22', time: '11:51', player: '瑕玟', bv: '' },
  { date: '2022-07-09', time: '11:17', player: 'PluginL', bv: '' },
  { date: '2022-08-24', time: '09:52', player: 'PluginL', bv: '' },
  { date: '2023-11-11', time: '09:43', player: 'xbd15', bv: '' },
  { date: '2023-12-24', time: '09:29', player: 'PluginL', bv: '' },
  { date: '2024-02-23', time: '08:08', player: 'Acactus_', bv: '' },
  { date: '2025-05-17', time: '08:03', player: 'Tenes9999', bv: '' },
  { date: new Date().toISOString().split('T')[0], time: '08:03', player: 'Tenes9999', bv: '' },
];

const chartRef = ref(null);
let chartInst = null;

function renderChart() {
  const option = {
    backgroundColor: '#333',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#444',
      borderColor: '#00bcd4',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 14,
      },
      formatter(params) {
        const { data } = params;
        return `${data.player}  ${data.date}<br/>用时：${data.time}`;
      },
    },
    grid: {
      left: 60,
      right: 40,
      top: 60,
      bottom: 40,
      backgroundColor: 'transparent',
    },
    xAxis: {
      type: 'time',
      name: '日期',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
      },
      axisLabel: {
        formatter: '{yyyy}-{MM}-{dd}',
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
    yAxis: {
      type: 'category',
      name: '用时（mm:ss）',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
      },
      axisLabel: {
        color: '#ccc',
        fontSize: 12,
      },
      axisLine: {
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
      data: [...history.map((d) => d.time), '06:50'],
    },
    dataZoom: {
      filterMode: 'none',
      type: 'inside',
      backgroundColor: '#444',
      borderColor: '#00bcd4',
      fillerColor: 'rgba(0, 188, 212, 0.1)',
      handleStyle: {
        color: '#00bcd4',
      },
    },
    series: [
      {
        type: 'line',
        step: 'start',
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color: '#00bcd4',
        },
        itemStyle: {
          color: '#00bcd4',
          borderColor: '#00acc1',
          borderWidth: 2,
        },
        emphasis: {
          scale: 1.6,
          itemStyle: {
            color: '#00acc1',
            borderColor: '#0097a7',
          },
        },
        data: history.map((d) => ({
          date: d.date,
          value: [new Date(d.date), d.time],
          time: d.time,
          player: d.player,
          bv: d.bv,
        })),
        markLine: {
          data: [
            {
              player: '世界纪录',
              yAxis: '06:50',
              time: '06:50',
              lineStyle: {
                color: '#ff6b6b',
                type: 'dashed',
                width: 2,
              },
              label: {
                show: true,
                position: 'end',
                color: '#ff6b6b',
                fontSize: 12,
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderColor: '#ff6b6b',
                borderWidth: 1,
                borderRadius: 4,
                padding: [4, 8],
              },
            },
          ],
        },
      },
    ],
  };

  chartInst.setOption(option);

  chartInst.on('click', (params) => {
    const bv = params.data.bv;
    if (bv) window.open(`https://www.bilibili.com/video/${bv}`);
  });
}

onMounted(() => {
  chartInst = echarts.init(chartRef.value);
  renderChart();
  window.addEventListener('resize', () => chartInst.resize());
});
onBeforeUnmount(() => {
  chartInst.dispose();
});
</script>

<style scoped>
.stats-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 0 100px 0;
  background-color: var(--bgcolor);
  min-height: calc(100vh - 80px);
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
  .stats-container {
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
