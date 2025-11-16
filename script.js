// Bilancia basata su pressione touch / posizione — 16 novembre 2025
const platform = document.getElementById('platform');
const display = document.getElementById('display');
const maxWeightInput = document.getElementById('maxWeight');
const sensitivityEl = document.getElementById('sensitivity');
const precisionEl = document.getElementById('precision');
const tareBtn = document.getElementById('tare');
const demoBtn = document.getElementById('demo');

let maxWeight = parseFloat(maxWeightInput.value) || 500;
let sensitivity = parseFloat(sensitivityEl.value) || 1;
let precision = parseFloat(precisionEl.value) || 0.1;
let tareOffset = 0;

// State for current measured "force" (in grams)
let currentGrams = 0;
let pressed = false;

// Utility
function decimalPlaces(p){
  const s = String(p);
  if(!s.includes('.')) return 0;
  return s.split('.')[1].length;
}
function formatG(v){ return v.toFixed(decimalPlaces(precision)) + ' g'; }

// Map a pressure value [0..1] to grams using sensitivity and maxWeight
function pressureToGrams(p){
  // clamp
  p = Math.max(0, Math.min(1, p));
  // apply sensitivity curve (exponential) so small changes can be magnified
  const curve = Math.pow(p, 1 / Math.max(0.0001, sensitivity));
  const grams = curve * maxWeight;
  return Math.max(0, grams - tareOffset);
}

// Read pointer pressure if available, fallback to touch.force, else simulate from vertical position
function extractPressureFromPointer(ev){
  // PointerEvent.pressure: 0..1 on supported devices (0 when not pressed)
  if(typeof ev.pressure === 'number' && ev.pressure > 0){
    return ev.pressure;
  }
  // TouchEvent: use Touch.force (Safari on iOS)
  if(ev.touches && ev.touches[0] && typeof ev.touches[0].force === 'number' && ev.touches[0].force >= 0){
    // Touch.force often in 0..1
    return ev.touches[0].force;
  }
  return null;
}

function pressureFromTouchPosition(touch, rect){
  // simulate pressure by vertical position: higher on element => larger pressure
  // y from top (0) to bottom (rect.height). We invert so top => 1, bottom => 0
  const y = touch.clientY - rect.top;
  const p = 1 - (y / rect.height);
  return Math.max(0, Math.min(1, p));
}

function updateDisplayValue(v){
  // round to precision
  const rounded = Math.round(v / precision) * precision;
  display.textContent = formatG(rounded);
  // visual effect: platform darkens with weight
  const t = Math.min(1, rounded / maxWeight);
  platform.style.boxShadow = `inset 0 ${-8 * t}px ${20 * t}px rgba(0,0,0,0.12)`;
  platform.style.transform = `translateY(${ -6 * t }px)`;
}

// Event handlers
function onPointerDown(ev){
  pressed = true;
  platform.classList.add('active');
  handlePressureFromEvent(ev);
  // capture pointer to continue receiving events
  if(ev.pointerId) platform.setPointerCapture(ev.pointerId);
}
function onPointerMove(ev){
  if(!pressed) return;
  handlePressureFromEvent(ev);
}
function onPointerUp(ev){
  pressed = false;
  platform.classList.remove('active');
  currentGrams = 0;
  updateDisplayValue(0);
  if(ev.pointerId) platform.releasePointerCapture(ev.pointerId);
}

function handlePressureFromEvent(ev){
  const rect = platform.getBoundingClientRect();
  let p = extractPressureFromPointer(ev);
  if(p === null){
    // fallback: use pointer coordinate to simulate pressure
    if(ev.clientY !== undefined){
      p = pressureFromTouchPosition(ev, rect);
    } else {
      p = 0;
    }
  }
  currentGrams = pressureToGrams(p);
  updateDisplayValue(currentGrams);
}

// Touch events for older browsers / Safari with Touch.force
function onTouchStart(ev){
  pressed = true;
  platform.classList.add('active');
  handleTouchMove(ev);
}
function handleTouchMove(ev){
  ev.preventDefault();
  const rect = platform.getBoundingClientRect();
  const t = ev.touches[0];
  let p = null;
  if(t && typeof t.force === 'number' && t.force >= 0){
    p = t.force; // 0..1
  } else {
    p = pressureFromTouchPosition(t, rect);
  }
  currentGrams = pressureToGrams(p);
  updateDisplayValue(currentGrams);
}
function onTouchEnd(ev){
  pressed = false;
  platform.classList.remove('active');
  currentGrams = 0;
  updateDisplayValue(0);
}

// Mouse fallback: use vertical position and mouse button
function onMouseDown(ev){
  pressed = true;
  platform.classList.add('active');
  handleMouseMove(ev);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', onMouseUpOnce);
}
function handleMouseMove(ev){
  if(!pressed) return;
  const rect = platform.getBoundingClientRect();
  const p = pressureFromTouchPosition(ev, rect);
  currentGrams = pressureToGrams(p);
  updateDisplayValue(currentGrams);
}
function onMouseUpOnce(ev){
  pressed = false;
  platform.classList.remove('active');
  currentGrams = 0;
  updateDisplayValue(0);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', onMouseUpOnce);
}

// Controls
sensitivityEl.addEventListener('input', () => {
  sensitivity = parseFloat(sensitivityEl.value) || 1;
});
precisionEl.addEventListener('change', () => {
  precision = parseFloat(precisionEl.value) || 0.1;
});
maxWeightInput.addEventListener('change', () => {
  maxWeight = parseFloat(maxWeightInput.value) || 500;
  updateDisplayValue(currentGrams);
});
tareBtn.addEventListener('click', () => {
  // set tare so displayed value becomes zero now
  tareOffset = Math.round(currentGrams / precision) * precision;
  updateDisplayValue(Math.max(0, currentGrams - tareOffset));
});

// Demo: simulate adding weight for testing
demoBtn.addEventListener('click', () => {
  // animate a press from 0 to 1 and back
  let t = 0, dir = 1;
  const id = setInterval(() => {
    t += dir * 0.03;
    if(t >= 1) dir = -1;
    if(t <= 0){ clearInterval(id); onPointerUp({pointerId:null}); return; }
    const grams = pressureToGrams(t);
    currentGrams = grams;
    updateDisplayValue(grams);
  }, 20);
});

// Attach events
// Prefer Pointer Events
platform.addEventListener('pointerdown', onPointerDown);
platform.addEventListener('pointermove', onPointerMove);
platform.addEventListener('pointerup', onPointerUp);
platform.addEventListener('pointercancel', onPointerUp);

// Touch fallback
platform.addEventListener('touchstart', onTouchStart, {passive:false});
platform.addEventListener('touchmove', handleTouchMove, {passive:false});
platform.addEventListener('touchend', onTouchEnd);

// Mouse fallback
platform.addEventListener('mousedown', onMouseDown);

// Initialize display
updateDisplayValue(0);
