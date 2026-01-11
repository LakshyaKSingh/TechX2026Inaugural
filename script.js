const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("introVideo");
const splash = document.getElementById("splash");
const brainImg = document.getElementById("brainImage");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ------------------------------------------------
// CONFIG
// ------------------------------------------------
const BACKGROUND_DOTS = 120;
const REQUIRED_CLICKS = 5;
const CLICK_RADIUS = 14;

// ------------------------------------------------
// BACKGROUND DOTS (ambient)
// ------------------------------------------------
const bgDots = [];
for (let i = 0; i < BACKGROUND_DOTS; i++) {
  bgDots.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3
  });
}

// ------------------------------------------------
// NEURAL NODES (RELATIVE, RESPONSIVE)
// ------------------------------------------------
const neuralNodes = [];
const clickedNodes = new Set();
let recombining = false;
let activated = false;
let flashAlpha = 0;

// ------------------------------------------------
// HELPERS
// ------------------------------------------------
function getBrainRect() {
  return brainImg.getBoundingClientRect();
}

function isInsideBrain(x, y) {
  const r = getBrainRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function initNeuralNodes() {
  neuralNodes.length = 0;

  // RELATIVE positions (0–1) → device independent
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
      pulse: 0
    });
  });
}
const BRAIN_SAFE_INSET = {
  top: 0.15,
  bottom: 0.18,
  left: 0.06,
  right: 0.06
};
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


// ------------------------------------------------
// INITIALIZE AFTER IMAGE LOAD (CRITICAL)
// ------------------------------------------------
if (brainImg.complete) {
  initNeuralNodes();
  updateNeuralNodePositions();
} else {
  brainImg.onload = () => {
    initNeuralNodes();
    updateNeuralNodePositions();
  };
}

// ------------------------------------------------
// DRAW LOOP
// ------------------------------------------------
function animate() {
  updateNeuralNodePositions();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ---- BACKGROUND DOTS ----
  bgDots.forEach(d => {
    d.x += d.vx;
    d.y += d.vy;

    if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
    if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

    ctx.fillStyle = "rgba(255, 4, 4, 0.6)";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- NEURAL NODES ----
  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);

    if (recombining) {
      n.x += (n.targetX - n.x) * 0.10;
      n.y += (n.targetY - n.y) * 0.10;
    }

    if (n.pulse > 0) n.pulse -= 0.3;

    // Remaining nodes (guides)
    if (!clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgb(11, 0, 0)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Clicked glow
    if (clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 12 + n.pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,0,0,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Core
    ctx.fillStyle = clicked ? "#ff6666" : "#ff3b3b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- FINAL FLASH ----
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,0,0,${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    flashAlpha -= 0.05;
  }

  requestAnimationFrame(animate);
}

animate();

// ------------------------------------------------
// CLICK HANDLER
// ------------------------------------------------
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
    }
  });

  if (clickedNodes.size === REQUIRED_CLICKS && !recombining) {
    recombining = true;
    flashAlpha = 0.35;

    const r = getBrainRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    neuralNodes.forEach(n => {
      n.targetX = cx;
      n.targetY = cy;
    });

    setTimeout(() => {
      splash.classList.add("zoom-out");
    }, 300);

    setTimeout(() => {
      splash.style.display = "none";
      document.body.classList.add("video-playing");

      video.muted = false;
      video.controls = false;
      video.style.display = "none";

      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(() => {
          video.style.display = "block";
          // video.requestFullscreen?.();
          activated = true;
        }).catch(() => {
          video.style.display = "block";
        });
      }
    }, 1500);
  }
});

// ------------------------------------------------
// VIDEO END → RESET
// ------------------------------------------------
video.addEventListener("ended", () => {
  document.exitFullscreen?.();
  video.pause();
  video.currentTime = 0;
  video.style.display = "none";

  splash.style.display = "block";
  splash.classList.remove("zoom-out");
  document.body.classList.remove("video-playing");

  activated = false;
  recombining = false;
  clickedNodes.clear();
  flashAlpha = 0;

  updateNeuralNodePositions();
});

// ------------------------------------------------
// RESIZE
// ------------------------------------------------
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateNeuralNodePositions();
});

// ------------------------------------------------
// HARDEN UI
// ------------------------------------------------
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());
