<template>
  <div class="upload-container">
    <form class="upload-form">
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">版本</label>
        <select class="upload-form-item-select" id="version" v-model="version">
          <option value="1.16.1" class="upload-form-item-option">1.16.1</option>
        </select>
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">类型</label>
        <select class="upload-form-item-select" id="type" v-model="type">
          <option value="RSG" class="upload-form-item-option">RSG</option>
        </select>
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">用户名</label>
        <input
          class="upload-form-item-input"
          type="text"
          id="nickname"
          v-model="nickname"
        />
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">游戏时间IGT</label>
        <input
          class="upload-form-item-input igt-input"
          type="number"
          id="igt"
          v-model="igtMinute"
        />分
        <input
          class="upload-form-item-input igt-input"
          type="number"
          min="00"
          max="59"
          id="igt"
          v-model="igtSecond"
        />秒
        <input
          class="upload-form-item-input igt-input"
          type="number"
          min="000"
          max="999"
          id="igt"
          v-model="igtMillisecond"
        />毫秒
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">日期</label>
        <input
          class="upload-form-item-input"
          type="date"
          id="date"
          v-model="date"
        />
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">视频链接</label>
        <input
          class="upload-form-item-input"
          type="text"
          id="video-link"
          v-model="videoLink"
        />
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">备注</label>
        <textarea
          class="upload-form-item-input"
          type="text"
          id="remarks"
          v-model="remarks"
        />
      </div>
      <div class="upload-form-item">
        <label class="upload-form-item-label" for="title">种子</label>
        <input
          class="upload-form-item-input"
          type="text"
          id="seed"
          v-model="seed"
        />
      </div>
      <div class="upload-form-item">
        <button
          class="upload-form-item-button button-common"
          @click.prevent="uploadRun"
        >
          上传
        </button>
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
    date: date.value,
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
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-form-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-form-item-label {
  min-width: 50px;
}

.upload-form-item-option {
  width: 100%;
  color: #000;
}

.upload-form-item-select {
  width: 200px;
  color: #000;
  height: 40px;
}

.upload-form-item-input {
  width: 200px;
  color: #000;
  height: 40px;
  max-width: 200px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0 10px;
}

.igt-input {
  width: 50px;
}

.upload-form-item-button {
  width: 100px;
  color: #000;
  height: 40px;
}

.upload-form-item-button:hover {
  background-color: #ccc;
}
</style>
