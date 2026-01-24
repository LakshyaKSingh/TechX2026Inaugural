// ============================================================
// CANVAS + DOM REFERENCES
// ============================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("introVideo");
const splash = document.getElementById("splash");
const brainImg = document.getElementById("brainImage");
const clickSound = document.getElementById("clickSound");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// CONFIGURATION
// ============================================================
const BACKGROUND_DOTS = 120;
const REQUIRED_CLICKS = 5;
const CLICK_RADIUS = 50;

const NODE_COLORS = [
  "#ff3b3b",
  "#1ce5ff",
  "#ffd60a",
  "#4cd137",
  "#1e90ff"
];

const NODE_LABELS = [
  "LLM",
  "Gen AI",
  "Deep Learning",
  "Neural Network",
  "Machine Learning"
];

const THEME_COLOR = "#ff0000";

// ============================================================
// PLATFORM CHECK
// ============================================================
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// ============================================================
// AUDIO UNLOCK
// ============================================================
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  video.muted = true;
  video.playsInline = true;

  clickSound.muted = false;
  clickSound.volume = 1;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});

  audioUnlocked = true;
}

// ============================================================
// FULLSCREEN (DESKTOP ONLY)
// ============================================================
function requestVideoFullscreen() {
  if (isIOS()) return;
  if (document.fullscreenElement) return;
  if (video.requestFullscreen) video.requestFullscreen();
}

// ============================================================
// BACKGROUND DOTS
// ============================================================
const bgDots = [];
for (let i = 0; i < BACKGROUND_DOTS; i++) {
  bgDots.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3
  });
}

// ============================================================
// NEURAL NODES + STATES
// ============================================================
const neuralNodes = [];
const clickedNodes = new Set();

let recombining = false;
let activated = false;
let showConnections = false;
let currentLink = 0;
let linkProgress = 0;
let showAIMerge = false;
let aiAlpha = 0;
let instructionHidden = false;
let finalStaticState = false;

// ============================================================
// BRAIN REVEAL
// ============================================================
let revealTarget = 0;
let revealCurrent = 0;

function updateBrainRevealTarget() {
  const c = clickedNodes.size;
  if (c === 0) revealTarget = 0;
  else if (c < REQUIRED_CLICKS) revealTarget = (c / (REQUIRED_CLICKS - 1)) * 50;
  else revealTarget = 100;
}

function animateBrainReveal() {
  if (finalStaticState) return;
  revealCurrent += (revealTarget - revealCurrent) * 0.045;
  brainImg.style.clipPath = `circle(${revealCurrent}% at 50% 50%)`;
}

// ============================================================
// HELPERS
// ============================================================
function getBrainRect() {
  return brainImg.getBoundingClientRect();
}

function isInsideBrain(x, y) {
  const r = getBrainRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

const BRAIN_SAFE_INSET = { top: 0.10, bottom: 0.16, left: 0.06, right: 0.06 };

// ============================================================
// INIT NODES
// ============================================================
function initNeuralNodes() {
  neuralNodes.length = 0;

  const positions = [
    { x: 0.35, y: 0.55 },
    { x: 0.65, y: 0.55 },
    { x: 0.65, y: 0.72 },
    { x: 0.50, y: 0.40 },
    { x: 0.45, y: 0.72 }
  ];

  positions.forEach((p, i) => {
    neuralNodes.push({
      rx: p.x,
      ry: p.y,
      x: 0,
      y: 0,
      targetX: null,
      targetY: null,
      color: null,
      label: NODE_LABELS[i],
      labelAlpha: 0,
      labelOffset: i === 2 ? 60 : 46
    });
  });
}

function updateNeuralNodePositions() {
  const r = getBrainRect();
  const l = r.left + r.width * BRAIN_SAFE_INSET.left;
  const rt = r.right - r.width * BRAIN_SAFE_INSET.right;
  const t = r.top + r.height * BRAIN_SAFE_INSET.top;
  const b = r.bottom - r.height * BRAIN_SAFE_INSET.bottom;

  neuralNodes.forEach(n => {
    if (recombining && n.targetX !== null) {
      n.x += (n.targetX - n.x) * 0.08;
      n.y += (n.targetY - n.y) * 0.08;
    } else {
      n.x = l + (rt - l) * n.rx;
      n.y = t + (b - t) * n.ry;
    }
  });
}

// ============================================================
// BEZIER HELPERS
// ============================================================
function quadBezierPoint(t, p0, p1, p2) {
  const u = 1 - t;
  return {
    x: u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
    y: u*u*p0.y + 2*u*t*p1.y + t*t*p2.y
  };
}

function controlPoint(a, b, k = 0.25) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: mx - (dy / len) * len * k,
    y: my + (dx / len) * len * k
  };
}

// ============================================================
// INIT
// ============================================================
initNeuralNodes();
brainImg.style.clipPath = "circle(0% at 50% 50%)";

// ============================================================
// DRAW LOOP
// ============================================================
function animate() {
  updateNeuralNodePositions();
  animateBrainReveal();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bgDots.forEach(d => {
    d.x += d.vx;
    d.y += d.vy;
    ctx.fillStyle = "rgba(255,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  if (showConnections) {
    const nodes = [...clickedNodes].map(i => neuralNodes[i]);
    ctx.strokeStyle = THEME_COLOR;
    ctx.lineWidth = 2;

    for (let i = 0; i < currentLink; i++) {
      const a = nodes[i];
      const b = (i === REQUIRED_CLICKS - 1) ? nodes[0] : nodes[i + 1];
      const c = controlPoint(a, b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.stroke();
    }

    if (currentLink < REQUIRED_CLICKS) {
      const a = nodes[currentLink];
      const b = (currentLink === REQUIRED_CLICKS - 1) ? nodes[0] : nodes[currentLink + 1];
      const c = controlPoint(a, b);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const steps = Math.max(10, Math.floor(50 * linkProgress));
      for (let i = 1; i <= steps; i++) {
        const t = (i / steps) * linkProgress;
        const p = quadBezierPoint(t, a, c, b);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      const head = quadBezierPoint(linkProgress, a, c, b);
      ctx.save();
      ctx.shadowColor = THEME_COLOR;
      ctx.shadowBlur = 18;
      ctx.fillStyle = THEME_COLOR;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      linkProgress += 0.035;
      if (linkProgress >= 1) {
        linkProgress = 0;
        currentLink++;
      }
    }
  }

  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);
    if (clicked && n.labelAlpha < 1) n.labelAlpha += 0.03;

    ctx.fillStyle = clicked ? n.color : "#ff3b3b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i + 1, n.x, n.y);

    if (clicked && !showAIMerge) {
      const dx = n.x - canvas.width / 2;
      const dy = n.y - canvas.height / 2;
      const len = Math.hypot(dx, dy) || 1;

      ctx.globalAlpha = n.labelAlpha;
      ctx.fillStyle = THEME_COLOR;
      ctx.font = "600 18px Arial";
      ctx.fillText(
        n.label,
        n.x + (dx / len) * n.labelOffset,
        n.y + (dy / len) * n.labelOffset
      );
      ctx.globalAlpha = 1;
    }
  });

  if (showAIMerge) {
    aiAlpha += 0.025;
    ctx.globalAlpha = Math.min(aiAlpha, 1);
    ctx.fillStyle = THEME_COLOR;
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("AI", canvas.width / 2, canvas.height / 2 + 24);
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(animate);
}

animate();

// ============================================================
// CLICK HANDLER
// ============================================================
splash.addEventListener("click", (e) => {
  unlockAudio();
  if (activated || finalStaticState) return;

  const x = e.clientX;
  const y = e.clientY;
  if (!isInsideBrain(x, y)) return;

  neuralNodes.forEach((n, i) => {
    if (clickedNodes.has(i)) return;

    if (Math.hypot(n.x - x, n.y - y) < CLICK_RADIUS) {
      clickedNodes.add(i);
      n.color = NODE_COLORS[clickedNodes.size - 1];
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
      updateBrainRevealTarget();
    }
  });

  if (clickedNodes.size === REQUIRED_CLICKS && !showConnections) {
    showConnections = true;
    if (!isIOS()) requestVideoFullscreen();

    setTimeout(() => {
      recombining = true;
      showAIMerge = true;

      const r = getBrainRect();
      neuralNodes.forEach(n => {
        n.targetX = r.left + r.width / 2;
        n.targetY = r.top + r.height / 2;
      });

      setTimeout(() => splash.classList.add("zoom-out"), 2500);

      setTimeout(() => {
        splash.style.display = "none";
        video.style.display = "block";
        video.muted = true;
        video.playsInline = true;

        video.play().then(() => {
          if (!isIOS()) video.muted = false;
        }).catch(() => {});
        activated = true;
      }, 2500);
    }, REQUIRED_CLICKS * 1500);
  }
});

// ============================================================
// VIDEO END → STATIC IMAGE
// ============================================================
video.addEventListener("ended", () => {
  video.pause();
  video.currentTime = 0;
  video.style.display = "none";

  finalStaticState = true;
  activated = true;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = "none";

  brainImg.src = "Poster.png";

  brainImg.style.transition = "none";
  brainImg.style.transform = "scale(0.85)";
  brainImg.style.clipPath = "circle(0% at 50% 50%)";
  brainImg.offsetHeight;

  brainImg.style.transition =
    "clip-path 1.2s cubic-bezier(0.175,0.885,0.32,1.275), transform 1.2s cubic-bezier(0.175,0.885,0.32,1.275)";
  brainImg.style.transform = "scale(1)";
  brainImg.style.clipPath = "circle(100% at 50% 50%)";

  splash.style.display = "block";
  splash.style.pointerEvents = "none";
});

// ============================================================
// HARDENING
// ============================================================
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateNeuralNodePositions();
});

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());
