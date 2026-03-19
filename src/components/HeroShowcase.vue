<script setup>
import { ref } from "vue";

const cards = ref([
  { id: 1, title: "RAG 笔记流", desc: "把检索命中片段和个人理解融合成可追溯文章。" },
  { id: 2, title: "实验室", desc: "记录模型提示词、评测策略与失败案例。" },
  { id: 3, title: "知识地图", desc: "用可视化方式串联技术主题和项目沉淀。" }
]);

const panelRef = ref(null);
const panelStyle = ref({
  "--mx": "50%",
  "--my": "50%"
});

function handleMove(event) {
  if (!panelRef.value) return;

  const rect = panelRef.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  panelStyle.value = {
    "--mx": `${x.toFixed(2)}%`,
    "--my": `${y.toFixed(2)}%`
  };
}
</script>

<template>
  <section ref="panelRef" class="hero" :style="panelStyle" @mousemove="handleMove">
    <div class="hero__content">
      <p class="hero__tag">Personal Blog / RAG / Front-End</p>
      <h1>把博客做成你的实验场，而不是静态简历页</h1>
      <p class="hero__desc">
        这是一个面向内容创作和实验记录的前端骨架，你可以继续接入后端 API、RAG 搜索和管理台。
      </p>
      <div class="hero__actions">
        <RouterLink class="btn btn--primary" to="/articles">浏览文章</RouterLink>
        <RouterLink class="btn btn--ghost" to="/login">进入后台</RouterLink>
      </div>
    </div>

    <div class="hero__cards">
      <article
        v-for="card in cards"
        :key="card.id"
        class="floating-card"
      >
        <h3>{{ card.title }}</h3>
        <p>{{ card.desc }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.hero {
  border-radius: 30px;
  background:
    radial-gradient(circle at var(--mx) var(--my), rgba(34, 211, 238, 0.24), transparent 45%),
    linear-gradient(135deg, #fffaf2, #f7f9fc);
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: clamp(1.2rem, 2.5vw, 2.2rem);
  display: grid;
  gap: 1.4rem;
  grid-template-columns: 1.3fr 1fr;
  min-height: 380px;
  position: relative;
  overflow: hidden;
}

.hero__content {
  align-self: center;
}

.hero__tag {
  margin: 0;
  color: #0369a1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
}

h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0.55rem 0 0;
  line-height: 1.06;
}

.hero__desc {
  margin-top: 0.95rem;
  color: #334155;
  max-width: 54ch;
}

.hero__actions {
  margin-top: 1.1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-weight: 700;
  padding: 0.62rem 1.05rem;
}

.btn--primary {
  color: white;
  background: linear-gradient(135deg, #0f172a, #1e293b);
}

.btn--ghost {
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.22);
  background: rgba(255, 255, 255, 0.72);
}

.hero__cards {
  display: grid;
  align-content: center;
  gap: 0.85rem;
  perspective: 1200px;
}

.floating-card {
  border: 1px solid rgba(15, 23, 42, 0.13);
  border-radius: 16px;
  padding: 0.95rem 1rem;
  background: rgba(255, 255, 255, 0.82);
  transform: translateZ(0);
  animation: drift 7s ease-in-out infinite;
}

.floating-card:nth-child(2) {
  animation-delay: 0.6s;
}

.floating-card:nth-child(3) {
  animation-delay: 1.2s;
}

.floating-card h3 {
  margin: 0;
  font-size: 1rem;
}

.floating-card p {
  margin: 0.45rem 0 0;
  color: #334155;
  line-height: 1.4;
}

@keyframes drift {
  0%,
  100% {
    transform: translateY(0) rotateX(0deg);
  }
  50% {
    transform: translateY(-6px) rotateX(3deg);
  }
}

@media (max-width: 980px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}
</style>
