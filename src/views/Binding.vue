<template>
  <div class="binding-container">
    <div class="binding-header">
      <h1>{{ userStore.isBinding ? "修改" : "绑定" }}</h1>
    </div>
    <div class="unbinded-user-list">
      <select v-model="selectedUserId" class="unbinded-user-select">
        <option
          class="unbinded-user-item"
          v-for="user in unbindedUserList"
          :value="user.id"
          :key="user.id"
        >
          {{ user.nickname }}
        </option>
      </select>
      <button @click="handleBinding">绑定</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import useUserStore from "@/stores/user";
import useAuthStore from "@/stores/auth";
import { onMounted, ref } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "vue-router";

const userStore = useUserStore();
const authStore = useAuthStore();
const router = useRouter();

const unbindedUserList = ref<any[]>([]);
const selectedUserId = ref<number>(0);

const getUnbindedUser = async () => {
  //uuser为空
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .is("user_id", null);
  if (error) {
    throw error;
  }
  unbindedUserList.value = data.map((user) => ({
    id: user.id,
    nickname: user.nickname,
  }));
};

const handleBinding = async () => {
  await userStore.bindUser(selectedUserId.value);
  router.push("/");
};

onMounted(() => {
  getUnbindedUser();
});
</script>

<style scoped>
.binding-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.unbinded-user-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.unbinded-user-select {
  color: #000;
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0 10px;
}

.unbinded-user-item {
  color: #000;
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0 10px;
}
</style>
