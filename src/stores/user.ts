import { ref, computed } from "vue";
import { defineStore } from "pinia";
const useUserStore = defineStore("user", () => {
  const userInfo = ref(null);
  const isLoggedin = ref(false);

  return {
    userInfo,
    isLoggedin,
  };
});

export default useUserStore;
