<template>
  <div class="upload-container">
    <form class="upload-form">
      <div class="upload-form-item">
        <label for="title">标题</label>
        <input type="text" id="title" v-model="title" />
      </div>
      <div class="upload-form-item">
        <label for="description">描述</label>
        <textarea id="description" v-model="description"></textarea>
      </div>
      <div class="upload-form-item">
        <label for="file">文件</label>
        <input type="file" id="file" @change="handleFileChange" />
      </div>
      <div class="upload-form-item">
        <label for="file">文件</label>
        <input type="file" id="file" @change="handleFileChange" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const title = ref("");
const description = ref("");
const file = ref<File | null>(null);
const fileType = ref("");
const fileSize = ref(0);
const fileUrl = ref("");

const handleFileChange = (e: Event) => {
  const selectedFile = (e.target as HTMLInputElement).files?.[0];
  if (selectedFile) {
    file.value = selectedFile;
    fileType.value = selectedFile.type;
    fileSize.value = selectedFile.size;
    fileUrl.value = URL.createObjectURL(selectedFile);
  }
};
</script>
