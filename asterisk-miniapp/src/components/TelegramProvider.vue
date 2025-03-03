<script setup lang="ts">
import { useTelegramStore } from '../stores/telegram'

const telegram = useTelegramStore()
</script>

<template>
  <slot />
</template>