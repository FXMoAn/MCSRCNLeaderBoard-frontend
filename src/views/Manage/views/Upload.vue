<template>
  <div class="upload-container">
    <div class="upload-title">上传成绩记录</div>
    <form class="upload-form" @submit.prevent="uploadRun">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="version">版本</label>
          <select class="form-select" id="version" v-model="version">
            <option value="1.16.1">1.16.1</option>
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
          <input
            class="form-input"
            type="text"
            id="nickname"
            v-model="nickname"
            placeholder="请输入用户名"
            autocomplete="off"
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
        <button class="submit-button" type="submit">上传记录</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";

const version = ref("1.16.1");
const type = ref("RSG");
const igtMinute = ref(0);
const igtSecond = ref(0);
const igtMillisecond = ref(0);
const date = ref(new Date().toISOString().split("T")[0]);
const videoLink = ref("");
const remarks = ref("");
const seed = ref("");
const nickname = ref("");

const igt = computed(() => {
  return (
    igtMinute.value.toString().padStart(2, "0") +
    ":" +
    igtSecond.value.toString().padStart(2, "0") +
    ":" +
    igtMillisecond.value.toString().padStart(3, "0")
  );
});

const checkRequiredInfo = () => {
  if (version.value === "") {
    alert("版本不能为空");
    return false;
  }
  if (type.value === "") {
    alert("类型不能为空");
    return false;
  }
  if (igt.value === "") {
    alert("游戏时间不能为空");
    return false;
  }
  if (date.value === "") {
    alert("日期不能为空");
    return false;
  }
  if (videoLink.value === "") {
    alert("视频链接不能为空");
    return false;
  }
  return true;
};

const getNameIdByNickname = async (nickname: string) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .single();
    if (error) {
      alert("获取用户ID失败");
      return;
    }
    return data.id;
  } catch (error) {
    alert("获取用户ID失败");
    return;
  }
};

const insertVerifiedRun = async () => {
  const userId = await getNameIdByNickname(nickname.value);
  const { data, error } = await supabase.from("runs").insert({
    userid: userId,
    version: version.value,
    type: type.value,
    igt: igt.value,
    date: date.value.replace(/-/g, "/"),
    videolink: videoLink.value,
    remarks: remarks.value,
    seed: seed.value,
    status: "verified",
  });
  if (error) {
    alert("上传失败");
    return;
  }
  alert("上传成功");
};

const uploadRun = () => {
  if (!checkRequiredInfo()) {
    return;
  }
  insertVerifiedRun();
  console.log(
    version.value,
    type.value,
    igt.value,
    date.value,
    videoLink.value,
    remarks.value,
    seed.value
  );
};
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
