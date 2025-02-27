<script setup lang="ts">
import { onMounted } from 'vue'
import { useTelegramStore } from '../stores/telegram'
import HelloWorld from './HelloWorld.vue'

const telegram = useTelegramStore()

onMounted(() => {
  telegram.init()
})
</script>

<template>
  <div>
    <slot v-if="telegram.isReady" >
    <HelloWorld msg="Hello World" />
    </slot>
    <div v-else>Loading...</div>
  </div>
</template>