import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { createProfileLoader, type ProfileStatus } from '@/auth/profile';
import axios from 'axios';
import {
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification,
} from '@/utils/notification';
import type { UserInfo } from '@/types/CommonTypes';

const useUserStore = defineStore('user', () => {
  const localUserId = ref<string | null>(null);
  const userInfo = ref<UserInfo>({} as UserInfo);
  const loading = ref(false);
  const profileStatus = ref<ProfileStatus>('idle');
  const profileError = ref('');
  const isBinding = computed(
    () => !!localUserId.value && userInfo.value.user_id === localUserId.value
  );
  const isBindMinecraftId = computed(() => isBinding.value && !!userInfo.value.mc_uuid);
  const isAdmin = computed(() => isBinding.value && userInfo.value.role === 'admin');
  const profileLoader = createProfileLoader<UserInfo>(
    async (owner) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', owner)
        .abortSignal(AbortSignal.timeout(15_000))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    (state) => {
      loading.value = state.status === 'loading';
      profileStatus.value = state.status;
      profileError.value = state.status === 'error' ? '资料暂时无法加载，请重试' : '';
      userInfo.value = state.profile ?? ({} as UserInfo);
    }
  );
  const ensureUserInfo = async (force = false) => {
    if (localUserId.value) await profileLoader.load(localUserId.value, force);
  };
  const initUserInfo = () => ensureUserInfo(true);

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
  const updateUserInfo = async (updates: Partial<UserInfo>): Promise<boolean> => {
    const ownerId = localUserId.value;
    const profileId = userInfo.value.id;
    if (!ownerId || !profileId) return false;
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', ownerId)
        .eq('id', profileId)
        .select()
        .single();
      if (error) {
        showErrorNotification('保存资料失败，请重试');
        return false;
      }
      if (localUserId.value !== ownerId || userInfo.value.id !== profileId) return false;
      setUserInfo(data);
      showSuccessNotification('资料已保存');
      return true;
    } catch {
      showErrorNotification('保存资料失败，请重试');
      return false;
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
    if (info && localUserId.value && info.user_id === localUserId.value)
      profileLoader.seed(localUserId.value, info);
    else profileLoader.setOwner(null);
  };
  const clearUserInfo = () => {
    profileLoader.setOwner(null);
    try {
      localStorage.removeItem('userInfo');
    } catch {
      /* Legacy profile cache is optional. */
    }
  };
  const setUserId = (userId: string | null) => {
    if (localUserId.value === userId) return;
    localUserId.value = userId;
    profileLoader.setOwner(userId);
    try {
      localStorage.removeItem('userInfo');
    } catch {
      /* No credentials are stored here. */
    }
  };

  return {
    userInfo,
    loading,
    profileStatus,
    profileError,
    ensureUserInfo,
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
