import { createRouter, createWebHistory } from 'vue-router';
import Rank from '@/views/Rank.vue';
import { setupRouteGuards, setupRouteErrorHandling } from './guards';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/rank',
    },
    {
      path: '/rank',
      name: 'rank',
      component: Rank,
    },
    {
      path: '/run/:id',
      name: 'run',
      component: () => import('../views/Run.vue'),
    },
    {
      path: '/user-upload',
      name: 'user-upload',
      component: () => import('../views/Upload/Upload.vue'),
    },
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
    {
      path: '/pending-run/:id',
      name: 'pending-run',
      component: () => import('../views/PendingRun.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/Stats/Stats.vue'),
    },
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
          path: 'binding',
          name: 'binding',
          component: () => import('../views/Space/views/Binding.vue'),
        },
      ],
    },
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
