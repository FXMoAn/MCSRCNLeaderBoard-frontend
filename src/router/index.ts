import { createRouter, createWebHistory } from 'vue-router';
import Rank from '@/views/Rank/Rank.vue';
import { setupRouteGuards, setupRouteErrorHandling } from './guards';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/rank',
    },
    // 排行榜
    {
      path: '/rank',
      name: 'rank',
      component: Rank,
    },
    // 速通详情
    {
      path: '/run/:id',
      name: 'run',
      component: () => import('../views/Run.vue'),
    },
    // 上传成绩
    {
      path: '/user-upload',
      name: 'user-upload',
      meta: { requiresAuth: true, requiresProfile: true },
      component: () => import('../views/Upload/Upload.vue'),
    },
    // 账号管理
    {
      path: '/login',
      name: 'login',
      meta: { guestOnly: true },
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      meta: { guestOnly: true },
      component: () => import('../views/Signup.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      meta: { authPage: true },
      component: () => import('../views/ResetPassword.vue'),
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      meta: { authPage: true },
      component: () => import('../views/auth/VerifyEmail.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      meta: { authPage: true },
      component: () => import('../views/auth/ForgotPassword.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      meta: { authPage: true },
      component: () => import('../views/auth/AuthCallback.vue'),
    },
    // 待审核成绩（管理员）
    {
      path: '/pending-run/:id',
      name: 'pending-run',
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import('../views/PendingRun.vue'),
    },
    // 公告
    {
      path: '/announcements',
      name: 'announcements',
      component: () => import('../views/Announcements.vue'),
    },
    // 资源
    {
      path: '/resources',
      name: 'resources',
      component: () => import('../views/Resources.vue'),
    },
    // 用户资料(公开)
    {
      path: '/profile/:id',
      name: 'profile',
      component: () => import('../views/Profile/Profile.vue'),
    },
    // 个人空间
    {
      path: '/space',
      name: 'space',
      meta: { requiresAuth: true },
      component: () => import('../views/Space/Space.vue'),
      redirect: '/space/user-edit',
      children: [
        {
          path: 'user-runs',
          name: 'user-runs',
          meta: { requiresProfile: true },
          component: () => import('../views/Space/views/UserRuns.vue'),
        },
        {
          path: 'user-edit',
          name: 'user-edit',
          component: () => import('../views/Space/views/UserEdit.vue'),
        },
        {
          path: 'binding',
          name: 'binding',
          redirect: '/space/user-edit',
        },
      ],
    },
    // 管理面板
    {
      path: '/manage',
      name: 'manage',
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import('../views/Manage/Manage.vue'),
      children: [
        {
          path: 'upload',
          name: 'upload',
          component: () => import('../views/Manage/views/Upload.vue'),
        },
        {
          path: 'user',
          name: 'user',
          component: () => import('../views/Manage/views/User.vue'),
        },
        {
          path: 'verify',
          name: 'verify',
          component: () => import('../views/Manage/views/Verify.vue'),
        },
        {
          path: 'run',
          name: 'manageRun',
          component: () => import('../views/Manage/views/Run.vue'),
        },
      ],
    },
  ],
});

// 设置路由守卫
setupRouteGuards(router);
setupRouteErrorHandling(router);

export default router;
