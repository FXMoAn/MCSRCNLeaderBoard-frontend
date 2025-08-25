import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useUserStore } from '@/stores';

// 需要登录的路由
const requireAuthRoutes = [
  '/space',
  '/space/profile',
  '/space/binding',
  '/manage',
  '/manage/upload',
  '/manage/user'
];

// 需要管理员权限的路由
const requireAdminRoutes = [
  '/manage',
  '/manage/upload',
  '/manage/user'
];

// 已登录用户不能访问的路由（如登录、注册页面）
const redirectIfAuthenticatedRoutes = [
  '/login',
  '/signup'
];

/**
 * 检查用户是否已登录
 */
const isAuthenticated = (): boolean => {
  const authStore = useAuthStore();
  return authStore.isLoggedIn;
};

/**
 * 检查用户是否是管理员
 */
const isAdmin = (): boolean => {
  const userStore = useUserStore();
  return Boolean(userStore.isAdmin);
};

/**
 * 检查路由是否需要认证
 */
const requiresAuth = (to: RouteLocationNormalized): boolean => {
  return requireAuthRoutes.some(route => to.path.startsWith(route));
};

/**
 * 检查路由是否需要管理员权限
 */
const requiresAdmin = (to: RouteLocationNormalized): boolean => {
  return requireAdminRoutes.some(route => to.path.startsWith(route));
};

/**
 * 检查是否应该重定向已登录用户
 */
const shouldRedirectIfAuthenticated = (to: RouteLocationNormalized): boolean => {
  return redirectIfAuthenticatedRoutes.some(route => to.path === route);
};

/**
 * 全局前置守卫
 */
export const setupRouteGuards = (router: Router) => {
  router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    try {
      // 等待认证状态初始化完成
      const authStore = useAuthStore();
      if (authStore.loading) {
        // 如果认证还在初始化中，等待一下
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 检查是否需要重定向已登录用户
      if (shouldRedirectIfAuthenticated(to) && isAuthenticated()) {
        next('/rank');
        return;
      }

      // 检查是否需要认证
      if (requiresAuth(to)) {
        if (!isAuthenticated()) {
          // 未登录，重定向到登录页面
          next({
            path: '/login',
            query: { redirect: to.fullPath }
          });
          return;
        }

        // 检查是否需要管理员权限
        if (requiresAdmin(to)) {
          if (!isAdmin()) {
            // 不是管理员，重定向到首页并显示错误信息
            next({
              path: '/rank',
              query: { error: 'unauthorized' }
            });
            return;
          }
        }
      }

      // 所有检查通过，允许导航
      next();
    } catch (error) {
      console.error('路由守卫错误:', error);
      // 发生错误时重定向到首页
      next('/rank');
    }
  });
};

/**
 * 路由错误处理
 */
export const setupRouteErrorHandling = (router: Router) => {
  router.onError((error) => {
    console.error('路由错误:', error);
    // 可以在这里添加错误上报逻辑
  });
};

/**
 * 获取重定向路径（用于登录后跳转）
 */
export const getRedirectPath = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('redirect') || '/rank';
};

/**
 * 清除重定向参数
 */
export const clearRedirectPath = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('redirect');
  window.history.replaceState({}, '', url.toString());
};
