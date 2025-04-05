<script setup lang="ts">
import { RouterView } from 'vue-router'
import LoadingScreen from './components/LoadingScreen.vue'
import TelegramProvider from './components/TelegramProvider.vue'
</script>

<template>
  <TelegramProvider>
    <RouterView />
  </TelegramProvider>
</template>

<style>
@import './styles/shared.css';

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--background);
  color: var(--text);
}

#app {
  min-height: 100vh;
}
</style>
