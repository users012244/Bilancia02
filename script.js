// Debug pressione — 16 novembre 2025
const platform = document.getElementById('platform');
const display = document.getElementById('display');
const maxWeightInput = document.getElementById('maxWeight');
const sensitivityEl = document.getElementById('sensitivity');
const precisionEl = document.getElementById('precision');
const tareBtn = document.getElementById('tare');
const demoBtn = document.getElementById('demo');
const sourceEl = document.getElementById('source');
const rawEl = document.getElementById('raw');
const simEl = document.getElementById('sim');
const feedback = document.getElementById('feedback');

let maxWeight = parseFloat(maxWeightInput.value) || 500;
let sensitivity = parseFloat(sensitivityEl.value) || 1;
let precision = parseFloat(precisionEl.value) || 0.1;
let tareOffset = 0;
let currentGrams = 0;
let pressed = false;

function decimalPlaces(p){ const s=String(p); return s.includes('.')?s.split('.')[1].length:0; }
function formatG(v){ return v.toFixed(decimalPlaces(precision)) + ' g'; }

function pressureToGrams(p){
  p = Math.max(0, Math.min(1, p));
  const curve = Math.pow(p, 1 / Math.max(0.0001, sensitivity));
  return Math.max(0, curve * maxWeight - tareOffset);
}

function updateDisplayValue(v){
  const rounded = Math.round(v / precision) * precision;
  display.textContent = formatG(rounded);
  const t = Math.min(1, rounded / maxWeight);
  platform.style.boxShadow = `inset 0 ${-8 * t}px ${20 * t}px rgba(0,0,0,0.12)`;
  platform.style.transform = `translateY(${ -6 * t }px)`;
}

// detect pressure sources
function extractPressureFromPointer(ev){
  if(typeof ev.pressure === 'number' && ev.pressure > 0){
    sourceEl.textContent = 'PointerEvent.pressure';
    rawEl.textContent = String(ev.pressure);
    return ev.pressure;
  }
  if(ev.touches && ev.touches[0] && typeof ev.touches[0].force === 'number' && ev.touches[0].force >= 0){
    sourceEl.textContent = 'Touch.force';
    rawEl.textContent = String(ev.touches[0].force);
    return ev.touches[0].force;
  }
  sourceEl.textContent = 'fallback: posizione verticale';
  rawEl.textContent = 'n/a';
  return null;
}

function pressureFromPos(clientY, rect){
  const y = clientY - rect.top;
  const p = 1 - (y / rect.height);
  return Math.max(0, Math.min(1, p));
}

// Handlers
function handlePointerDown(ev){
  pressed = true;
  platform.classList.add('active');
  if(ev.pointerId) platform.setPointerCapture(ev.pointerId);
  handlePointerMove(ev);
}
function handlePointerMove(ev){
  if(!pressed) return;
  const rect = platform.getBoundingClientRect();
  let p = extractPressureFromPointer(ev);
  if(p === null){
    p = pressureFromPos(ev.clientY, rect);
    rawEl.textContent = p.toFixed(3);
  }
  simEl.textContent = p !== null ? p.toFixed(3) : '—';
  currentGrams = pressureToGrams(p || 0);
  updateDisplayValue(currentGrams);
  feedback.textContent = `Fonte pressione: ${sourceEl.textContent}`;
}
function handlePointerUp(ev){
  pressed = false;
  platform.classList.remove('active');
  if(ev.pointerId) platform.releasePointerCapture(ev.pointerId);
  currentGrams = 0;
  updateDisplayValue(0);
  sourceEl.textContent = '—';
  rawEl.textContent = '—';
  simEl.textContent = '—';
  feedback.textContent = 'Fonte pressione: —';
}

// Touch fallbacks
function handleTouchStart(ev){ pressed = true; platform.classList.add('active'); handleTouchMove(ev); }
function handleTouchMove(ev){ ev.preventDefault(); const rect = platform.getBoundingClientRect(); const t = ev.touches[0]; let p=null; if(typeof t.force === 'number' && t.force>=0){ sourceEl.textContent='Touch.force'; rawEl.textContent=String(t.force); p=t.force; } else { sourceEl.textContent='fallback: posizione verticale'; rawEl.textContent='n/a'; p=pressureFromPos(t.clientY,rect); rawEl.textContent=p.toFixed(3);} simEl.textContent = p.toFixed(3); currentGrams = pressureToGrams(p); updateDisplayValue(currentGrams); feedback.textContent = `Fonte pressione: ${sourceEl.textContent}`; }
function handleTouchEnd(ev){ pressed=false; platform.classList.remove('active'); currentGrams=0; updateDisplayValue(0); sourceEl.textContent='—'; rawEl.textContent='—'; simEl.textContent='—'; feedback.textContent='Fonte pressione: —'; }

// Mouse fallback
function handleMouseDown(ev){ pressed=true; platform.classList.add('active'); handleMouseMove(ev); document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUpOnce); }
function handleMouseMove(ev){ if(!pressed) return; const rect=platform.getBoundingClientRect(); const p=pressureFromPos(ev.clientY,rect); simEl.textContent=p.toFixed(3); rawEl.textContent='n/a'; sourceEl.textContent='fallback: posizione verticale'; currentGrams=pressureToGrams(p); updateDisplayValue(currentGrams); feedback.textContent = `Fonte pressione: ${sourceEl.textContent}`; }
function handleMouseUpOnce(ev){ pressed=false; platform.classList.remove('active'); currentGrams=0; updateDisplayValue(0); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUpOnce); sourceEl.textContent='—'; rawEl.textContent='—'; simEl.textContent='—'; feedback.textContent='Fonte pressione: —'; }

// Controls
sensitivityEl.addEventListener('input', ()=>{ sensitivity=parseFloat(sensitivityEl.value)||1; });
precisionEl.addEventListener('change', ()=>{ precision=parseFloat(precisionEl.value)||0.1; });
maxWeightInput.addEventListener('change', ()=>{ maxWeight=parseFloat(maxWeightInput.value)||500; updateDisplayValue(currentGrams); });
tareBtn.addEventListener('click', ()=>{ tareOffset = Math.round(currentGrams/precision)*precision; updateDisplayValue(Math.max(0,currentGrams-tareOffset)); });
demoBtn.addEventListener('click', ()=>{ let t=0,dir=1; const id=setInterval(()=>{ t+=dir*0.03; if(t>=1) dir=-1; if(t<=0){ clearInterval(id); handlePointerUp({pointerId:null}); return; } currentGrams=pressureToGrams(t); updateDisplayValue(currentGrams); },20); });

// Attach events
platform.addEventListener('pointerdown', handlePointerDown);
platform.addEventListener('pointermove', handlePointerMove);
platform.addEventListener('pointerup', handlePointerUp);
platform.addEventListener('pointercancel', handlePointerUp);
platform.addEventListener('touchstart', handleTouchStart, {passive:false});
platform.addEventListener('touchmove', handleTouchMove, {passive:false});
platform.addEventListener('touchend', handleTouchEnd);
platform.addEventListener('mousedown', handleMouseDown);

// Init
updateDisplayValue(0);
