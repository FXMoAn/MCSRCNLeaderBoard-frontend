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
      component: () => import('../views/Upload/Upload.vue'),
    },
    // 账号管理
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/Signup.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPassword.vue'),
    },
    // 待审核成绩（管理员）
    {
      path: '/pending-run/:id',
      name: 'pending-run',
      component: () => import('../views/PendingRun.vue'),
    },
    // 统计数据
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/Stats/Stats.vue'),
    },
    // 年份对比
    {
      path: '/24to25',
      name: '24to25',
      component: () => import('../views/YearComparison.vue'),
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
      component: () => import('../views/Space/Space.vue'),
      children: [
        {
          path: 'user-runs',
          name: 'user-runs',
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
          component: () => import('../views/Space/views/Binding.vue'),
        },
      ],
    },
    // 管理面板
    {
      path: '/manage',
      name: 'manage',
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
