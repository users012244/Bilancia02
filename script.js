// Bilancia virtuale migliorata — 16 novembre 2025
const objectEl = document.getElementById('object');
const platformEl = document.getElementById('platform');
const displayEl = document.getElementById('display');
const realWeightInput = document.getElementById('realWeight');
const setWeightBtn = document.getElementById('setWeight');
const tareBtn = document.getElementById('tare');
const placeBtn = document.getElementById('place');
const sensitivityEl = document.getElementById('sensitivity');
const precisionEl = document.getElementById('precision');

let realWeight = parseFloat(realWeightInput.value) || 0;
let onPlatform = false;
let tareOffset = 0;

// Simulation params
let sensitivity = parseFloat(sensitivityEl.value); // 0..1 (higher = more responsive)
let precision = parseFloat(precisionEl.value); // rounding
const baseNoiseStd = 0.015; // base sensor noise (g)

// Low-pass filter state for stable reading
let filteredValue = 0;
const alphaBase = 0.15; // base smoothing

function gaussianRandom(mean = 0, std = 1){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std + mean;
}

function sensorReadRaw(){
  // if no object, raw is 0 (but may have tiny offset)
  const presenceFactor = onPlatform ? 1 : 0;
  // noise scaled inversely with sensitivity (more sensitive => less attenuation)
  const noiseStd = baseNoiseStd * (1 - Math.min(0.99, sensitivity));
  const noise = gaussianRandom(0, noiseStd);
  const raw = presenceFactor * realWeight + noise - tareOffset;
  return Math.max(0, raw);
}

function updateFilter(){
  // alpha depends on sensitivity: higher sensitivity -> higher alpha (faster response)
  const alpha = Math.min(0.95, alphaBase + sensitivity * 0.7);
  const raw = sensorReadRaw();
  filteredValue = alpha * raw + (1 - alpha) * filteredValue;
}

function getDisplayValue(){
  // apply rounding to chosen precision
  const rounded = Math.round(filteredValue / precision) * precision;
  return rounded.toFixed(decimalPlaces(precision));
}

function decimalPlaces(p){
  const s = String(p);
  if(s.indexOf('.')===-1) return 0;
  return s.split('.')[1].length;
}

function updateDisplay(){
  updateFilter();
  displayEl.textContent = getDisplayValue() + ' g';
  // visual scale effect
  const w = parseFloat(getDisplayValue());
  const scale = 1 - Math.min(0.09, w / 3000);
  platformEl.style.transform = `scaleY(${scale})`;
}

// Controls
setWeightBtn.addEventListener('click', () => {
  const v = parseFloat(realWeightInput.value);
  if(!isFinite(v) || v < 0){ alert('Inserisci un numero valido >= 0'); return; }
  realWeight = v;
  // if object is on platform, nudge filter to reflect new real weight quickly
  if(onPlatform) filteredValue = realWeight;
  updateDisplay();
});

tareBtn.addEventListener('click', () => {
  // set tare to current true load (without noise): if onPlatform then realWeight else 0
  tareOffset = onPlatform ? realWeight : 0;
  // also reset filter to avoid transient negative readings
  filteredValue = Math.max(0, filteredValue - tareOffset);
  updateDisplay();
});

sensitivityEl.addEventListener('input', () => {
  sensitivity = parseFloat(sensitivityEl.value);
});

precisionEl.addEventListener('change', () => {
  precision = parseFloat(precisionEl.value);
});

// Place / remove object button toggles presence on platform and also supports click/touch
placeBtn.addEventListener('click', () => {
  toggleObjectPlacement();
});

function toggleObjectPlacement(){
  if(onPlatform){
    // remove: move element after platform
    if(platformEl.contains(objectEl)){
      platformEl.parentElement.insertBefore(objectEl, platformEl.nextSibling);
    }
    onPlatform = false;
  } else {
    // place: ensure object is child of platform
    if(!platformEl.contains(objectEl)){
      platformEl.appendChild(objectEl);
    }
    onPlatform = true;
    // nudge filter toward realWeight for quick response
    filteredValue = realWeight;
  }
  updateDisplay();
}

// Make object draggable and also support touchmove for fine positioning on platform
let dragging = false;
let offset = {x:0,y:0};

objectEl.addEventListener('mousedown', startDrag);
objectEl.addEventListener('touchstart', startDrag, {passive:false});

function startDrag(e){
  e.preventDefault();
  dragging = true;
  objectEl.style.transition = 'none';
  const rect = objectEl.getBoundingClientRect();
  const client = e.touches ? e.touches[0] : e;
  offset.x = client.clientX - rect.left;
  offset.y = client.clientY - rect.top;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', onDrag, {passive:false});
  document.addEventListener('touchend', endDrag);
  objectEl.style.position = 'absolute';
  objectEl.style.zIndex = 999;
  document.body.appendChild(objectEl);
}

function onDrag(e){
  if(!dragging) return;
  const client = e.touches ? e.touches[0] : e;
  e.preventDefault();
  let x = client.clientX - offset.x;
  let y = client.clientY - offset.y;
  objectEl.style.left = x + 'px';
  objectEl.style.top = y + 'px';
}

function endDrag(e){
  dragging = false;
  objectEl.style.transition = '';
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', endDrag);
  // detect if drop center is inside platform
  const objRect = objectEl.getBoundingClientRect();
  const platformRect = platformEl.getBoundingClientRect();
  const cx = objRect.left + objRect.width/2;
  const cy = objRect.top + objRect.height/2;
  if(cx >= platformRect.left && cx <= platformRect.right && cy >= platformRect.top && cy <= platformRect.bottom){
    // place onto platform: append and clear inline positioning
    platformEl.appendChild(objectEl);
    objectEl.style.position = '';
    objectEl.style.left = '';
    objectEl.style.top = '';
    objectEl.style.zIndex = '';
    onPlatform = true;
    filteredValue = realWeight; // immediate response
  } else {
    // leave outside
    if(platformEl.contains(objectEl)){
      platformEl.parentElement.insertBefore(objectEl, platformEl.nextSibling);
    }
    objectEl.style.position = '';
    objectEl.style.left = '';
    objectEl.style.top = '';
    objectEl.style.zIndex = '';
    onPlatform = false;
  }
  updateDisplay();
}

// Initialize filteredValue
filteredValue = 0;

// Continuous update at 20 Hz
setInterval(updateDisplay, 50);

// allow Enter key on platform to toggle placement (accessibility)
platformEl.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' || e.key === ' ') toggleObjectPlacement();
});
