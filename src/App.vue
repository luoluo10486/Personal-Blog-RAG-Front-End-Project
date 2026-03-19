<script setup>
import { RouterView } from "vue-router";
import MainLayout from "./layouts/MainLayout.vue";
</script>

<template>
  <MainLayout>
    <RouterView v-slot="{ Component, route }">
      <Transition name="route-fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </MainLayout>
</template>
