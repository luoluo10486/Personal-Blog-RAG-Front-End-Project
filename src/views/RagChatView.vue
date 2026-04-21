<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createRagChatStream,
  deleteRagSession,
  listRagMessages,
  listRagSessions,
  listSampleQuestions,
  stopRagTask,
  submitRagMessageFeedback
} from "../services/ragService";
import { clearStoredAuth, getStoredAuthUser } from "../utils/auth";

const DEFAULT_SUGGESTIONS = [
  {
    title: "内容总结",
    description: "提炼 3 到 5 个要点",
    question: "请帮我总结这段内容，并提炼 3 到 5 个关键要点。"
  },
  {
    title: "任务拆解",
    description: "拆成步骤和优先级",
    question: "请把这个需求拆成可执行步骤，并给出优先级和里程碑。"
  },
  {
    title: "方案对比",
    description: "给出多个方案并比较",
    question: "围绕这个主题给出 3 个可行方案，并比较优缺点和适用场景。"
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

const activeSession = computed(() => {
  return sessions.value.find((item) => item.id === currentSessionId.value) || null;
});
const hasMessages = computed(() => messages.value.length > 0);
const thinkingMessage = computed(() => {
  return messages.value.find((message) => message.role === "assistant" && message.isThinking);
});
const currentSessionTitle = computed(() => activeSession.value?.title || "新对话");
const currentUserName = computed(() => {
  const user = currentUser.value;
  return user?.displayName || user?.username || user?.email || "当前用户";
});
const userInitial = computed(() => {
  return currentUserName.value.slice(0, 1).toUpperCase() || "U";
});
const sendButtonText = computed(() => {
  if (isStreaming.value) {
    return "停止生成";
  }

  return "发送";
});

function setNotice(message, type = "info") {
  noticeText.value = message;
  noticeType.value = type;
}

function formatSessionTime(value) {
  if (!value) {
    return "刚刚";
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
    ...(sameYear ? {} : { year: "numeric" })
  });
}

function mapVoteToFeedback(vote) {
  if (vote === 1) {
    return "like";
  }

  if (vote === -1) {
    return "dislike";
  }

  return null;
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
    feedback: mapVoteToFeedback(item?.vote),
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

function resizeComposer() {
  nextTick(() => {
    const textarea = textareaRef.value;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
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
  resizeComposer();
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
    thinking: "",
    thinkingDuration: 0,
    createdAt: new Date().toISOString(),
    feedback: null,
    status: "streaming",
    isThinking: deepThinkingEnabled.value
  };

  draft.value = "";
  resizeComposer();
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
  resizeComposer();
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

async function copyMessageContent(content) {
  if (!content) {
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    setNotice("回答内容已复制", "success");
  } catch {
    setNotice("复制失败，请手动选择文本", "error");
  }
}

async function submitFeedback(message, feedback) {
  if (!message?.id || message.id.startsWith("assistant-")) {
    return;
  }

  const previousFeedback = message.feedback || null;
  const nextFeedback = previousFeedback === feedback ? null : feedback;
  messages.value = messages.value.map((item) =>
    item.id === message.id
      ? {
          ...item,
          feedback: nextFeedback
        }
      : item
  );

  if (!nextFeedback) {
    setNotice("已取消反馈", "info");
    return;
  }

  try {
    await submitRagMessageFeedback(message.id, nextFeedback === "like" ? 1 : -1);
    setNotice(nextFeedback === "like" ? "已标记为有帮助" : "已标记为需改进", "success");
  } catch (error) {
    messages.value = messages.value.map((item) =>
      item.id === message.id
        ? {
            ...item,
            feedback: previousFeedback
          }
        : item
    );
    setNotice(error?.message || "反馈保存失败，请稍后重试", "error");
  }
}

function handleLogout() {
  clearStoredAuth();
  router.push("/login");
}

onMounted(async () => {
  await Promise.all([loadSuggestions(), loadSessions()]);
  focusComposer();
  resizeComposer();
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
      <div class="rag-brand">
        <div class="rag-brand__logo">R</div>
        <div>
          <strong>RAG 问答</strong>
          <span>Clean workspace</span>
        </div>
      </div>

      <div class="rag-topbar__actions">
        <button class="ghost-button" type="button" @click="router.push('/workspace')">工作台</button>
        <button class="ghost-button" type="button" @click="router.push('/admin')">后台管理</button>
        <div class="rag-user">
          <span class="rag-user__avatar">{{ userInitial }}</span>
          <div>
            <small>当前登录</small>
            <strong>{{ currentUserName }}</strong>
          </div>
        </div>
        <button class="ghost-button ghost-button--danger" type="button" @click="handleLogout">退出</button>
      </div>
    </header>

    <div class="rag-layout">
      <aside class="sidebar-card">
        <div class="sidebar-card__header">
          <div>
            <p class="sidebar-card__label">会话列表</p>
            <h2>历史会话</h2>
          </div>
          <button class="new-chat-button" type="button" @click="createConversation">新建</button>
        </div>

        <div class="sidebar-card__search">
          <span>{{ sessions.length }} 个会话</span>
          <span>{{ isStreaming ? "生成中" : "空闲" }}</span>
        </div>

        <div v-if="loadingSessions" class="panel-state">加载会话中...</div>

        <div v-else-if="sessions.length === 0" class="panel-state panel-state--compact">
          暂无会话，直接在右侧开始提问。
        </div>

        <ul v-else class="session-list">
          <li v-for="session in sessions" :key="session.id">
            <button
              type="button"
              :class="['session-item', { 'is-active': currentSessionId === session.id }]"
              @click="selectSession(session.id)"
            >
              <strong>{{ session.title }}</strong>
              <span>{{ formatSessionTime(session.lastTime) }}</span>
            </button>
            <button class="session-item__delete" type="button" @click="removeSession(session.id)">
              删除
            </button>
          </li>
        </ul>
      </aside>

      <main class="chat-card">
        <header class="chat-card__header">
          <div>
            <p class="chat-card__label">当前会话</p>
            <h1>{{ currentSessionTitle }}</h1>
            <p class="chat-card__desc">
              {{ activeSession ? "已进入历史会话，可继续追问。" : "新会话会在第一条问题发送后自动创建。" }}
            </p>
          </div>

          <button
            type="button"
            :class="['thinking-toggle', { 'is-active': deepThinkingEnabled }]"
            :disabled="isStreaming"
            @click="deepThinkingEnabled = !deepThinkingEnabled"
          >
            深度思考
          </button>
        </header>

        <div v-if="noticeText" :class="['notice-bar', `notice-bar--${noticeType}`]">
          {{ noticeText }}
        </div>

        <section class="chat-card__body">
          <div v-if="loadingMessages" class="panel-state panel-state--body">加载消息中...</div>

          <template v-else>
            <div v-if="!hasMessages" class="welcome-shell">
              <div class="welcome-box">
                <h3>今天想问点什么？</h3>
                <p>保留推荐问题、历史会话和流式回答，页面结构尽量贴近 `frontend` 的聊天工作区。</p>
              </div>

              <div class="suggestions-grid">
                <button
                  v-for="(item, index) in suggestions"
                  :key="`${item.title}-${index}`"
                  type="button"
                  class="suggestion-card"
                  @click="handleSuggestionClick(item.question)"
                >
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.description }}</small>
                  <span>{{ item.question }}</span>
                </button>
              </div>
            </div>

            <div v-else ref="messageScrollerRef" class="message-list">
              <article
                v-for="message in messages"
                :key="message.id"
                :class="['message-row', `message-row--${message.role}`]"
              >
                <div class="message-avatar">
                  {{ message.role === "user" ? userInitial : "AI" }}
                </div>

                <div :class="['message-bubble', `message-bubble--${message.role}`]">
                  <div class="message-bubble__meta">
                    <span>{{ message.role === "user" ? "我" : "RAG 助手" }}</span>
                    <time>{{ formatSessionTime(message.createdAt) }}</time>
                  </div>

                  <details
                    v-if="message.role === 'assistant' && message.thinking"
                    class="thinking-panel"
                  >
                    <summary>
                      <span>深度思考</span>
                      <strong v-if="message.thinkingDuration">{{ message.thinkingDuration }}s</strong>
                    </summary>
                    <pre>{{ message.thinking }}</pre>
                  </details>

                  <div
                    v-if="message.role === 'assistant' && message.status === 'streaming' && !message.content && !message.thinking"
                    class="message-loading"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <pre class="message-bubble__content">{{
                    message.content || (message.isThinking ? "正在深度思考..." : "")
                  }}</pre>

                  <p v-if="message.status === 'cancelled'" class="message-bubble__status">
                    已停止生成
                  </p>
                  <p
                    v-else-if="message.status === 'error'"
                    class="message-bubble__status message-bubble__status--error"
                  >
                    生成失败，请重试
                  </p>

                  <div
                    v-if="message.role === 'assistant' && message.status !== 'streaming' && message.content"
                    class="message-actions"
                  >
                    <button type="button" @click="copyMessageContent(message.content)">复制</button>
                    <button
                      type="button"
                      :class="{ 'is-active': message.feedback === 'like' }"
                      :disabled="message.id.startsWith('assistant-')"
                      @click="submitFeedback(message, 'like')"
                    >
                      有帮助
                    </button>
                    <button
                      type="button"
                      :class="{ 'is-active': message.feedback === 'dislike' }"
                      :disabled="message.id.startsWith('assistant-')"
                      @click="submitFeedback(message, 'dislike')"
                    >
                      需改进
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </template>
        </section>

        <footer class="composer">
          <div v-if="thinkingMessage" class="thinking-tip">深度思考中，正在生成推理内容...</div>

          <textarea
            ref="textareaRef"
            v-model="draft"
            class="composer__input"
            rows="2"
            :placeholder="
              deepThinkingEnabled
                ? '输入需要深度分析的问题...'
                : '输入你的问题，Enter 发送，Shift + Enter 换行'
            "
            @input="resizeComposer"
            @keydown="handleComposerKeydown"
          />

          <div class="composer__footer">
            <div class="composer__hint">
              <span>Enter 发送</span>
              <span>Shift + Enter 换行</span>
            </div>
            <button class="send-button" :class="{ 'is-stop': isStreaming }" type="button" @click="sendMessage">
              {{ sendButtonText }}
            </button>
          </div>
        </footer>
      </main>
    </div>
  </section>
</template>

<style scoped>
.rag-shell {
  min-height: 100vh;
  padding: 20px;
  background:
    linear-gradient(180deg, rgba(240, 245, 255, 0.95), rgba(250, 250, 250, 1)),
    #fafafa;
  color: #1f2937;
}

.rag-shell button,
.rag-shell textarea {
  font: inherit;
}

.rag-topbar,
.rag-layout {
  width: min(1440px, 100%);
  margin: 0 auto;
}

.rag-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.rag-brand,
.rag-topbar__actions,
.rag-user {
  display: flex;
  align-items: center;
}

.rag-brand {
  gap: 12px;
}

.rag-brand__logo {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #7c8fd8, #8fd3f4 70%, #f6b7a7);
  color: #fff;
  font-size: 24px;
  font-weight: 800;
}

.rag-brand strong,
.rag-brand span {
  display: block;
}

.rag-brand strong {
  font-size: 24px;
}

.rag-brand span,
.rag-user small,
.chat-card__desc,
.session-item span,
.suggestion-card small,
.suggestion-card span,
.message-bubble__meta,
.composer__hint,
.sidebar-card__search {
  color: #6b7280;
}

.rag-topbar__actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ghost-button,
.new-chat-button,
.thinking-toggle,
.send-button,
.message-actions button {
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.ghost-button {
  height: 40px;
  padding: 0 16px;
  background: #fff;
  color: #1f2937;
  cursor: pointer;
}

.ghost-button:hover {
  border-color: #93c5fd;
  color: #2563eb;
}

.ghost-button--danger:hover {
  border-color: #fecaca;
  color: #dc2626;
}

.rag-user {
  gap: 10px;
  min-height: 40px;
  padding: 4px 10px 4px 4px;
  border: 1px solid #dbe4ee;
  border-radius: 999px;
  background: #fff;
}

.rag-user__avatar,
.message-avatar {
  display: grid;
  place-items: center;
  font-weight: 700;
}

.rag-user__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #111827;
  color: #fff;
}

.rag-user strong {
  display: block;
  font-size: 13px;
}

.rag-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 116px);
}

.sidebar-card,
.chat-card {
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.sidebar-card {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.sidebar-card__header,
.chat-card__header,
.composer__footer,
.message-bubble__meta,
.message-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-card__header h2,
.chat-card__header h1,
.welcome-box h3 {
  margin: 0;
  color: #111827;
}

.sidebar-card__label,
.chat-card__label {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sidebar-card__header h2 {
  font-size: 26px;
}

.new-chat-button {
  height: 36px;
  padding: 0 14px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.new-chat-button:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.sidebar-card__search {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 12px 0 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.panel-state {
  display: grid;
  place-items: center;
  min-height: 120px;
  color: #6b7280;
  text-align: center;
}

.panel-state--compact {
  min-height: 180px;
}

.panel-state--body {
  min-height: 520px;
}

.session-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 10px;
  overflow: auto;
}

.session-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.session-item {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: #fafafa;
  text-align: left;
  cursor: pointer;
}

.session-item:hover {
  background: #f5f7fb;
}

.session-item.is-active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.session-item strong,
.session-item span {
  display: block;
}

.session-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #111827;
  font-size: 14px;
}

.session-item span {
  margin-top: 6px;
  font-size: 12px;
}

.session-item__delete {
  border: 0;
  background: transparent;
  color: #9ca3af;
  font-size: 12px;
  cursor: pointer;
}

.session-item__delete:hover {
  color: #ef4444;
}

.chat-card {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  min-height: calc(100vh - 116px);
  overflow: hidden;
}

.chat-card__header {
  padding: 24px 24px 18px;
  border-bottom: 1px solid #f3f4f6;
}

.chat-card__header h1 {
  font-size: 28px;
  line-height: 1.2;
}

.chat-card__desc {
  margin: 8px 0 0;
  line-height: 1.6;
}

.thinking-toggle {
  min-height: 40px;
  padding: 0 14px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
}

.thinking-toggle.is-active {
  border-color: #bfdbfe;
  background: #dbeafe;
  color: #2563eb;
}

.thinking-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.notice-bar {
  margin: 12px 24px 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
}

.notice-bar--info {
  background: #eff6ff;
  color: #1d4ed8;
}

.notice-bar--success {
  background: #ecfdf5;
  color: #047857;
}

.notice-bar--error {
  background: #fef2f2;
  color: #dc2626;
}

.chat-card__body {
  min-height: 0;
  background: #fff;
}

.welcome-shell {
  height: 100%;
  min-height: 540px;
  padding: 28px;
  display: grid;
  align-content: center;
  gap: 24px;
}

.welcome-box {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.welcome-box h3 {
  font-size: 38px;
  letter-spacing: -0.04em;
}

.welcome-box p {
  margin: 14px 0 0;
  color: #6b7280;
  line-height: 1.8;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.suggestion-card {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.suggestion-card:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.08);
}

.suggestion-card strong,
.suggestion-card small,
.suggestion-card span {
  display: block;
}

.suggestion-card strong {
  color: #111827;
  font-size: 16px;
}

.suggestion-card small {
  margin-top: 6px;
  font-size: 13px;
}

.suggestion-card span {
  margin-top: 14px;
  color: #374151;
  font-size: 13px;
  line-height: 1.6;
}

.message-list {
  height: 100%;
  min-height: 540px;
  max-height: 100%;
  padding: 24px;
  overflow-y: auto;
  background: #fff;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.message-row--user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.message-row--assistant .message-avatar {
  background: #dbeafe;
  color: #2563eb;
}

.message-bubble {
  max-width: min(820px, 88%);
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.message-bubble--user {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.message-bubble__meta {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
}

.message-bubble__content,
.thinking-panel pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
}

.thinking-panel {
  margin: 0 0 12px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  overflow: hidden;
  background: #f8fbff;
}

.thinking-panel summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.thinking-panel pre {
  padding: 0 14px 14px;
  color: #1d4ed8;
  font-size: 13px;
}

.message-loading {
  display: inline-flex;
  gap: 6px;
  margin-bottom: 8px;
}

.message-loading span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #60a5fa;
  animation: dotBounce 0.9s ease-in-out infinite;
}

.message-loading span:nth-child(2) {
  animation-delay: 0.15s;
}

.message-loading span:nth-child(3) {
  animation-delay: 0.3s;
}

.message-bubble__status {
  margin: 12px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.message-bubble__status--error {
  color: #dc2626;
}

.message-actions {
  flex-wrap: wrap;
  margin-top: 14px;
}

.message-actions button {
  height: 30px;
  padding: 0 10px;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
}

.message-actions button:hover:not(:disabled),
.message-actions button.is-active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.message-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.composer {
  padding: 16px 24px 20px;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.thinking-tip {
  margin-bottom: 10px;
  color: #2563eb;
  font-size: 13px;
}

.composer__input {
  width: 100%;
  min-height: 56px;
  max-height: 160px;
  resize: none;
  border: 1px solid #dbe4ee;
  border-radius: 16px;
  padding: 14px 16px;
  background: #fff;
  color: #111827;
  outline: none;
  line-height: 1.7;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.composer__input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(147, 197, 253, 0.18);
}

.composer__footer {
  margin-top: 12px;
}

.composer__hint {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}

.send-button {
  min-width: 108px;
  height: 40px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.send-button:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.send-button.is-stop {
  background: #dc2626;
  border-color: #dc2626;
}

@keyframes dotBounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@media (max-width: 1080px) {
  .rag-layout {
    grid-template-columns: 1fr;
  }

  .sidebar-card {
    max-height: none;
  }

  .session-list {
    max-height: 280px;
  }
}

@media (max-width: 768px) {
  .rag-shell {
    padding: 12px;
  }

  .rag-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .rag-topbar__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .chat-card__header,
  .composer__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .suggestions-grid {
    grid-template-columns: 1fr;
  }

  .message-avatar {
    display: none;
  }

  .message-bubble {
    max-width: 100%;
  }

  .send-button {
    width: 100%;
  }
}
</style>
