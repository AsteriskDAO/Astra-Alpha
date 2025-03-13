<script setup lang="ts">
import { useTelegramStore } from '../stores/telegram'

const telegram = useTelegramStore()

defineOptions({
  name: 'TelegramProvider'
})
</script>

<template>
  <div class="telegram-provider">
    <slot />
  </div>
</template>