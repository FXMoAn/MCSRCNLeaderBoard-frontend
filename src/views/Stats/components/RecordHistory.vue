<template>
  <section class="record-history-container">
    <div class="title">1.16.1速通中国记录变迁史</div>
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

// 为不同玩家定义颜色方案
const playerColors = {
  PluginL: '#00bcd4', // 青色 - 主要玩家
  '-2x-': '#ff9800', // 橙色
  瑕玟: '#4caf50', // 绿色
  xbd15: '#9c27b0', // 紫色
  Acactus_: '#f44336', // 红色
  Tenes9999: '#2196f3', // 蓝色
};

// 获取玩家颜色，如果未定义则使用默认颜色
function getPlayerColor(player) {
  return playerColors[player] || '#607d8b'; // 默认蓝灰色
}

// 将时间字符串转换为秒数
function timeToSeconds(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

// 将秒数转换为时间字符串
function secondsToTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
      type: 'value',
      name: '用时（mm:ss）',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
      },
      axisLabel: {
        color: '#ccc',
        fontSize: 12,
        formatter: function (value) {
          return secondsToTime(value);
        },
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
      min: timeToSeconds('06:50'),
      max: timeToSeconds('17:37'),
      inverse: true,
    },
    legend: {
      show: true,
      top: 10,
      right: 20,
      orient: 'vertical',
      textStyle: {
        color: '#fff',
        fontSize: 12,
      },
      itemGap: 8,
      data: Object.keys(playerColors).map((player) => ({
        name: player,
        itemStyle: {
          color: playerColors[player],
        },
      })),
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
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color: function (params) {
            return getPlayerColor(params.data.player);
          },
        },
        itemStyle: {
          color: function (params) {
            return getPlayerColor(params.data.player);
          },
          borderColor: function (params) {
            const baseColor = getPlayerColor(params.data.player);
            // 创建更深的边框颜色
            return baseColor;
          },
          borderWidth: 2,
        },
        emphasis: {
          scale: 1.6,
          itemStyle: {
            color: function (params) {
              const baseColor = getPlayerColor(params.data.player);
              // 悬停时稍微变亮
              return baseColor;
            },
            borderColor: function (params) {
              const baseColor = getPlayerColor(params.data.player);
              return baseColor;
            },
          },
        },
        data: history.map((d, index) => ({
          date: d.date,
          value: [new Date(d.date), timeToSeconds(d.time)],
          time: d.time,
          player: d.player,
          bv: d.bv,
          symbol: index === history.length - 1 ? 'diamond' : 'circle',
          symbolSize: index === history.length - 1 ? 12 : 10,
          itemStyle: {
            color: getPlayerColor(d.player),
            borderColor: getPlayerColor(d.player),
          },
        })),
        markLine: {
          data: [
            {
              player: '世界纪录',
              yAxis: timeToSeconds('06:50'),
              time: '06:50',
              date: '2025-06-12',
              lineStyle: {
                color: '#ff6b6b',
                type: 'dashed',
                width: 2,
              },
              label: {
                show: true,
                position: 'insideEndTop',
                color: '#ff6b6b',
                fontSize: 12,
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderColor: '#ff6b6b',
                borderWidth: 1,
                borderRadius: 4,
                padding: [4, 8],
                formatter: '世界纪录 06:50',
                offset: [0, -10],
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
.record-history-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding: 20px 0 100px 0;
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
  .record-history-container {
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
