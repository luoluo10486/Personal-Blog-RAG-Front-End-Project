<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import NavBar from "../components/NavBar.vue";

const route = useRoute();
const isFullscreen = computed(() => Boolean(route.meta.fullscreen));
</script>

<template>
  <div :class="['app-shell', { 'app-shell--fullscreen': isFullscreen }]">
    <template v-if="!isFullscreen">
      <div class="bg-orb bg-orb--a" />
      <div class="bg-orb bg-orb--b" />
      <NavBar />
      <main class="app-main">
        <slot />
      </main>
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.app-main {
  width: min(1200px, calc(100% - 3rem));
  margin: 2rem auto 3rem;
  position: relative;
  z-index: 2;
}

.bg-orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(55px);
  z-index: 0;
  opacity: 0.38;
  pointer-events: none;
}

.bg-orb--a {
  width: 380px;
  height: 380px;
  left: -120px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, #fcae56, #f97316);
}

.bg-orb--b {
  width: 460px;
  height: 460px;
  right: -160px;
  bottom: -160px;
  background: radial-gradient(circle at 30% 30%, #22d3ee, #0ea5e9);
}

.app-shell--fullscreen {
  background: #f5f0e8;
}

@media (max-width: 960px) {
  .app-main {
    width: min(1200px, calc(100% - 1.4rem));
  }
}
</style>
