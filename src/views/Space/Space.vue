<template>
  <SecondaryNav title="个人空间" :navItems="navItems" />
</template>

<script setup lang="ts">
import SecondaryNav from '@/components/SecondaryNav.vue';

const navItems = [
  // {
  //   path: '/space/profile',
  //   label: '个人资料',
  // },
  {
    path: '/space/binding',
    label: '账号信息管理',
  },
];
</script>
