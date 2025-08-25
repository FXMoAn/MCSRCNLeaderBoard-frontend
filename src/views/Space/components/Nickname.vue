<template>
  <div class="nickname-container" v-if="!userStore.isBinding">
    <div class="section-title">账号绑定</div>

    <div class="binding-section">
      <div class="section-subtitle">老用户绑定账号（如果之前投过成绩，可以先搜一下）如果找不到或错绑，请联系管理员</div>
      <div class="form-row">
        <div class="custom-select-container">
          <input
            type="text"
            class="custom-select-input"
            :placeholder="selectedUserId ? getUserNameById(selectedUserId) : '请选择用户'"
            v-model="searchKeyword"
            @focus="showDropdown = true"
            @blur="handleBlur"
            @input="handleSearch"
          />
          
          <!-- 下拉选项列表 -->
          <div class="custom-dropdown" v-show="showDropdown">
            <div class="dropdown-header">
              <span class="dropdown-title">选择用户</span>
              <span class="dropdown-count">{{ filteredUserList.length }} 个用户</span>
            </div>
            
            <div class="dropdown-options">
              <div
                v-for="user in filteredUserList"
                :key="user.id"
                class="dropdown-option"
                :class="{ 'selected': selectedUserId === user.id }"
                @click="selectUser(user)"
              >
                {{ user.nickname }}
              </div>
              
              <div v-if="filteredUserList.length === 0" class="no-results">
                没有找到匹配的用户
              </div>
            </div>
          </div>
        </div>
        <button class="form-button" @click="handleBinding">绑定</button>
      </div>
    </div>

    <div class="binding-section">
      <div class="section-subtitle">新用户输入昵称（如果没有投过榜，可以在这里绑定，最好是B站名）</div>
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
      <div class="section-title">当前昵称</div>
      <p class="nickname-display">{{ userStore.userInfo?.nickname }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import useUserStore from "@/stores/user";
import { useRouter } from "vue-router";

const userStore = useUserStore();
const router = useRouter();

const unbindedUserList = ref<any[]>([]);
const selectedUserId = ref<number>(0);
const newUserNickname = ref<string>("");
const searchKeyword = ref<string>("");
const showDropdown = ref<boolean>(false);

// 计算属性：根据搜索关键词筛选用户列表
const filteredUserList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return unbindedUserList.value;
  }
  return unbindedUserList.value.filter(user =>
    user.nickname.toLowerCase().includes(searchKeyword.value.toLowerCase())
  );
});

// 根据用户ID获取用户名
const getUserNameById = (userId: number) => {
  const user = unbindedUserList.value.find(u => u.id === userId);
  return user ? user.nickname : '';
};

// 选择用户
const selectUser = (user: any) => {
  selectedUserId.value = user.id;
  searchKeyword.value = user.nickname;
  showDropdown.value = false;
};

// 处理搜索输入
const handleSearch = () => {
  showDropdown.value = true;
};

// 处理失焦事件
const handleBlur = () => {
  // 延迟关闭，让用户有时间点击选项
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

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

/* 自定义下拉框样式 */
.custom-select-container {
  position: relative;
  flex: 1;
}

.custom-select-input {
  width: 100%;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  cursor: pointer;
}

.custom-select-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.custom-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #444;
  background-color: #2a2a2a;
}

.dropdown-title {
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.dropdown-count {
  color: #666;
  font-size: 12px;
}

.dropdown-options {
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #2a2a2a;
}

.dropdown-option:hover {
  background-color: #3a3a3a;
}

.dropdown-option.selected {
  background-color: rgba(0, 188, 212, 0.1);
  color: #00bcd4;
}

.dropdown-option:last-child {
  border-bottom: none;
}

.no-results {
  padding: 20px 16px;
  text-align: center;
  color: #666;
  font-style: italic;
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
