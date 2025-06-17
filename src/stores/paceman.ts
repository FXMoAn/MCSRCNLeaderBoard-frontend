import axios from "axios";
import {defineStore} from 'pinia'

let request = axios.create({
    baseURL: 'https://paceman.gg/stats/api/',
    timeout: 5000
})

export const usePacemanStore = defineStore('paceman',()=>{
    const fetchPacemanStats = async (nickname: string) => {
        try {
            let response = await request({
                method: 'GET',
                params: {
                    name:nickname,
                    hours:24,
                    hoursBetween:2
                },
                url: "getSessionNethers"
            })
        }catch(err){
            
        }
    }
})