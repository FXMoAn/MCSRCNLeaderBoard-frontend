<template>
  <div class="upload-container">
    <div class="upload-title">上传成绩记录</div>
    <form class="upload-form" @submit.prevent="uploadRun">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="version">版本</label>
          <select class="form-select" id="version" v-model="version">
            <option value="1.16.1">1.16.1</option>
            <option value="1.15.2">1.15.2</option>
            <option value="1.12.2">1.12.2</option>
            <option value="1.8.9">1.8.9</option>
            <option value="1.7.10">1.7.10</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="type">类型</label>
          <select class="form-select" id="type" v-model="type">
            <option value="RSG">RSG</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="nickname">用户名</label>
          <SearchSelect
            v-model="nickname"
            :options="userList"
            option-key="id"
            option-label="nickname"
            :search-fields="['nickname']"
            placeholder="请选择用户"
            @select="handleUserSelect"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="igt">游戏时间IGT</label>
          <div class="igt-inputs">
            <input
              class="form-input igt-input"
              type="number"
              id="igt-minute"
              v-model="igtMinute"
              placeholder="分"
              min="0"
              autocomplete="off"
            />
            <span class="igt-separator">:</span>
            <input
              class="form-input igt-input"
              type="number"
              id="igt-second"
              v-model="igtSecond"
              placeholder="秒"
              min="0"
              max="59"
              autocomplete="off"
            />
            <span class="igt-separator">:</span>
            <input
              class="form-input igt-input"
              type="number"
              id="igt-millisecond"
              v-model="igtMillisecond"
              placeholder="毫秒"
              min="0"
              max="999"
              autocomplete="off"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="date">日期</label>
          <input class="form-input" type="date" id="date" v-model="date" autocomplete="off" />
        </div>

        <div class="form-group">
          <label class="form-label" for="video-link">视频链接</label>
          <input
            class="form-input"
            type="text"
            id="video-link"
            v-model="videoLink"
            placeholder="请输入视频链接"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="seed">种子</label>
          <input
            class="form-input"
            type="text"
            id="seed"
            v-model="seed"
            placeholder="请输入种子"
            autocomplete="off"
          />
        </div>

        <div class="form-group full-width">
          <label class="form-label" for="remarks">备注</label>
          <textarea
            class="form-textarea"
            id="remarks"
            v-model="remarks"
            placeholder="请输入备注信息"
            rows="3"
            autocomplete="off"
          />
        </div>
      </div>

      <div class="form-actions">
        <button
          class="submit-button"
          type="submit"
          :disabled="isSubmitting"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">上传记录</span>
          <span v-else>上传中...</span>
        </button>

        <button type="button" class="clear-button" @click="clearForm" :disabled="isSubmitting">
          清空表单
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import {
  validateNickname,
  validateRemarks,
  validateSeed,
  validateVideoLink,
  sanitizeInput,
  sanitizeVideoLink,
  sanitizeTextInput,
} from '@/utils/security';
import SearchSelect from '@/components/common/SearchSelect.vue';

const version = ref('1.16.1');
const type = ref('RSG');
const igtMinute = ref(0);
const igtSecond = ref(0);
const igtMillisecond = ref(0);
const date = ref(new Date().toISOString().split('T')[0]);
const videoLink = ref('');
const remarks = ref('');
const seed = ref('');
const nickname = ref('');

const userList = ref<any[]>([]);

// 防重复提交状态
const isSubmitting = ref(false);

const igt = computed(() => {
  return (
    igtMinute.value.toString().padStart(2, '0') +
    ':' +
    igtSecond.value.toString().padStart(2, '0') +
    ':' +
    igtMillisecond.value.toString().padStart(3, '0')
  );
});

const checkRequiredInfo = () => {
  if (version.value === '') {
    alert('版本不能为空');
    return false;
  }
  if (type.value === '') {
    alert('类型不能为空');
    return false;
  }
  if (igt.value === '') {
    alert('游戏时间不能为空');
    return false;
  }
  if (date.value === '') {
    alert('日期不能为空');
    return false;
  }

  // 使用安全工具函数验证输入
  const nicknameValidation = validateNickname(nickname.value);
  if (!nicknameValidation.isValid) {
    alert(nicknameValidation.message);
    return false;
  }

  const videoLinkValidation = validateVideoLink(videoLink.value);
  if (!videoLinkValidation.isValid) {
    alert(videoLinkValidation.message);
    return false;
  }

  return true;
};

const getNameIdByNickname = async (nickname: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)
      .single();
    if (error) {
      alert('获取用户ID失败');
      return;
    }
    return data.id;
  } catch (error) {
    alert('获取用户ID失败');
    return;
  }
};

const getUserList = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    alert('获取用户列表失败');
    return;
  }
  userList.value = data.map((user) => ({
    id: user.id,
    nickname: user.nickname,
  }));
};

const handleUserSelect = (user: any) => {
  nickname.value = user.nickname;
};

const insertVerifiedRun = async () => {
  // 使用安全工具函数清理输入
  const sanitizedNickname = sanitizeInput(nickname.value.trim());
  const sanitizedRemarks = sanitizeTextInput(remarks.value.trim());
  const sanitizedSeed = sanitizeTextInput(seed.value.trim());
  const sanitizedVideoLink = sanitizeVideoLink(videoLink.value.trim());

  const userId = await getNameIdByNickname(sanitizedNickname);
  const { data, error } = await supabase.from('runs').insert({
    userid: userId,
    version: version.value,
    type: type.value,
    igt: igt.value,
    date: date.value.replace(/-/g, '/'),
    videolink: sanitizedVideoLink,
    remarks: sanitizedRemarks,
    seed: sanitizedSeed,
    status: 'verified',
  });
  if (error) {
    alert('上传失败');
    return;
  }
  alert('上传成功');

  // 上传成功后清空表单
  clearForm();
};

/**
 * 清空所有表单输入
 */
const clearForm = () => {
  // 重置为默认值
  version.value = '1.16.1';
  type.value = 'RSG';
  igtMinute.value = 0;
  igtSecond.value = 0;
  igtMillisecond.value = 0;
  date.value = new Date().toISOString().split('T')[0];
  videoLink.value = '';
  remarks.value = '';
  seed.value = '';
  nickname.value = '';
};

const uploadRun = async () => {
  // 防重复提交检查
  if (isSubmitting.value) {
    alert('正在上传中，请勿重复提交');
    return;
  }

  if (!checkRequiredInfo()) {
    return;
  }

  try {
    isSubmitting.value = true; // 设置提交状态
    await insertVerifiedRun();
  } catch (error) {
    console.error('上传过程中出现错误:', error);
    alert('上传失败，请重试');
  } finally {
    isSubmitting.value = false; // 重置提交状态
  }
};

onMounted(() => {
  getUserList();
});
</script>

<style scoped>
.upload-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-title {
  color: #fff;
  font-size: 1.8em;
  font-weight: 600;
  text-align: center;
  margin-bottom: 30px;
}

.upload-form {
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  color: #ccc;
  font-size: 0.9em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  width: 100%;
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

.igt-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.igt-input {
  width: 80px;
  text-align: center;
}

.igt-separator {
  color: #666;
  font-weight: 600;
  font-size: 16px;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
}

.submit-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button:disabled {
  background: linear-gradient(135deg, #666, #555);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.submit-button.submitting {
  background: linear-gradient(135deg, #0097a7, #00695f);
  cursor: wait;
}

.submit-button.submitting:hover {
  transform: none;
  box-shadow: none;
}

.clear-button {
  background: linear-gradient(135deg, #666, #555);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #777, #666);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(102, 102, 102, 0.3);
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.clear-button:active:not(:disabled) {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .upload-container {
    padding: 16px;
  }

  .upload-title {
    font-size: 1.5em;
    margin-bottom: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: 10px 14px;
  }

  .submit-button {
    padding: 12px 24px;
    font-size: 14px;
  }
}
</style>
