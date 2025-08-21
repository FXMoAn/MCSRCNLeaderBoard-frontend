<template>
  <div class="nickname-container" v-if="!userStore.isBinding">
    <div class="unbinded-user-list">
      <div class="unbinded-user-list-title">老用户绑定账号</div>
      <select v-model="selectedUserId" class="unbinded-user-select">
        <option class="unbinded-user-item" value="" selected disabled>
          请选择
        </option>
        <option
          class="unbinded-user-item"
          v-for="user in unbindedUserList"
          :value="user.id"
          :key="user.id"
        >
          {{ user.nickname }}
        </option>
      </select>
      <button class="button-common unbinded-user-button" @click="handleBinding">
        绑定
      </button>
    </div>
    <div class="new-user">
      <div class="new-user-title">新用户输入昵称</div>
      <input
        type="text"
        class="new-user-input"
        placeholder="请输入你的昵称"
        v-model="newUserNickname"
      />
      <button
        class="button-common new-user-button"
        @click="handleNewUserBinding"
      >
        绑定
      </button>
    </div>
  </div>
  <div class="nickname-container" v-else>
    <div class="nickname-title">昵称:{{ userStore.userInfo?.nickname }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabaseClient";
import useUserStore from "@/stores/user";
import { useRouter } from "vue-router";

const userStore = useUserStore();
const router = useRouter();

const unbindedUserList = ref<any[]>([]);
const selectedUserId = ref<number>(0);
const newUserNickname = ref<string>("");

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
  if (!selectedUserId.value) {
    alert("请选择一个用户");
    return;
  }
  await userStore.bindUser(selectedUserId.value);
  router.go(0);
};

const handleNewUserBinding = async () => {
  if (!newUserNickname.value) {
    alert("请输入昵称");
    return;
  }
  await userStore.createNewUser(newUserNickname.value);
  router.go(0);
};

onMounted(() => {
  getUnbindedUser();
});
</script>

<style scoped>
/* 绑定账号 */
.nickname-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.unbinded-user-list {
  display: flex;
  align-items: center;
  gap: 20px;
}

.unbinded-user-select {
  color: #000;
  min-width: 200px;
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

.unbinded-user-button,
.new-user-button {
  width: 100px;
  height: 40px;
}

.new-user {
  display: flex;
  align-items: center;
  gap: 20px;
}

.new-user-title {
  font-size: 16px;
  font-weight: bold;
}

.new-user-input {
  max-width: 200px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0 10px;
  color: #000;
}
</style>
