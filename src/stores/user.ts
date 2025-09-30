import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { eventBus, AUTH_EVENTS } from './eventBus';
import axios from 'axios';
import {
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification,
} from '@/utils/notification';
import type { UserInfo } from '@/types/CommonTypes';

const useUserStore = defineStore('user', () => {
  const localUserId = ref<number | null>(null);

  const userInfo = ref<UserInfo>(JSON.parse(localStorage.getItem('userInfo') ?? '{}'));
  const loading = ref(false);

  const isBinding = computed(() => !!userInfo.value.user_id);
  const isBindMinecraftId = computed(() => !!userInfo.value.mc_uuid);
  const isAdmin = computed(() => {
    // 确保用户已登录且角色为admin
    return localUserId.value && userInfo.value.role === 'admin';
  });

  // 用于获取用户信息
  const initUserInfo = async () => {
    try {
      loading.value = true;
      if (!localUserId.value) {
        console.log('用户ID不存在，跳过用户信息初始化');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', localUserId.value)
        .single();
      if (error) {
        throw error;
      }
      userInfo.value = data;
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value));
    } catch (error) {
      console.error(error);
      showErrorNotification('获取用户信息失败');
    } finally {
      loading.value = false;
    }
  };

  const bindUser = async (selectedUserId: number) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ user_id: localUserId.value })
        .eq('id', selectedUserId)
        .select();
      if (error) {
        console.error(error);
        showErrorNotification('绑定用户失败');
      } else {
        showSuccessNotification('绑定成功');
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
      showErrorNotification('绑定用户失败');
    }
  };

  const createNewUser = async (nickname: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({ nickname: nickname, user_id: localUserId.value })
        .select();
      if (error) {
        console.error(error);
        showErrorNotification('创建用户失败');
      } else {
        showSuccessNotification('创建成功');
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
      showErrorNotification('创建用户失败');
    }
  };

  const updateNickname = async (nickname: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ nickname: nickname })
        .eq('user_id', localUserId.value);
      if (error) {
        console.error(error);
        showErrorNotification('更新失败');
      } else {
        showSuccessNotification('更新成功');
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
      showErrorNotification('更新失败');
    }
  };

  // 更新用户信息(通用)
  const updateUserInfo = async (updates: Partial<UserInfo>) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', localUserId.value);

      if (error) {
        console.error(error);
        showErrorNotification('更新失败');
      } else {
        showSuccessNotification('更新成功');
        await initUserInfo();
      }
    } catch (error) {
      console.error(error);
      showErrorNotification('更新失败');
    }
  };

  // 用于操作Minecraft ID
  const getMinecraftId = async (ingamename: string) => {
    try {
      const res = await axios.get(
        // `https://mcsrcors.fxmoan148.workers.dev/?url=https://api.mojang.com/users/profiles/minecraft/${ingamename}`
        `https://playerdb.co/api/player/minecraft/${ingamename}`
      );
      if ((res.data.success = true)) {
        userInfo.value.mc_uuid = res.data.data.player.raw_id;
        userInfo.value!.ingamename = ingamename;
        return true;
      } else {
        showErrorNotification('获取Minecraft ID失败，请检查MC名称是否正确');
        return false;
      }
    } catch (error) {
      console.error('获取Minecraft ID失败:', error);
      return false;
    }
  };

  const getMinecraftNickname = async (mc_uuid: string) => {
    try {
      const res = await axios.get(
        `https://mcsrcors.fxmoan148.workers.dev/?url=https://sessionserver.mojang.com/session/minecraft/profile/${mc_uuid}`
      );
      if (res.data.id && res.data.name) {
        userInfo.value.ingamename = res.data.name;
        return true;
      } else {
        showErrorNotification('获取Minecraft昵称失败，请检查MC ID是否正确');
        return false;
      }
    } catch (error) {
      console.error('获取Minecraft昵称失败:', error);
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
        .from('users')
        .update({ mc_uuid: userInfo.value.mc_uuid, ingamename: ingamename })
        .eq('user_id', localUserId.value);
      if (error) {
        console.error(error);
      } else {
        showSuccessNotification('绑定成功');
        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const refreshMinecraftId = async () => {
    const success = await getMinecraftNickname(userInfo.value.mc_uuid);
    if (!success) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ingamename: userInfo.value.ingamename })
        .eq('user_id', localUserId.value);
      if (error) {
        console.error(error);
      } else {
        showSuccessNotification('刷新成功');
        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const setUserInfo = (info: UserInfo | null) => {
    if (info) {
      userInfo.value = info;
      localStorage.setItem('userInfo', JSON.stringify(info));
    } else {
      userInfo.value = {} as UserInfo;
      localStorage.removeItem('userInfo');
    }
  };

  const clearUserInfo = () => {
    userInfo.value = {} as UserInfo;
    localStorage.removeItem('userInfo');
  };

  // 设置用户ID（从事件总线接收）
  const setUserId = (userId: number | null) => {
    localUserId.value = userId;
    if (!userId) {
      clearUserInfo();
    }
  };

  // 监听认证状态变化
  const setupEventListeners = () => {
    // 监听用户登录
    eventBus.on(AUTH_EVENTS.USER_LOGGED_IN, (user: any) => {
      console.log('用户登录事件:', user);
      setUserId(user?.id || null);
      if (user?.id) {
        initUserInfo();
      }
    });

    // 监听用户登出
    eventBus.on(AUTH_EVENTS.USER_LOGGED_OUT, () => {
      console.log('用户登出事件');
      setUserId(null);
      clearUserInfo();
    });

    // 监听session过期
    eventBus.on(AUTH_EVENTS.SESSION_EXPIRED, () => {
      console.log('Session过期事件');
      setUserId(null);
      clearUserInfo();
    });
  };

  // 在store初始化时设置事件监听
  setupEventListeners();

  return {
    userInfo,
    loading,
    isBinding,
    localUserId,
    isBindMinecraftId,
    isAdmin,
    // 方法
    initUserInfo,
    bindUser,
    updateNickname,
    getMinecraftId,
    bindMinecraftId,
    refreshMinecraftId,
    createNewUser,
    setUserInfo,
    clearUserInfo,
    setUserId,
    updateUserInfo,
  };
});

export default useUserStore;
