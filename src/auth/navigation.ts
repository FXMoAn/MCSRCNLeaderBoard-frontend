import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { safeRedirect } from './flow';

export async function authenticatedDestination(redirect: unknown) {
  const auth = useAuthStore();
  const profiles = useUserStore();
  await auth.ensureProfile();
  const target = safeRedirect(redirect);
  if (profiles.profileStatus !== 'ready') {
    return { path: '/space/user-edit', query: { setup: '1', redirect: target } };
  }
  return target;
}
