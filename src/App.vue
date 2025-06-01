<script setup>
import RealtimeVideo from './components/RealtimeVideo.vue'
</script>

<template>
  <main class="main-wrapper">
    <RealtimeVideo />
  </main>
</template>

<style scoped>
.main-wrapper {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
