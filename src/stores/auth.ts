import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { supabase } from "@/lib/supabaseClient";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { useRouter } from "vue-router";
import { eventBus, AUTH_EVENTS } from "./eventBus";

const useAuthStore = defineStore("auth", () => {
  const router = useRouter();

  // 状态
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(false);

  // 计算属性
  const isLoggedIn = computed(() => !!user.value);
  const isAuthenticated = computed(() => !!session.value);

  /**
   * 初始化认证状态
   * 监听认证状态变化
   * 当用户登录时，自动初始化用户信息
   * 当用户登出时，清除用户信息
   * 当token刷新时，可能需要重新验证用户信息
   * 当用户信息更新时，更新用户信息
   * 当用户信息更新时，更新用户信息
   */
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
        try {
          session.value = newSession;
          user.value = newSession?.user ?? null;

          // 当用户登录时，自动初始化用户信息
          if (event === "SIGNED_IN" && newSession?.user) {
            eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, newSession.user);
          }
          // 当用户登出时，清除用户信息
          else if (event === "SIGNED_OUT") {
            eventBus.emit(AUTH_EVENTS.USER_LOGGED_OUT);
          }
          // 当token刷新时，可能需要重新验证用户信息
          else if (event === "TOKEN_REFRESHED" && newSession?.user) {
            // 可选：重新验证用户信息
            console.log("Token已刷新");
          }
          // 当用户信息更新时
          else if (event === "USER_UPDATED" && newSession?.user) {
            console.log("用户信息已更新");
          }
        } catch (error) {
          console.error("处理认证状态变化时出错:", error);
          // 如果处理过程中出错，确保状态一致
          if (event === "SIGNED_OUT" || !newSession) {
            eventBus.emit(AUTH_EVENTS.USER_LOGGED_OUT);
          }
        }
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

      // 即使supabase返回错误，也要清除本地状态
      if (error) {
        console.warn("Supabase登出时出现警告:", error.message);
        // 如果是session相关错误，继续执行本地清理
        if (
          error.message.includes("Session") ||
          error.message.includes("JWT")
        ) {
          console.log("检测到session错误，继续执行本地清理");
        } else {
          // 如果是其他严重错误，抛出异常
          throw error;
        }
      }

      // 清除本地状态
      user.value = null;
      session.value = null;

      // 清除用户信息
      eventBus.emit(AUTH_EVENTS.USER_LOGGED_OUT);

      router.push("/");

      return { error: null };
    } catch (error) {
      console.error("登出过程中出现错误:", error);

      // 即使出现错误，也要强制清除本地状态
      user.value = null;
      session.value = null;
      eventBus.emit(AUTH_EVENTS.USER_LOGGED_OUT);

      // 跳转到首页
      router.push("/");

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

  // 强制清理失效的session状态
  const forceCleanup = () => {
    console.log("强制清理失效的session状态");
    user.value = null;
    session.value = null;
    eventBus.emit(AUTH_EVENTS.USER_LOGGED_OUT);
  };

  // 检查session是否有效
  const isSessionValid = async () => {
    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();
      if (error || !currentSession) {
        console.log("Session无效，执行清理");
        forceCleanup();
        return false;
      }
      return true;
    } catch (error) {
      console.error("检查session有效性时出错:", error);
      forceCleanup();
      return false;
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
    forceCleanup,
    isSessionValid,
  };
});

export default useAuthStore;
