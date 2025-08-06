<template>
  <div class="content">
        <ButtonGroup class="button-group" @selection-changed="handleSelectionChange"/>
        <div class="container">
            <table class="leaderboard">
                <tbody>
                    <tr class="head">
                        <th>排名</th>
                        <th>玩家</th>
                        <th>IGT</th>
                        <th>记录时间</th>
                        <th>记录视频</th>
                    </tr>
                    <tr v-for="info,index in slicedata" class="stats">
                        <td>{{ getRank(index) }}</td>
                        <td>{{ info.username }}</td>
                        <td>{{ formatTime(info.time) }}</td>
                        <td>{{ formatDateTime(info.datetime) }}</td>
                        <td><a :href="info.videolink" target="_blank"><SvgIcon name="vedio" color="white"></SvgIcon></a></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="choosepage">
            <button class="control prev" @click="prevpage"><</button>
            <div class="pagenumber">{{ page }}/{{ pages }}</div>
            <button class="control next" @click="nextpage">></button>
        </div>
    </div>
</template>

<script setup lang='ts'>
import '@/assets/main.css'
import request from '@/utils/request';
import ButtonGroup from '@/components/SelectionGroup.vue';
import {ref,onMounted, computed, watch, watchEffect} from 'vue'
import type UserInfo from '@/types/LeaderBoardTypes.ts';
import { useStatsStore } from '@/stores/stats.ts'

import SvgIcon from '@/components/icons/index.vue'

const statsStore = useStatsStore()
const statsdata = computed(() => statsStore.currStats)
const slicedata = computed(()=>statsdata.value.slice((page.value-1)*10, page.value*10))
const page = ref(1)
const pages = computed(() => statsStore.pages)

//获取数据
const handleSelectionChange = ({ version, type }: { version: string, type: string }) => {
  statsStore.getStats(version, type)
}

// 规范每个数据的格式
const getRank = (index:number)=>{
    return (index + 1) + (page.value-1)*10
}

const formatTime = (time:String)=>{
    return time.replace(/^00:/, '');
}

const formatDateTime = (datetime:String)=>{
    return datetime.replace(/.{10}$/, '');
}

// 实现页码增减，内容改变
const prevpage = ()=>{
    if(page.value > 1){
        page.value -= 1
    }
}

const nextpage = ()=>{
    if(page.value < pages.value){
        page.value += 1
    }
}

onMounted(()=>{
    statsStore.getStats('1.16.1','RSG')
})

</script>

<style scoped>
.button-group{
    margin-top: 10px;
}

.leaderboard{
    width: 90vw; 
    margin-top: 10px;
    color: white;
    text-align: center;
    border-collapse: collapse;
    table-layout: fixed;
    .head{
        font-size: 1.5em;
        height: 7vh;
    }
    .stats td{
        font-size: 1.5em;
        height: 7vh;
    }
}
.choosepage{
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    gap: 10px;
    font-size: 1rem;
    .control{
        background-color: var(--bgcolor);
        color: white;
        width: 2rem;
        height: 2rem;
        border-radius: 5px;
        border: 1px solid;
        cursor: pointer;
    }
    .pagenumber{
        color: white;
    }
}

@media(max-width: 780px) {
    .content{
        width: 100%;
        max-width: 780px;
    }

    .container{
        position: relative;
        overflow: auto;
        width: 100%;
    }
  
    .leaderboard {
        width: max-content;
        min-width: 780px;
        overflow-x: auto;
    }

}

</style> 