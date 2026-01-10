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
// BACKGROUND DOTS (ambient, unchanged behavior)
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
// FIXED NEURAL NODES (ONLY CLICKABLE)
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
  const r = getBrainRect();

  // Fixed relative positions (designed, not random)
  const positions = [
    { x: 0.35, y: 0.55 },
    { x: 0.50, y: 0.40 },
    { x: 0.65, y: 0.55 },
    { x: 0.45, y: 0.72 },
    { x: 0.65, y: 0.72 }
  ];

  positions.forEach(p => {
    neuralNodes.push({
  rx: p.x,     // relative X (0–1)
  ry: p.y,     // relative Y (0–1)
  x: 0,
  y: 0,
  targetX: null,
  targetY: null,
  pulse: 0
});
  });
}
function updateNeuralNodePositions() {
  // Do NOT override positions while recombining
  if (recombining) return;

  const r = getBrainRect();
  neuralNodes.forEach(n => {
    n.x = r.left + r.width * n.rx;
    n.y = r.top + r.height * n.ry;
  });
}

initNeuralNodes();

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

    ctx.fillStyle = "rgba(248, 0, 0, 0.74)";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- NEURAL NODES ----
  const r = getBrainRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);

    if (recombining) {
      n.x += (n.targetX - n.x) * 0.08;
      n.y += (n.targetY - n.y) * 0.08;
    }

    if (n.pulse > 0) n.pulse -= 0.2;

    // ---- REMAINING CLICKS (FAINT RINGS) ----
    if (!clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgb(0, 0, 0)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- CLICKED NODE GLOW ----
    if (clicked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 12 + n.pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgb(255, 0, 0)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Core
    ctx.fillStyle = clicked ? "#ff6666" : "#ff3b3b";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- FINAL RED FLASH ----
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
    const dx = n.x - x;
    const dy = n.y - y;

    if (Math.hypot(dx, dy) < CLICK_RADIUS && !clickedNodes.has(i)) {
      clickedNodes.add(i);
      n.pulse = 4;
    }
  });

  // ---- LAST CLICK LOGIC ----
  if (clickedNodes.size === REQUIRED_CLICKS && !recombining) {
  recombining = true;
  flashAlpha = 0.35; // subtle red flash

  neuralNodes.forEach(n => {
    n.targetX = getBrainRect().left + getBrainRect().width / 2;
    n.targetY = getBrainRect().top + getBrainRect().height / 2;
  });

  // ✅ ADD THIS (zoom + fade trigger)
  setTimeout(() => {
    splash.classList.add("zoom-out");
  }, 3000);

  // ⬇️ KEEP YOUR EXISTING VIDEO LOGIC
  setTimeout(() => {
    splash.style.display = "none";
    document.body.classList.add("video-playing");

    video.muted = false;
    video.controls = false;
    video.style.display = "none"; // keep hidden until playing

    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        video.style.display = "block";

        if (video.requestFullscreen) {
          video.requestFullscreen();
        }

        activated = true;
      }).catch(() => {
        video.style.display = "block";
      });
    }
  }, 1500);
}

});
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());
video.addEventListener("ended", () => {
  // Exit fullscreen safely
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  // Hide video
  video.pause();
  video.currentTime = 0;
  video.style.display = "none";

  // Restore splash
  splash.style.display = "block";
  splash.classList.remove("zoom-out");

  // Restore cursor state
  document.body.classList.remove("video-playing");

  // RESET STATE (important)
  activated = false;
  recombining = false;
  clickedNodes.clear();
  flashAlpha = 0;

  // Reinitialize neural nodes
  initNeuralNodes();
});



// ------------------------------------------------
// RESIZE
// ------------------------------------------------
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateNeuralNodePositions();
});

