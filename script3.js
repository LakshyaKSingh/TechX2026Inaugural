// ============================================================
// CANVAS + DOM REFERENCES
// ============================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("introVideo");
const splash = document.getElementById("splash");
const brainImg = document.getElementById("brainImage");

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

const THEME_COLOR = "#d1ff2a";

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
let flashAlpha = 0;

// connection animation
let showConnections = false;
let currentLink = 0;
let linkProgress = 0;

// ============================================================
// BRAIN REVEAL (UNPROPORTIONAL)
// ============================================================
let revealTarget = 0;
let revealCurrent = 0;

function updateBrainRevealTarget() {
  const c = clickedNodes.size;

  if (c === 0) {
    revealTarget = 0;
  } else if (c < REQUIRED_CLICKS) {
    // first 4 clicks → only 50%
    revealTarget = (c / (REQUIRED_CLICKS - 1)) * 50;
  } else {
    // final click → full brain
    revealTarget = 100;
  }
}

function animateBrainReveal() {
  revealCurrent += (revealTarget - revealCurrent) * 0.045;

  brainImg.style.clipPath =
    `circle(${revealCurrent}% at 50% 50%)`;
  brainImg.style.webkitClipPath =
    `circle(${revealCurrent}% at 50% 50%)`;
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

const BRAIN_SAFE_INSET = {
  top: 0.10,
  bottom: 0.16,
  left: 0.06,
  right: 0.06
};

function initNeuralNodes() {
  neuralNodes.length = 0;

  const positions = [
    { x: 0.35, y: 0.55 },
    { x: 0.50, y: 0.40 },
    { x: 0.65, y: 0.55 },
    { x: 0.45, y: 0.72 },
    { x: 0.65, y: 0.72 }
  ];

  positions.forEach(p => {
    neuralNodes.push({
      rx: p.x,
      ry: p.y,
      x: 0,
      y: 0,
      targetX: null,
      targetY: null,
      pulse: 0,
      color: null
    });
  });
}

function updateNeuralNodePositions() {
  if (recombining) return;

  const r = getBrainRect();
  const safeLeft   = r.left + r.width * BRAIN_SAFE_INSET.left;
  const safeRight  = r.right - r.width * BRAIN_SAFE_INSET.right;
  const safeTop    = r.top + r.height * BRAIN_SAFE_INSET.top;
  const safeBottom = r.bottom - r.height * BRAIN_SAFE_INSET.bottom;

  neuralNodes.forEach(n => {
    n.x = safeLeft + (safeRight - safeLeft) * n.rx;
    n.y = safeTop + (safeBottom - safeTop) * n.ry;
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
if (brainImg.complete) {
  initNeuralNodes();
  updateNeuralNodePositions();
} else {
  brainImg.onload = () => {
    initNeuralNodes();
    updateNeuralNodePositions();
  };
}

// brain fully hidden initially
brainImg.style.clipPath = "circle(0% at 50% 50%)";
brainImg.style.webkitClipPath = "circle(0% at 50% 50%)";

// ============================================================
// DRAW LOOP
// ============================================================
function animate() {
  updateNeuralNodePositions();
  animateBrainReveal();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background dots
  bgDots.forEach(d => {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
    if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

    ctx.fillStyle = "rgba(255,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // connections
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

  // neural nodes
  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);
    if (n.pulse > 0) n.pulse -= 0.25;

    if (!clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 12 + n.pulse, 0, Math.PI * 2);
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = clicked ? n.color : "#ff3b3b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

animate();

// ============================================================
// CLICK HANDLER
// ============================================================
splash.addEventListener("click", (e) => {
  if (activated) return;

  const x = e.clientX;
  const y = e.clientY;
  if (!isInsideBrain(x, y)) return;

  neuralNodes.forEach((n, i) => {
    if (clickedNodes.has(i)) return;
    if (Math.hypot(n.x - x, n.y - y) < CLICK_RADIUS) {
      clickedNodes.add(i);
      n.pulse = 4;
      n.color = NODE_COLORS[clickedNodes.size - 1];
      updateBrainRevealTarget();
    }
  });

  if (clickedNodes.size === REQUIRED_CLICKS && !showConnections) {
    showConnections = true;
    currentLink = 0;
    linkProgress = 0;

    setTimeout(() => {
      recombining = true;
      flashAlpha = 0.5;

      const r = getBrainRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      neuralNodes.forEach(n => {
        n.targetX = cx;
        n.targetY = cy;
        n.color = THEME_COLOR;
      });

      setTimeout(() => splash.classList.add("zoom-out"), 2000);

      setTimeout(() => {
        splash.style.display = "none";
        document.body.classList.add("video-playing");
        video.muted = false;
        video.controls = false;
        video.style.display = "block";
        video.play().catch(() => {});
        activated = true;
      }, 1500);
    }, REQUIRED_CLICKS * 500);
  }
});

// ============================================================
// VIDEO END RESET
// ============================================================
video.addEventListener("ended", () => {
  video.pause();
  video.currentTime = 0;
  video.style.display = "none";

  splash.style.display = "block";
  document.body.classList.remove("video-playing");

  activated = false;
  recombining = false;
  showConnections = false;
  currentLink = 0;
  linkProgress = 0;
  clickedNodes.clear();
  revealTarget = 0;
  revealCurrent = 0;

  brainImg.style.clipPath = "circle(0% at 50% 50%)";
  brainImg.style.webkitClipPath = "circle(0% at 50% 50%)";
});

// ============================================================
// RESIZE + UI HARDENING
// ============================================================
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateNeuralNodePositions();
});

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());
