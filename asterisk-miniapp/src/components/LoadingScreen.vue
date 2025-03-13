<script setup lang="ts">
defineOptions({
  name: 'LoadingScreen'
})

defineProps<{
  isLoading: boolean
}>()
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <v-progress-circular
      indeterminate
      color="primary"
      size="64"
    />
  </div>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}
</style> 