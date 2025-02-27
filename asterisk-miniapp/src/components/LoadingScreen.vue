<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading: boolean
}>()
</script>

<template>
  <v-fade-transition>
    <div v-if="isLoading" class="loading-screen">
      <v-container class="fill-height gradient" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular
              indeterminate
              size="64"
              color="white"
              class="mb-4"
            />
            <v-fade-transition>
              <div>
                <h3 class="text-h5 mb-2 text-white">Loading your health buddy...</h3>
                <v-progress-linear
                  indeterminate
                  color="white"
                  class="mb-0"
                />
              </div>
            </v-fade-transition>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-fade-transition>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.gradient {
  background: linear-gradient(to right bottom, var(--v-theme-gradient-start), var(--v-theme-gradient-end));
}
</style> 