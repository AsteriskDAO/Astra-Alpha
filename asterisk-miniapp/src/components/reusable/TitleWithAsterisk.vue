<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <h1 class="title">
    {{ title }}
    <img 
      src="../../assets/asterisk-pink.gif" 
      alt="*" 
      class="title-asterisk"
    />
  </h1>
</template>

<style scoped>
.title {
  font-family: var(--font-display);
  font-size: 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-asterisk {
  width: 25px;
  top: -7px;
  position: relative;
}
</style> 