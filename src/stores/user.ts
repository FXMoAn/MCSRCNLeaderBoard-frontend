import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import useAuthStore from "./auth";
import axios from "axios";

interface UserInfo {
  id: number;
  ingamename: string;
  mc_uuid: string;
  nickname: string;
  user_id: number;
  role: string;
}

const useUserStore = defineStore("user", () => {
  const authStore = useAuthStore();
  const userId = computed(() => authStore.user?.id);

  const userInfo = ref<UserInfo>(
    JSON.parse(localStorage.getItem("userInfo") ?? "{}")
  );
  const loading = ref(false);

  const isBinding = computed(() => !!userInfo.value.user_id);
  const isBindMinecraftId = computed(() => !!userInfo.value.mc_uuid);

  const initUserInfo = async () => {
    try {
      loading.value = true;
      if (!userId.value) {
        console.log("用户ID不存在，跳过用户信息初始化");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", userId.value)
        .single();
      if (error) {
        throw error;
      }
      userInfo.value = data;
      localStorage.setItem("userInfo", JSON.stringify(userInfo.value));
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  };

  const bindUser = async (selectedUserId: number) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ user_id: userId.value })
        .eq("id", selectedUserId)
        .select();
      if (error) {
        console.error(error);
      } else {
        alert("绑定成功");
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createNewUser = async (nickname: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({ nickname: nickname, user_id: userId.value })
        .select();
      if (error) {
        console.error(error);
      } else {
        alert("创建成功");
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getMinecraftId = async (ingamename: string) => {
    try {
      const res = await axios.get(
        `https://mcsrcors.fxmoan148.workers.dev/?url=https://api.mojang.com/users/profiles/minecraft/${ingamename}`
      );
      if (res.data && res.data.id) {
        userInfo.value.mc_uuid = res.data.id;
        userInfo.value!.ingamename = ingamename;
        return true;
      } else {
        alert("获取Minecraft ID失败，请检查MC名称是否正确");
        return false;
      }
    } catch (error) {
      console.error("获取Minecraft ID失败:", error);
      return false;
    }
  };

  const bindMinecraftId = async (ingamename: string) => {
    const success = await getMinecraftId(ingamename);
    if (!success) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ mc_uuid: userInfo.value.mc_uuid, ingamename: ingamename })
        .eq("user_id", userId.value);
      if (error) {
        console.error(error);
      } else {
        alert("绑定成功");
        // 更新本地存储
        localStorage.setItem("userInfo", JSON.stringify(userInfo.value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return {
    userInfo,
    loading,
    isBinding,
    userId,
    isBindMinecraftId,
    // 方法
    initUserInfo,
    bindUser,
    getMinecraftId,
    bindMinecraftId,
    createNewUser,
  };
});

export default useUserStore;
