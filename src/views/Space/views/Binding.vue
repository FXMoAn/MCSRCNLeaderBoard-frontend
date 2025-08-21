<template>
  <div class="binding-container">
    <Nickname />
    <MCName />
  </div>
</template>

<script setup lang="ts">
import Nickname from "../components/Nickname.vue";
import MCName from "../components/MCName.vue";
</script>

<style scoped>
.binding-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
