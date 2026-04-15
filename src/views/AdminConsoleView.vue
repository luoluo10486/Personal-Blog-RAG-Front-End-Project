<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAdminDashboardOverview,
  getKnowledgeBases,
  getRagTraceRuns,
  getSampleQuestionsPage,
  getSystemSettings,
  getUsersPage
} from "../services/adminService";
import { clearStoredAuth, getStoredAuthUser } from "../utils/auth";

const router = useRouter();
const loading = ref(false);
const pageError = ref("");
const dashboardOverview = ref(null);
const knowledgeBases = ref([]);
const traceRuns = ref([]);
const sampleQuestions = ref([]);
const users = ref([]);
const settings = ref(null);
const sectionErrors = ref([]);
const currentUser = ref(getStoredAuthUser());

const currentUserName = computed(() => {
  const user = currentUser.value;
  return user?.displayName || user?.username || user?.email || "当前用户";
});

const moduleCards = [
  {
    title: "知识库管理",
    description: "对应 ragent 的 knowledge 模块，管理知识库与文档。"
  },
  {
    title: "链路追踪",
    description: "对应 traces 模块，查看 traceId、会话与执行状态。"
  },
  {
    title: "示例问题",
    description: "对应 sample-questions 模块，维护问答首页推荐问题。"
  },
  {
    title: "系统设置",
    description: "对应 settings 模块，查看模型、向量与限流配置。"
  },
  {
    title: "用户管理",
    description: "对应 users 模块，查看账号与角色。"
  },
  {
    title: "后台概览",
    description: "对应 dashboard 模块，查看整体使用与会话指标。"
  }
];

const overviewCards = computed(() => {
  const kpis = dashboardOverview.value?.kpis;

  return [
    {
      label: "总用户",
      value: kpis?.totalUsers?.value ?? "--"
    },
    {
      label: "24h 会话",
      value: kpis?.sessions24h?.value ?? "--"
    },
    {
      label: "总消息数",
      value: kpis?.totalMessages?.value ?? "--"
    },
    {
      label: "24h 消息",
      value: kpis?.messages24h?.value ?? "--"
    }
  ];
});

const settingsSnapshot = computed(() => {
  const current = settings.value;
  if (!current) {
    return [];
  }

  return [
    {
      label: "默认 Collection",
      value: current?.rag?.default?.collectionName || "--"
    },
    {
      label: "默认聊天模型",
      value: current?.ai?.chat?.defaultModel || "--"
    },
    {
      label: "深度思考模型",
      value: current?.ai?.chat?.deepThinkingModel || "--"
    },
    {
      label: "记忆总结",
      value: current?.rag?.memory?.summaryEnabled ? "已开启" : "未开启"
    }
  ];
});

function pushSectionError(message) {
  if (!message || sectionErrors.value.includes(message)) {
    return;
  }

  sectionErrors.value = [...sectionErrors.value, message];
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStatus(value) {
  if (!value) {
    return "--";
  }

  return String(value).replace(/_/g, " ");
}

async function loadAdminConsole() {
  loading.value = true;
  pageError.value = "";
  sectionErrors.value = [];

  const results = await Promise.allSettled([
    getAdminDashboardOverview(),
    getKnowledgeBases(1, 6),
    getRagTraceRuns(1, 6),
    getSampleQuestionsPage(1, 6),
    getUsersPage(1, 6),
    getSystemSettings()
  ]);

  const [
    dashboardResult,
    knowledgeResult,
    traceResult,
    sampleQuestionResult,
    usersResult,
    settingsResult
  ] = results;

  if (dashboardResult.status === "fulfilled") {
    dashboardOverview.value = dashboardResult.value;
  } else {
    pushSectionError("后台概览接口暂不可用");
  }

  if (knowledgeResult.status === "fulfilled") {
    knowledgeBases.value = knowledgeResult.value?.records || [];
  } else {
    pushSectionError("知识库接口暂不可用");
  }

  if (traceResult.status === "fulfilled") {
    traceRuns.value = traceResult.value?.records || [];
  } else {
    pushSectionError("链路追踪接口暂不可用");
  }

  if (sampleQuestionResult.status === "fulfilled") {
    sampleQuestions.value = sampleQuestionResult.value?.records || [];
  } else {
    pushSectionError("示例问题接口暂不可用");
  }

  if (usersResult.status === "fulfilled") {
    users.value = usersResult.value?.records || [];
  } else {
    pushSectionError("用户管理接口暂不可用");
  }

  if (settingsResult.status === "fulfilled") {
    settings.value = settingsResult.value;
  } else {
    pushSectionError("系统设置接口暂不可用");
  }

  if (results.every((item) => item.status === "rejected")) {
    pageError.value = "后台管理页依赖的 RAG 管理接口当前均不可用，请检查 RAG 后端与账号权限。";
  }

  loading.value = false;
}

function handleLogout() {
  clearStoredAuth();
  router.push("/login");
}

onMounted(() => {
  void loadAdminConsole();
});
</script>

<template>
  <section class="admin-shell">
    <header class="admin-topbar">
      <div class="admin-topbar__title">
        <p>Independent App</p>
        <h1>RAG后台管理</h1>
      </div>

      <div class="admin-topbar__actions">
        <button class="ghost-button" type="button" @click="router.push('/workspace')">返回工作台</button>
        <button class="ghost-button" type="button" @click="router.push('/rag')">进入问答</button>
        <div class="admin-user">
          <span>当前登录</span>
          <strong>{{ currentUserName }}</strong>
        </div>
        <button class="logout-button" type="button" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="admin-console">
      <header class="admin-console__hero">
        <div>
          <p class="admin-console__tag">Admin Console</p>
          <h2>RAG 后台管理</h2>
          <p class="admin-console__desc">
            这是一个独立管理页面，不再挂载在登录后的全局左侧菜单上，而是从首页入口单独进入。
          </p>
        </div>
        <button class="admin-console__refresh" type="button" @click="loadAdminConsole">
          {{ loading ? "刷新中..." : "刷新数据" }}
        </button>
      </header>

      <p v-if="pageError" class="admin-console__notice admin-console__notice--error">
        {{ pageError }}
      </p>

      <section class="overview-grid">
        <article v-for="item in overviewCards" :key="item.label" class="overview-card">
          <span class="overview-card__label">{{ item.label }}</span>
          <strong class="overview-card__value">{{ loading ? "加载中..." : item.value }}</strong>
        </article>
      </section>

      <section class="module-grid">
        <article v-for="item in moduleCards" :key="item.title" class="module-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </section>

      <p v-if="sectionErrors.length > 0" class="admin-console__notice admin-console__notice--warn">
        {{ sectionErrors.join("；") }}
      </p>

      <section class="detail-grid">
        <article class="detail-card">
          <header class="detail-card__header">
            <h3>知识库概览</h3>
            <span>knowledge-base</span>
          </header>
          <div v-if="knowledgeBases.length === 0" class="detail-card__empty">暂无知识库数据</div>
          <table v-else class="detail-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>Collection</th>
                <th>文档数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in knowledgeBases" :key="item.id">
                <td>{{ item.name || "--" }}</td>
                <td>{{ item.collectionName || "--" }}</td>
                <td>{{ item.documentCount ?? "--" }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="detail-card">
          <header class="detail-card__header">
            <h3>系统配置快照</h3>
            <span>rag/settings</span>
          </header>
          <div v-if="settingsSnapshot.length === 0" class="detail-card__empty">暂无系统设置数据</div>
          <dl v-else class="detail-definition">
            <div v-for="item in settingsSnapshot" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </article>

        <article class="detail-card">
          <header class="detail-card__header">
            <h3>链路追踪</h3>
            <span>rag/traces/runs</span>
          </header>
          <div v-if="traceRuns.length === 0" class="detail-card__empty">暂无链路追踪数据</div>
          <ul v-else class="detail-list">
            <li v-for="item in traceRuns" :key="item.traceId">
              <strong>{{ item.traceName || item.traceId || "--" }}</strong>
              <span>{{ formatStatus(item.status) }}</span>
              <small>{{ formatDateTime(item.startTime) }}</small>
            </li>
          </ul>
        </article>

        <article class="detail-card">
          <header class="detail-card__header">
            <h3>示例问题</h3>
            <span>sample-questions</span>
          </header>
          <div v-if="sampleQuestions.length === 0" class="detail-card__empty">暂无示例问题数据</div>
          <ul v-else class="detail-list">
            <li v-for="item in sampleQuestions" :key="item.id">
              <strong>{{ item.title || "未命名问题" }}</strong>
              <span>{{ item.question || "--" }}</span>
            </li>
          </ul>
        </article>

        <article class="detail-card detail-card--full">
          <header class="detail-card__header">
            <h3>用户列表</h3>
            <span>users</span>
          </header>
          <div v-if="users.length === 0" class="detail-card__empty">暂无用户数据</div>
          <table v-else class="detail-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in users" :key="item.id">
                <td>{{ item.username || "--" }}</td>
                <td>{{ item.role || "--" }}</td>
                <td>{{ formatDateTime(item.createTime) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(22, 119, 255, 0.08), transparent 20%),
    #f5f7fa;
}

.admin-topbar {
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

.admin-topbar__title p {
  margin: 0 0 4px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.admin-topbar__title h1 {
  margin: 0;
  color: #1f1f1f;
  font-size: 24px;
  line-height: 1.4;
}

.admin-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-user {
  display: grid;
  gap: 2px;
  text-align: right;
}

.admin-user span {
  color: #8c8c8c;
  font-size: 12px;
}

.admin-user strong {
  color: #1f1f1f;
  font-size: 14px;
}

.ghost-button,
.logout-button {
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.ghost-button {
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #262626;
}

.ghost-button:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.logout-button {
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #262626;
}

.logout-button:hover {
  color: #1677ff;
  border-color: #1677ff;
}

.admin-console {
  width: min(1440px, calc(100% - 48px));
  margin: 0 auto;
  padding: 24px 0 32px;
  display: grid;
  gap: 24px;
}

.admin-console__hero,
.overview-card,
.module-card,
.detail-card {
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.admin-console__hero {
  padding: 28px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.admin-console__tag {
  margin: 0 0 8px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.admin-console__hero h2,
.detail-card__header h3,
.module-card h3 {
  margin: 0;
  color: #1f1f1f;
  font-size: 28px;
  line-height: 1.4;
  font-weight: 600;
}

.admin-console__desc,
.module-card p,
.detail-card__header span {
  margin: 10px 0 0;
  color: #595959;
  font-size: 14px;
  line-height: 1.7;
}

.admin-console__refresh {
  height: fit-content;
  padding: 10px 18px;
  border: 1px solid #1677ff;
  border-radius: 10px;
  background: #1677ff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.admin-console__refresh:hover {
  background: #0958d9;
  border-color: #0958d9;
}

.admin-console__notice {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.admin-console__notice--error {
  border: 1px solid #ffccc7;
  background: #fff2f0;
  color: #cf1322;
}

.admin-console__notice--warn {
  border: 1px solid #ffe7ba;
  background: #fffbe6;
  color: #ad6800;
}

.overview-grid,
.module-grid,
.detail-grid {
  display: grid;
  gap: 16px;
}

.overview-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.module-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-card,
.module-card,
.detail-card {
  padding: 22px;
}

.overview-card__label {
  display: block;
  color: #8c8c8c;
  font-size: 13px;
}

.overview-card__value {
  display: block;
  margin-top: 12px;
  color: #1f1f1f;
  font-size: 30px;
  line-height: 1.2;
}

.detail-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 18px;
}

.detail-card__header h3 {
  font-size: 20px;
}

.detail-card__empty {
  color: #8c8c8c;
  font-size: 14px;
}

.detail-card--full {
  grid-column: 1 / -1;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  font-size: 14px;
  color: #262626;
}

.detail-table th {
  color: #8c8c8c;
  font-weight: 500;
}

.detail-definition {
  display: grid;
  gap: 12px;
}

.detail-definition div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-definition dt {
  color: #8c8c8c;
  font-size: 13px;
}

.detail-definition dd {
  margin: 0;
  color: #1f1f1f;
  font-size: 14px;
  font-weight: 500;
  text-align: right;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.detail-list li {
  display: grid;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-list strong {
  color: #1f1f1f;
  font-size: 14px;
}

.detail-list span,
.detail-list small {
  color: #8c8c8c;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .admin-topbar {
    height: auto;
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-topbar__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .admin-user {
    text-align: left;
  }

  .admin-console {
    width: min(1440px, calc(100% - 24px));
    padding-top: 16px;
  }

  .overview-grid,
  .module-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .overview-grid,
  .module-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-card--full {
    grid-column: auto;
  }

  .detail-card__header,
  .admin-console__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-definition div {
    flex-direction: column;
  }

  .detail-definition dd {
    text-align: left;
  }
}
</style>
