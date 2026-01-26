const canvas = document.getElementById('topoCanvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let tick = 0;
const seed = Math.random() * 1000;
const pointer = { x: 0.5, y: 0.5 };
let theme = 'light';
const nodes = [];
const edges = [];
let draggedNode = null;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (theme === 'light') initNetwork();
}

function initNetwork() {
  nodes.length = 0;
  edges.length = 0;
  const nodeCount = 45;
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 4 + Math.random() * 3,
      baseRadius: 4 + Math.random() * 3
    });
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        edges.push({ a: i, b: j });
      }
    }
  }
}

// Simple deterministic RNG to keep the contour motion coherent
const rand = (() => {
  let s = Math.floor(seed * 1e6) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();

// Smooth pseudo-noise for contour undulation
function noise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i);
  const b = hash(i + 1);
  const t = f * f * (3 - 2 * f);
  return a * (1 - t) + b * t;
}

function hash(n) {
  let t = n;
  t = (t << 13) ^ t;
  return 1 - ((t * (t * t * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}

function drawContours(depth) {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a3a2a');
  gradient.addColorStop(1, '#0d2415');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const elevationLevels = 15;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  
  const baseSpacing = 45;
  
  for (let level = 0; level < elevationLevels; level++) {
    const hue = 100 + depth * 40 + level * 4;
    const opacity = 0.15 + level * 0.02;
    
    ctx.strokeStyle = `hsla(${hue}, 45%, ${55 - depth * 15}%, ${opacity})`;
    ctx.lineWidth = 1.6;
    
    ctx.beginPath();
    const points = 120;
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      
      // Dynamic convergence/divergence pattern
      const convergence = Math.sin(tick * 0.002 + level * 0.3) * 30;
      const spiral = level * 2 + tick * 0.001;
      
      // Radial distortion - creates interesting patterns
      const distortion = Math.sin(angle * 6 + tick * 0.003) * 25 + Math.cos(angle * 4 - tick * 0.002) * 20;
      
      // Wave patterns that vary per level
      const wave1 = Math.sin(angle * 3 + tick * 0.002 + level * 0.2) * 20;
      const wave2 = Math.cos(angle * 2 - tick * 0.0015 + level * 0.15) * 15;
      const wave3 = Math.sin(angle * 5 + tick * 0.0025 - level * 0.1) * 12;
      
      // Terrain noise
      const terrainNoise = noise(angle * 2 + level * 0.4 + tick * 0.0003) * 15;
      
      // Radial pulsing
      const pulse = Math.sin(tick * 0.003 + level * 0.3) * 10;
      
      // Calculate dynamic radius with convergence
      let radius = baseSpacing * (level + 1);
      radius += convergence + distortion + wave1 + wave2 + wave3 + terrainNoise + pulse;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.stroke();
  }
}

function onScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const depth = Math.min(1, Math.max(0, window.scrollY / Math.max(1, maxScroll)));
  document.documentElement.style.setProperty('--depth', depth.toFixed(3));
}

function drawNetwork(depth) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f5f5f5');
  gradient.addColorStop(1, '#fafafa');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const px = pointer.x * width;
  const py = pointer.y * height;
  const connectionThreshold = 180;
  const hue = 0;

  for (const node of nodes) {
    if (node !== draggedNode) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    }
    const dx = node.x - px;
    const dy = node.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = Math.max(0, 1 - dist / 200);
    node.radius = node.baseRadius * (1 + force * 2.5);
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connectionThreshold) {
        const alpha = Math.max(0, 1 - dist / connectionThreshold) * 0.4;
        ctx.strokeStyle = `rgba(74, 74, 74, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const node of nodes) {
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function loop() {
  const depth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--depth')) || 0;
  if (theme === 'dark') {
    drawContours(depth);
  } else {
    drawNetwork(depth);
  }
  tick += 0.25;
  requestAnimationFrame(loop);
}

function handlePointer(e) {
  const xNorm = e.clientX / window.innerWidth;
  const yNorm = e.clientY / window.innerHeight;
  pointer.x = xNorm;
  pointer.y = yNorm;
  document.documentElement.style.setProperty('--pointer-x', `${xNorm * 100}%`);
  document.documentElement.style.setProperty('--pointer-y', `${yNorm * 100}%`);
}

window.addEventListener('resize', resize);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('pointermove', handlePointer);

canvas.addEventListener('mousedown', (e) => {
  if (theme !== 'light') return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  for (const node of nodes) {
    const dx = node.x - mx;
    const dy = node.y - my;
    if (Math.sqrt(dx * dx + dy * dy) < node.radius * 2) {
      draggedNode = node;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (draggedNode) {
    const rect = canvas.getBoundingClientRect();
    draggedNode.x = e.clientX - rect.left;
    draggedNode.y = e.clientY - rect.top;
  }
});

canvas.addEventListener('mouseup', () => {
  if (draggedNode) {
    draggedNode.vx = (Math.random() - 0.5) * 0.3;
    draggedNode.vy = (Math.random() - 0.5) * 0.3;
    draggedNode = null;
  }
});

const themeToggle = document.getElementById('themeToggle');
let isTransitioning = false;

themeToggle.addEventListener('click', () => {
  if (isTransitioning) return;
  isTransitioning = true;
  
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  
  theme = newTheme;
  document.documentElement.setAttribute('data-theme', theme);
  
  if (theme === 'light') {
    themeToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
    initNetwork();
  } else {
    themeToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
  }
  
  setTimeout(() => {
    isTransitioning = false;
  }, 1000);
});

resize();
onScroll();
initNetwork();
themeToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
</svg>`;
loop();
