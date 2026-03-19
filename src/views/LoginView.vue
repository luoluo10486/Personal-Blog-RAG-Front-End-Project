<script setup>
import { ref } from "vue";

const showPassword = ref(false);
</script>

<template>
  <section class="login-page">
    <div class="bg-shape bg-a" />
    <div class="bg-shape bg-b" />
    <div class="bg-shape bg-c" />
    <div class="bg-shape bg-d" />
    <div class="bg-shape bg-e" />
    <div class="bg-shape bg-f" />

    <div class="login-shell">
      <form class="login-card" @submit.prevent>
        <h1>Please Sign In</h1>

        <label>
          <span>Email</span>
          <input type="email" placeholder="email" autocomplete="email" />
        </label>

        <label>
          <span>Password</span>
          <div class="password-wrap">
            <input :type="showPassword ? 'text' : 'password'" placeholder="password" autocomplete="current-password" />
            <button type="button" class="toggle" @click="showPassword = !showPassword">
              {{ showPassword ? "Hide" : "Show" }}
            </button>
          </div>
        </label>

        <button class="submit" type="submit">Sign In</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: #a9c8df;
  isolation: isolate;
}

.bg-shape {
  position: absolute;
  transform-origin: center;
  z-index: 0;
  filter: saturate(1.05);
}

.bg-a {
  width: 86vmax;
  height: 86vmax;
  left: -36vmax;
  top: -24vmax;
  background: #6f76bf;
  transform: rotate(45deg);
}

.bg-b {
  width: 74vmax;
  height: 74vmax;
  right: -30vmax;
  top: -22vmax;
  background: #7fc2de;
  transform: rotate(45deg);
}

.bg-c {
  width: 78vmax;
  height: 78vmax;
  left: -24vmax;
  bottom: -42vmax;
  background: #e4bf9c;
  transform: rotate(45deg);
}

.bg-d {
  width: 76vmax;
  height: 76vmax;
  right: -32vmax;
  bottom: -36vmax;
  background: #e59ea9;
  transform: rotate(45deg);
}

.bg-e {
  width: 48vmax;
  height: 48vmax;
  left: 50%;
  top: 50%;
  background: #f4f4f4;
  transform: translate(-50%, -50%) rotate(45deg);
}

.bg-f {
  width: 56vmax;
  height: 56vmax;
  left: 58%;
  top: 52%;
  background: rgba(255, 255, 255, 0.28);
  transform: translate(-50%, -50%) rotate(45deg);
}

.login-shell {
  min-height: 100vh;
  width: min(1160px, calc(100% - 2.4rem));
  margin: 0 auto;
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
}

.login-card {
  width: min(460px, calc(100% - 1rem));
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 18px 44px rgba(31, 41, 55, 0.14);
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: grid;
  gap: 0.9rem;
}

h1 {
  margin: 0 0 0.2rem;
  text-align: center;
  font-size: clamp(1.7rem, 2.8vw, 2.1rem);
  color: #0f172a;
}

label {
  display: grid;
  gap: 0.38rem;
  color: #334155;
  font-weight: 700;
  font-size: 0.95rem;
}

input {
  width: 100%;
  height: 46px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  padding: 0 0.82rem;
  background: rgba(255, 255, 255, 0.52);
  font: inherit;
  color: #0f172a;
  outline: none;
}

input:focus {
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 4px rgba(111, 118, 191, 0.18);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 4.4rem;
}

.toggle {
  position: absolute;
  right: 7px;
  top: 7px;
  height: 32px;
  padding: 0 0.62rem;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  color: #334155;
  font-weight: 700;
  cursor: pointer;
}

.submit {
  margin-top: 0.3rem;
  height: 46px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
}

@media (max-width: 900px) {
  .login-shell {
    width: min(1160px, calc(100% - 1.4rem));
  }

  .login-card {
    padding: 1.15rem;
  }

  .bg-e {
    width: 74vmax;
    height: 74vmax;
  }
}
</style>
