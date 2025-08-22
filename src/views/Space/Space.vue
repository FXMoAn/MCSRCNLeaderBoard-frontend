<template>
  <SecondaryNav title="个人空间" :navItems="navItems" />
</template>

<script setup lang="ts">
import SecondaryNav from "@/components/SecondaryNav.vue";

const navItems = [
  {
    path: "/space/profile",
    label: "个人信息",
  },
  {
    path: "/space/binding",
    label: "绑定账号",
  },
];
</script>
