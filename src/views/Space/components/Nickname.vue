<template>
  <div class="nickname-container" v-if="!userStore.isBinding">
    <h3 class="section-title">账号绑定</h3>

    <div class="binding-section">
      <h4 class="section-subtitle">老用户绑定账号</h4>
      <div class="form-row">
        <select v-model="selectedUserId" class="form-select">
          <option value="" selected disabled>请选择用户</option>
          <option
            v-for="user in unbindedUserList"
            :value="user.id"
            :key="user.id"
          >
            {{ user.nickname }}
          </option>
        </select>
        <button class="form-button" @click="handleBinding">绑定</button>
      </div>
    </div>

    <div class="binding-section">
      <h4 class="section-subtitle">新用户输入昵称</h4>
      <div class="form-row">
        <input
          type="text"
          class="form-input"
          placeholder="请输入你的昵称"
          v-model="newUserNickname"
        />
        <button class="form-button" @click="handleNewUserBinding">绑定</button>
      </div>
    </div>
  </div>

  <div class="nickname-container" v-else>
    <div class="user-info">
      <h3 class="section-title">当前昵称</h3>
      <p class="nickname-display">{{ userStore.userInfo?.nickname }}</p>
    </div>
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
.nickname-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.section-title {
  color: #fff;
  font-size: 1.6em;
  font-weight: 600;
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #444;
}

.binding-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid #444;
}

.section-subtitle {
  color: #ccc;
  font-size: 1.1em;
  font-weight: 500;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.form-input,
.form-select {
  flex: 1;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #666;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.form-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.form-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.form-button:active {
  transform: translateY(0);
}

.user-info {
  text-align: center;
  padding: 40px 20px;
}

.nickname-display {
  color: #00bcd4;
  font-size: 1.4em;
  font-weight: 600;
  margin: 0;
  padding: 20px;
  background-color: rgba(0, 188, 212, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 188, 212, 0.3);
}

@media (max-width: 768px) {
  .nickname-container {
    padding: 0 16px;
  }

  .section-title {
    font-size: 1.4em;
    margin-bottom: 24px;
  }

  .binding-section {
    padding: 16px;
    margin-bottom: 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .form-button {
    width: 100%;
  }

  .nickname-display {
    font-size: 1.2em;
    padding: 16px;
  }
}
</style>
