<script lang="ts">
export default {
  name: 'TelegramProvider'
}
</script>

<script setup lang="ts">
import { useTelegramStore } from '../stores/telegram'

const telegram = useTelegramStore()
</script>

<template>
  <div class="telegram-provider">
    <slot />
  </div>
</template>