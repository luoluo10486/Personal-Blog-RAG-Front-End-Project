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
    <div class="admin-chinoiserie-layer" aria-hidden="true">
      <span class="admin-ink-sun" />
      <span class="admin-ink-mountain" />
      <span class="admin-cloud admin-cloud--left" />
      <span class="admin-cloud admin-cloud--right" />
      <span class="admin-plum-branch" />
    </div>

    <header class="admin-topbar">
      <div class="admin-topbar__title">
        <p>Independent App</p>
        <h1>RAG后台管理</h1>
        <span class="admin-title-seal" aria-hidden="true">管</span>
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
          <span class="hero-scroll-mark" aria-hidden="true">山水有序 · 数据成章</span>
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

/* 水墨主题覆盖 */
.admin-shell {
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 10% 4%, rgba(36, 64, 52, 0.14), transparent 24%),
    radial-gradient(circle at 90% 10%, rgba(142, 116, 66, 0.16), transparent 26%),
    linear-gradient(135deg, rgba(255, 252, 243, 0.98), rgba(238, 234, 218, 0.92)),
    #f7f1e2;
}

.admin-shell::before,
.admin-shell::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.admin-shell::before {
  background:
    linear-gradient(90deg, rgba(36, 48, 40, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(36, 48, 40, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 76%);
}

.admin-shell::after {
  background:
    radial-gradient(ellipse at 0% 94%, rgba(20, 25, 22, 0.16), transparent 30%),
    radial-gradient(ellipse at 98% 78%, rgba(73, 94, 80, 0.12), transparent 28%);
  filter: blur(18px);
  opacity: 0.82;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid rgba(70, 76, 61, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 252, 243, 0.9), rgba(247, 241, 226, 0.78));
  box-shadow: 0 14px 36px rgba(50, 42, 28, 0.08);
  backdrop-filter: blur(16px);
}

.admin-topbar__title p,
.admin-console__tag {
  color: #8b6f3d;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.admin-topbar__title h1,
.admin-console__hero h2,
.detail-card__header h3,
.module-card h3,
.overview-card__value,
.detail-list strong,
.detail-definition dd {
  color: #1f2f29;
  font-family: "STKaiti", "KaiTi", "Microsoft YaHei", serif;
  letter-spacing: 0.03em;
}

.admin-console__desc,
.module-card p,
.detail-card__header span,
.overview-card__label,
.detail-card__empty,
.detail-table th,
.detail-definition dt,
.detail-list span,
.detail-list small,
.admin-user span {
  color: #6f695d;
}

.admin-user strong,
.detail-table td {
  color: #28322b;
}

.admin-console__hero,
.overview-card,
.module-card,
.detail-card {
  border-color: rgba(70, 76, 61, 0.18);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 253, 247, 0.9), rgba(246, 240, 225, 0.8)),
    rgba(255, 252, 243, 0.86);
  box-shadow:
    0 18px 48px rgba(50, 42, 28, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(14px);
}

.admin-console__hero {
  position: relative;
  overflow: hidden;
}

.admin-console__hero::after {
  content: "";
  position: absolute;
  right: -80px;
  bottom: -120px;
  width: 360px;
  height: 260px;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 35% 35%, rgba(31, 47, 41, 0.2), transparent 30%),
    radial-gradient(ellipse at 60% 62%, rgba(139, 111, 61, 0.16), transparent 48%);
  filter: blur(14px);
  opacity: 0.72;
}

.admin-console__hero > * {
  position: relative;
  z-index: 1;
}

.overview-card,
.module-card {
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.overview-card:hover,
.module-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 111, 61, 0.42);
  box-shadow: 0 24px 54px rgba(50, 42, 28, 0.14);
}

.overview-card__value {
  font-weight: 700;
}

.ghost-button,
.logout-button,
.admin-console__refresh {
  border-radius: 999px;
  transition: all 0.2s ease;
}

.ghost-button,
.logout-button {
  border-color: rgba(70, 76, 61, 0.22);
  background: rgba(255, 250, 238, 0.76);
  color: #4d5d4f;
}

.ghost-button:hover,
.logout-button:hover {
  border-color: #8b6f3d;
  color: #6f4f1f;
  background: rgba(229, 216, 181, 0.46);
}

.admin-console__refresh {
  border-color: #243028;
  background: linear-gradient(135deg, #18231f, #536656);
  color: #fffaf0;
  box-shadow: 0 12px 26px rgba(31, 47, 41, 0.18);
}

.admin-console__refresh:hover {
  border-color: #6f7f63;
  background: linear-gradient(135deg, #243028, #6f7f63);
}

.admin-console__refresh:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.admin-console__notice--error {
  border-color: rgba(143, 58, 50, 0.28);
  background: rgba(245, 218, 210, 0.68);
  color: #8f3a32;
}

.admin-console__notice--warn {
  border-color: rgba(139, 111, 61, 0.3);
  background: rgba(229, 216, 181, 0.48);
  color: #6f4f1f;
}

.detail-table th,
.detail-table td,
.detail-definition div,
.detail-list li {
  border-color: rgba(70, 76, 61, 0.14);
}

.detail-table tbody tr {
  transition: background 0.18s ease;
}

.detail-table tbody tr:hover {
  background: rgba(229, 216, 181, 0.24);
}

/* 中式美学强化：卷轴、梅枝、朱印、云纹 */
.admin-chinoiserie-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.admin-ink-sun {
  position: absolute;
  top: 122px;
  right: 15%;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 34%, rgba(255, 236, 196, 0.9), rgba(154, 47, 40, 0.48) 58%, transparent 62%);
  opacity: 0.68;
}

.admin-ink-mountain {
  position: absolute;
  left: -8vw;
  right: -8vw;
  bottom: -72px;
  height: 280px;
  opacity: 0.34;
  filter: blur(1px);
  background:
    radial-gradient(ellipse at 14% 74%, rgba(31, 47, 41, 0.38), transparent 34%),
    radial-gradient(ellipse at 42% 70%, rgba(74, 93, 76, 0.32), transparent 40%),
    radial-gradient(ellipse at 72% 78%, rgba(20, 25, 22, 0.26), transparent 36%),
    radial-gradient(ellipse at 96% 74%, rgba(139, 111, 61, 0.22), transparent 34%);
}

.admin-cloud {
  position: absolute;
  width: 230px;
  height: 78px;
  border-top: 1px solid rgba(139, 111, 61, 0.28);
  border-bottom: 1px solid rgba(139, 111, 61, 0.22);
  opacity: 0.5;
}

.admin-cloud::before,
.admin-cloud::after {
  content: "";
  position: absolute;
  border: 1px solid rgba(139, 111, 61, 0.26);
  border-radius: 999px;
}

.admin-cloud::before {
  width: 82px;
  height: 30px;
  top: 16px;
  left: 24px;
}

.admin-cloud::after {
  width: 124px;
  height: 40px;
  right: 18px;
  bottom: 12px;
}

.admin-cloud--left {
  top: 180px;
  left: 5%;
}

.admin-cloud--right {
  right: 7%;
  bottom: 220px;
  transform: scaleX(-1);
}

.admin-plum-branch {
  position: absolute;
  top: 72px;
  left: -28px;
  width: 250px;
  height: 250px;
  opacity: 0.36;
  background:
    linear-gradient(128deg, transparent 0 118px, rgba(31, 47, 41, 0.54) 119px 123px, transparent 124px),
    linear-gradient(42deg, transparent 0 126px, rgba(31, 47, 41, 0.4) 127px 130px, transparent 131px),
    radial-gradient(circle at 138px 94px, rgba(154, 47, 40, 0.72) 0 5px, transparent 6px),
    radial-gradient(circle at 168px 120px, rgba(154, 47, 40, 0.62) 0 4px, transparent 5px),
    radial-gradient(circle at 104px 132px, rgba(154, 47, 40, 0.56) 0 4px, transparent 5px),
    radial-gradient(circle at 188px 82px, rgba(154, 47, 40, 0.5) 0 3px, transparent 4px);
}

.admin-topbar,
.admin-console {
  position: relative;
  z-index: 1;
}

.admin-topbar__title {
  position: relative;
  padding-left: 18px;
}

.admin-topbar__title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #9a2f28, #8b6f3d, #536656);
}

.admin-title-seal {
  position: absolute;
  right: -40px;
  top: 8px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid rgba(154, 47, 40, 0.82);
  border-radius: 8px;
  color: #9a2f28;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 16px;
  font-weight: 800;
  transform: rotate(8deg);
  background: rgba(255, 245, 225, 0.72);
}

.hero-scroll-mark {
  display: inline-flex;
  margin-top: 12px;
  padding: 5px 12px;
  border: 1px solid rgba(139, 111, 61, 0.28);
  border-radius: 999px;
  background: rgba(255, 250, 238, 0.62);
  color: #8b6f3d;
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 14px;
  letter-spacing: 0.12em;
}

.admin-console__hero {
  border-left: 8px solid rgba(139, 111, 61, 0.32);
  border-right: 8px solid rgba(139, 111, 61, 0.22);
}

.overview-card,
.module-card,
.detail-card {
  position: relative;
  overflow: hidden;
}

.overview-card::before,
.module-card::before,
.detail-card::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(139, 111, 61, 0.15);
  border-radius: 18px;
  pointer-events: none;
}

.overview-card::after {
  content: "令";
  position: absolute;
  right: 18px;
  bottom: 8px;
  color: rgba(154, 47, 40, 0.08);
  font-family: "STKaiti", "KaiTi", serif;
  font-size: 70px;
  line-height: 1;
}

.module-card::after {
  content: "";
  position: absolute;
  right: 18px;
  top: 18px;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(154, 47, 40, 0.22);
  border-radius: 8px;
  transform: rotate(8deg);
}

.detail-card__header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(139, 111, 61, 0.18);
}

.detail-card__header h3::before {
  content: "◆";
  margin-right: 8px;
  color: #9a2f28;
  font-size: 12px;
}

/* 诗意网页质感：同工作台/RAG 的宣纸空间 */
.admin-topbar {
  width: min(1620px, calc(100% - 64px));
  height: 82px;
  margin: 0 auto;
  padding: 0;
  border-bottom: 0;
  background: transparent;
  box-shadow: none;
}

.admin-console {
  width: min(1620px, calc(100% - 64px));
  padding-top: 18px;
}

.ghost-button,
.logout-button {
  min-width: 76px;
  height: 40px;
  padding: 0 18px;
  background: rgba(255, 250, 238, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.admin-user {
  min-height: 44px;
  padding: 4px 14px;
  border: 1px solid rgba(70, 76, 61, 0.16);
  border-radius: 999px;
  background: rgba(255, 250, 238, 0.74);
  backdrop-filter: blur(12px);
}

.admin-console__hero {
  min-height: 260px;
  padding: 40px 48px;
  border-radius: 34px;
  align-items: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.72), transparent 38%),
    linear-gradient(180deg, rgba(255, 253, 247, 0.94), rgba(246, 240, 225, 0.86));
}

.admin-console__hero h2 {
  font-size: clamp(38px, 5vw, 68px);
  line-height: 1.08;
}

.admin-console__desc {
  max-width: 780px;
  font-size: 16px;
}

.overview-grid,
.module-grid,
.detail-grid {
  gap: 18px;
}

.overview-card,
.module-card,
.detail-card {
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.6), transparent 36%),
    linear-gradient(180deg, rgba(255, 253, 247, 0.92), rgba(246, 240, 225, 0.84));
}

.overview-card {
  min-height: 136px;
}

.overview-card__value {
  font-size: 38px;
}

.module-card {
  min-height: 166px;
}

.detail-card {
  border-radius: 28px;
}

.admin-ink-sun {
  animation: adminPoeticSun 8s ease-in-out infinite;
}

.admin-cloud--left {
  animation: adminPoeticCloud 16s ease-in-out infinite alternate;
}

.admin-cloud--right {
  animation: adminPoeticCloudReverse 18s ease-in-out infinite alternate;
}

.admin-ink-mountain {
  animation: adminInkFloat 14s ease-in-out infinite alternate;
}

.detail-card,
.admin-console__hero {
  scrollbar-color: rgba(139, 111, 61, 0.34) transparent;
  scrollbar-width: thin;
}

@keyframes adminPoeticSun {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.62;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.78;
  }
}

@keyframes adminPoeticCloud {
  from {
    transform: translateX(-16px);
  }
  to {
    transform: translateX(26px);
  }
}

@keyframes adminPoeticCloudReverse {
  from {
    transform: scaleX(-1) translateX(-22px);
  }
  to {
    transform: scaleX(-1) translateX(18px);
  }
}

@keyframes adminInkFloat {
  from {
    filter: blur(1px);
    opacity: 0.3;
  }
  to {
    filter: blur(2px);
    opacity: 0.42;
  }
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
