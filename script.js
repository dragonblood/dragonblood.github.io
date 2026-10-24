const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  navigation.classList.toggle('open', !isOpen);
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

// Keep a small portrait in view and fly it into the About portrait as that
// section arrives. Clicking the portrait takes the same path with a slow scroll.
(() => {
  const mini = document.querySelector('.mini-me');
  const portrait = document.querySelector('.about-portrait');
  const about = document.querySelector('#about');
  if (!mini || !portrait || !about) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let flying = false;
  let scrollFrame = 0;

  function flyToPortrait() {
    if (flying || motionQuery.matches) {
      mini.classList.toggle('is-hidden', true);
      return;
    }
    const start = mini.getBoundingClientRect();
    if (mini.classList.contains('is-hidden')) return;
    flying = true;
    mini.style.left = `${start.left}px`;
    mini.style.top = `${start.top}px`;
    mini.classList.add('is-flying');
    const end = portrait.getBoundingClientRect();
    const sx = end.width / start.width;
    const sy = end.height / start.height;
    const dx = end.left - start.left;
    const dy = end.top - start.top;
    const animation = mini.animate([
      { transform: 'translate(0, 0) scale(1, 1)', borderRadius: '50%' },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: '50%' }
    ], {
      duration: 780,
      easing: 'cubic-bezier(.16, 1, .3, 1)',
      fill: 'forwards'
    });
    animation.onfinish = () => {
      mini.classList.add('is-hidden');
      animation.cancel();
      mini.classList.remove('is-flying');
      mini.style.left = '';
      mini.style.top = '';
      mini.style.transform = '';
      flying = false;
    };
  }

  const aboutObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) flyToPortrait();
    else if (!flying) mini.classList.remove('is-hidden');
  }, { threshold: 0.18, rootMargin: '0px 0px -18% 0px' });
  aboutObserver.observe(about);

  function slowScrollToAbout() {
    if (motionQuery.matches) {
      mini.classList.add('is-hidden');
      about.scrollIntoView({ behavior: 'auto' });
      return;
    }
    cancelAnimationFrame(scrollFrame);
    const startY = window.scrollY;
    const targetY = window.scrollY + about.getBoundingClientRect().top - 20;
    const distance = targetY - startY;
    const duration = Math.min(2400, Math.max(1100, Math.abs(distance) * 0.65));
    const started = performance.now();
    mini.classList.add('is-hidden');
    document.documentElement.style.scrollBehavior = 'auto';

    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
      else {
        document.documentElement.style.scrollBehavior = '';
        // If the observer did not get an intersection (short viewport), still
        // finish with the same portrait transition.
        if (!mini.classList.contains('is-hidden')) flyToPortrait();
        else if (!motionQuery.matches) {
          mini.classList.remove('is-hidden');
          requestAnimationFrame(flyToPortrait);
        }
      }
    };
    scrollFrame = requestAnimationFrame(step);
  }

  mini.addEventListener('click', slowScrollToAbout);
  motionQuery.addEventListener?.('change', () => {
    if (motionQuery.matches) {
      mini.getAnimations().forEach((animation) => animation.cancel());
      mini.classList.remove('is-flying');
      mini.classList.toggle('is-hidden', about.getBoundingClientRect().top < window.innerHeight * 0.7);
      flying = false;
    }
  });
})();

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

/* Hero: chaos → structure
   Pure Canvas 2D, no libraries. Everything static (structure, dense cloud, dotted
   lanes) is pre-rendered once into offscreen layers; only ~3k moving dots are
   drawn per frame, batched into 12 paths. */
(() => {
  'use strict';
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const hero = canvas.parentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  const TAU = Math.PI * 2;
  const PAPER = '#f6f4ed';
  const COLORS = ['#12130f', '#d99124', '#f6f4ed']; // ink · amber · paper
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // deterministic RNG so every load / resize looks the same
  let seed = 1;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => rnd() + rnd() + rnd() - 1.5;

  // timeline (seconds / fractions of a particle's lap)
  const JOURNEY = 0.72, HOLD_END = 0.93;
  const REVEAL_FROM = 1.2, REVEAL_TO = 5.4;

  // ---- state ----------------------------------------------------------------
  let W = 0, H = 0, dpr = 1, compact = false;
  let stage, cloudW, cloudTop;
  let structure, resA, resB, resPad = 16;
  let segs = [], segCum = [], segLen = 0;
  let lanes, laneCount, laneY0, laneH;
  let pulsePaths = [];
  let total = 0, active = 0, squares = 0;
  let clock = 0, last = 0, raf = 0, visible = true, reduced = reduceMQ.matches;
  let slow = 0, slowT = 0, slowN = 0;
  const pointer = { x: 0, y: 0, on: false };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  // per-particle data (typed arrays → no GC, cache friendly)
  let TX, TY, OX, OY, WF1, WF2, WP1, WP2, WA, SZ, AL, DELAY, DUR0, REST, PER;
  let LANE, FLAG, PX, PY, KX, KY;
  let bucketIdx, bucketCnt = new Int32Array(12), sqIdx;

  // ---- helpers --------------------------------------------------------------
  const makeLayer = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    return { c, g };
  };

  // collects dots, then paints them as 12 batched paths (3 colours × 4 alphas)
  const splat = () => {
    const b = Array.from({ length: 12 }, () => []);
    return {
      add(x, y, s, cls, a) { b[cls * 4 + (a > 0.75 ? 3 : a > 0.5 ? 2 : a > 0.25 ? 1 : 0)].push(x, y, s); },
      flush(g) {
        b.forEach((arr, k) => {
          if (!arr.length) return;
          g.globalAlpha = ((k % 4) + 1) / 4;
          g.fillStyle = COLORS[k >> 2];
          g.beginPath();
          for (let i = 0; i < arr.length; i += 3) {
            const x = arr[i], y = arr[i + 1], s = arr[i + 2];
            if (s > 2.1) { g.moveTo(x + s / 2, y); g.arc(x, y, s / 2, 0, TAU); }
            else g.rect(x - s / 2, y - s / 2, s, s);
          }
          g.fill();
        });
        g.globalAlpha = 1;
      }
    };
  };

  function track(x1, y1, x2, y2, light) {
    const l = Math.hypot(x2 - x1, y2 - y1);
    if (l < 5) return;
    segs.push([x1, y1, x2, y2, light]);
    segLen += l; segCum.push(segLen);
  }
  function pick() {
    const t = rnd() * segLen;
    let lo = 0, hi = segCum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (segCum[m] < t) lo = m + 1; else hi = m; }
    return segs[lo];
  }

  // ---- layout ---------------------------------------------------------------
  function layout() {
    compact = W < 700;
    if (compact) {
      const w = W * 0.92;
      stage = { x: W * 0.16, y: H * 0.5, w, h: H * 0.5 };
      cloudW = W * 0.52; cloudTop = 0.7;
    } else {
      const w = Math.min(W * 0.54, H * 1.22);
      stage = { x: W - w, y: 0, w, h: H };
      // Keep a slim paper gap between the loose particle field and the first
      // structure edges so the transition has room to read.
      cloudW = Math.min(W * 0.44, Math.max(0, stage.x - W * 0.025)); cloudTop = 0.47;
    }
  }

  // ---- lanes: the curved routes dots follow from the cloud into the structure ----
  function buildLanes() {
    laneCount = compact ? 20 : 32;
    lanes = new Float32Array(laneCount * 8);
    laneY0 = stage.y + stage.h * 0.1;
    laneH = stage.h * 0.86;
    const throatX = compact ? stage.x + stage.w * 0.18 : stage.x - W * 0.02;
    const throatY = H * (compact ? 0.68 : 0.54);
    for (let l = 0; l < laneCount; l++) {
      const f = (l + 0.5) / laneCount;
      // Start across the middle of the loose cloud, then gather into one
      // narrow central throat before branching back out to the structure.
      const x0 = cloudW * (0.16 + rnd() * 0.82);
      const y0 = clamp(throatY + gauss() * H * (compact ? 0.22 : 0.27), H * 0.08, H * 0.94);
      const x3 = stage.x + stage.w * 0.3;
      const y3 = laneY0 + laneH * f;
      const dx = x3 - x0;
      const throat = throatY + (f - 0.5) * H * (compact ? 0.11 : 0.14);
      const o = l * 8;
      lanes[o] = x0;              lanes[o + 1] = y0;
      lanes[o + 2] = x0 + (throatX - x0) * 0.72; lanes[o + 3] = throat;
      lanes[o + 4] = throatX + (x3 - throatX) * 0.52; lanes[o + 5] = throat + (y3 - throat) * 0.88;
      lanes[o + 6] = x3;          lanes[o + 7] = y3;
    }
  }
  function lanePoint(l, p) {
    const o = l * 8, m = 1 - p, a = m * m * m, b = 3 * m * m * p, c = 3 * m * p * p, d = p * p * p;
    return [a * lanes[o] + b * lanes[o + 2] + c * lanes[o + 4] + d * lanes[o + 6],
            a * lanes[o + 1] + b * lanes[o + 3] + c * lanes[o + 5] + d * lanes[o + 7]];
  }

  // ---- the static architecture ---------------------------------------------
  // x, base, width, height, depth (fractions of the stage) · g glass, d dark, s slab
  const BLOCKS = [
    [.02, .72, .10, .32, .04, 'f'],
    [.27, .68, .09, .42, .05, 'f'],
    [.60, .46, .12, .32, .05, 'f'],
    [.15, .80, .17, .17, .06, 'g'],
    [.14, .60, .12, .29, .05, 'g'],
    [.37, .50, .14, .34, .09, 'g'],
    [.52, .56, .10, .22, .05, 'g'],
    [.66, .57, .15, .22, .06, 'g'],
    [.84, .52, .14, .27, .05, 'g'],
    [.37, .90, .30, .46, .07, 'd'],
    [.30, .70, .52, .018, .10, 's'],
    [.70, .60, .30, .02, .09, 's'],
    [.58, .975, .30, .20, .10, 'd'],
    [.42, .88, .50, .018, .12, 's']
  ];
  const FILLS = {
    f: ['rgba(120,122,116,.05)', 'rgba(60,62,58,.10)', 'rgba(120,122,116,.06)'],
    g: ['rgba(112,114,108,.09)', 'rgba(50,52,48,.20)', 'rgba(120,122,116,.12)'],
    d: ['rgba(16,17,14,.95)', 'rgba(8,9,7,.97)', 'rgba(54,55,51,.9)'],
    s: ['rgba(30,31,28,.72)', 'rgba(14,15,13,.80)', 'rgba(110,112,106,.16)']
  };

  function poly(g, fill, a, b, c, d) {
    g.fillStyle = fill; g.beginPath();
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]);
    g.closePath(); g.fill();
  }

  function drawBlock(g, blk) {
    const [bx, bb, bw, bh, bd, kind] = blk;
    const w = bw * stage.w, h = bh * stage.h, dep = bd * stage.w;
    const x0 = stage.x + bx * stage.w, y0 = stage.y + bb * stage.h;
    const px = dep * 0.5, py = dep * 0.6;
    const P = (u, v, z) => [x0 + u * w + z * px, y0 - v * h - z * py];
    const dark = kind === 'd' || kind === 's', fl = FILLS[kind];
    poly(g, fl[0], P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0));
    poly(g, fl[1], P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0));
    poly(g, fl[2], P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1));

    const cell = compact ? 8 : 11;
    const nx = clamp(Math.round(w / cell), 2, 20), ny = clamp(Math.round(h / cell), 1, 44), nz = clamp(Math.round(dep / cell), 1, 18);
    const lines = new Map();
    const ln = (a, b, alpha, width, tr) => {
      const key = alpha + '|' + width;
      let arr = lines.get(key); if (!arr) lines.set(key, (arr = []));
      arr.push(a[0], a[1], b[0], b[1]);
      if (tr) track(a[0], a[1], b[0], b[1], dark ? 1 : 0);
    };
    const ghost = kind === 'f', gA = ghost ? 0.08 : 0.15, eA = ghost ? 0.2 : dark ? 0.42 : 0.38;
    for (let i = 0; i <= nx; i++) { const e = i === 0 || i === nx; ln(P(i / nx, 0, 0), P(i / nx, 1, 0), e ? eA : gA, e ? 1 : 0.6, true); }
    for (let j = 0; j <= ny; j++) { const e = j === 0 || j === ny; ln(P(0, j / ny, 0), P(1, j / ny, 0), e ? eA : gA, e ? 1 : 0.6, true); }
    for (let j = 0; j <= ny; j++) { const e = j === 0 || j === ny; ln(P(1, j / ny, 0), P(1, j / ny, 1), e ? eA : gA, e ? 1 : 0.6, true); }
    for (let k = 0; k <= nz; k++) { const e = k === 0 || k === nz; ln(P(1, 0, k / nz), P(1, 1, k / nz), e ? eA : gA, e ? 1 : 0.6, true); }
    for (let i = 0; i <= nx; i++) { const e = i === 0 || i === nx; ln(P(i / nx, 1, 0), P(i / nx, 1, 1), e ? eA : gA, e ? 1 : 0.6, true); }
    for (let k = 0; k <= nz; k++) { const e = k === 0 || k === nz; ln(P(0, 1, k / nz), P(1, 1, k / nz), e ? eA : gA, e ? 1 : 0.6, true); }
    if (dark) { ln(P(0, 1, 0), P(1, 1, 0), 0.85, 1.3, false); ln(P(1, 1, 0), P(1, 1, 1), 0.6, 1, false); }
    else ln(P(0, 1, 0), P(1, 1, 0), 0.55, 1.1, false);

    g.strokeStyle = dark ? '#f6f4ed' : '#12130f';
    lines.forEach((arr, key) => {
      const [a, wd] = key.split('|');
      g.globalAlpha = +a; g.lineWidth = +wd; g.beginPath();
      for (let i = 0; i < arr.length; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
      g.stroke();
    });
    g.globalAlpha = 1;
  }

  function buildStructure() {
    segs = []; segCum = []; segLen = 0;
    const L = makeLayer(W, H), g = L.g;
    structure = L.c;

    // construction hairlines + faint perspective fan (behind the blocks)
    g.strokeStyle = '#12130f'; g.lineWidth = 0.6;
    g.globalAlpha = 0.12; g.beginPath();
    const vx = stage.x - stage.w * 0.25, vy = H * 0.6;
    for (let i = 0; i < 24; i++) { const ex = stage.x + stage.w * 0.55, ey = stage.y + stage.h * (0.14 + i * 0.034); g.moveTo(vx + (ex - vx) * 0.42, vy + (ey - vy) * 0.42); g.lineTo(ex, ey); }
    g.stroke();
    g.globalAlpha = 0.22; g.beginPath();
    const nodes = [];
    for (let i = 0; i < (compact ? 8 : 22); i++) {
      const x = stage.x + stage.w * (0.1 + rnd() * 0.88);
      const y1 = H * (0.02 + rnd() * 0.3), y2 = H * (0.55 + rnd() * 0.45);
      g.moveTo(x, y1); g.lineTo(x, y2);
      if (rnd() < 0.4) nodes.push([x, y1]);
    }
    g.stroke();
    g.globalAlpha = 0.85; g.fillStyle = '#12130f';
    nodes.forEach(([x, y]) => { const s = 3 + rnd() * 2.5; g.fillRect(x - s / 2, y - s / 2, s, s); });
    g.globalAlpha = 1;

    BLOCKS.forEach((b) => drawBlock(g, b));

    // amber routes (also used by the travelling pulses)
    const S = (fx, fy) => [stage.x + fx * stage.w, stage.y + fy * stage.h];
    const routes = [
      [S(.546, .10), S(.546, .37)],
      [S(.84, .14), S(.84, .62)],
      [S(.18, .86), S(.42, .72), S(.66, .65), S(.93, .58)]
    ];
    pulsePaths = routes;
    g.strokeStyle = COLORS[1]; g.lineWidth = 0.9; g.globalAlpha = 0.7;
    routes.forEach((r) => { g.beginPath(); r.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); });
    g.globalAlpha = 0.95; g.fillStyle = COLORS[1];
    routes.forEach((r) => r.forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 2, 0, TAU); g.fill(); }));
    g.globalAlpha = 1;

    // settled dots: the “already organised” part of the structure
    const sp = splat();
    const nSettled = compact ? 320 : 1500;
    for (let i = 0; i < nSettled; i++) {
      const s = pick(), t = rnd();
      sp.add(s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t, 0.8 + rnd() * 0.9, s[4] ? 2 : 0, 0.5 + rnd() * 0.5);
    }
    // dotted lane trails between the cloud and the structure
    const nDust = compact ? 600 : 2800;
    const dustAxisY = H * (compact ? 0.68 : 0.54);
    for (let i = 0; i < nDust; i++) {
      const l = (rnd() * laneCount) | 0, p = 0.3 + rnd() * 0.62, q = lanePoint(l, p), j = (1 - p) * 5;
      const trailY = dustAxisY + (q[1] - dustAxisY) * 0.84;
      sp.add(q[0] + gauss() * j, trailY + gauss() * j, 0.8 + rnd() * 0.6, 0, 0.45 + rnd() * 0.55);
    }
    sp.flush(g);
  }

  // dense, softly “boiling” cloud (two textures cross-faded)
  function buildReservoir(count) {
    const L = makeLayer(cloudW + resPad, H), g = L.g, sp = splat();
    for (let i = 0; i < count; i++) {
      const core = i < count * 0.55;                         // denser heart of the plume
      const xn = Math.pow(rnd(), core ? 2.0 : 1.6);
      if (rnd() > Math.pow(1 - xn, 0.7)) continue;           // taper smoothly to nothing
      // Confine the reservoir to a broad, irregular plume that narrows toward
      // the funnel instead of filling a tall rectangular canvas.
      const center = 0.54 + xn * 0.025;
      const halfHeight = 0.035 + 0.28 * Math.pow(1 - xn, 0.72);
      let yv = center + (rnd() * 2 - 1) * halfHeight;
      if (rnd() < 0.06) yv -= rnd() * 0.08;                  // loose spray above the mass
      const r = rnd(), big = core ? 3.8 : 2.4;
      sp.add(xn * cloudW + resPad, yv * H, 0.5 + Math.pow(rnd(), 2.4) * big,
        r < 0.01 ? 1 : r < (core ? 0.05 : 0.025) ? 2 : 0, core ? 0.55 + rnd() * 0.45 : 0.3 + rnd() * 0.7);
    }
    sp.flush(g);
    return L.c;
  }

  // ---- moving dots ----------------------------------------------------------
  function buildParticles() {
    squares = compact ? 8 : 16;
    total = squares + (compact ? 1000 : clamp(Math.round((W * H) / 420), 1400, 3400));
    active = total;
    const F = () => new Float32Array(total);
    TX = F(); TY = F(); OX = F(); OY = F(); WF1 = F(); WF2 = F(); WP1 = F(); WP2 = F(); WA = F();
    SZ = F(); AL = F(); DELAY = F(); DUR0 = F(); REST = F(); PER = F(); PX = F(); PY = F(); KX = F(); KY = F();
    LANE = new Uint8Array(total); FLAG = new Uint8Array(total); // 1 amber · 2 settles on dark (turns light)
    bucketIdx = Array.from({ length: 12 }, () => new Int32Array(total));
    sqIdx = new Int32Array(squares);
    for (let i = 0; i < total; i++) {
      const sq = i < squares, s = pick(), t = rnd();
      TX[i] = s[0] + (s[2] - s[0]) * t + gauss() * 2;
      TY[i] = s[1] + (s[3] - s[1]) * t + gauss() * 2;
      const lane = clamp(Math.floor(((TY[i] - laneY0) / laneH) * laneCount), 0, laneCount - 1);
      LANE[i] = lane;
      FLAG[i] = sq ? 0 : rnd() < 0.018 ? 1 : s[4] ? 2 : 0;
      OX[i] = gauss() * cloudW * 0.42;
      const y0 = lanes[lane * 8 + 1];
      OY[i] = clamp(gauss() * H * 0.13, H * (cloudTop - 0.14) - y0, H - y0 + 20);
      WF1[i] = 0.5 + rnd() * 1.6; WF2[i] = 0.5 + rnd() * 1.6;
      WP1[i] = rnd() * TAU; WP2[i] = rnd() * TAU;
      WA[i] = (6 + rnd() * 20) * (compact ? 0.7 : 1);
      SZ[i] = sq ? 4 + rnd() * 4 : 0.7 + Math.pow(rnd(), 2.2) * 1.7;
      AL[i] = 0.45 + rnd() * 0.55;
      PER[i] = 8.5 + rnd() * 3;
      DUR0[i] = PER[i] * 0.36;
      REST[i] = rnd() * 0.55 * PER[i];
      DELAY[i] = Math.pow(rnd(), 1.7) * 8;
      if (sq) sqIdx[i] = i;
    }
  }

  // ---- per-frame drawing ----------------------------------------------------
  function drawStructure(sx, sy) {
    const rv = reduced ? 1 : smooth(REVEAL_FROM, REVEAL_TO, clock);
    if (rv <= 0) return;
    if (rv >= 1) { ctx.drawImage(structure, sx, sy, W, H); return; }
    const front = (0.15 + 1.2 * rv) * W, soft = 0.2 * W, n = 48;
    const wd = structure.width, hd = structure.height;
    for (let k = 0; k < n; k++) {
      const a0 = Math.round((k * wd) / n), a1 = Math.round(((k + 1) * wd) / n);
      const a = clamp((front - (a0 + a1) / 2 / dpr) / soft);
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(structure, a0, 0, a1 - a0, hd, a0 / dpr + sx, sy, (a1 - a0) / dpr, H);
    }
    ctx.globalAlpha = 1;
  }

  function drawPulses(sx, sy) {
    if (clock < REVEAL_TO - 0.8) return;
    ctx.fillStyle = COLORS[1];
    pulsePaths.forEach((path, k) => {
      let len = 0; const seg = [];
      for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(d); len += d; }
      const cycle = len + 160, head = ((clock * (70 + k * 14) + k * 190) % cycle);
      for (let t = 0; t < 5; t++) {
        let s = head - t * 9; if (s < 0 || s > len) continue;
        let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
        const f = s / seg[i], a = path[i], b = path[i + 1];
        ctx.globalAlpha = 0.95 - t * 0.19;
        ctx.beginPath(); ctx.arc(a[0] + (b[0] - a[0]) * f + sx, a[1] + (b[1] - a[1]) * f + sy, 2.1 - t * 0.28, 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles(dt, csx, csy, ssx, ssy) {
    const kd = Math.pow(0.9, dt * 60), R = compact ? 70 : 110, R2 = R * R, push = compact ? 3 : 4.2;
    const limit = Math.min(total, active);
    bucketCnt.fill(0);
    let nsq = 0;
    for (let i = 0; i < limit; i++) {
      const te = clock - DELAY[i];
      let u = 0, a = 1;
      if (te >= 0) {
        if (te < DUR0[i]) u = te / DUR0[i];
        else {
          const tp = te - DUR0[i], cyc = REST[i] + PER[i], ph = tp - Math.floor(tp / cyc) * cyc;
          if (ph < 0.7) a = smooth(0, 0.7, ph);
          u = ph < REST[i] ? 0 : (ph - REST[i]) / PER[i];
        }
      }
      if (u > HOLD_END) a *= 1 - (u - HOLD_END) / (1 - HOLD_END);
      if (a < 0.04) continue;

      const s = u < JOURNEY ? u / JOURNEY : 1, p = s * s * (3 - 2 * s);
      const o = LANE[i] * 8, m = 1 - p, c0 = m * m * m, c1 = 3 * m * m * p, c2 = 3 * m * p * p, c3 = p * p * p, e = smooth(0.3, 1, p);
      let x = c0 * lanes[o] + c1 * lanes[o + 2] + c2 * lanes[o + 4] + c3 * lanes[o + 6] + (TX[i] - lanes[o + 6]) * e;
      let y = c0 * lanes[o + 1] + c1 * lanes[o + 3] + c2 * lanes[o + 5] + c3 * lanes[o + 7] + (TY[i] - lanes[o + 7]) * e;
      const d0 = 1 - smooth(0.05, 0.72, p), d = d0 * d0;
      if (d > 0.002) {
        x += OX[i] * d + Math.sin(clock * WF1[i] + WP1[i]) * WA[i] * d;
        y += OY[i] * d + Math.cos(clock * WF2[i] + WP2[i]) * WA[i] * 0.8 * d;
      } else if (p > 0.97) {
        x += Math.sin(clock * 2.1 + WP1[i]) * 0.5; y += Math.cos(clock * 1.7 + WP2[i]) * 0.5;
      }
      if (pointer.on) {
        const dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) { const dist = Math.sqrt(d2), f = 1 - dist / R, k = f * f * push; KX[i] += (dx / dist) * k; KY[i] += (dy / dist) * k; }
      }
      KX[i] *= kd; KY[i] *= kd;
      PX[i] = x + KX[i] + csx + (ssx - csx) * p;
      PY[i] = y + KY[i] + csy + (ssy - csy) * p;

      const al = AL[i] * a;
      if (i < squares) { sqIdx[nsq++] = i; continue; }
      const fl = FLAG[i];
      if (fl === 1) push12(1, al, i);
      else if (fl === 2) {
        const mm = smooth(0.8, 0.95, p);
        if (al * (1 - mm) > 0.08) push12(0, al * (1 - mm), i);
        if (al * mm > 0.08) push12(2, al * mm, i);
      } else push12(0, al, i);
    }
    for (let b = 0; b < 12; b++) {
      const n = bucketCnt[b]; if (!n) continue;
      const idx = bucketIdx[b];
      ctx.globalAlpha = ((b & 3) + 1) / 4; ctx.fillStyle = COLORS[b >> 2]; ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const i = idx[k], sz = SZ[i], x = PX[i], y = PY[i];
        if (sz > 2.1) { ctx.moveTo(x + sz / 2, y); ctx.arc(x, y, sz / 2, 0, TAU); } else ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 0.9; ctx.fillStyle = COLORS[0];
    for (let k = 0; k < nsq; k++) { const i = sqIdx[k], sz = SZ[i]; ctx.fillRect(PX[i] - sz / 2, PY[i] - sz / 2, sz, sz); }
    ctx.globalAlpha = 1;
  }
  function push12(cls, a, i) {
    const b = cls * 4 + (a > 0.75 ? 3 : a > 0.5 ? 2 : a > 0.25 ? 1 : 0);
    bucketIdx[b][bucketCnt[b]++] = i;
  }

  function render(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const k = 1 - Math.pow(0.92, dt * 60);
    par.x += (par.tx - par.x) * k; par.y += (par.ty - par.y) * k;
    const csx = -par.x * 7, csy = -par.y * 5, ssx = par.x * 10, ssy = par.y * 7;

    // cloud: two textures drifting and cross-fading = a slowly boiling mass
    const fade = reduced ? 1 : smooth(0, 0.7, clock);
    ctx.globalAlpha = fade;
    ctx.drawImage(resA, -resPad + csx + Math.sin(clock * 0.31) * 3.5, csy + Math.cos(clock * 0.23) * 2.5, cloudW + resPad, H);
    ctx.globalAlpha = fade * (0.4 + 0.35 * Math.sin(clock * 0.8));
    ctx.drawImage(resB, -resPad + csx - Math.sin(clock * 0.27) * 3.5, csy - Math.cos(clock * 0.19) * 2.5, cloudW + resPad, H);
    ctx.globalAlpha = 1;

    drawStructure(ssx, ssy);
    drawParticles(dt, csx, csy, ssx, ssy);
    if (!reduced) drawPulses(ssx, ssy);
  }

  // ---- lifecycle ------------------------------------------------------------
  function setup() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    seed = 20240611;
    layout(); buildLanes(); buildStructure();
    const n = compact ? clamp(Math.round(W * H * 0.03), 6000, 14000) : clamp(Math.round(W * H * 0.032), 12000, 46000);
    resA = buildReservoir(n); resB = buildReservoir(Math.round(n * 0.7));
    buildParticles();
    slow = 0; slowT = 0; slowN = 0;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    clock += dt;
    render(dt);
    // adaptive quality: shed dots on slow devices instead of dropping frames
    slowT += dt; slowN++;
    if (slowN >= 45) {
      if (slowT / slowN > 0.026 && slow < 3) { slow++; active = Math.max(squares + 500, Math.round(active * 0.72)); }
      slowT = 0; slowN = 0;
    }
    if (visible && !reduced) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function still() { clock = 26; render(0.016); }

  setup();
  if (reduced) still(); else { render(0.016); start(); }

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', () => {
    reduced = reduceMQ.matches; stop();
    if (reduced) still(); else { clock = 0; start(); }
  });

  let rt = 0, lw = W, lh = H;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - lw) < 2 && Math.abs(r.height - lh) < 2) return;
      lw = r.width; lh = r.height; setup();
      reduced ? still() : render(0.016);
    }, 140);
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas); else window.addEventListener('resize', onResize, { passive: true });

  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = true;
    par.tx = clamp((pointer.x / r.width) * 2 - 1, -1, 1); par.ty = clamp((pointer.y / r.height) * 2 - 1, -1, 1);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointer.on = false; par.tx = 0; par.ty = 0; }, { passive: true });
})();
