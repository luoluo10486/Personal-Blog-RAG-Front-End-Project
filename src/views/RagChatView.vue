<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createRagChatStream,
  deleteRagSession,
  listRagMessages,
  listRagSessions,
  listSampleQuestions,
  stopRagTask
} from "../services/ragService";
import { clearStoredAuth, getStoredAuthUser } from "../utils/auth";

const DEFAULT_SUGGESTIONS = [
  {
    title: "知识点总结",
    description: "快速提炼主题核心观点和行动建议",
    question: "请帮我总结这段内容，并提炼 3 到 5 个关键要点。"
  },
  {
    title: "方案对比",
    description: "对多个思路做结构化优缺点分析",
    question: "围绕这个主题给出 3 个可行方案，并比较优缺点和适用场景。"
  },
  {
    title: "排查问题",
    description: "适合接口、前端和联调问题定位",
    question: "请按可能性从高到低帮我排查这个问题，并给出验证步骤。"
  }
];

const router = useRouter();
const sessions = ref([]);
const messages = ref([]);
const suggestions = ref(DEFAULT_SUGGESTIONS);
const currentSessionId = ref("");
const draft = ref("");
const loadingSessions = ref(false);
const loadingMessages = ref(false);
const isStreaming = ref(false);
const deepThinkingEnabled = ref(false);
const noticeText = ref("");
const noticeType = ref("info");
const streamTaskId = ref("");
const streamingMessageId = ref("");
const cancelRequested = ref(false);
const thinkingStartAt = ref(0);
const messageScrollerRef = ref(null);
const textareaRef = ref(null);
let cancelStreamRequest = null;
const currentUser = ref(getStoredAuthUser());

const currentSessionTitle = computed(() => {
  return sessions.value.find((item) => item.id === currentSessionId.value)?.title || "RAG 问答";
});

const hasMessages = computed(() => messages.value.length > 0);
const currentUserName = computed(() => {
  const user = currentUser.value;
  return user?.displayName || user?.username || user?.email || "当前用户";
});

function setNotice(message, type = "info") {
  noticeText.value = message;
  noticeType.value = type;
}

function formatSessionTime(value) {
  if (!value) {
    return "刚刚创建";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameYear = now.getFullYear() === date.getFullYear();
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    ...(sameYear
      ? {}
      : {
          year: "numeric"
        })
  });
}

function mapSession(item) {
  return {
    id: item?.conversationId || "",
    title: item?.title || "新对话",
    lastTime: item?.lastTime || ""
  };
}

function mapMessage(item) {
  return {
    id: String(item?.id ?? `${Date.now()}`),
    role: item?.role === "assistant" ? "assistant" : "user",
    content: item?.content || "",
    thinking: item?.thinkingContent || "",
    thinkingDuration: item?.thinkingDuration || 0,
    createdAt: item?.createTime || "",
    status: "done",
    isThinking: false
  };
}

function sortSessions(items) {
  return [...items].sort((a, b) => {
    const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
    const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
    return timeB - timeA;
  });
}

function upsertSession(nextSession) {
  const index = sessions.value.findIndex((item) => item.id === nextSession.id);
  const merged = [...sessions.value];

  if (index >= 0) {
    merged[index] = {
      ...merged[index],
      ...nextSession
    };
  } else {
    merged.unshift(nextSession);
  }

  sessions.value = sortSessions(merged);
}

function updateSessionTitle(sessionId, title) {
  if (!sessionId || !title) {
    return;
  }

  sessions.value = sessions.value.map((item) =>
    item.id === sessionId
      ? {
          ...item,
          title
        }
      : item
  );
}

function computeThinkingDuration() {
  if (!thinkingStartAt.value) {
    return 0;
  }

  const seconds = Math.round((Date.now() - thinkingStartAt.value) / 1000);
  return Math.max(1, seconds);
}

function scrollToBottom() {
  nextTick(() => {
    const container = messageScrollerRef.value;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  });
}

function focusComposer() {
  nextTick(() => {
    textareaRef.value?.focus();
  });
}

function createConversation() {
  if (isStreaming.value) {
    void interruptStreaming();
  }

  currentSessionId.value = "";
  messages.value = [];
  setNotice("", "info");
  focusComposer();
}

async function loadSuggestions() {
  try {
    const data = await listSampleQuestions();
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    suggestions.value = data
      .filter((item) => item?.question && item.question.trim())
      .slice(0, 3)
      .map((item, index) => ({
        title: item.title?.trim() || `推荐问题 ${index + 1}`,
        description: item.description?.trim() || "点击即可快速开始提问",
        question: item.question.trim()
      }));
  } catch {
    return;
  }
}

async function loadSessions({ autoSelect = true } = {}) {
  loadingSessions.value = true;

  try {
    const data = await listRagSessions();
    const nextSessions = Array.isArray(data) ? sortSessions(data.map(mapSession)) : [];
    sessions.value = nextSessions;

    if (!autoSelect) {
      return;
    }

    if (currentSessionId.value && nextSessions.some((item) => item.id === currentSessionId.value)) {
      return;
    }

    if (nextSessions.length > 0) {
      await selectSession(nextSessions[0].id);
      return;
    }

    createConversation();
  } catch (error) {
    setNotice(error?.message || "加载会话失败，请稍后重试", "error");
  } finally {
    loadingSessions.value = false;
  }
}

async function selectSession(sessionId) {
  if (!sessionId) {
    createConversation();
    return;
  }

  if (isStreaming.value) {
    await interruptStreaming();
  }

  currentSessionId.value = sessionId;
  loadingMessages.value = true;
  setNotice("", "info");

  try {
    const data = await listRagMessages(sessionId);
    if (currentSessionId.value !== sessionId) {
      return;
    }

    messages.value = Array.isArray(data) ? data.map(mapMessage) : [];
    scrollToBottom();
  } catch (error) {
    setNotice(error?.message || "加载消息失败，请稍后重试", "error");
  } finally {
    if (currentSessionId.value === sessionId) {
      loadingMessages.value = false;
    }
  }
}

async function removeSession(sessionId) {
  if (!sessionId) {
    return;
  }

  const confirmed = typeof window === "undefined" ? true : window.confirm("确认删除这个会话吗？");
  if (!confirmed) {
    return;
  }

  try {
    await deleteRagSession(sessionId);
    const remaining = sessions.value.filter((item) => item.id !== sessionId);
    sessions.value = remaining;

    if (currentSessionId.value === sessionId) {
      if (remaining.length > 0) {
        await selectSession(remaining[0].id);
      } else {
        createConversation();
      }
    }

    setNotice("会话已删除", "success");
  } catch (error) {
    setNotice(error?.message || "删除会话失败，请稍后重试", "error");
  }
}

function updateStreamingMessage(patch) {
  messages.value = messages.value.map((item) =>
    item.id === streamingMessageId.value ? patch(item) : item
  );
  scrollToBottom();
}

function appendThinking(delta) {
  if (!delta) {
    return;
  }

  if (!thinkingStartAt.value) {
    thinkingStartAt.value = Date.now();
  }

  updateStreamingMessage((message) => ({
    ...message,
    thinking: `${message.thinking || ""}${delta}`,
    isThinking: true
  }));
}

function appendContent(delta) {
  if (!delta) {
    return;
  }

  const duration = thinkingStartAt.value ? computeThinkingDuration() : 0;
  const shouldCloseThinking = thinkingStartAt.value > 0;

  if (shouldCloseThinking) {
    thinkingStartAt.value = 0;
  }

  updateStreamingMessage((message) => ({
    ...message,
    content: `${message.content || ""}${delta}`,
    isThinking: false,
    thinkingDuration: message.thinkingDuration || duration
  }));
}

function finishStreamingMessage(status, payload = null) {
  const duration = thinkingStartAt.value ? computeThinkingDuration() : 0;
  thinkingStartAt.value = 0;

  updateStreamingMessage((message) => ({
    ...message,
    ...(payload?.messageId
      ? {
          id: String(payload.messageId)
        }
      : {}),
    status,
    isThinking: false,
    thinkingDuration: message.thinkingDuration || duration
  }));
}

function clearStreamingState() {
  isStreaming.value = false;
  streamTaskId.value = "";
  streamingMessageId.value = "";
  cancelRequested.value = false;
  thinkingStartAt.value = 0;
  cancelStreamRequest = null;
}

async function interruptStreaming() {
  if (!isStreaming.value) {
    return;
  }

  if (streamTaskId.value) {
    try {
      await stopRagTask(streamTaskId.value);
    } catch {}
  }

  cancelStreamRequest?.();
  clearStreamingState();
}

async function stopGeneration() {
  if (!isStreaming.value) {
    return;
  }

  cancelRequested.value = true;

  if (streamTaskId.value) {
    try {
      await stopRagTask(streamTaskId.value);
    } catch (error) {
      setNotice(error?.message || "停止生成失败，请稍后重试", "error");
    }
  }
}

async function sendMessage() {
  if (isStreaming.value) {
    await stopGeneration();
    return;
  }

  const question = draft.value.trim();
  if (!question) {
    return;
  }

  setNotice("", "info");

  const userMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    content: question,
    createdAt: new Date().toISOString(),
    status: "done"
  };
  const assistantId = `assistant-${Date.now()}`;
  const assistantMessage = {
    id: assistantId,
    role: "assistant",
    content: "",
    thinking: deepThinkingEnabled.value ? "" : "",
    thinkingDuration: 0,
    createdAt: new Date().toISOString(),
    status: "streaming",
    isThinking: false
  };

  draft.value = "";
  messages.value = [...messages.value, userMessage, assistantMessage];
  isStreaming.value = true;
  streamTaskId.value = "";
  streamingMessageId.value = assistantId;
  cancelRequested.value = false;
  thinkingStartAt.value = 0;
  scrollToBottom();

  const stream = createRagChatStream(
    {
      question,
      conversationId: currentSessionId.value || undefined,
      deepThinking: deepThinkingEnabled.value || undefined
    },
    {
      onMeta(payload) {
        if (streamingMessageId.value !== assistantId) {
          return;
        }

        const nextSessionId = payload?.conversationId || currentSessionId.value;
        if (nextSessionId) {
          currentSessionId.value = nextSessionId;
          upsertSession({
            id: nextSessionId,
            title:
              sessions.value.find((item) => item.id === nextSessionId)?.title || "新对话",
            lastTime: new Date().toISOString()
          });
        }

        if (payload?.taskId) {
          streamTaskId.value = payload.taskId;
          if (cancelRequested.value) {
            stopRagTask(payload.taskId).catch(() => null);
          }
        }
      },
      onMessage(payload) {
        if (!payload || typeof payload !== "object") {
          return;
        }

        if (payload.type === "think") {
          appendThinking(payload.delta || "");
          return;
        }

        appendContent(payload.delta || "");
      },
      onReject(payload) {
        appendContent(payload?.delta || "");
      },
      onTitle(payload) {
        if (payload?.title && currentSessionId.value) {
          updateSessionTitle(currentSessionId.value, payload.title);
        }
      },
      onFinish(payload) {
        if (payload?.title && currentSessionId.value) {
          updateSessionTitle(currentSessionId.value, payload.title);
        }

        if (currentSessionId.value) {
          upsertSession({
            id: currentSessionId.value,
            title:
              payload?.title ||
              sessions.value.find((item) => item.id === currentSessionId.value)?.title ||
              "新对话",
            lastTime: new Date().toISOString()
          });
        }

        finishStreamingMessage("done", payload);
      },
      onCancel(payload) {
        finishStreamingMessage("cancelled", payload);
        clearStreamingState();
      },
      onDone() {
        clearStreamingState();
      },
      onError(error) {
        finishStreamingMessage("error");
        setNotice(error?.message || "生成失败，请稍后重试", "error");
        clearStreamingState();
      }
    }
  );

  cancelStreamRequest = stream.cancel;

  try {
    await stream.start();
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    finishStreamingMessage("error");
    setNotice(error?.message || "生成失败，请稍后重试", "error");
    clearStreamingState();
  } finally {
    focusComposer();
  }
}

function handleSuggestionClick(question) {
  draft.value = question;
  focusComposer();
}

function handleComposerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  if (event.isComposing || event.keyCode === 229) {
    return;
  }

  event.preventDefault();
  void sendMessage();
}

function handleLogout() {
  clearStoredAuth();
  router.push("/login");
}

onMounted(async () => {
  await Promise.all([loadSuggestions(), loadSessions()]);
  focusComposer();
});

onBeforeUnmount(() => {
  if (streamTaskId.value) {
    stopRagTask(streamTaskId.value).catch(() => null);
  }
  cancelStreamRequest?.();
});
</script>

<template>
  <section class="rag-shell">
    <header class="rag-topbar">
      <div class="rag-topbar__title">
        <p>Independent App</p>
        <h1>RAG问答</h1>
      </div>

      <div class="rag-topbar__actions">
        <button class="ghost-button" type="button" @click="router.push('/workspace')">返回工作台</button>
        <button class="ghost-button" type="button" @click="router.push('/admin')">后台管理</button>
        <div class="rag-user">
          <span>当前登录</span>
          <strong>{{ currentUserName }}</strong>
        </div>
        <button class="logout-button" type="button" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="rag-shell__body">
      <section class="rag-page">
        <aside class="rag-page__sessions">
      <div class="session-panel">
        <div class="session-panel__header">
          <div>
            <p class="session-panel__label">会话管理</p>
            <h2>RAG 问答</h2>
          </div>
          <button class="primary-button primary-button--ghost" type="button" @click="createConversation">
            新建对话
          </button>
        </div>

        <div class="session-panel__summary">
          <span>{{ sessions.length }} 个会话</span>
          <span>{{ isStreaming ? "生成中" : "就绪" }}</span>
        </div>

        <div v-if="loadingSessions" class="panel-state">正在加载会话...</div>

        <div v-else-if="sessions.length === 0" class="panel-state">
          暂无历史会话，直接在右侧输入问题即可开始。
        </div>

        <ul v-else class="session-list">
          <li v-for="session in sessions" :key="session.id">
            <button
              type="button"
              :class="['session-item', { 'is-active': currentSessionId === session.id }]"
              @click="selectSession(session.id)"
            >
              <span class="session-item__title">{{ session.title }}</span>
              <span class="session-item__time">{{ formatSessionTime(session.lastTime) }}</span>
            </button>
            <button class="session-item__delete" type="button" @click="removeSession(session.id)">
              删除
            </button>
          </li>
        </ul>
      </div>
        </aside>

        <section class="rag-page__workspace">
      <header class="workspace-card workspace-card--header">
        <div>
          <p class="workspace-card__eyebrow">智能问答工作台</p>
          <h2>{{ currentSessionTitle }}</h2>
          <p class="workspace-card__description">
            基于 `ragent` 已有接口重构，保留会话、历史消息、流式回答和推荐问题能力。
          </p>
        </div>
        <div class="workspace-card__actions">
          <button
            type="button"
            :class="['switch-chip', { 'is-active': deepThinkingEnabled }]"
            :disabled="isStreaming"
            @click="deepThinkingEnabled = !deepThinkingEnabled"
          >
            深度思考
          </button>
          <span class="status-chip">{{ isStreaming ? "生成中" : "空闲" }}</span>
        </div>
      </header>

      <div v-if="noticeText" :class="['notice-bar', `notice-bar--${noticeType}`]">
        {{ noticeText }}
      </div>

      <div class="workspace-card workspace-card--body">
        <div v-if="loadingMessages" class="panel-state panel-state--body">正在加载消息...</div>

        <template v-else>
          <div v-if="!hasMessages" class="welcome-area">
            <section class="welcome-banner">
              <div>
                <p class="welcome-banner__eyebrow">RAG 问答</p>
                <h3>开始一个更清晰、可追踪的知识问答会话</h3>
                <p>
                  这里保留了最核心的对话能力，移除了原来无关的内容展示页面，界面结构更接近中后台式工作台。
                </p>
              </div>
              <ul class="welcome-banner__facts">
                <li>流式回答</li>
                <li>历史会话</li>
                <li>推荐问题</li>
              </ul>
            </section>

            <section class="suggestions-area">
              <header class="suggestions-area__header">
                <h3>推荐提问</h3>
                <p>来自 `ragent` 的推荐问题接口，点击即可填入输入框。</p>
              </header>

              <div class="suggestions-grid">
                <button
                  v-for="item in suggestions"
                  :key="item.title"
                  type="button"
                  class="suggestion-card"
                  @click="handleSuggestionClick(item.question)"
                >
                  <span class="suggestion-card__title">{{ item.title }}</span>
                  <span class="suggestion-card__desc">{{ item.description }}</span>
                  <span class="suggestion-card__question">{{ item.question }}</span>
                </button>
              </div>
            </section>
          </div>

          <div v-else ref="messageScrollerRef" class="message-list">
            <article
              v-for="message in messages"
              :key="message.id"
              :class="['message-row', `message-row--${message.role}`]"
            >
              <div :class="['message-bubble', `message-bubble--${message.role}`]">
                <div class="message-bubble__meta">
                  <span>{{ message.role === 'user' ? '我' : 'RAG 助手' }}</span>
                  <span>{{ formatSessionTime(message.createdAt) }}</span>
                </div>

                <details
                  v-if="message.role === 'assistant' && message.thinking"
                  class="thinking-panel"
                >
                  <summary>
                    深度思考
                    <span v-if="message.thinkingDuration">{{ message.thinkingDuration }}s</span>
                  </summary>
                  <pre>{{ message.thinking }}</pre>
                </details>

                <pre class="message-bubble__content">{{ message.content || (message.isThinking ? '正在思考...' : '') }}</pre>

                <p v-if="message.status === 'cancelled'" class="message-bubble__status">
                  已停止生成
                </p>
                <p v-else-if="message.status === 'error'" class="message-bubble__status message-bubble__status--error">
                  生成失败，请重试
                </p>
              </div>
            </article>
          </div>
        </template>

        <footer class="composer">
          <textarea
            ref="textareaRef"
            v-model="draft"
            class="composer__input"
            rows="3"
            :placeholder="deepThinkingEnabled ? '输入需要深入分析的问题...' : '请输入你的问题，支持 Shift + Enter 换行'"
            @keydown="handleComposerKeydown"
          />
          <div class="composer__footer">
            <div class="composer__hint">
              <span>Enter 发送</span>
              <span>Shift + Enter 换行</span>
            </div>
            <button class="primary-button" type="button" @click="sendMessage">
              {{ isStreaming ? '停止生成' : '发送问题' }}
            </button>
          </div>
        </footer>
      </div>
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.rag-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(22, 119, 255, 0.08), transparent 20%),
    #f5f7fa;
}

.rag-topbar {
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

.rag-topbar__title p {
  margin: 0 0 4px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.rag-topbar__title h1 {
  margin: 0;
  color: #1f1f1f;
  font-size: 24px;
  line-height: 1.4;
}

.rag-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rag-user {
  display: grid;
  gap: 2px;
  text-align: right;
}

.rag-user span {
  color: #8c8c8c;
  font-size: 12px;
}

.rag-user strong {
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

.rag-shell__body {
  width: min(1440px, calc(100% - 48px));
  margin: 0 auto;
  padding: 24px 0 32px;
}

.rag-page {
  display: grid;
  gap: 24px;
  grid-template-columns: 300px minmax(0, 1fr);
  min-height: calc(100vh - 132px);
}

.rag-page__sessions,
.rag-page__workspace {
  min-width: 0;
}

.session-panel,
.workspace-card {
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.session-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px;
}

.session-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.session-panel__label,
.workspace-card__eyebrow,
.welcome-banner__eyebrow {
  margin: 0 0 6px;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.session-panel__header h2,
.workspace-card--header h2,
.welcome-banner h3,
.suggestions-area__header h3 {
  margin: 0;
  color: #1f1f1f;
  font-size: 22px;
  line-height: 1.4;
  font-weight: 600;
}

.session-panel__summary {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  color: #8c8c8c;
  font-size: 13px;
}

.session-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 12px;
}

.session-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.session-item {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: #91caff;
  background: #f5faff;
}

.session-item.is-active {
  border-color: #1677ff;
  background: #e6f4ff;
  box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.08);
}

.session-item__title,
.suggestion-card__title {
  display: block;
  color: #1f1f1f;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.session-item__time,
.suggestion-card__desc,
.workspace-card__description,
.suggestions-area__header p,
.welcome-banner p,
.message-bubble__meta {
  display: block;
  margin-top: 6px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.5;
}

.session-item__delete {
  border: 0;
  background: transparent;
  color: #8c8c8c;
  font-size: 12px;
  cursor: pointer;
}

.session-item__delete:hover {
  color: #ff4d4f;
}

.workspace-card--header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
}

.workspace-card__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.switch-chip,
.status-chip,
.primary-button {
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.switch-chip {
  padding: 9px 14px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #595959;
  cursor: pointer;
}

.switch-chip.is-active {
  border-color: #1677ff;
  background: #e6f4ff;
  color: #1677ff;
}

.switch-chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 9px 14px;
  background: #fafafa;
  color: #8c8c8c;
}

.notice-bar {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
}

.notice-bar--error {
  background: #fff2f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.notice-bar--success {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
}

.notice-bar--info {
  background: #f0f5ff;
  color: #1d39c4;
  border: 1px solid #adc6ff;
}

.workspace-card--body {
  margin-top: 16px;
  padding: 0;
  min-height: 720px;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.panel-state {
  display: grid;
  place-items: center;
  min-height: 120px;
  color: #8c8c8c;
  font-size: 14px;
  text-align: center;
}

.panel-state--body {
  min-height: 520px;
}

.welcome-area {
  padding: 24px;
  display: grid;
  gap: 24px;
}

.welcome-banner {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #fafcff);
}

.welcome-banner__facts {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.welcome-banner__facts li {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f5f5f5;
  color: #595959;
  font-size: 13px;
}

.suggestions-grid {
  margin-top: 16px;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.suggestion-card {
  padding: 18px;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-card:hover {
  border-color: #91caff;
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.08);
}

.suggestion-card__question {
  display: block;
  margin-top: 14px;
  color: #262626;
  font-size: 13px;
  line-height: 1.6;
}

.message-list {
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  background: #fafafa;
}

.message-row {
  display: flex;
  margin-bottom: 20px;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: min(780px, 88%);
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid #f0f0f0;
  background: #ffffff;
}

.message-bubble--user {
  background: #e6f4ff;
  border-color: #bae0ff;
}

.message-bubble__meta {
  margin-top: 0;
}

.message-bubble__content,
.thinking-panel pre {
  margin: 12px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #262626;
  font-size: 14px;
  line-height: 1.7;
  font-family: inherit;
}

.message-bubble__status {
  margin: 12px 0 0;
  color: #8c8c8c;
  font-size: 12px;
}

.message-bubble__status--error {
  color: #cf1322;
}

.thinking-panel {
  margin-top: 12px;
  border: 1px solid #d6e4ff;
  border-radius: 12px;
  background: #f0f5ff;
  overflow: hidden;
}

.thinking-panel summary {
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 12px 14px;
  color: #1d39c4;
  font-size: 13px;
  font-weight: 500;
}

.composer {
  border-top: 1px solid #f0f0f0;
  padding: 20px 24px 24px;
  background: #ffffff;
}

.composer__input {
  width: 100%;
  resize: none;
  padding: 14px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  background: #ffffff;
  color: #262626;
  font: inherit;
  line-height: 1.6;
  min-height: 108px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.composer__input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
}

.composer__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.composer__hint {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #8c8c8c;
  font-size: 12px;
}

.primary-button {
  border: 1px solid #1677ff;
  background: #1677ff;
  color: #ffffff;
  padding: 10px 18px;
  cursor: pointer;
}

.primary-button:hover {
  background: #0958d9;
  border-color: #0958d9;
}

.primary-button--ghost {
  background: #ffffff;
  color: #1677ff;
}

.primary-button--ghost:hover {
  background: #f0f5ff;
  border-color: #1677ff;
}

@media (max-width: 1200px) {
  .rag-topbar {
    height: auto;
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .rag-topbar__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .rag-user {
    text-align: left;
  }

  .rag-shell__body {
    width: min(1440px, calc(100% - 24px));
    padding-top: 16px;
  }

  .rag-page {
    grid-template-columns: 1fr;
  }

  .workspace-card--header {
    flex-direction: column;
    align-items: stretch;
  }

  .workspace-card__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .suggestions-grid {
    grid-template-columns: 1fr;
  }

  .message-bubble {
    max-width: 100%;
  }

  .composer__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-button {
    width: 100%;
  }
}
</style>
