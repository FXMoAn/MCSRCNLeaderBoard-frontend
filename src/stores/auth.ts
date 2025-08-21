import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabaseClient";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { useRouter } from "vue-router";

const useAuthStore = defineStore("auth", () => {
  const router = useRouter();
  // 状态
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);

  // 计算属性
  const isLoggedIn = computed(() => !!user.value);
  const isAuthenticated = computed(() => !!session.value);

  // 初始化认证状态
  const initializeAuth = async () => {
    try {
      loading.value = true;

      // 获取当前会话
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      session.value = currentSession;
      user.value = currentSession?.user ?? null;

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        session.value = newSession;
        user.value = newSession?.user ?? null;
      });
    } catch (error) {
      console.error("初始化认证失败:", error);
    } finally {
      loading.value = false;
    }
  };

  // 登录
  const login = async (email: string, password: string) => {
    try {
      loading.value = true;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  // 注册
  const signup = async (email: string, password: string) => {
    try {
      loading.value = true;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  // 登出
  const logout = async () => {
    try {
      loading.value = true;
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // 清除本地状态
      user.value = null;
      session.value = null;
      localStorage.removeItem("userInfo");
      router.push("/");

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  // 获取当前用户
  const getCurrentUser = async () => {
    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      user.value = currentUser;
      return { user: currentUser, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  };

  // 重置密码
  const resetPassword = async (email: string) => {
    try {
      loading.value = true;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  // 更新密码
  const updatePassword = async (password: string) => {
    try {
      loading.value = true;
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  // 更新用户信息
  const updateUserProfile = async (updates: { email?: string; data?: any }) => {
    try {
      loading.value = true;
      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      loading.value = false;
    }
  };

  return {
    // 状态
    user,
    session,
    loading,

    // 计算属性
    isLoggedIn,
    isAuthenticated,

    // 方法
    initializeAuth,
    login,
    signup,
    logout,
    getCurrentUser,
    resetPassword,
    updatePassword,
    updateUserProfile,
  };
});

export default useAuthStore;
