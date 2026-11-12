import { nextTick, reactive, ref } from 'vue';
import { authErrorMessage } from '@/auth/flow';

export function useAuthForm() {
  const busy = ref(false);
  const error = ref('');
  const errors = reactive<Record<string, string>>({});
  function clear(field: string) {
    errors[field] = '';
    error.value = '';
  }
  async function validate(fields: Record<string, string>) {
    for (const field of Object.keys(errors)) errors[field] = '';
    Object.assign(errors, fields);
    const first = Object.keys(fields).find((field) => !!fields[field]);
    if (first) {
      await nextTick();
      document.getElementById(first)?.focus();
    }
    return !first;
  }
  async function run(task: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    error.value = '';
    try {
      await task();
    } catch (reason) {
      error.value = authErrorMessage(reason);
    } finally {
      busy.value = false;
    }
  }
  function guardComposition(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) event.preventDefault();
  }
  return { busy, error, errors, clear, validate, run, guardComposition };
}
