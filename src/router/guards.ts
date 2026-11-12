import type { Router } from 'vue-router';
import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { safeRedirect } from '@/auth/flow';
import { showErrorNotification } from '@/utils/notification';

export function setupRouteGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const profiles = useUserStore();
    if (!to.meta.requiresAuth && !to.meta.guestOnly && !to.meta.authPage) return true;
    await auth.initializeAuth();
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return { path: '/login', query: { redirect: safeRedirect(to.fullPath) }, replace: true };
    }
    if (to.meta.requiresAuth || (to.meta.guestOnly && auth.isLoggedIn)) {
      await auth.ensureProfile();
    }
    const redirect = safeRedirect(to.query.redirect);
    if (to.meta.guestOnly && auth.isLoggedIn) {
      if (profiles.profileStatus !== 'ready') {
        return { path: '/space/user-edit', query: { setup: '1', redirect }, replace: true };
      }
      return redirect;
    }
    if (to.meta.requiresProfile || to.meta.requiresAdmin) {
      if (profiles.profileStatus !== 'ready') {
        return {
          path: '/space/user-edit',
          query: { setup: '1', redirect: safeRedirect(to.fullPath) },
          replace: true,
        };
      }
    }
    if (to.meta.requiresAdmin && !profiles.isAdmin) {
      return { path: '/rank', query: { error: 'unauthorized' }, replace: true };
    }
    return true;
  });
}

export function setupRouteErrorHandling(router: Router) {
  router.onError(() => showErrorNotification('页面暂时无法加载，请刷新后重试'));
}
