<!-- src/components/Counter.vue -->

<template>
  <div class="p-4 border rounded">
    <p>Contador: {{ clicks }}</p>
    <button @click="clicks++" class="bg-blue-500 text-white px-2 py-1 rounded">
      Incrementar
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const clicks = ref(0);
</script>