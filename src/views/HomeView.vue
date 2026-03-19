<script setup>
import HeroShowcase from "../components/HeroShowcase.vue";

const highlights = [
  {
    title: "动态专题模块",
    text: "每个专题卡可以绑定不同 API 和图表组件，支持后续扩展。"
  },
  {
    title: "可插拔内容区",
    text: "你可以把 Markdown 渲染、评论系统、AI 总结挂到统一卡片容器。"
  },
  {
    title: "交互优先设计",
    text: "保留动效入口，避免成为只有排版没有体验的静态模板。"
  }
];

function tiltCard(event) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  const rx = (py - 0.5) * -12;
  const ry = (px - 0.5) * 16;
  target.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
}

function resetTilt(event) {
  event.currentTarget.style.transform = "";
}
</script>

<template>
  <div class="home">
    <HeroShowcase />

    <section class="section">
      <header class="section__header">
        <p class="section__tag">Framework Blocks</p>
        <h2>博客首页核心模块</h2>
      </header>

      <div class="highlight-grid">
        <article
          v-for="item in highlights"
          :key="item.title"
          class="highlight"
          @mousemove="tiltCard"
          @mouseleave="resetTilt"
        >
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 1.5rem;
}

.section {
  border-radius: 26px;
  padding: 1.4rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.72);
}

.section__header h2 {
  margin: 0.4rem 0 0;
  font-size: clamp(1.45rem, 2.2vw, 2rem);
}

.section__tag {
  margin: 0;
  letter-spacing: 0.18em;
  color: #0369a1;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
}

.highlight-grid {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.highlight {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 16px;
  padding: 1rem;
  background: linear-gradient(145deg, #f8fafc, #eff6ff);
  transform-style: preserve-3d;
  transition: transform 0.18s ease;
  will-change: transform;
}

.highlight h3 {
  margin: 0;
  font-size: 1.03rem;
}

.highlight p {
  margin-top: 0.48rem;
  line-height: 1.46;
  color: #475569;
}

@media (max-width: 920px) {
  .highlight-grid {
    grid-template-columns: 1fr;
  }
}
</style>
