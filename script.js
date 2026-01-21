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
const CLICK_RADIUS = 14;

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

const THEME_COLOR = "#ffae00";

// ============================================================
// AUDIO UNLOCK (CRITICAL)
// ============================================================
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  video.muted = false;
  video.volume = 1;

  const p = video.play();
  if (p) {
    p.then(() => {
      video.pause();
      video.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }
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
  revealCurrent += (revealTarget - revealCurrent) * 0.045;
  brainImg.style.clipPath = `circle(${revealCurrent}% at 50% 50%)`;
  brainImg.style.webkitClipPath = `circle(${revealCurrent}% at 50% 50%)`;
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
    { x: 0.50, y: 0.40 },
    { x: 0.65, y: 0.55 },
    { x: 0.45, y: 0.72 },
    { x: 0.65, y: 0.72 }
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
      labelOffset: 36
    });
  });
}

function updateNeuralNodePositions() {
  if (recombining) return;

  const r = getBrainRect();
  const l = r.left + r.width * BRAIN_SAFE_INSET.left;
  const rt = r.right - r.width * BRAIN_SAFE_INSET.right;
  const t = r.top + r.height * BRAIN_SAFE_INSET.top;
  const b = r.bottom - r.height * BRAIN_SAFE_INSET.bottom;

  neuralNodes.forEach(n => {
    n.x = l + (rt - l) * n.rx;
    n.y = t + (b - t) * n.ry;
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

  // Connections
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

  // Nodes + labels
  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);
    if (clicked && n.labelAlpha < 1) n.labelAlpha += 0.03;

    ctx.fillStyle = clicked ? n.color : "#ff3b3b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (clicked && !showAIMerge) {
      const dx = n.x - canvas.width / 2;
      const dy = n.y - canvas.height / 2;
      const len = Math.hypot(dx, dy) || 1;

      ctx.globalAlpha = n.labelAlpha;
      ctx.fillStyle = THEME_COLOR;
      ctx.font = "600 15px 'Segoe UI', 'Inter', 'Poppins', Arial";
      ctx.fillText(
        n.label,
        n.x + (dx / len) * n.labelOffset,
        n.y + (dy / len) * n.labelOffset
      );
      ctx.globalAlpha = 1;
    }
  });

  // AI merge
  if (showAIMerge) {
    aiAlpha += 0.025;
    ctx.globalAlpha = Math.min(aiAlpha, 1);
    ctx.fillStyle = THEME_COLOR;
    ctx.font = "bold 72px 'Segoe UI', 'Inter', 'Poppins', Arial";
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
  unlockAudio(); // MUST be first

  if (activated) return;

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
        clickSound.pause();
        clickSound.currentTime = 0;

        video.muted = false;
        video.volume = 1;
        video.style.display = "block";
        video.play().catch(() => {});
        activated = true;
      }, 3500);
    }, REQUIRED_CLICKS * 500);
  }
});

// ============================================================
// VIDEO RESET
// ============================================================
video.addEventListener("ended", () => {
  video.pause();
  video.currentTime = 0;
  video.style.display = "none";
  splash.style.display = "block";

  activated = false;
  recombining = false;
  showConnections = false;
  showAIMerge = false;
  aiAlpha = 0;

  clickedNodes.clear();
  revealTarget = 0;
  revealCurrent = 0;
  brainImg.style.clipPath = "circle(0% at 50% 50%)";
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
