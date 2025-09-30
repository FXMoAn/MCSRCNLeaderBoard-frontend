<template>
  <div class="user-edit-container">
    <div class="user-edit-section">
      <div class="section-subtitle">编辑个人资料</div>
      <div class="form-column">
        <PrimaryInput
          label="主页链接"
          :modelValue="spaceLink"
          @update:modelValue="handleSpaceLinkChange"
        />
        <PrimaryInput
          label="直播间链接"
          :modelValue="liveroomLink"
          @update:modelValue="handleLiveroomLinkChange"
        />
        <div class="button-row">
          <PrimaryButton variant="primary" @click="handleSave">保存</PrimaryButton>
          <PrimaryButton variant="clear" @click="handleCancel">取消</PrimaryButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import useUserStore from '@/stores/user';

import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';

const userStore = useUserStore();
const userInfo = ref(userStore.userInfo);

// 主页和直播间链接
const spaceLink = ref(userInfo.value.space_link);
const liveroomLink = ref(userInfo.value.liveroom_link);

const handleSpaceLinkChange = (value: string) => {
  spaceLink.value = value;
};

const handleLiveroomLinkChange = (value: string) => {
  liveroomLink.value = value;
};

const handleSave = () => {
  // console.log(spaceLink.value, liveroomLink.value);
  userStore.updateUserInfo({ space_link: spaceLink.value, liveroom_link: liveroomLink.value });
};

const handleCancel = () => {
  spaceLink.value = userInfo.value.space_link;
  liveroomLink.value = userInfo.value.liveroom_link;
};
</script>

<style scoped>
.user-edit-container {
  width: 100%;
  height: 100%;
}

.user-edit-section {
  width: 100%;
  margin: 0 auto;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid #444;
  padding: 20px;
}

.section-subtitle {
  color: #fff;
  font-size: 1.1em;
  font-weight: 500;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row {
  width: 100%;
  display: flex;
  gap: 16px;
  align-items: center;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.button-row {
  display: flex;
  gap: 16px;
  align-items: center;
}
</style>
