<template>
  <SecondaryNav title="个人空间" :navItems="navItems" />
</template>

<script setup lang="ts">
import SecondaryNav from '@/components/SecondaryNav.vue';

const navItems = [
  {
    path: '/space/user-runs',
    label: '我的成绩',
  },
  {
    path: '/space/binding',
    label: '账号信息管理',
  },
];
</script>
