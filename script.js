
/* ══════════════════════════════════════════════════════════════════
   HOW THE WIPE WORKS (no more blink):

   FORWARD  (S1 → S2):
     - Scene1 is visible (z2), Scene2 is below it (z1)
     - Red disc expands on canvas OVER Scene1
     - Once disc fully covers frame → hide Scene1, clear canvas instantly
     - Scene2 is already there, no flash, no reveal needed

   REVERSE  (S2 → S1):
     - Scene2 is visible (z1), Scene1 is hidden
     - Show Scene1 behind canvas (still hidden by full red rect on canvas)
     - Red rect with shrinking hole collapses over Scene2
     - Once hole reaches 0 → clear canvas, Scene1 is visible underneath
   ══════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('wipe-canvas');
const ctx    = canvas.getContext('2d');
const W = 300, H = 250;
const cx = W / 2, cy = H / 2;
const MAX_R = Math.sqrt(cx*cx + cy*cy) + 4;

const RINGS = [
  { offset: 0,    thickness: 18, color: '#2a2a2a' },
  { offset: 0.08, thickness: 13, color: '#e8000d'    },
  { offset: 0.16, thickness: 8,  color: '#888'    },
];

const wipe = { r: 0, phase: 'idle' };

function drawWipe() {
  ctx.clearRect(0, 0, W, H);
  if (wipe.phase === 'idle') return;

  if (wipe.phase === 'expand') {
    // Growing red disc over Scene 1
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, wipe.r), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    // Rings trail at leading edge
    RINGS.forEach(ring => {
      const rr = wipe.r - ring.offset * MAX_R;
      if (rr <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth   = ring.thickness;
      ctx.stroke();
      ctx.restore();
    });
  }

  if (wipe.phase === 'collapse') {
    // Full red rect with a transparent hole shrinking to zero
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, wipe.r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Rings on trailing edge of hole
    RINGS.forEach(ring => {
      const rr = wipe.r + ring.offset * MAX_R;
      if (rr > MAX_R + 50) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth   = ring.thickness;
      ctx.stroke();
      ctx.restore();
    });
  }
}

gsap.ticker.add(drawWipe);

// Blinking bug dots
gsap.to(['.s1-bug-dot','.s2-bug-dot'], {
  opacity: 0, duration: 0.5,
  repeat: -1, yoyo: true, ease: 'power1.inOut'
});

/* ══════════════════════════════════════════════════════════════════
   MASTER TIMELINE
   ══════════════════════════════════════════════════════════════════ */
function buildMaster() {
  // Ensure clean initial state
  gsap.set('#scene1',    { autoAlpha: 1 });
  gsap.set('#scene2',    { autoAlpha: 1 }); // always visible, just behind scene1
  gsap.set('#s2Bug',     { opacity: 0 });
  gsap.set('#s2Chyron',  { opacity: 0, y: 70 });
  gsap.set('#s2Eyebrow', { clipPath: 'inset(0 100% 0 0)' });

  const tl = gsap.timeline({
    repeat: -1,
    onRepeat() {
      // Hard-reset all animated elements the instant the loop restarts
      gsap.set('#s1TopLine', { scaleX: 0 });
      gsap.set(['#s1Bug'],   { opacity: 0 });
      gsap.set('#s1Bar',     { opacity: 0, scaleX: 0 });
      gsap.set('#s1Headline',{ opacity: 0, y: 10 });
      gsap.set('#s2Bug',     { opacity: 0 });
      gsap.set('#s2Chyron',  { opacity: 0, y: 70 });
      gsap.set('#s2Eyebrow', { clipPath: 'inset(0 100% 0 0)' });
      wipe.phase = 'idle';
      ctx.clearRect(0, 0, W, H);
    }
  });

  /* ── Scene 1 intro ──────────────────────────────────────────── */
  tl.to('#s1TopLine', { scaleX: 1, duration: 0.35, ease: 'power2.out' }, 0.1)
    .to('#s1Bug',     { opacity: 1, duration: 0.3 }, 0.2)
    .to('#s1Bar',     { opacity: 1, scaleX: 1, duration: 0.45, ease: 'back.out(1.4)' }, 0.5)
    .to('#s1Headline',{ opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.9);

  /* ── EXPAND WIPE: red disc grows over Scene 1 ───────────────── */
  const EXP = 3.5;
  tl.call(() => {
    wipe.phase = 'expand';
    wipe.r = 0;
  }, null, EXP)
  .to(wipe, {
    r: MAX_R,
    duration: 0.65,
    ease: 'power2.inOut',
    onComplete() {
      // Disc fully covers frame — safe to hide Scene 1 & clear canvas together
      gsap.set('#scene1', { autoAlpha: 0 });
      wipe.phase = 'idle';
      ctx.clearRect(0, 0, W, H);
      // Scene 2 is already below, now fully visible
    }
  }, EXP);

  /* ── Scene 2 intro ──────────────────────────────────────────── */
  const S2 = EXP + 0.65;
  tl.to('#s2Bug',    { opacity: 1, duration: 0.3 }, S2)
    .to('#s2Chyron', { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, S2 + 0.15)
    .to('#s2Eyebrow',{ clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'power2.out' }, S2 + 0.45);

  /* ── COLLAPSE WIPE: red rect shrinks over Scene 2 → Scene 1 ── */
  const COL = 6.8;
  tl.call(() => {
    // Prep Scene 1 behind the canvas before collapse begins
    gsap.set('#s1TopLine', { scaleX: 0 });
    gsap.set('#s1Bug',     { opacity: 0 });
    gsap.set('#s1Bar',     { opacity: 0, scaleX: 0 });
    gsap.set('#s1Headline',{ opacity: 0, y: 10 });
    wipe.phase = 'collapse';
    wipe.r = MAX_R;
  }, null, COL)
  .to(wipe, {
    r: 0,
    duration: 0.65,
    ease: 'power2.inOut',
    onComplete() {
       gsap.set('#scene1', { autoAlpha: 1 });
       wipe.phase = 'idle';
       ctx.clearRect(0, 0, W, H);
}
  }, COL);

  // Lock total duration so repeat fires at exactly 6s with no black frame
  tl.set({}, {}, 7.45);

  return tl;
}

buildMaster();
