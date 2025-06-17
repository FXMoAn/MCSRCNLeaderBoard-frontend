<template>
  <div class="userinfo">
    <div class="rank">{{ rank }}</div>
    <div class="username">{{ username }}</div>
    <div class="time">{{ time }}</div>
    <div class="date"></div>
    <div class="link"></div>
  </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';

const props = defineProps({
    data:{
        type:Object
    },
    index:{
        type:Number,
        required:true
    }
})
const rank = computed(()=>{
    return props.index + 1
})

const username = computed(()=>{
    return props.data?.username
})

const time = computed(()=>{
    return props.data?.time.replace(/^00:/, '');
})
</script>

<style scoped>
.userinfo{
    display: flex;
    gap:10px;
    margin-top: 10px;
    color: white;
}
</style>