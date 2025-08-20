import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import useAuthStore from "./auth";

const useUserStore = defineStore("user", () => {
  const authStore = useAuthStore();
  const userId = computed(() => authStore.user?.id);

  const userInfo = ref(null);
  const loading = ref(false);

  const isBinding = computed(() => !!userInfo.value);

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
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  };

  const bindUser = async (selectedUserId: number) => {
    const { data, error } = await supabase
      .from("users")
      .update({ user_id: userId.value })
      .eq("id", selectedUserId)
      .select();
    if (error) {
      throw error;
    } else {
      alert("绑定成功");
      console.log(data);
      await initUserInfo();
    }
  };

  return {
    userInfo,
    loading,
    isBinding,
    userId,

    initUserInfo,
    bindUser,
  };
});

export default useUserStore;
