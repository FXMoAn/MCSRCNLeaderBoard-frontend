import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import request from '@/utils/request'
import type UserInfo from '@/types/LeaderBoardTypes'

export const useStatsStore = defineStore('stats', ()=>{
    const cache = ref(new Map())
    const currStats = ref<UserInfo[]>([])
    const isLoading = ref(false)
    const pages = ref(0)

    const fetchStats = async (version:String, type:String):Promise<UserInfo[]>=>{
        try{
            const res = await request({
                url:'/getStats',
                method:'get',
                params:{
                    version:version,
                    type:type
                }
            })
            pages.value = Math.ceil(res.data.length/10)
            return res.data
        }catch(err){
            console.log('获取错误',err)
            return []
        }
    }

    const getStats = async (version:String, type:String)=>{
        let key = `${version}${type}`
        if (isLoading.value) return
        isLoading.value = true
        
        try{
            if(cache.value.has(key)){
                currStats.value = cache.value.get(key)
            }
            const data:UserInfo[] = await fetchStats(version,type)
            cache.value.set(key,data)
            currStats.value = data
        }catch(err){
            console.log(err)
        }finally{
            isLoading.value = false
        }
    }
    return {
        cache,
        currStats, 
        isLoading, 
        pages, 
        fetchStats, 
        getStats
    }
})
