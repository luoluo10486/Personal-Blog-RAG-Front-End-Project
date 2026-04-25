<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getAdminDashboardOverview } from "../services/adminService";
import { clearStoredAuth, getStoredAuthUser } from "../utils/auth";

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const currentUser = ref(getStoredAuthUser());
const overview = ref(null);
const overviewLoading = ref(false);
const overviewError = ref("");
const shellRef = ref(null);
const viewportRef = ref(null);
const trackRef = ref(null);
const progress = ref(0);
const activeChapter = ref(0);
const animationContext = ref(null);

const chapters = [
  { key: "opening", label: "开卷" },
  { key: "rag", label: "问答" },
  { key: "admin", label: "管理" },
  { key: "choice", label: "去处" }
];

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

function scrollToChapter(index) {
  const trigger = ScrollTrigger.getById("workbench-horizontal-scroll");
  if (!trigger) {
    return;
  }

  const nextProgress = index / (chapters.length - 1);
  const nextScroll = trigger.start + (trigger.end - trigger.start) * nextProgress;
  window.scrollTo({
    top: nextScroll,
    behavior: "smooth"
  });
}

function handleLogout() {
  clearStoredAuth();
  router.push("/login");
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

function setupHorizontalStory() {
  animationContext.value?.revert();

  animationContext.value = gsap.context(() => {
    const track = trackRef.value;
    if (!track || !viewportRef.value || !shellRef.value) {
      return;
    }

    const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0);
    const chapterItems = gsap.utils.toArray(".chapter-marker");

    gsap.set(".story-copy, .floating-entry, .final-choice", {
      autoAlpha: 0,
      y: 36,
      filter: "blur(10px)"
    });
    gsap.set(".watercolor-focus", {
      filter: "blur(18px)",
      scale: 0.94,
      autoAlpha: 0.55,
      transformOrigin: "50% 50%"
    });
    gsap.set(".story-copy--opening", {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)"
    });

    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        id: "workbench-horizontal-scroll",
        trigger: shellRef.value,
        pin: viewportRef.value,
        scrub: 0.9,
        start: "top top",
        end: () => `+=${distance()}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress.value = self.progress;
          activeChapter.value = Math.min(
            chapters.length - 1,
            Math.round(self.progress * (chapters.length - 1))
          );
        }
      }
    });

    chapterItems.forEach((item) => {
      const chapter = item.dataset.chapter;
      const copy = `.story-copy--${chapter}`;

      gsap.to(copy, {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: item,
          containerAnimation: ScrollTrigger.getById("workbench-horizontal-scroll")?.animation,
          start: "left 72%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.utils.toArray(".watercolor-focus").forEach((item) => {
      gsap.to(item, {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
        ease: "power2.out",
        scrollTrigger: {
          trigger: item,
          containerAnimation: ScrollTrigger.getById("workbench-horizontal-scroll")?.animation,
          start: "left 78%",
          end: "left 34%",
          scrub: true
        }
      });
    });

    gsap.utils.toArray(".floating-entry, .final-choice").forEach((item) => {
      gsap.to(item, {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        ease: "power2.out",
        scrollTrigger: {
          trigger: item,
          containerAnimation: ScrollTrigger.getById("workbench-horizontal-scroll")?.animation,
          start: "left 68%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.to(".tree-canopy", {
      y: -16,
      scale: 1.02,
      duration: 4.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    gsap.to(".mist-layer", {
      x: 80,
      duration: 12,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, shellRef.value);

  ScrollTrigger.refresh();
}

onMounted(async () => {
  void loadOverview();
  await nextTick();
  setupHorizontalStory();
});

onBeforeUnmount(() => {
  animationContext.value?.revert();
  ScrollTrigger.getById("workbench-horizontal-scroll")?.kill();
});
</script>

<template>
  <section ref="shellRef" class="workbench-shell">
    <header class="gallery-nav">
      <button class="gallery-nav__brand" type="button" @click="scrollToChapter(0)">
        RAG 山水阁
      </button>
      <nav class="gallery-nav__links" aria-label="工作台章节">
        <button
          v-for="(chapter, index) in chapters"
          :key="chapter.key"
          type="button"
          :class="{ 'is-active': activeChapter === index }"
          @click="scrollToChapter(index)"
        >
          {{ chapter.label }}
        </button>
      </nav>
      <div class="gallery-nav__actions">
        <span>当前登录 {{ currentUserName }}</span>
        <button type="button" class="dark-button" @click="handleLogout">退出</button>
      </div>
    </header>

    <div ref="viewportRef" class="story-viewport">
      <div ref="trackRef" class="story-track">
        <section class="story-panel story-panel--opening">
          <div class="story-copy story-copy--opening">
            <p>RAG Landscape Workspace</p>
            <h1>
              <span>你从一棵</span>
              <span>水彩树开始</span>
            </h1>
            <strong>滚动鼠标，长卷会向左展开。</strong>
            <small>Scroll to explore</small>
          </div>

          <svg class="watercolor-tree watercolor-focus" viewBox="0 0 720 680" role="img" aria-label="水彩大树">
            <defs>
              <filter id="paper-noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="8" />
                <feColorMatrix type="saturate" values="0.35" />
                <feBlend mode="multiply" in2="SourceGraphic" />
              </filter>
              <filter id="soft-blur">
                <feGaussianBlur stdDeviation="8" />
              </filter>
              <radialGradient id="leaf-a" cx="42%" cy="36%" r="62%">
                <stop offset="0" stop-color="#c9dda0" stop-opacity="0.95" />
                <stop offset="0.48" stop-color="#73925e" stop-opacity="0.74" />
                <stop offset="1" stop-color="#35483a" stop-opacity="0.18" />
              </radialGradient>
              <radialGradient id="leaf-b" cx="58%" cy="44%" r="70%">
                <stop offset="0" stop-color="#a7c276" stop-opacity="0.82" />
                <stop offset="0.58" stop-color="#536d4e" stop-opacity="0.62" />
                <stop offset="1" stop-color="#223126" stop-opacity="0.2" />
              </radialGradient>
            </defs>
            <g class="mist-layer" opacity="0.42" filter="url(#soft-blur)">
              <path d="M70 472 C180 410 298 448 380 492 C480 548 604 520 690 456 L690 620 L70 620Z" fill="#ffffff" />
              <path d="M318 104 C420 44 560 88 616 180 C662 256 642 384 540 438 C412 506 238 450 196 314 C170 228 222 154 318 104Z" fill="#ffffff" opacity="0.55" />
            </g>
            <g class="tree-canopy" filter="url(#paper-noise)">
              <path d="M262 72 C332 26 472 44 520 120 C604 126 660 194 642 286 C700 362 626 456 526 454 C472 534 338 544 278 468 C184 482 104 416 124 316 C54 238 112 132 218 146 C224 114 236 90 262 72Z" fill="url(#leaf-a)" opacity="0.84" />
              <path d="M154 206 C208 126 306 128 356 196 C438 160 540 194 560 286 C630 330 614 424 524 444 C478 502 368 488 338 420 C260 460 160 414 174 318 C118 286 122 238 154 206Z" fill="url(#leaf-b)" opacity="0.72" />
              <circle cx="248" cy="232" r="92" fill="#d5e6ad" opacity="0.36" filter="url(#soft-blur)" />
              <circle cx="418" cy="248" r="118" fill="#406145" opacity="0.32" filter="url(#soft-blur)" />
              <circle cx="334" cy="384" r="108" fill="#5d7b55" opacity="0.32" filter="url(#soft-blur)" />
            </g>
            <g opacity="0.86">
              <path d="M354 286 C338 368 348 462 326 584" fill="none" stroke="#2d362d" stroke-width="28" stroke-linecap="round" />
              <path d="M354 318 C292 268 246 218 196 158" fill="none" stroke="#5e6c5c" stroke-width="22" stroke-linecap="round" opacity="0.82" />
              <path d="M374 330 C430 252 496 194 560 130" fill="none" stroke="#4c5d4e" stroke-width="22" stroke-linecap="round" opacity="0.82" />
              <ellipse cx="386" cy="610" rx="206" ry="34" fill="#747a70" opacity="0.18" filter="url(#soft-blur)" />
            </g>
          </svg>

          <span class="chapter-marker" data-chapter="opening" />
          <p class="open-note">• Open the landscape</p>
        </section>

        <section class="story-panel story-panel--rag">
          <div class="story-copy story-copy--rag">
            <p>RAG Chat</p>
            <h1>
              <span>当你发问</span>
              <span>万卷回应</span>
            </h1>
            <strong>进入知识问答空间，展开历史会话、流式回答与深度思考。</strong>
            <small>Click to open</small>
          </div>

          <svg class="watercolor-cow watercolor-focus" viewBox="0 0 680 430" role="img" aria-label="水彩牛与草地">
            <defs>
              <filter id="cow-blur">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <linearGradient id="grass" x1="0" x2="1">
                <stop offset="0" stop-color="#c7d9a0" stop-opacity="0.24" />
                <stop offset="0.45" stop-color="#9cb96e" stop-opacity="0.72" />
                <stop offset="1" stop-color="#78985d" stop-opacity="0.2" />
              </linearGradient>
            </defs>
            <path d="M84 282 C190 220 310 244 410 290 C506 336 598 318 650 280 C642 374 170 382 84 282Z" fill="#fff" opacity="0.72" filter="url(#cow-blur)" />
            <ellipse cx="364" cy="350" rx="290" ry="26" fill="url(#grass)" />
            <g opacity="0.86">
              <ellipse cx="330" cy="206" rx="128" ry="66" fill="#5d675d" />
              <circle cx="432" cy="194" r="58" fill="#4d584f" opacity="0.62" />
              <circle cx="512" cy="202" r="56" fill="#26332b" />
              <circle cx="236" cy="194" r="46" fill="#fbfbf0" />
              <rect x="282" y="250" width="24" height="108" rx="12" fill="#414d43" />
              <rect x="438" y="250" width="24" height="108" rx="12" fill="#414d43" />
            </g>
          </svg>

          <button class="floating-entry floating-entry--rag" type="button" @click="router.push('/rag')">
            打开 RAG 问答
          </button>
          <span class="chapter-marker" data-chapter="rag" />
          <p class="open-note">• Open the RAG chat</p>
        </section>

        <section class="story-panel story-panel--admin">
          <div class="story-copy story-copy--admin">
            <p>Admin Console</p>
            <h1>
              <span>数据有序</span>
              <span>诸事归档</span>
            </h1>
            <strong>进入后台管理页面，查看知识库、链路追踪、系统配置与用户概览。</strong>
            <small>Click to open</small>
          </div>

          <svg class="watercolor-village watercolor-focus" viewBox="0 0 920 430" role="img" aria-label="水彩村落">
            <defs>
              <filter id="village-soft">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>
            <path d="M70 310 C194 246 314 260 440 300 C590 348 760 330 874 274 L874 386 L70 386Z" fill="#fff" opacity="0.74" filter="url(#village-soft)" />
            <path d="M88 324 C252 292 550 292 854 326" stroke="#aeca78" stroke-width="28" stroke-linecap="round" opacity="0.62" />
            <g opacity="0.82">
              <path d="M280 246 L350 184 L430 246Z" fill="#756f60" />
              <rect x="300" y="246" width="110" height="72" fill="#c9b992" />
              <path d="M410 250 L486 192 L570 250Z" fill="#675f52" />
              <rect x="432" y="250" width="116" height="76" fill="#d4c4a0" />
              <path d="M552 262 L620 210 L700 262Z" fill="#7f7662" />
              <rect x="574" y="262" width="108" height="62" fill="#c2b28f" />
              <rect x="506" y="280" width="18" height="68" rx="9" fill="#5a8d98" />
              <circle cx="515" cy="268" r="11" fill="#d8b58b" />
            </g>
            <g opacity="0.42" filter="url(#village-soft)">
              <circle cx="720" cy="210" r="66" fill="#78905f" />
              <circle cx="198" cy="240" r="58" fill="#9eb878" />
              <circle cx="760" cy="238" r="48" fill="#4d624b" />
            </g>
          </svg>

          <button class="floating-entry floating-entry--admin" type="button" @click="router.push('/admin')">
            打开后台管理
          </button>
          <span class="chapter-marker" data-chapter="admin" />
          <p class="open-note">• Open the admin console</p>
        </section>

        <section class="story-panel story-panel--choice">
          <div class="story-copy story-copy--choice">
            <p>Choose Your Path</p>
            <h1>
              <span>长卷已开</span>
              <span>请选择去处</span>
            </h1>
            <strong>从这张水彩长卷进入你的知识空间。</strong>
            <small>Final choice</small>
          </div>

          <svg class="watercolor-island watercolor-focus" viewBox="0 0 900 460" role="img" aria-label="水彩田园">
            <defs>
              <filter id="island-soft">
                <feGaussianBlur stdDeviation="2.4" />
              </filter>
            </defs>
            <path d="M88 314 C210 224 328 258 438 312 C536 360 668 328 802 260 L830 344 C612 412 300 410 88 314Z" fill="#fff" opacity="0.78" filter="url(#island-soft)" />
            <path d="M152 308 C282 260 464 258 604 300" stroke="#acd075" stroke-width="42" stroke-linecap="round" opacity="0.72" />
            <g opacity="0.72">
              <circle cx="602" cy="220" r="64" fill="#6f8e5e" filter="url(#island-soft)" />
              <circle cx="688" cy="216" r="78" fill="#57734f" filter="url(#island-soft)" />
              <path d="M574 274 L636 226 L708 274Z" fill="#9f7c56" />
              <rect x="596" y="274" width="96" height="48" fill="#d4bd91" />
              <circle cx="248" cy="306" r="18" fill="#f2f2de" />
              <circle cx="278" cy="310" r="14" fill="#e8e8d2" />
            </g>
          </svg>

          <div class="final-choice">
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
          <span class="chapter-marker" data-chapter="choice" />
          <p class="open-note">• Choose one entrance</p>
        </section>
      </div>

      <div class="progress-line" aria-hidden="true">
        <span :style="{ width: `${progress * 100}%` }" />
      </div>
    </div>

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
  min-height: 100vh;
  color: #151914;
  background:
    radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.96), transparent 28%),
    linear-gradient(180deg, #f5f5f1 0%, #e8e9e3 100%);
}

.workbench-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(185, 190, 180, 0.2) 1px, transparent 1px),
    linear-gradient(180deg, rgba(185, 190, 180, 0.14) 1px, transparent 1px);
  background-size: 44px 44px;
}

.gallery-nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  height: 52px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 34px;
  align-items: center;
  font-size: 12px;
  mix-blend-mode: multiply;
}

.gallery-nav button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.gallery-nav__brand {
  font-family: Georgia, "Times New Roman", "STSong", serif;
  font-size: 18px !important;
}

.gallery-nav__links {
  display: flex;
  gap: 28px;
  align-items: center;
}

.gallery-nav__links button {
  color: #6b6d65;
}

.gallery-nav__links button.is-active,
.gallery-nav__links button:hover {
  color: #11140f;
}

.gallery-nav__actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.dark-button {
  height: 28px;
  padding: 0 14px;
  background: #0d0d0b !important;
  color: #fff !important;
}

.story-viewport {
  position: relative;
  z-index: 1;
  height: 100vh;
  overflow: hidden;
}

.story-track {
  height: 100%;
  width: max-content;
  display: flex;
  will-change: transform;
}

.story-panel {
  position: relative;
  flex: 0 0 100vw;
  height: 100vh;
  overflow: hidden;
}

.story-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 56% 48%, rgba(255, 255, 255, 0.72), transparent 30%),
    radial-gradient(ellipse at 72% 82%, rgba(170, 174, 164, 0.16), transparent 34%);
}

.story-copy {
  position: absolute;
  left: 10.6vw;
  top: 31vh;
  z-index: 8;
  width: min(370px, 30vw);
}

.story-copy p {
  margin: 0 0 14px;
  color: #777a70;
  font-size: 13px;
}

.story-copy h1 {
  margin: 0;
  color: #111611;
  font-family: Georgia, "Times New Roman", "STSong", serif;
  font-size: clamp(38px, 4.5vw, 68px);
  font-weight: 400;
  line-height: 1.06;
  letter-spacing: -0.045em;
}

.story-copy h1 span,
.story-copy strong,
.story-copy small {
  display: block;
}

.story-copy strong {
  margin-top: 18px;
  color: #30342f;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.68;
}

.story-copy small {
  margin-top: 24px;
  color: #171a16;
  font-size: 12px;
}

.watercolor-tree {
  position: absolute;
  left: 35vw;
  top: 9vh;
  z-index: 4;
  width: min(720px, 52vw);
  height: auto;
}

.watercolor-cow {
  position: absolute;
  left: 38vw;
  bottom: 8vh;
  z-index: 4;
  width: min(680px, 50vw);
}

.watercolor-village {
  position: absolute;
  left: 34vw;
  bottom: 9vh;
  z-index: 4;
  width: min(920px, 62vw);
}

.watercolor-island {
  position: absolute;
  left: 34vw;
  bottom: 9vh;
  z-index: 4;
  width: min(900px, 62vw);
}

.floating-entry {
  position: absolute;
  z-index: 9;
  right: 13vw;
  top: 45vh;
  border: 0;
  border-bottom: 1px solid #141711;
  padding: 0 0 4px;
  background: transparent;
  color: #141711;
  font-size: 13px;
  cursor: pointer;
}

.final-choice {
  position: absolute;
  left: 10.6vw;
  bottom: 14vh;
  z-index: 10;
  display: flex;
  gap: 18px;
}

.final-choice button {
  width: 220px;
  padding: 22px;
  border: 1px solid rgba(70, 76, 61, 0.16);
  border-radius: 22px;
  background: rgba(255, 255, 250, 0.74);
  box-shadow: 0 22px 48px rgba(78, 82, 70, 0.12);
  backdrop-filter: blur(12px);
  cursor: pointer;
  text-align: left;
}

.final-choice span,
.final-choice strong,
.final-choice small {
  display: block;
}

.final-choice span {
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  border: 1px solid rgba(154, 47, 40, 0.64);
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #9a2f28;
}

.final-choice strong {
  color: #111611;
  font-size: 18px;
}

.final-choice small {
  margin-top: 8px;
  color: #686a62;
}

.open-note {
  position: absolute;
  right: 12vw;
  top: 47vh;
  z-index: 8;
  color: #282c26;
  font-size: 12px;
}

.chapter-marker {
  position: absolute;
  left: 52vw;
  top: 50vh;
  width: 1px;
  height: 1px;
}

.progress-line {
  position: fixed;
  right: 28px;
  bottom: 24px;
  z-index: 40;
  width: 48px;
  height: 1px;
  background: rgba(20, 22, 19, 0.2);
}

.progress-line span {
  display: block;
  height: 100%;
  background: rgba(20, 22, 19, 0.76);
}

.overview-strip {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 25;
  display: flex;
  gap: 10px;
  opacity: 0.72;
}

.overview-strip article {
  min-width: 58px;
  padding: 8px 10px;
  border: 1px solid rgba(70, 76, 61, 0.12);
  background: rgba(255, 255, 250, 0.58);
  backdrop-filter: blur(8px);
}

.overview-strip span,
.overview-strip strong {
  display: block;
}

.overview-strip span {
  color: #686a62;
  font-size: 11px;
}

.overview-strip strong {
  color: #111611;
  font-size: 16px;
}

.inline-notice {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 40;
  transform: translateX(-50%);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(154, 47, 40, 0.16);
  background: rgba(245, 230, 220, 0.82);
  color: #8f3a32;
  font-size: 12px;
}

@media (max-width: 900px) {
  .gallery-nav {
    gap: 12px;
  }

  .gallery-nav__links,
  .overview-strip {
    display: none;
  }

  .story-copy {
    left: 8vw;
    top: 17vh;
    width: 84vw;
  }

  .watercolor-tree,
  .watercolor-cow,
  .watercolor-village,
  .watercolor-island {
    left: 16vw;
    top: auto;
    bottom: 12vh;
    width: 78vw;
  }

  .final-choice {
    left: 8vw;
    right: 8vw;
    flex-direction: column;
  }

  .final-choice button {
    width: 100%;
  }
}
</style>
