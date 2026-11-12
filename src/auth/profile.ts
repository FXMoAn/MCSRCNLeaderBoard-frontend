export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';
export interface ProfileState<T> {
  owner: string | null;
  status: ProfileStatus;
  profile: T | null;
}

export function createProfileLoader<T>(
  fetchProfile: (owner: string) => Promise<T | null>,
  onState: (state: ProfileState<T>) => void
) {
  let state: ProfileState<T> = { owner: null, status: 'idle', profile: null };
  let generation = 0;
  let pending: Promise<ProfileState<T>> | null = null;
  function publish(next: ProfileState<T>) {
    state = next;
    onState({ ...state });
  }
  function setOwner(owner: string | null) {
    if (state.owner === owner) return;
    generation++;
    pending = null;
    publish({ owner, status: 'idle', profile: null });
  }
  function seed(owner: string, profile: T) {
    generation++;
    pending = null;
    publish({ owner, status: 'ready', profile });
  }
  function load(owner: string, force = false): Promise<ProfileState<T>> {
    setOwner(owner);
    if (!force && pending) return pending;
    if (!force && ['ready', 'missing', 'error'].includes(state.status))
      return Promise.resolve({ ...state });
    const version = ++generation;
    publish({ ...state, status: 'loading' });
    const request = (async () => {
      try {
        const profile = await fetchProfile(owner);
        if (version === generation)
          publish({ owner, profile, status: profile ? 'ready' : 'missing' });
      } catch {
        if (version === generation) publish({ owner, profile: null, status: 'error' });
      } finally {
        if (version === generation) pending = null;
      }
      return { ...state };
    })();
    pending = request;
    return request;
  }
  return { load, setOwner, seed };
}
