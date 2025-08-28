<template>
  <div class="nickname-container" v-if="!userStore.isBinding">
    <div class="section-title">账号绑定</div>

    <div class="binding-section">
      <div class="section-subtitle">
        老用户绑定账号（如果之前投过成绩，可以在这里绑定，如果找不到或错绑，请联系管理员）
      </div>
      <div class="form-row">
        <SearchSelect
          v-model="selectedUser"
          :options="unbindedUserList"
          option-key="id"
          option-label="nickname"
          :search-fields="['nickname']"
          placeholder="搜索用户名"
          title="选择用户"
          @select="handleUserSelect"
        />
        <button class="form-button" @click="handleBinding">绑定</button>
      </div>
    </div>

    <div class="binding-section">
      <div class="section-subtitle">
        新用户输入昵称（如果没有投过榜，可以在这里绑定，榜单上会使用这个名字）
      </div>
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
      <div class="section-subtitle">当前昵称</div>
      <div class="nickname-display-container">
        <input
          type="text"
          class="nickname-display"
          v-model="changedNickname"
          :disabled="!isEditing"
        />
        <button class="form-button refresh-button" @click="handleEditNickname" v-if="!isEditing">
          修改
        </button>
        <button class="form-button refresh-button" @click="handleSaveNickname" v-else>保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import useUserStore from '@/stores/user';
import { useRouter } from 'vue-router';
import { validateNickname, sanitizeInput } from '@/utils/security';
import SearchSelect from '@/components/common/SearchSelect.vue';

const userStore = useUserStore();
const router = useRouter();

const unbindedUserList = ref<any[]>([]);
const selectedUser = ref<any>(null);
const newUserNickname = ref<string>('');

const isEditing = ref(false);
const changedNickname = ref(userStore.userInfo.nickname);

// 处理用户选择
const handleUserSelect = (user: any) => {
  selectedUser.value = user;
};

const getUnbindedUser = async () => {
  //uuser为空
  const { data, error } = await supabase.from('users').select('*').is('user_id', null);
  if (error) {
    throw error;
  }
  unbindedUserList.value = data.map((user) => ({
    id: user.id,
    nickname: user.nickname,
  }));
};

const handleBinding = async () => {
  if (!selectedUser.value) {
    alert('请选择一个用户');
    return;
  }
  await userStore.bindUser(selectedUser.value.id);
  router.go(0);
};

const handleNewUserBinding = async () => {
  // 使用安全工具函数进行输入验证
  const validation = validateNickname(newUserNickname.value);

  if (!validation.isValid) {
    alert(validation.message);
    return;
  }

  // 清理输入
  const sanitizedNickname = sanitizeInput(newUserNickname.value.trim());

  await userStore.createNewUser(sanitizedNickname);
  newUserNickname.value = ''; // 清空输入
  router.go(0);
};

const handleEditNickname = () => {
  isEditing.value = true;
};

const handleSaveNickname = async () => {
  try {
    await userStore.updateNickname(changedNickname.value);
    isEditing.value = false;
  } catch (error) {
    console.error(error);
  }
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

/* 滚动条样式 */
.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.dropdown-options::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.user-info {
  text-align: center;
  padding: 40px 20px;
}

.nickname-display-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.nickname-display {
  flex: 1;
  color: #00bcd4;
  font-size: 1.4em;
  font-weight: 600;
  margin: 0;
  padding: 15px;
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

  .custom-dropdown {
    max-height: 250px;
  }

  .dropdown-options {
    max-height: 200px;
  }

  .nickname-display {
    font-size: 1.2em;
    padding: 16px;
  }
}
</style>
