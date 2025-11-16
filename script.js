// Bilancia virtuale semplice
// Data odierna usata solo nei commenti: 16 novembre 2025

const objectEl = document.getElementById('object');
const platformEl = document.getElementById('platform');
const displayEl = document.getElementById('display');
const realWeightInput = document.getElementById('realWeight');
const setWeightBtn = document.getElementById('setWeight');
const tareBtn = document.getElementById('tare');

// Stato:
// peso reale assegnato all'oggetto (grammi)
let realWeight = parseFloat(realWeightInput.value) || 0;
// se l'oggetto è posizionato sulla piattaforma
let onPlatform = true;
// valore tara (offset)
let tareOffset = 0;

// Impostazioni simulazione: accuratezza e rumore
const precision = 0.1; // arrotondamento a 0.1 g
const noiseStd = 0.02;  // deviazione standard rumore in grammi (molto piccolo)

// Funzione per generare rumore gaussiano (Box-Muller)
function gaussianRandom(mean = 0, std = 1){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

// Calcola lettura simulata
function measureReading(){
  if(!onPlatform) return 0.0.toFixed(1);
  // aggiungi rumore piccolo e applica tara
  const noisy = realWeight + gaussianRandom(0, noiseStd) - tareOffset;
  // protezione contro valori negativi (tolleranza)
  const val = Math.max(0, noisy);
  // arrotonda alla precisione
  const rounded = Math.round(val / precision) * precision;
  // formatta con una cifra decimale
  return rounded.toFixed(1);
}

// Aggiorna display
function updateDisplay(){
  const text = measureReading() + ' g';
  displayEl.textContent = text;
  // effetto visivo: scala leggermente la piattaforma in base al peso
  const w = parseFloat(measureReading());
  const scale = 1 - Math.min(0.08, w / 2000); // riduzione massima 8%
  platformEl.style.transform = `scaleY(${scale})`;
}

// Drag & drop semplice per posizionare l'oggetto dentro/fuori la piattaforma
objectEl.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain','object');
  objectEl.classList.add('dragging');
});
objectEl.addEventListener('dragend', () => {
  objectEl.classList.remove('dragging');
});

// Permetti drop sulla piattaforma
platformEl.addEventListener('dragover', (e) => { e.preventDefault(); });
platformEl.addEventListener('drop', (e) => {
  e.preventDefault();
  // assicurati che l'elemento sia figlio della piattaforma (visivamente)
  if(!platformEl.contains(objectEl)){
    platformEl.appendChild(objectEl);
  }
  onPlatform = true;
  updateDisplay();
});

// Permetti drop fuori: drop sul documento body per rimuoverlo dalla piattaforma
document.body.addEventListener('dragover', (e) => { e.preventDefault(); });
document.body.addEventListener('drop', (e) => {
  // se il drop avviene fuori dalla piattaforma, posiziona l'oggetto dopo la piattaforma
  if(e.target !== platformEl && !platformEl.contains(e.target)){
    if(platformEl.contains(objectEl)){
      platformEl.parentElement.insertBefore(objectEl, platformEl.nextSibling);
    }
    onPlatform = false;
    updateDisplay();
  }
});

// Imposta peso reale dall'input
setWeightBtn.addEventListener('click', () => {
  const v = parseFloat(realWeightInput.value);
  if(!isFinite(v) || v < 0){
    alert('Inserisci un numero valido >= 0');
    return;
  }
  realWeight = v;
  // se l'oggetto è sulla piattaforma aggiorna immediatamente
  updateDisplay();
});

// Tara: imposta offset in modo che la bilancia legga zero ora
tareBtn.addEventListener('click', () => {
  // misura attuale senza tara e imposta come offset
  const current = (onPlatform ? realWeight : 0) + 0; // senza rumore per impostare tara
  tareOffset = current;
  updateDisplay();
});

// Aggiornamento continuo per simulare la lettura dinamica (frequenza 5 Hz)
setInterval(updateDisplay, 200);

// inizializza display
updateDisplay();
