<template>
  <div class="selection-container">
    <div class="select-wrapper">
      <select 
        v-model="selectedVersion" 
        @change="updateSelection"
        class="custom-select"
      >
        <option value="1.16.1">1.16.1</option>
        <option value="1.15.2">1.15.2</option>
        <option value="1.7.10">1.7.10</option>
      </select>
      <select 
        v-model="selectedType" 
        @change="updateSelection"
        class="custom-select"
      >
        <option value="RSG">RSG</option>
        <option value="SSG">SSG</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['selection-changed'])

const selectedVersion = ref('1.16.1')
const selectedType = ref('RSG')

const updateSelection = () => {
  emit('selection-changed', {
    version: selectedVersion.value,
    type: selectedType.value
  })
}
</script>

<style scoped>
.selection-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.custom-select {
  appearance: none;
  padding: 10px 15px;
  border-radius: 8px;
  background-color: #123;
  color: white;
  border: 2px solid #34495e;
  transition: all 0.3s ease;
}

.custom-select:hover {
  background-color: #34495e;
  transform: scale(1.05);
}

.custom-select:focus {
  outline: none;
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
}
</style>
