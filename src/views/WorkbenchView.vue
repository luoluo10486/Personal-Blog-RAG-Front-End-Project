<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getAdminDashboardOverview } from "../services/adminService";
import { clearStoredAuth, getStoredAuthUser } from "../utils/auth";

const router = useRouter();
const currentUser = ref(getStoredAuthUser());
const overview = ref(null);
const overviewLoading = ref(false);
const overviewError = ref("");
const scrollRootRef = ref(null);
const trackRef = ref(null);
const horizontalOffset = ref(0);
const activePanel = ref(0);
const scrollProgress = ref(0);

const panels = [
  {
    key: "opening",
    eyebrow: "RAG Landscape Workspace",
    title: ["你从一片", "山色开始"],
    body: "滚动鼠标，长卷会向左展开；问答与管理入口会像水彩风景一样逐段涌现。",
    note: "Scroll to explore",
    variant: "tree",
    action: "展开长卷"
  },
  {
    key: "rag",
    eyebrow: "RAG Chat",
    title: ["当你发问", "万卷回应"],
    body: "进入 RAG 问答页面，保留历史会话、流式回答、深度思考与推荐问题。",
    note: "Open the RAG chat",
    variant: "cow",
    action: "进入 RAG 问答",
    to: "/rag"
  },
  {
    key: "admin",
    eyebrow: "Admin Console",
    title: ["让数据", "各归其位"],
    body: "进入后台管理页面，查看知识库、链路追踪、示例问题、系统配置与用户概览。",
    note: "Open the admin console",
    variant: "village",
    action: "进入后台管理",
    to: "/admin"
  },
  {
    key: "choice",
    eyebrow: "Choose Your Path",
    title: ["山水已开", "请选择去处"],
    body: "从这张长卷进入你的知识空间：向左是问答，向右是治理。",
    note: "Click to enter",
    variant: "landscape"
  }
];

let ticking = false;

const currentUserName = computed(() => {
  const user = currentUser.value;
  return user?.displayName || user?.username || user?.email || "当前用户";
});

const stats = computed(() => {
  const kpis = overview.value?.kpis;

  return [
    { label: "用户", value: kpis?.totalUsers?.value ?? "--" },
    { label: "活跃", value: kpis?.activeUsers?.value ?? "--" },
    { label: "会话", value: kpis?.totalSessions?.value ?? "--" },
    { label: "消息", value: kpis?.totalMessages?.value ?? "--" }
  ];
});

const scrollRootHeight = computed(() => `${panels.length * 120}vh`);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateHorizontalScroll() {
  ticking = false;

  const root = scrollRootRef.value;
  const track = trackRef.value;
  if (!root || !track) {
    return;
  }

  const maxVertical = Math.max(root.offsetHeight - window.innerHeight, 1);
  const maxHorizontal = Math.max(track.scrollWidth - window.innerWidth, 0);
  const rootTop = root.getBoundingClientRect().top;
  const nextProgress = clamp(-rootTop / maxVertical, 0, 1);

  scrollProgress.value = nextProgress;
  horizontalOffset.value = nextProgress * maxHorizontal;
  activePanel.value = clamp(Math.round(nextProgress * (panels.length - 1)), 0, panels.length - 1);
}

function requestHorizontalUpdate() {
  if (ticking) {
    return;
  }

  ticking = true;
  requestAnimationFrame(updateHorizontalScroll);
}

function scrollToPanel(index) {
  const root = scrollRootRef.value;
  if (!root) {
    return;
  }

  const maxVertical = Math.max(root.offsetHeight - window.innerHeight, 1);
  const rootTop = root.getBoundingClientRect().top + window.scrollY;
  const nextTop = rootTop + (index / (panels.length - 1)) * maxVertical;

  window.scrollTo({
    top: nextTop,
    behavior: "smooth"
  });
}

function handlePanelAction(panel, index) {
  if (panel.to) {
    router.push(panel.to);
    return;
  }

  scrollToPanel(Math.min(index + 1, panels.length - 1));
}

async function loadOverview() {
  overviewLoading.value = true;
  overviewError.value = "";

  try {
    overview.value = await getAdminDashboardOverview();
  } catch (error) {
    overviewError.value = error?.message || "后台概览加载失败，请稍后重试";
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
  updateHorizontalScroll();
  window.addEventListener("scroll", requestHorizontalUpdate, { passive: true });
  window.addEventListener("resize", requestHorizontalUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", requestHorizontalUpdate);
  window.removeEventListener("resize", requestHorizontalUpdate);
});
</script>

<template>
  <section class="workbench-shell">
    <header class="art-nav">
      <button class="art-nav__brand" type="button" @click="scrollToPanel(0)">
        <strong>RAG 山水阁</strong>
      </button>

      <nav class="art-nav__links" aria-label="工作台导航">
        <button type="button" @click="scrollToPanel(0)">Home</button>
        <button type="button" @click="scrollToPanel(1)">RAG 问答</button>
        <button type="button" @click="scrollToPanel(2)">后台管理</button>
      </nav>

      <div class="art-nav__actions">
        <span class="signed-user">当前登录 {{ currentUserName }}</span>
        <button type="button" class="subscribe-button" @click="handleLogout">退出</button>
      </div>
    </header>

    <main ref="scrollRootRef" class="horizontal-scroll" :style="{ height: scrollRootHeight }">
      <div class="scroll-viewport">
        <div
          ref="trackRef"
          class="landscape-track"
          :style="{ transform: `translate3d(${-horizontalOffset}px, 0, 0)` }"
        >
          <section
            v-for="(panel, index) in panels"
            :key="panel.key"
            :class="[
              'landscape-panel',
              `landscape-panel--${panel.variant}`,
              {
                'is-active': activePanel === index,
                'is-passed': activePanel > index
              }
            ]"
          >
            <div class="panel-copy">
              <p class="panel-copy__eyebrow">{{ panel.eyebrow }}</p>
              <h1>
                <span v-for="line in panel.title" :key="line">{{ line }}</span>
              </h1>
              <p>{{ panel.body }}</p>
              <button type="button" class="panel-action" @click="handlePanelAction(panel, index)">
                {{ panel.action || "继续探索" }}
              </button>
            </div>

            <div class="watercolor-world" aria-hidden="true">
              <div v-if="panel.variant === 'tree'" class="watercolor-tree">
                <span class="tree-leaf tree-leaf--a" />
                <span class="tree-leaf tree-leaf--b" />
                <span class="tree-leaf tree-leaf--c" />
                <span class="tree-leaf tree-leaf--d" />
                <span class="tree-leaf tree-leaf--e" />
                <span class="tree-trunk" />
                <span class="tree-shadow" />
              </div>

              <div v-if="panel.variant === 'cow'" class="cow-scene">
                <span class="paper-patch paper-patch--left" />
                <span class="cow-body" />
                <span class="cow-head" />
                <span class="cow-leg cow-leg--a" />
                <span class="cow-leg cow-leg--b" />
                <span class="grass-strip" />
              </div>

              <div v-if="panel.variant === 'village'" class="village-scene">
                <span class="paper-patch paper-patch--wide" />
                <span class="house house--one" />
                <span class="house house--two" />
                <span class="house house--three" />
                <span class="tiny-person" />
                <span class="meadow" />
              </div>

              <div v-if="panel.variant === 'landscape'" class="final-landscape">
                <span class="island island--left" />
                <span class="island island--right" />
                <span class="small-sheep" />
                <span class="flower-bank" />
              </div>
            </div>

            <button
              v-if="panel.to"
              class="floating-entry"
              type="button"
              @click="router.push(panel.to)"
            >
              {{ panel.to === "/rag" ? "打开 RAG 问答" : "打开后台管理" }}
            </button>

            <div v-if="panel.key === 'choice'" class="choice-card">
              <button type="button" @click="router.push('/rag')">
                <span>问</span>
                <strong>RAG 问答</strong>
                <small>进入知识问答</small>
              </button>
              <button type="button" @click="router.push('/admin')">
                <span>管</span>
                <strong>后台管理</strong>
                <small>进入治理后台</small>
              </button>
            </div>

            <p class="open-landscape">• {{ panel.note }}</p>
          </section>
        </div>

        <div class="progress-mark" aria-hidden="true">
          <span :style="{ width: `${scrollProgress * 100}%` }" />
        </div>
      </div>
    </main>

    <aside class="overview-strip" aria-label="系统概览">
      <article v-for="item in stats" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ overviewLoading ? "..." : item.value }}</strong>
      </article>
    </aside>

    <p v-if="overviewError" class="inline-notice">{{ overviewError }}</p>
  </section>
</template>

<style scoped>
.workbench-shell {
  position: relative;
  min-height: 100vh;
  color: #161916;
  background:
    radial-gradient(circle at 82% 24%, rgba(255, 255, 255, 0.94), transparent 30%),
    linear-gradient(180deg, #f4f4f0 0%, #e8e9e3 100%);
}

.workbench-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 42% 52%, rgba(255, 255, 255, 0.64), transparent 42%),
    linear-gradient(90deg, rgba(200, 203, 194, 0.24) 1px, transparent 1px),
    linear-gradient(180deg, rgba(200, 203, 194, 0.16) 1px, transparent 1px);
  background-size: auto, 42px 42px, 42px 42px;
  opacity: 0.76;
}

.art-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: 50px;
  padding: 0 18px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 34px;
  color: #111;
  font-size: 12px;
  mix-blend-mode: multiply;
}

.art-nav button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.art-nav__brand strong {
  font-family: Georgia, "Times New Roman", "STSong", serif;
  font-size: 18px;
  font-weight: 500;
}

.art-nav__links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.art-nav__links button {
  color: #65665f;
}

.art-nav__links button:hover {
  color: #111;
}

.art-nav__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.signed-user {
  color: #30302c;
}

.subscribe-button {
  height: 28px;
  padding: 0 14px;
  background: #0d0d0b !important;
  color: #fff !important;
}

.horizontal-scroll {
  position: relative;
  z-index: 1;
}

.scroll-viewport {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.landscape-track {
  height: 100%;
  display: flex;
  width: max-content;
  will-change: transform;
}

.landscape-panel {
  position: relative;
  flex: 0 0 100vw;
  height: 100vh;
  overflow: hidden;
}

.landscape-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 56% 48%, rgba(255, 255, 255, 0.7), transparent 28%),
    radial-gradient(ellipse at 68% 78%, rgba(180, 183, 172, 0.16), transparent 30%);
  opacity: 0.9;
}

.panel-copy {
  position: absolute;
  left: 10.5vw;
  top: 32vh;
  z-index: 5;
  width: min(360px, 30vw);
  opacity: 0.34;
  transform: translateX(-24px);
  transition: opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease;
  filter: blur(1.5px);
}

.landscape-panel.is-active .panel-copy {
  opacity: 1;
  transform: translateX(0);
  filter: blur(0);
}

.landscape-panel.is-passed .panel-copy {
  opacity: 0.22;
}

.panel-copy__eyebrow {
  margin: 0 0 12px;
  color: #6d6f67;
  font-size: 13px;
}

.panel-copy h1 {
  margin: 0;
  color: #0f1511;
  font-family: Georgia, "Times New Roman", "STSong", serif;
  font-size: clamp(34px, 4.1vw, 62px);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.panel-copy h1 span {
  display: block;
}

.panel-copy p:not(.panel-copy__eyebrow) {
  margin: 18px 0 0;
  color: #2f332d;
  font-size: 17px;
  line-height: 1.65;
}

.panel-action {
  margin-top: 28px;
  border: 0;
  border-bottom: 1px solid #161916;
  padding: 0 0 4px;
  background: transparent;
  color: #161916;
  font-size: 13px;
  cursor: pointer;
}

.watercolor-world {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.watercolor-tree {
  position: absolute;
  left: 37vw;
  top: 12vh;
  width: 440px;
  height: 560px;
  transform: rotate(-2deg);
  filter: saturate(0.82) contrast(0.94);
}

.tree-leaf {
  position: absolute;
  border-radius: 46% 54% 48% 52%;
  background:
    radial-gradient(circle at 30% 30%, rgba(185, 215, 124, 0.85), transparent 26%),
    radial-gradient(circle at 64% 40%, rgba(96, 135, 72, 0.78), transparent 32%),
    radial-gradient(circle at 48% 68%, rgba(56, 83, 57, 0.7), transparent 38%);
  filter: blur(1.4px);
  opacity: 0.88;
}

.tree-leaf--a {
  width: 310px;
  height: 250px;
  left: 72px;
  top: 16px;
}

.tree-leaf--b {
  width: 260px;
  height: 280px;
  left: 12px;
  top: 92px;
  transform: rotate(-20deg);
}

.tree-leaf--c {
  width: 280px;
  height: 300px;
  right: 16px;
  top: 104px;
  transform: rotate(18deg);
}

.tree-leaf--d {
  width: 250px;
  height: 220px;
  left: 98px;
  top: 220px;
  opacity: 0.72;
}

.tree-leaf--e {
  width: 150px;
  height: 180px;
  right: 18px;
  top: 330px;
  opacity: 0.5;
}

.tree-trunk {
  position: absolute;
  left: 214px;
  top: 236px;
  width: 38px;
  height: 250px;
  border-radius: 40% 60% 30% 70%;
  background:
    linear-gradient(110deg, rgba(67, 66, 47, 0.8), rgba(30, 37, 29, 0.9) 55%, rgba(106, 101, 72, 0.55));
  filter: blur(0.6px);
}

.tree-trunk::before,
.tree-trunk::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 180px;
  background: rgba(34, 43, 34, 0.62);
  border-radius: 999px;
  transform-origin: bottom center;
}

.tree-trunk::before {
  left: -28px;
  top: -96px;
  transform: rotate(-34deg);
}

.tree-trunk::after {
  right: -34px;
  top: -84px;
  transform: rotate(34deg);
}

.tree-shadow {
  position: absolute;
  left: 160px;
  bottom: 36px;
  width: 260px;
  height: 44px;
  border-radius: 50%;
  background: rgba(90, 94, 83, 0.22);
  filter: blur(10px);
}

.cow-scene {
  position: absolute;
  left: 46vw;
  bottom: 12vh;
  width: 500px;
  height: 300px;
}

.paper-patch {
  position: absolute;
  border-radius: 42% 58% 47% 53%;
  background: rgba(255, 255, 255, 0.78);
  filter: blur(1px);
}

.paper-patch--left {
  left: -68px;
  bottom: 24px;
  width: 300px;
  height: 150px;
  transform: rotate(8deg);
}

.cow-body {
  position: absolute;
  left: 92px;
  top: 80px;
  width: 180px;
  height: 92px;
  border-radius: 48% 42% 42% 52%;
  background:
    radial-gradient(circle at 32% 38%, #f7f7ef 0 18%, transparent 19%),
    radial-gradient(circle at 68% 45%, #2f3831 0 22%, transparent 23%),
    linear-gradient(135deg, #5c665c, #252d28);
  filter: blur(0.6px);
  opacity: 0.8;
}

.cow-head {
  position: absolute;
  left: 248px;
  top: 96px;
  width: 58px;
  height: 54px;
  border-radius: 48%;
  background: #333c35;
  filter: blur(0.5px);
}

.cow-leg {
  position: absolute;
  top: 160px;
  width: 16px;
  height: 82px;
  border-radius: 999px;
  background: rgba(35, 42, 37, 0.8);
}

.cow-leg--a {
  left: 122px;
}

.cow-leg--b {
  left: 232px;
}

.grass-strip,
.meadow {
  position: absolute;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(144, 177, 91, 0.64), rgba(95, 133, 63, 0.48));
  filter: blur(1px);
}

.grass-strip {
  left: 30px;
  bottom: 38px;
  width: 350px;
}

.village-scene {
  position: absolute;
  left: 43vw;
  bottom: 12vh;
  width: 700px;
  height: 340px;
}

.paper-patch--wide {
  left: -30px;
  bottom: 42px;
  width: 630px;
  height: 190px;
  transform: rotate(-3deg);
}

.house {
  position: absolute;
  bottom: 114px;
  width: 130px;
  height: 74px;
  background: rgba(205, 191, 157, 0.76);
  filter: blur(0.5px);
}

.house::before {
  content: "";
  position: absolute;
  left: -8px;
  right: -8px;
  top: -34px;
  height: 42px;
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
  background: rgba(110, 102, 82, 0.72);
}

.house--one {
  left: 140px;
}

.house--two {
  left: 268px;
  bottom: 126px;
  transform: scale(0.88);
}

.house--three {
  left: 390px;
  transform: scale(0.78);
}

.tiny-person {
  position: absolute;
  left: 472px;
  bottom: 96px;
  width: 16px;
  height: 54px;
  border-radius: 999px;
  background: rgba(59, 111, 118, 0.72);
}

.meadow {
  left: 78px;
  bottom: 70px;
  width: 560px;
}

.final-landscape {
  position: absolute;
  right: 10vw;
  bottom: 13vh;
  width: 760px;
  height: 360px;
}

.island {
  position: absolute;
  border-radius: 46% 54% 40% 60%;
  background:
    radial-gradient(circle at 42% 28%, rgba(104, 145, 76, 0.78), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(196, 183, 150, 0.54));
  filter: blur(0.8px);
}

.island--left {
  left: 40px;
  bottom: 58px;
  width: 360px;
  height: 180px;
}

.island--right {
  right: 20px;
  bottom: 112px;
  width: 310px;
  height: 160px;
}

.small-sheep {
  position: absolute;
  left: 322px;
  bottom: 108px;
  width: 38px;
  height: 22px;
  border-radius: 50%;
  background: rgba(235, 235, 220, 0.92);
  box-shadow: 18px 4px 0 rgba(235, 235, 220, 0.76);
}

.flower-bank {
  position: absolute;
  right: 54px;
  bottom: 54px;
  width: 170px;
  height: 54px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 20% 45%, rgba(176, 84, 84, 0.72), transparent 16%),
    radial-gradient(circle at 45% 36%, rgba(189, 93, 110, 0.68), transparent 16%),
    radial-gradient(circle at 70% 50%, rgba(144, 177, 91, 0.72), transparent 22%);
  filter: blur(1px);
}

.floating-entry {
  position: absolute;
  right: 18vw;
  top: 42vh;
  z-index: 8;
  border: 0;
  border-bottom: 1px solid #171a16;
  background: transparent;
  color: #171a16;
  font-size: 13px;
  cursor: pointer;
  opacity: 0;
  transform: translateX(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.landscape-panel.is-active .floating-entry {
  opacity: 1;
  transform: translateX(0);
}

.choice-card {
  position: absolute;
  left: 13vw;
  bottom: 15vh;
  z-index: 9;
  display: flex;
  gap: 18px;
}

.choice-card button {
  width: 210px;
  padding: 22px;
  border: 1px solid rgba(80, 84, 75, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 250, 0.76);
  box-shadow: 0 22px 48px rgba(78, 82, 70, 0.12);
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(12px);
}

.choice-card span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  border: 1px solid rgba(154, 47, 40, 0.6);
  border-radius: 10px;
  color: #9a2f28;
}

.choice-card strong,
.choice-card small {
  display: block;
}

.choice-card strong {
  color: #131713;
  font-size: 18px;
}

.choice-card small {
  margin-top: 8px;
  color: #65665f;
}

.open-landscape {
  position: absolute;
  right: 12vw;
  top: 48vh;
  z-index: 6;
  color: #2c302b;
  font-size: 12px;
}

.progress-mark {
  position: fixed;
  right: 26px;
  bottom: 24px;
  z-index: 30;
  width: 46px;
  height: 1px;
  background: rgba(20, 22, 19, 0.2);
}

.progress-mark span {
  display: block;
  height: 100%;
  background: rgba(20, 22, 19, 0.72);
}

.overview-strip {
  position: fixed;
  left: 18px;
  bottom: 18px;
  z-index: 20;
  display: flex;
  gap: 12px;
  opacity: 0.78;
}

.overview-strip article {
  min-width: 62px;
  padding: 8px 10px;
  border: 1px solid rgba(80, 84, 75, 0.16);
  background: rgba(255, 255, 250, 0.6);
  backdrop-filter: blur(8px);
}

.overview-strip span,
.overview-strip strong {
  display: block;
}

.overview-strip span {
  color: #65665f;
  font-size: 11px;
}

.overview-strip strong {
  color: #151915;
  font-size: 16px;
  line-height: 1.2;
}

.inline-notice {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 30;
  transform: translateX(-50%);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(154, 47, 40, 0.16);
  background: rgba(245, 230, 220, 0.82);
  color: #8f3a32;
  font-size: 12px;
}

@media (max-width: 980px) {
  .art-nav {
    gap: 14px;
  }

  .art-nav__links {
    display: none;
  }

  .panel-copy {
    left: 8vw;
    top: 18vh;
    width: min(420px, 82vw);
  }

  .watercolor-tree {
    left: 28vw;
    top: 28vh;
    transform: scale(0.78);
  }

  .cow-scene,
  .village-scene,
  .final-landscape {
    left: 18vw;
    right: auto;
    transform: scale(0.78);
    transform-origin: left bottom;
  }

  .choice-card {
    left: 8vw;
    right: 8vw;
    bottom: 10vh;
    flex-direction: column;
  }

  .choice-card button {
    width: 100%;
  }

  .overview-strip {
    display: none;
  }
}
</style>
