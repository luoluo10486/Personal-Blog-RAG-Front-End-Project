<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const coreIdeas = [
  "采用 WebGL 着色器实现像素级溶解转场。",
  "通过 Noise 噪声函数的 Alpha 阈值裁切，让背景呈现不规则的物理溶解感。",
  "将 ScrollTrigger 的 scrub 数值映射到 Shader 变量，让溶解过程精准对齐滚动节奏。"
];

const performanceIdeas = [
  "考虑到 WebGL 渲染开销，改用 Three.js 文字平面承载标题与说明。",
  "把文字与视觉效果放进同一套渲染循环，避免 DOM 文本参与动画时带来的掉帧。",
  "补充 Lenis 丝滑滚动，用惯性滚动去放大转场时的视觉张力。"
];
</script>

<template>
  <section class="idea-page">
    <div class="idea-page__mist idea-page__mist--left" />
    <div class="idea-page__mist idea-page__mist--right" />

    <header class="idea-page__header">
      <button type="button" class="idea-page__back" @click="router.push('/workspace')">
        返回工作台
      </button>
      <div class="idea-page__header-text">
        <p>一点留白，一点灵感。</p>
        <h1>小巧思</h1>
      </div>
    </header>

    <main class="idea-page__content">
      <section class="idea-card idea-card--intro">
        <span class="idea-card__tag">方案记录</span>
        <p class="idea-card__lead">
          这里先收一份可继续打磨的视觉方案，用来记录之后想尝试的页面表现与动效升级方向。
        </p>
      </section>

      <section class="idea-card">
        <h2>核心技术逻辑</h2>
        <ul>
          <li v-for="item in coreIdeas" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="idea-card">
        <h2>性能优化方案</h2>
        <ul>
          <li v-for="item in performanceIdeas" :key="item">{{ item }}</li>
        </ul>
      </section>
    </main>
  </section>
</template>

<style scoped>
.idea-page {
  position: relative;
  min-height: 100vh;
  padding: 40px 28px 56px;
  color: #1b1e17;
  background:
    radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.94), transparent 22%),
    radial-gradient(circle at 84% 18%, rgba(223, 229, 224, 0.86), transparent 24%),
    linear-gradient(180deg, #f7f6f1 0%, #ecebe3 48%, #e4e6dd 100%);
  overflow: hidden;
}

.idea-page__mist {
  position: absolute;
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.55;
  pointer-events: none;
}

.idea-page__mist--left {
  top: 120px;
  left: -40px;
  width: 240px;
  height: 240px;
  background: rgba(213, 221, 214, 0.78);
}

.idea-page__mist--right {
  right: -40px;
  bottom: 80px;
  width: 320px;
  height: 320px;
  background: rgba(231, 227, 215, 0.72);
}

.idea-page__header,
.idea-page__content {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
}

.idea-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.idea-page__back {
  min-width: 120px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid rgba(27, 30, 23, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  cursor: pointer;
  backdrop-filter: blur(12px);
}

.idea-page__header-text p {
  margin: 0 0 10px;
  color: rgba(27, 30, 23, 0.56);
  font-size: 14px;
  text-align: right;
}

.idea-page__header-text h1 {
  margin: 0;
  font-size: clamp(42px, 7vw, 86px);
  font-weight: 500;
  letter-spacing: 0.04em;
}

.idea-page__content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.idea-card {
  padding: 28px 28px 30px;
  border: 1px solid rgba(27, 30, 23, 0.08);
  border-radius: 28px;
  background: rgba(255, 252, 246, 0.72);
  box-shadow: 0 18px 45px rgba(64, 59, 44, 0.08);
  backdrop-filter: blur(16px);
}

.idea-card--intro {
  grid-column: 1 / -1;
}

.idea-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(31, 42, 31, 0.06);
  font-size: 13px;
}

.idea-card__lead {
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 1.9;
  color: rgba(27, 30, 23, 0.82);
}

.idea-card h2 {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 600;
}

.idea-card ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  color: rgba(27, 30, 23, 0.82);
}

@media (max-width: 900px) {
  .idea-page {
    padding: 24px 18px 40px;
  }

  .idea-page__header {
    flex-direction: column;
  }

  .idea-page__header-text p {
    text-align: left;
  }

  .idea-page__content {
    grid-template-columns: 1fr;
  }
}
</style>
