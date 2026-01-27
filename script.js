// ============================================================
// CANVAS + DOM REFERENCES
// ============================================================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("introVideo");
const splash = document.getElementById("splash");
const brainImg = document.getElementById("brainImage");
const clickSound = document.getElementById("clickSound");
const instrText = document.getElementById("instructionText");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// CONFIGURATION
// ============================================================
const BACKGROUND_DOTS = 120;
const REQUIRED_CLICKS = 5;
const CLICK_RADIUS = 50;

const NODE_COLORS = ["#1ce5ff", "#ffd60a", "#4cd137", "#1e90ff", "#ff3b3b"];
const DEFAULT_NODE_COLOR = "#a5acb6"; 
const NODE_LABELS = ["LLM", "Gen AI", "Deep Learning", "Neural Network", "Machine Learning"];
const THEME_COLOR = "#0095ff";

// Visibility for Instruction Text (Brain Outline Removed per request)
if (instrText) {
  instrText.style.textShadow = `0 0 15px ${THEME_COLOR}, 0 0 5px #000`;
  instrText.style.fontWeight = "bold";
}

// ============================================================
// AUDIO UNLOCK
// ============================================================
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  video.muted = false;
  video.volume = 1;
  clickSound.muted = false;
  clickSound.volume = 1;

  video.play().then(() => {
    video.pause();
    video.currentTime = 0;
  }).catch(() => {});

  clickSound.currentTime = 0;
  clickSound.load();
  audioUnlocked = true;
}

// ============================================================
// FULLSCREEN HELPER
// ============================================================
function requestVideoFullscreen() {
  if (document.fullscreenElement) return;
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  } else if (video.webkitEnterFullscreen) {
    video.webkitEnterFullscreen(); 
  } else if (video.msRequestFullscreen) {
    video.msRequestFullscreen();
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
// STATE MANAGEMENT
// ============================================================
const neuralNodes = [];
const clickedNodes = new Set();

let recombining = false;
let activated = false;
let sequenceTriggered = false; 

let showConnections = false;
let currentLink = 0;
let linkProgress = 0;

let showAIMerge = false;
let aiAlpha = 0;
let instructionHidden = false;

// ============================================================
// BRAIN REVEAL
// ============================================================
let revealTarget = 100;
let revealCurrent = 100;

function updateBrainRevealTarget() {
  revealTarget = 100;
}

function animateBrainReveal() {
  const target = recombining ? 0 : revealTarget;
  revealCurrent += (target - revealCurrent) * 0.045;
  const clipStr = `circle(${revealCurrent}% at 50% 50%)`;
  brainImg.style.clipPath = clipStr;
  brainImg.style.webkitClipPath = clipStr;
}

// ============================================================
// HELPERS
// ============================================================
function getBrainRect() { return brainImg.getBoundingClientRect(); }
function isInsideBrain(x, y) {
  const r = getBrainRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
const BRAIN_SAFE_INSET = { top: 0.10, bottom: 0.16, left: 0.06, right: 0.06 };

// ============================================================
// NODES INIT
// ============================================================
function initNeuralNodes() {
  neuralNodes.length = 0;
  const positions = [{x:0.35, y:0.55},{x:0.65, y:0.55},{x:0.65, y:0.72},{x:0.50, y:0.40},{x:0.45, y:0.72}];
  positions.forEach((p, i) => {
    neuralNodes.push({
      rx: p.x, ry: p.y, x: 0, y: 0, targetX: null, targetY: null,
      color: null, label: NODE_LABELS[i], labelAlpha: 0, labelOffset: i === 2 ? 60 : 46
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
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  return { x: mx - (dy / len) * len * k, y: my + (dx / len) * len * k };
}

// ============================================================
// FINAL HANDOFF
// ============================================================
function startFinalTransition() {
  if (sequenceTriggered) return;
  sequenceTriggered = true;

  setTimeout(() => {
    recombining = true;
    showAIMerge = true;
    const r = getBrainRect();
    neuralNodes.forEach(n => {
      n.targetX = r.left + r.width / 2;
      n.targetY = r.top + r.height / 2;
    });

    setTimeout(() => {
      splash.classList.add("zoom-out");
      
      setTimeout(() => {
        activated = true; 
        video.style.display = "block";
        video.style.position = "fixed";
        video.style.zIndex = "99999";
        video.style.opacity = "1";
        video.style.visibility = "visible";

        brainImg.style.opacity = "0";
        brainImg.style.visibility = "hidden";
        brainImg.style.display = "none";
        
        splash.style.opacity = "0";
        splash.style.visibility = "hidden";
        splash.style.pointerEvents = "none";
        splash.style.display = "none";
        
        canvas.style.display = "none";
        
        clickSound.pause();

        requestVideoFullscreen(); 
        video.play().catch(() => {
            video.muted = true;
            video.play();
        });
      }, 1000); 
    }, 2000); 
  }, 500);
}

// ============================================================
// DRAW LOOP
// ============================================================
function animate() {
  if (activated) return; 
  updateNeuralNodePositions();
  animateBrainReveal();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background dots 
  ctx.shadowBlur = 0;
  bgDots.forEach(d => {
    d.x += d.vx; d.y += d.vy;
    ctx.fillStyle = "rgb(255, 0, 0)";
    ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2); ctx.fill();
  });

  if (showConnections) {
    const nodes = [...clickedNodes].map(i => neuralNodes[i]);
    ctx.strokeStyle = THEME_COLOR; 
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = THEME_COLOR;
    
    for (let i = 0; i < currentLink; i++) {
      const a = nodes[i], b = (i === REQUIRED_CLICKS - 1) ? nodes[0] : nodes[i + 1], c = controlPoint(a, b);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
    }
    if (currentLink < REQUIRED_CLICKS) {
      const a = nodes[currentLink], b = (currentLink === REQUIRED_CLICKS - 1) ? nodes[0] : nodes[currentLink + 1], c = controlPoint(a, b);
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      const steps = Math.max(10, Math.floor(50 * linkProgress));
      for (let i = 1; i <= steps; i++) {
        const p = quadBezierPoint((i/steps)*linkProgress, a, c, b);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      linkProgress += 0.035;
      if (linkProgress >= 1) { linkProgress = 0; currentLink++; }
    } else {
      startFinalTransition();
    }
    ctx.shadowBlur = 0;
  }

  neuralNodes.forEach((n, i) => {
    const clicked = clickedNodes.has(i);
    if (clicked && n.labelAlpha < 1) n.labelAlpha += 0.03;
    if (recombining && n.targetX !== null) {
      n.x += (n.targetX - n.x) * 0.08; n.y += (n.targetY - n.y) * 0.08;
    }
    
    // 1. Draw the Node Circle
    ctx.shadowBlur = clicked ? 25 : 15;
    ctx.shadowColor = clicked ? n.color : "white";
    ctx.fillStyle = clicked ? n.color : DEFAULT_NODE_COLOR; 
    ctx.beginPath(); ctx.arc(n.x, n.y, 12, 0, Math.PI * 2); ctx.fill();
    
    // White core for visibility
    ctx.fillStyle = "rgba(241, 233, 233, 0.8)";
    ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); ctx.fill();
    
    if (!recombining) {
        // 2. Draw Number inside node
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000000"; 
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(i + 1, n.x, n.y);

        // 3. Draw Node Label (Color matches Node Color)
        if (clicked && n.labelAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = n.labelAlpha;
          ctx.fillStyle = n.color; // Label color matches node color
          ctx.font = "bold 18px 'Segoe UI', Arial";
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(232, 5, 5, 0.8)";
          ctx.fillText(n.label, n.x, n.y - 30); 
          ctx.restore();
        }
    }
  });

  if (showAIMerge) {
    aiAlpha += 0.025; ctx.globalAlpha = Math.min(aiAlpha, 1);
    ctx.shadowBlur = 30;
    ctx.shadowColor = THEME_COLOR;
    ctx.fillStyle = "#ffffff"; 
    ctx.font = "bold 80px 'Segoe UI', Arial";
    ctx.textAlign = "center"; ctx.fillText("AI", canvas.width / 2, canvas.height / 2 + 24);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
  requestAnimationFrame(animate);
}

initNeuralNodes();
animate();

// ============================================================
// CLICK HANDLER
// ============================================================
splash.addEventListener("click", (e) => {
  unlockAudio();
  if (activated || showConnections) return;
  const x = e.clientX, y = e.clientY;
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

  if (clickedNodes.size >= 1 && !instructionHidden) {
    if (instrText) instrText.classList.add("hidden");
    instructionHidden = true;
  }

  if (clickedNodes.size === REQUIRED_CLICKS) showConnections = true;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  updateNeuralNodePositions();
});
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dblclick", e => e.preventDefault());