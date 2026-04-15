<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getStoredAuthUser, clearStoredAuth } from "../utils/auth";
import { getAdminDashboardOverview } from "../services/adminService";

const router = useRouter();
const currentUser = ref(getStoredAuthUser());
const overview = ref(null);
const overviewLoading = ref(false);
const overviewError = ref("");

const currentUserName = computed(() => {
  const user = currentUser.value;
  return user?.displayName || user?.username || user?.email || "当前用户";
});

const entryCards = [
  {
    title: "RAG问答",
    description: "独立进入知识问答页面，查看历史会话、流式回答和推荐问题。",
    tag: "Chat Workspace",
    action: "进入问答",
    to: "/rag"
  },
  {
    title: "RAG后台管理",
    description: "独立进入管理台，查看知识库、链路追踪、示例问题与系统设置。",
    tag: "Admin Console",
    action: "进入管理台",
    to: "/admin"
  }
];

const stats = computed(() => {
  const kpis = overview.value?.kpis;

  return [
    {
      label: "总用户数",
      value: kpis?.totalUsers?.value ?? "--"
    },
    {
      label: "活跃用户",
      value: kpis?.activeUsers?.value ?? "--"
    },
    {
      label: "累计会话",
      value: kpis?.totalSessions?.value ?? "--"
    },
    {
      label: "累计消息",
      value: kpis?.totalMessages?.value ?? "--"
    }
  ];
});

async function loadOverview() {
  overviewLoading.value = true;
  overviewError.value = "";

  try {
    overview.value = await getAdminDashboardOverview();
  } catch (error) {
    overviewError.value = error?.message || "后台概览加载失败";
  } finally {
    overviewLoading.value = false;
  }
}

function handleLogout() {
  clearStoredAuth();
  router.push("/login");
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <section class="workbench-shell">
    <header class="workbench-topbar">
      <div class="workbench-brand">
        <span class="workbench-brand__mark">R</span>
        <div>
          <strong>RAG Studio</strong>
          <small>Workspace Entry</small>
        </div>
      </div>

      <div class="workbench-topbar__actions">
        <div class="workbench-user">
          <span>当前登录</span>
          <strong>{{ currentUserName }}</strong>
        </div>
        <button class="workbench-logout" type="button" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="workbench-page">
      <header class="workbench-hero">
        <div>
          <p class="workbench-hero__tag">Workspace Home</p>
          <h2>登录成功后先进入这里</h2>
          <p class="workbench-hero__desc">
            这里不再放全局左侧菜单，`RAG问答` 和 `RAG后台管理` 都作为独立页面，从下方入口单独进入。
          </p>
        </div>
      </header>

      <section class="stats-grid">
        <article v-for="item in stats" :key="item.label" class="stats-card">
          <span class="stats-card__label">{{ item.label }}</span>
          <strong class="stats-card__value">
            {{ overviewLoading ? "加载中..." : item.value }}
          </strong>
        </article>
      </section>

      <p v-if="overviewError" class="inline-notice">{{ overviewError }}</p>

      <section class="entry-grid">
        <article v-for="item in entryCards" :key="item.title" class="entry-card">
          <span class="entry-card__tag">{{ item.tag }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <button class="entry-card__button" type="button" @click="router.push(item.to)">
            {{ item.action }}
          </button>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.workbench-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(22, 119, 255, 0.08), transparent 24%),
    #f5f7fa;
}

.workbench-topbar {
  height: 76px;
  padding: 0 32px;
  border-bottom: 1px solid #f0f0f0;
  background: rgba(255, 255, 255, 0.94);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  backdrop-filter: blur(8px);
}

.workbench-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workbench-brand__mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #1677ff;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
}

.workbench-brand strong {
  display: block;
  color: #1f1f1f;
  font-size: 16px;
  line-height: 1.4;
}

.workbench-brand small {
  display: block;
  color: #8c8c8c;
  font-size: 12px;
}

.workbench-topbar__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.workbench-user {
  display: grid;
  gap: 2px;
  text-align: right;
}

.workbench-user span {
  color: #8c8c8c;
  font-size: 12px;
}

.workbench-user strong {
  color: #1f1f1f;
  font-size: 14px;
}

.workbench-logout {
  padding: 9px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  background: #ffffff;
  color: #262626;
  cursor: pointer;
}

.workbench-logout:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.workbench-page {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 36px;
  display: grid;
  gap: 24px;
}

.workbench-hero,
.stats-card,
.entry-card {
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.workbench-hero {
  padding: 28px;
}

.workbench-hero__tag,
.entry-card__tag {
  display: inline-flex;
  margin-bottom: 8px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.workbench-hero h2,
.entry-card h3 {
  margin: 0;
  color: #1f1f1f;
  font-size: 30px;
  line-height: 1.4;
  font-weight: 600;
}

.workbench-hero__desc,
.entry-card p {
  margin: 10px 0 0;
  color: #595959;
  font-size: 14px;
  line-height: 1.7;
}

.stats-grid,
.entry-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.entry-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stats-card {
  padding: 20px 22px;
}

.stats-card__label {
  display: block;
  color: #8c8c8c;
  font-size: 13px;
}

.stats-card__value {
  display: block;
  margin-top: 10px;
  color: #1f1f1f;
  font-size: 28px;
  line-height: 1.2;
}

.entry-card {
  padding: 24px;
}

.entry-card__button {
  margin-top: 18px;
  padding: 10px 18px;
  border: 1px solid #1677ff;
  border-radius: 10px;
  background: #1677ff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.entry-card__button:hover {
  background: #0958d9;
  border-color: #0958d9;
}

.inline-notice {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #ffe7ba;
  background: #fffbe6;
  color: #ad6800;
  font-size: 14px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .workbench-topbar {
    height: auto;
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .workbench-topbar__actions {
    width: 100%;
    justify-content: space-between;
  }

  .workbench-user {
    text-align: left;
  }

  .workbench-page {
    width: min(1280px, calc(100% - 24px));
    padding-top: 16px;
  }

  .entry-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
