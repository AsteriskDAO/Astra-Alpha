<script setup lang="ts">
import { useTelegramStore } from '../stores/telegram'

const telegram = useTelegramStore()
</script>

<template>
  <div class="home">
    <h1>Asterisk Health</h1>
    <div v-if="telegram.userInfo">
      <p>Welcome, {{ telegram.userInfo.first_name }}!</p>
    </div>
  </div>
</template>