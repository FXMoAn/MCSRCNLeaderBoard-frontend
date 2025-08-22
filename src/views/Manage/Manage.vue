<template>
  <SecondaryNav title="管理面板" :navItems="navItems" />
</template>

<script setup lang="ts">
import SecondaryNav from "@/components/SecondaryNav.vue";

const navItems = [
  {
    path: "/manage/upload",
    label: "上传成绩",
  },
];
</script>
