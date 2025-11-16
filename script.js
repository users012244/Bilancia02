// Bilancia compatta e corretta — verifica rapida per Samsung
const platform = document.getElementById('platform');
const display = document.getElementById('display');
const maxWeightIn = document.getElementById('maxWeight');
const sensitivityIn = document.getElementById('sensitivity');
const precisionIn = document.getElementById('precision');
const tareBtn = document.getElementById('tare');
const demoBtn = document.getElementById('demo');

let maxWeight = Number(maxWeightIn.value) || 2000;
let sensitivity = Number(sensitivityIn.value) || 1;
let precision = Number(precisionIn.value) || 0.1;
let tareOffset = 0;

let smoothed = 0;
const alpha = 0.25; // smoothing

function dp(p){ const s=String(p); return s.includes('.')?s.split('.')[1].length:0; }
function fmt(v){ return v.toFixed(dp(precision)) + ' g'; }

// Map pressure [0..1] to grams. Uses sensor if available, else fallback:
// fallback uses vertical position AND touch area (if available) to infer pressure.
function pressureToGrams(p, touch){ 
  p = Math.max(0, Math.min(1, p || 0));
  // amplify small pressures moderately by sensitivity
  const shaped = Math.pow(p, 1 / Math.max(0.2, sensitivity));
  // if touch has radius/area info, scale by estimated contact area (Android may provide)
  let areaFactor = 1;
  if(touch){
    if(typeof touch.radiusX === 'number' && typeof touch.radiusY === 'number'){
      const area = (touch.radiusX || 0) * (touch.radiusY || 0);
      // normalize area to a reasonable range
      areaFactor = 1 + Math.min(3, area / 2000);
    } else if(typeof touch.force === 'number' && touch.force >= 0){
      // use touch.force if present (Safari iOS)
      areaFactor = 1 + touch.force * 2;
    }
  }
  const grams = shaped * maxWeight * areaFactor;
  return Math.max(0, grams - tareOffset);
}

function updateDisplay(val){
  // smooth transitions
  smoothed = alpha * val + (1 - alpha) * smoothed;
  const rounded = Math.round(smoothed / precision) * precision;
  display.textContent = fmt(rounded);
  // visual feedback
  const t = Math.min(1, rounded / maxWeight);
  platform.style.transform = `translateY(${ -6 * t }px)`;
  platform.style.boxShadow = `inset 0 ${-8*t}px ${20*t}px rgba(0,0,0,0.12)`;
}

// extract pressure source, with fallbacks
function getPressureFromPointer(ev){
  if(typeof ev.pressure === 'number' && ev.pressure > 0){
    return {p: ev.pressure, touch: ev};
  }
  return null;
}

function pressureFromTouchPos(clientY, rect){
  const y = clientY - rect.top;
  const p = 1 - (y / rect.height);
  return Math.max(0, Math.min(1, p));
}

// handlers
let active = false;

function handlePointerDown(ev){
  active = true;
  platform.classList.add('active');
  if(ev.pointerId) platform.setPointerCapture(ev.pointerId);
  handlePointerMove(ev);
}
function handlePointerMove(ev){
  if(!active) return;
  const rect = platform.getBoundingClientRect();
  const src = getPressureFromPointer(ev);
  let p, touch;
  if(src){
    p = src.p;
    touch = ev;
  } else {
    p = pressureFromTouchPos(ev.clientY, rect);
    touch = null;
  }
  const grams = pressureToGrams(p, touch);
  updateDisplay(grams);
}
function handlePointerUp(ev){
  active = false;
  platform.classList.remove('active');
  if(ev.pointerId) platform.releasePointerCapture(ev.pointerId);
  // decay to zero smoothly
  updateDisplay(0);
}

// touch fallback (for Safari / older)
function handleTouchStart(ev){
  active = true;
  platform.classList.add('active');
  handleTouchMove(ev);
}
function handleTouchMove(ev){
  ev.preventDefault();
  if(!active) return;
  const t = ev.touches[0];
  const rect = platform.getBoundingClientRect();
  let p = null;
  if(typeof t.force === 'number' && t.force >= 0){
    p = t.force;
  } else {
    p = pressureFromTouchPos(t.clientY, rect);
  }
  const grams = pressureToGrams(p, t);
  updateDisplay(grams);
}
function handleTouchEnd(ev){
  active = false;
  platform.classList.remove('active');
  updateDisplay(0);
}

// mouse fallback
function handleMouseDown(ev){
  active = true;
  platform.classList.add('active');
  handleMouseMove(ev);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUpOnce);
}
function handleMouseMove(ev){
  if(!active) return;
  const rect = platform.getBoundingClientRect();
  const p = pressureFromTouchPos(ev.clientY, rect);
  const grams = pressureToGrams(p, null);
  updateDisplay(grams);
}
function handleMouseUpOnce(ev){
  active = false;
  platform.classList.remove('active');
  updateDisplay(0);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUpOnce);
}

// controls
maxWeightIn.addEventListener('change', ()=>{ maxWeight = Number(maxWeightIn.value) || 2000; });
sensitivityIn.addEventListener('input', ()=>{ sensitivity = Number(sensitivityIn.value) || 1; });
precisionIn.addEventListener('change', ()=>{ precision = Number(precisionIn.value) || 0.1; });
tareBtn.addEventListener('click', ()=>{ tareOffset = Math.round(smoothed / precision) * precision; });
demoBtn.addEventListener('click', ()=>{
  // quick demo animation
  let t = 0, dir = 1;
  const id = setInterval(()=>{
    t += dir * 0.03;
    if(t>=1) dir = -1;
    const grams = pressureToGrams(Math.max(0,t), null);
    updateDisplay(grams);
    if(t<=0){ clearInterval(id); updateDisplay(0); }
  },20);
});

// attach events
platform.addEventListener('pointerdown', handlePointerDown);
platform.addEventListener('pointermove', handlePointerMove);
platform.addEventListener('pointerup', handlePointerUp);
platform.addEventListener('pointercancel', handlePointerUp);
platform.addEventListener('touchstart', handleTouchStart, {passive:false});
platform.addEventListener('touchmove', handleTouchMove, {passive:false});
platform.addEventListener('touchend', handleTouchEnd);
platform.addEventListener('mousedown', handleMouseDown);

// init
updateDisplay(0);
