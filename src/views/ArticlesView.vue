<script setup>
import { ref, computed } from "vue";

const tags = ["全部", "RAG", "Vue", "Prompt", "Engineering"];
const activeTag = ref("全部");

const articles = ref([
  {
    id: 1,
    title: "从 0 到 1：个人博客里的 RAG 检索流程",
    tag: "RAG",
    readTime: "8 min"
  },
  {
    id: 2,
    title: "Vue 组件通信策略：从 Props 到 Store",
    tag: "Vue",
    readTime: "6 min"
  },
  {
    id: 3,
    title: "提示词版本管理：让实验可复盘",
    tag: "Prompt",
    readTime: "9 min"
  },
  {
    id: 4,
    title: "前端工程结构设计：目录不是摆设",
    tag: "Engineering",
    readTime: "7 min"
  }
]);

const filtered = computed(() => {
  if (activeTag.value === "全部") return articles.value;
  return articles.value.filter((item) => item.tag === activeTag.value);
});
</script>

<template>
  <section class="articles">
    <header class="articles__header">
      <h1>文章流</h1>
      <p>这里是可接 CMS 或后端接口的数据驱动列表。</p>
    </header>

    <div class="tags">
      <button
        v-for="tag in tags"
        :key="tag"
        :class="['tag', { 'is-active': activeTag === tag }]"
        @click="activeTag = tag"
      >
        {{ tag }}
      </button>
    </div>

    <div class="article-grid">
      <article v-for="item in filtered" :key="item.id" class="article-card">
        <div class="article-card__meta">
          <span>{{ item.tag }}</span>
          <span>{{ item.readTime }}</span>
        </div>
        <h2>{{ item.title }}</h2>
        <button class="article-card__action">阅读全文</button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.articles {
  border-radius: 26px;
  padding: 1.4rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.72);
}

.articles__header h1 {
  margin: 0;
}

.articles__header p {
  margin: 0.55rem 0 0;
  color: #475569;
}

.tags {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.62rem;
}

.tag {
  border: 1px solid rgba(15, 23, 42, 0.16);
  background: #ffffff;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag.is-active,
.tag:hover {
  background: #0f172a;
  color: #fff;
}

.article-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.article-card {
  border-radius: 15px;
  padding: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: linear-gradient(160deg, #fff7ed, #ecfeff);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
}

.article-card__meta {
  display: flex;
  justify-content: space-between;
  color: #475569;
  font-size: 0.88rem;
}

.article-card h2 {
  margin: 0.55rem 0 0;
  font-size: 1.1rem;
  line-height: 1.35;
}

.article-card__action {
  margin-top: 0.8rem;
  border: 0;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  background: #0f172a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 920px) {
  .article-grid {
    grid-template-columns: 1fr;
  }
}
</style>
