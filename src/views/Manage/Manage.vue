<template>
  <SecondaryNav title="管理面板" :navItems="navItems" />
</template>

<script setup lang="ts">
import SecondaryNav from '@/components/SecondaryNav.vue';

const navItems = [
  {
    path: '/manage/upload',
    label: '上传成绩',
  },
  {
    path: '/manage/verify',
    label: '审核记录',
  },
  {
    path: '/manage/user',
    label: '管理用户',
  },
  {
    path: '/manage/run',
    label: '管理成绩',
  },
];
</script>
