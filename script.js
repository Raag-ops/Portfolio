const canvas = document.getElementById('topoCanvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let tick = 0;
const seed = Math.random() * 1000;
const pointer = { x: 0.5, y: 0.5 };
let theme = 'dark';
const nodes = [];
const edges = [];
let draggedNode = null;

// Mobile detection and performance settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const isLowPower = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;
let animationEnabled = !isMobile || !isLowPower;
let lastFrameTime = 0;
const targetFPS = isMobile ? 24 : 60;
const frameInterval = 1000 / targetFPS;

// ========== SPLASH SCREEN LOGIC ==========
const splashGreetings = [
  { text: 'Hello', lang: 'en' },
  { text: 'नमस्ते', lang: 'ne' },       
  { text: 'こんにちは', lang: 'ja' },
  { text: '안녕하세요', lang: 'ko' },
  { text: 'Bonjour', lang: 'fr' },
  { text: 'Hola', lang: 'es' },
  { text: 'مرحبا', lang: 'ar' },
  { text: 'Привет', lang: 'ru' },
  { text: 'Ciao', lang: 'it' },
  { text: 'Olá', lang: 'pt' },
  { text: 'Hallo', lang: 'de' },
  { text: 'שלום', lang: 'he' },
  { text: 'สวัสดี', lang: 'th' },
  { text: 'Hej', lang: 'sv' },
  { text: 'Salam', lang: 'fa' }
];

let currentGreetingIndex = 0;
let splashActive = true;
let isTyping = false;

// Typewriter effect functions
function typeWriter(element, text, callback, speed = 100) {
  let i = 0;
  isTyping = true;
  element.textContent = '';
  
  function type() {
    if (!splashActive) return;
    if (i < text.length) {
      const currentText = text.substring(0, i + 1);
      element.textContent = currentText;
      i++;
      setTimeout(type, speed);
    } else {
      isTyping = false;
      if (callback) callback();
    }
  }
  type();
}

function eraseText(element, callback, speed = 60) {
  isTyping = true;
  let text = element.textContent;
  
  function erase() {
    if (!splashActive) return;
    if (text.length > 0) {
      text = text.substring(0, text.length - 1);
      element.textContent = text;
      setTimeout(erase, speed);
    } else {
      isTyping = false;
      if (callback) callback();
    }
  }
  erase();
}

function initSplashScreen() {
  const splashScreen = document.getElementById('splash-screen');
  const glitchWord = document.querySelector('.glitch-word');
  const glitchText = document.querySelector('.glitch-text');
  
  if (!splashScreen || !glitchWord) return;
  
  // Add splash-active class to body to hide content
  document.body.classList.add('splash-active');
  
  // Start with empty and type the first word
  glitchWord.textContent = '';
  
  function cycleGreetings() {
    if (!splashActive) return;
    
    const greeting = splashGreetings[currentGreetingIndex];
    
    // Type the word
    typeWriter(glitchWord, greeting.text, () => {
      // Wait before erasing
      setTimeout(() => {
        if (!splashActive) return;
        
        // Erase the word
        eraseText(glitchWord, () => {
          // Move to next greeting
          currentGreetingIndex = (currentGreetingIndex + 1) % splashGreetings.length;
          
          // Small pause before typing next word
          setTimeout(cycleGreetings, 300);
        });
      }, 1500);
    });
  }
  
  // Start the cycle
  setTimeout(cycleGreetings, 500);
  
  // Scroll/wheel to dismiss splash
  let scrollThreshold = 0;
  const dismissThreshold = 50;
  
  function handleScroll(delta) {
    if (!splashActive) return;
    
    scrollThreshold += Math.abs(delta);
    
    if (scrollThreshold > dismissThreshold) {
      dismissSplash();
    }
  }
  
  function dismissSplash() {
    if (!splashActive) return;
    splashActive = false;
    splashScreen.classList.add('hidden');
    document.body.classList.remove('splash-active');
    document.body.style.overflow = '';
    
    // Remove splash after animation completes
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 800);
  }
  
  // Mouse wheel
  window.addEventListener('wheel', (e) => {
    if (splashActive) {
      e.preventDefault();
      handleScroll(e.deltaY);
    }
  }, { passive: false });
  
  // Touch scroll
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (splashActive) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  
  window.addEventListener('touchmove', (e) => {
    if (splashActive) {
      const touchY = e.touches[0].clientY;
      const delta = touchStartY - touchY;
      handleScroll(delta);
      touchStartY = touchY;
    }
  }, { passive: true });
  
  // Keyboard scroll (arrow keys, space, page down)
  window.addEventListener('keydown', (e) => {
    if (splashActive && ['ArrowDown', 'Space', 'PageDown', 'Enter'].includes(e.code)) {
      e.preventDefault();
      dismissSplash();
    }
  });
  
  // Click to dismiss
  splashScreen.addEventListener('click', dismissSplash);
  
  // Prevent body scroll while splash is active
  document.body.style.overflow = 'hidden';
}

// Initialize splash screen when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSplashScreen);
} else {
  // DOM is already ready, call immediately
  initSplashScreen();
}
// ========== END SPLASH SCREEN LOGIC ==========

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = isMobile ? 1 : (window.devicePixelRatio || 1);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (theme === 'light') initNetwork();
}


function initNetwork() {
  nodes.length = 0;
  edges.length = 0;
  // Reduce nodes significantly on mobile
  const nodeCount = isMobile ? 40 : (isLowPower ? 80 : 200);
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 1.5 + Math.random() * 1.5,
      baseRadius: 1.5 + Math.random() * 1.5
    });
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

// 2D Simplex-like noise for smooth terrain
function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  
  const aa = hash(X + hash(Y));
  const ab = hash(X + hash(Y + 1));
  const ba = hash(X + 1 + hash(Y));
  const bb = hash(X + 1 + hash(Y + 1));
  
  const x1 = aa + u * (ba - aa);
  const x2 = ab + u * (bb - ab);
  
  return x1 + v * (x2 - x1);
}

// Smooth 2D Perlin-style noise for circular contours
function smoothNoise2D(x, y) {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const fx = x - X;
  const fy = y - Y;
  
  // Smooth interpolation
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  
  const n00 = hash(X + hash(Y)) * 0.5 + 0.5;
  const n01 = hash(X + hash(Y + 1)) * 0.5 + 0.5;
  const n10 = hash(X + 1 + hash(Y)) * 0.5 + 0.5;
  const n11 = hash(X + 1 + hash(Y + 1)) * 0.5 + 0.5;
  
  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  
  return nx0 + v * (nx1 - nx0);
}

// Smooth noise for static terrain with pulsing animation
function terrainNoise(x, y, time) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  // 3 octaves for smooth but varied terrain
  for (let i = 0; i < 3; i++) {
    value += amplitude * smoothNoise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  // Add slow pulsing wave that makes contours expand/contract
  const pulse = Math.sin(time) * 0.1;
  
  return (value / maxValue) + pulse;
}

// Terrain colormap - classic elevation gradient
function getTerrainColor(elevation) {
  const colors = [
    { r: 20, g: 45, b: 30 },    // Deep green
    { r: 35, g: 65, b: 45 },    // Forest
    { r: 55, g: 85, b: 55 },    // Green
    { r: 85, g: 110, b: 70 },   // Light green
    { r: 120, g: 135, b: 85 },  // Olive
    { r: 155, g: 160, b: 110 }, // Tan
    { r: 185, g: 180, b: 140 }, // Sand
    { r: 210, g: 200, b: 165 }, // Cream
  ];
  
  const e = Math.max(0, Math.min(1, elevation));
  const idx = Math.min(Math.floor(e * (colors.length - 1)), colors.length - 2);
  const t = (e * (colors.length - 1)) - idx;
  const c1 = colors[idx];
  const c2 = colors[idx + 1];
  
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

function drawContours(depth) {
  ctx.clearRect(0, 0, width, height);

  // Subtle vertical gradient for depth
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#123024');
  gradient.addColorStop(0.6, '#10271d');
  gradient.addColorStop(1, '#0f241b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const time = tick * 0.0018;
  // Reduce complexity on mobile
  const numContours = isMobile ? 8 : 16;
  const resolution = isMobile ? 16 : 9;
  const cols = Math.ceil(width / resolution);
  const rows = Math.ceil(height / resolution);
  
  // Precompute moving centers for organic drift
  const centers = [
    { baseX: 0.32, baseY: 0.42, radius: 150, speed: 0.35, scale: 0.34 },
    { baseX: 0.68, baseY: 0.30, radius: 165, speed: 0.28, scale: 0.38 },
    { baseX: 0.52, baseY: 0.72, radius: 140, speed: 0.42, scale: 0.32 },
    { baseX: 0.20, baseY: 0.78, radius: 170, speed: 0.31, scale: 0.36 },
    { baseX: 0.82, baseY: 0.63, radius: 155, speed: 0.38, scale: 0.33 }
  ].map((c, i) => {
    const angle = time * c.speed + i * 1.2;
    const drift = (idx) => Math.sin(angle + idx * 0.7) * 40;
    return {
      x: width * c.baseX + drift(1),
      y: height * c.baseY + drift(2),
      radius: c.radius,
      speed: c.speed,
      scale: c.scale
    };
  });
  
  // Create smooth height field with circular pulsating patterns
  const field = new Array(rows);
  for (let y = 0; y < rows; y++) {
    field[y] = new Array(cols);
    for (let x = 0; x < cols; x++) {
      const px = x * resolution;
      const py = y * resolution;
      
      let heightVal = 0;
      
      // Combine circular waves from each drifting center
      for (const center of centers) {
        const dx = px - center.x;
        const dy = py - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pulse = Math.sin(time * center.speed) * 50 + center.radius;
        const wave = Math.sin(dist * 0.008 - time * center.speed * 1.05) * center.scale;
        heightVal += wave * Math.exp(-dist / (pulse * 1.25));
      }
      
      // Add gentle noise for texture
      const noise = smoothNoise2D(px * 0.0025, py * 0.0025) * 0.25;
      
      field[y][x] = heightVal + noise;
    }
  }
  
  // Normalize field
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = field[y][x];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const span = Math.max(0.0001, max - min);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      field[y][x] = (field[y][x] - min) / span;
    }
  }
  
  // Draw smooth contour lines with sparse, non-linear spacing
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.35;
  
  for (let c = 0; c < numContours; c++) {
    const t = c / Math.max(1, numContours - 1);
    const level = 0.12 + 0.82 * Math.pow(t, 1.08); // gentler spacing, more air near center
    
    // Earthy terrain gradient (green -> moss -> ochre -> clay)
    const r = Math.floor(110 + level * 90);
    const g = Math.floor(150 + level * 50);
    const b = Math.floor(110 + level * 25);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
    
    ctx.beginPath();
    
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const v0 = field[y][x];
        const v1 = field[y][x + 1];
        const v2 = field[y + 1][x + 1];
        const v3 = field[y + 1][x];
        
        const px = x * resolution;
        const py = y * resolution;
        
        const smooth = (a, b, tVal) => {
          const s = tVal * tVal * (3 - 2 * tVal);
          return a + (b - a) * s;
        };
        const edgePoint = (va, vb, pa, pb) => {
          const tEdge = (level - va) / (vb - va + 0.00001);
          return smooth(pa, pb, Math.max(0, Math.min(1, tEdge)));
        };
        
        const pts = [];
        if ((v0 < level && v1 >= level) || (v0 >= level && v1 < level)) {
          pts.push({ x: edgePoint(v0, v1, px, px + resolution), y: py });
        }
        if ((v1 < level && v2 >= level) || (v1 >= level && v2 < level)) {
          pts.push({ x: px + resolution, y: edgePoint(v1, v2, py, py + resolution) });
        }
        if ((v3 < level && v2 >= level) || (v3 >= level && v2 < level)) {
          pts.push({ x: edgePoint(v3, v2, px, px + resolution), y: py + resolution });
        }
        if ((v0 < level && v3 >= level) || (v0 >= level && v3 < level)) {
          pts.push({ x: px, y: edgePoint(v0, v3, py, py + resolution) });
        }
        
        if (pts.length === 2) {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
        } else if (pts.length === 4) {
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.moveTo(pts[2].x, pts[2].y);
          ctx.lineTo(pts[3].x, pts[3].y);
        }
      }
    }
    
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
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, width, height);

  // Skip pointer interaction on mobile for performance
  const px = isMobile ? width / 2 : pointer.x * width;
  const py = isMobile ? height / 2 : pointer.y * height;
  
  // Reduced connection threshold on mobile
  const baseDist = isMobile ? 80 : 130;
  const pulseAmount = Math.sin(tick * 0.006) * (isMobile ? 10 : 25);
  const connectionThreshold = baseDist + pulseAmount;

  for (const node of nodes) {
    if (node !== draggedNode) {
      // Slower movement
      node.x += node.vx * 0.4;
      node.y += node.vy * 0.4;
      
      // Bounce off edges
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      
      // Skip cursor attraction on mobile
      if (!isMobile) {
        const dx = px - node.x;
        const dy = py - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 10) {
          node.vx += (dx / dist) * 0.008;
          node.vy += (dy / dist) * 0.008;
        }
      }
      
      // Lower speed limit
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > 0.8) {
        node.vx = (node.vx / speed) * 0.8;
        node.vy = (node.vy / speed) * 0.8;
      }
    }
    
    // Simpler radius calculation on mobile
    if (!isMobile) {
      const dx = node.x - px;
      const dy = node.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.max(0, 1 - dist / 150);
      node.radius = node.baseRadius * (1 + force * 1.5);
    } else {
      node.radius = node.baseRadius;
    }
  }

  // Draw connections - use spatial grid optimization on mobile
  ctx.lineCap = 'round';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connectionThreshold) {
        const alpha = Math.max(0, 1 - dist / connectionThreshold) * 0.35;
        ctx.strokeStyle = `rgba(60, 60, 60, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes - darker and more visible
  for (const node of nodes) {
    ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop(currentTime) {
  // Frame rate limiting for mobile
  if (currentTime - lastFrameTime < frameInterval) {
    requestAnimationFrame(loop);
    return;
  }
  lastFrameTime = currentTime;
  
  const depth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--depth')) || 0;
  if (theme === 'dark') {
    drawContours(depth);
  } else {
    drawNetwork(depth);
  }
  tick += isMobile ? 0.3 : 0.5;
  requestAnimationFrame(loop);
}

// Throttled pointer handler for mobile
let pointerThrottle = 0;
function handlePointer(e) {
  const now = Date.now();
  if (isMobile && now - pointerThrottle < 50) return;
  pointerThrottle = now;
  
  const xNorm = e.clientX / window.innerWidth;
  const yNorm = e.clientY / window.innerHeight;
  pointer.x = xNorm;
  pointer.y = yNorm;
  document.documentElement.style.setProperty('--pointer-x', `${xNorm * 100}%`);
  document.documentElement.style.setProperty('--pointer-y', `${yNorm * 100}%`);
}

// Debounced resize handler
let resizeTimeout;
function debouncedResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resize, 150);
}

window.addEventListener('resize', debouncedResize);
window.addEventListener('scroll', onScroll, { passive: true });
if (!isMobile) {
  window.addEventListener('pointermove', handlePointer);
}

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
requestAnimationFrame(loop);

// Project carousel with touch support and dots
const projectCards = document.querySelector('#projects .cards');
const projectDots = document.querySelectorAll('.project-dot');

if (projectCards) {
  // Mouse wheel horizontal scroll (desktop only)
  if (!isMobile) {
    projectCards.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        projectCards.scrollBy({
          left: e.deltaY * 2,
          behavior: 'smooth'
        });
      }
    }, { passive: false });
  }

  // Update dots on scroll - throttled
  let scrollThrottle = 0;
  projectCards.addEventListener('scroll', () => {
    const now = Date.now();
    if (now - scrollThrottle < 100) return;
    scrollThrottle = now;
    
    const scrollLeft = projectCards.scrollLeft;
    const cardWidth = isMobile ? 296 : 632; // Adjusted for mobile card width
    const activeIndex = Math.round(scrollLeft / cardWidth);
    
    projectDots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
    });
  }, { passive: true });

  // Click/tap on dots to scroll
  projectDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.index);
      const cardWidth = isMobile ? 296 : 632;
      projectCards.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    });
  });
}

// Email form handler
const emailForm = document.getElementById('emailForm');
if (emailForm) {
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    const formMessage = document.getElementById('formMessage');
    
    try {
      // Using formspree.io service for form submission
      const response = await fetch('https://formspree.io/f/myzqvvdw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message
        })
      });
      
      if (response.ok) {
        formMessage.textContent = '✓ Message sent successfully! I\'ll get back to you soon.';
        formMessage.style.display = 'block';
        formMessage.style.color = 'var(--accent)';
        emailForm.reset();
        setTimeout(() => {
          formMessage.style.display = 'none';
        }, 5000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      formMessage.textContent = '✗ Error sending message. Please try again or email directly.';
      formMessage.style.display = 'block';
      formMessage.style.color = '#ff6b6b';
      console.error('Error:', error);
    }
  });
}
