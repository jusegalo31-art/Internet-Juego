/* ==========================================================================
   AVENTURA EN EL INTERNET - MOTOR DEL VIDEOJUEGO (2° DE PRIMARIA)
   ========================================================================== */

const GameState = {
  playerName: 'Explorador',
  avatar: '🤖',
  score: 0,
  soundEnabled: true,
  voiceEnabled: true,
  stars: { 1: 0, 2: 0, 3: 0, 4: 0 },
  unlocked: { 1: true, 2: false, 3: false, 4: false },
  currentScreen: 'screenWelcome'
};

/* ==========================================================================
   SISTEMA DE SONIDO SINTETIZADO (WEB AUDIO API - SIN ARCHIVOS EXTERNOS)
   ========================================================================== */
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type = 'sine', duration = 0.15, vol = 0.18, delay = 0) {
  if (!GameState.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  setTimeout(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }, delay * 1000);
}

const SFX = {
  click() {
    playTone(520, 'triangle', 0.08, 0.15);
  },
  connect() {
    playTone(440, 'sine', 0.12, 0.2, 0);
    playTone(660, 'sine', 0.18, 0.2, 0.09);
  },
  packet() {
    playTone(587.33, 'triangle', 0.1, 0.22, 0);
    playTone(880, 'triangle', 0.18, 0.22, 0.08);
  },
  error() {
    playTone(220, 'sawtooth', 0.16, 0.15, 0);
    playTone(170, 'sawtooth', 0.22, 0.15, 0.12);
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => playTone(n, 'triangle', 0.22, 0.22, idx * 0.11));
  }
};

/* ==========================================================================
   NARRADOR DE VOZ EN ESPAÑOL (WEB SPEECH API)
   ========================================================================== */
function speakText(text, force = false) {
  if (!('speechSynthesis' in window)) return;
  if (!GameState.voiceEnabled && !force) return;

  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[^\w\sáéíóúÁÉÍÓÚñÑüÜ¡!¿?,.:;-]/g, ' ');
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = 'es-MX';
  utter.rate = 1.02;
  utter.pitch = 1.12;

  const voices = window.speechSynthesis.getVoices();
  const esVoice =
    voices.find(v => v.lang.includes('es-MX')) ||
    voices.find(v => v.lang.includes('es-US')) ||
    voices.find(v => v.lang.startsWith('es'));
  if (esVoice) utter.voice = esVoice;

  window.speechSynthesis.speak(utter);
}

/* ==========================================================================
   NAVEGACIÓN Y ACTUALIZACIÓN DE INTERFAZ (HUD)
   ========================================================================== */
function updateHUD() {
  document.getElementById('hudAvatar').textContent = GameState.avatar;
  document.getElementById('hudName').textContent = GameState.playerName;
  document.getElementById('hudScore').textContent = GameState.score;
  document.getElementById('mapBitAvatar').textContent = GameState.avatar;

  const totalStars = Object.values(GameState.stars).reduce((a, b) => a + b, 0);
  document.getElementById('hudStars').textContent = `${totalStars} / 12`;

  for (let lvl = 1; lvl <= 4; lvl++) {
    const card = document.getElementById(`cardLevel${lvl}`);
    const starEl = document.getElementById(`starsLevel${lvl}`);
    const s = GameState.stars[lvl];
    starEl.textContent = '⭐'.repeat(s) + '☆'.repeat(3 - s);

    card.classList.toggle('unlocked', !!GameState.unlocked[lvl]);
    card.classList.toggle('completed', s > 0);
  }
}

function addScore(points) {
  GameState.score += points;
  updateHUD();
}

function showScreen(screenId) {
  SFX.click();
  stopLevel2Loop();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  GameState.currentScreen = screenId;
  updateHUD();

  if (screenId === 'screenMap') {
    const msg = `¡Hola ${GameState.playerName}! Elige una misión en el Mapa del Internet para comenzar.`;
    document.getElementById('mapSpeechText').innerHTML =
      `¡Hola <strong>${GameState.playerName}</strong>! Elige cualquiera de las 4 misiones para explorar cómo funciona el Internet.`;
    speakText(msg);
  } else if (screenId === 'screenCertificate') {
    document.getElementById('certStudentName').textContent =
      `${GameState.avatar} ${GameState.playerName}`;
    launchConfetti();
    SFX.win();
    speakText(`¡Felicidades ${GameState.playerName}! Has ganado el Diploma Oficial de Experto Maestro del Internet.`);
  }
}

function completeMission(levelNum, title, message, lessonText, nextAction) {
  GameState.stars[levelNum] = 3;
  if (levelNum < 4) {
    GameState.unlocked[levelNum + 1] = true;
  }
  addScore(100);
  SFX.win();
  launchConfetti();

  const modal = document.getElementById('victoryModal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('modalLessonText').textContent = lessonText;
  modal.classList.remove('hidden');

  speakText(`${title}. ${lessonText}`);

  const btnContinue = document.getElementById('btnModalContinue');
  btnContinue.onclick = () => {
    modal.classList.add('hidden');
    if (nextAction) nextAction();
    else showScreen('screenMap');
  };
}

/* ==========================================================================
   MISIÓN 1: CONSTRUYE LA GRAN RED MUNDIAL (CANVAS INTERACTIVO)
   ========================================================================== */
let l1Stage = 1;
let l1Nodes = [];
let l1RequiredLinks = [];
let l1ConnectedLinks = [];
let l1SelectedNode = null;
let l1AnimId = null;
let l1Packets = [];
let l1FishOffset = 0;

const L1_STAGES_DATA = {
  1: {
    badge: 'Etapa 1 de 3: Tu Casa y el Wi-Fi',
    instruction:
      'En tu casa hay celulares, tabletas y computadoras. ¡Haz clic en cada aparato para conectarlo al RÚTER Wi-Fi del centro!',
    nodes: [
      { id: 'router', label: 'Rúter Wi-Fi', emoji: '📡', x: 450, y: 215, r: 46, color: '#0284c7', isHub: true },
      { id: 'tablet', label: 'Tableta', emoji: '📱', x: 180, y: 110, r: 38, color: '#f97316' },
      { id: 'laptop', label: 'Computadora', emoji: '💻', x: 720, y: 110, r: 38, color: '#8b5cf6' },
      { id: 'tv', label: 'Tele Inteligente', emoji: '📺', x: 200, y: 330, r: 38, color: '#22c55e' },
      { id: 'console', label: 'Consola', emoji: '🎮', x: 700, y: 330, r: 38, color: '#ec4899' }
    ],
    links: [
      ['router', 'tablet'],
      ['router', 'laptop'],
      ['router', 'tv'],
      ['router', 'console']
    ]
  },
  2: {
    badge: 'Etapa 2 de 3: La Red de tu Ciudad',
    instruction:
      '¡Muy bien! Ahora conectemos el Rúter de tu Casa, tu Escuela y la Casa de tu Amigo con la Gran Antena de la Ciudad.',
    nodes: [
      { id: 'tower', label: 'Antena Central', emoji: '🗼', x: 450, y: 200, r: 48, color: '#eab308', isHub: true },
      { id: 'home', label: 'Tu Casa', emoji: '🏠', x: 165, y: 140, r: 40, color: '#3b82f6' },
      { id: 'school', label: 'Tu Escuela', emoji: '🏫', x: 735, y: 140, r: 40, color: '#22c55e' },
      { id: 'friend', label: 'Casa de tu Amigo', emoji: '🏡', x: 450, y: 355, r: 40, color: '#f97316' }
    ],
    links: [
      ['tower', 'home'],
      ['tower', 'school'],
      ['tower', 'friend']
    ]
  },
  3: {
    badge: 'Etapa 3 de 3: ¡Cables Submarinos bajo el Océano!',
    instruction:
      '¿Sabías que el Internet cruza el mar por CABLES SUBMARINOS gigantes? ¡Haz clic en cada estación en orden para cruzar el océano!',
    isOcean: true,
    nodes: [
      { id: 'mexico', label: 'México', emoji: '🇲🇽', x: 125, y: 210, r: 44, color: '#16a34a' },
      { id: 'buoy1', label: 'Cable Atlántico', emoji: '⚓', x: 340, y: 280, r: 36, color: '#0284c7' },
      { id: 'buoy2', label: 'Fibra Submarina', emoji: '🌊', x: 560, y: 280, r: 36, color: '#0284c7' },
      { id: 'world', label: 'Servidor Mundial', emoji: '🌍', x: 775, y: 210, r: 44, color: '#8b5cf6' }
    ],
    links: [
      ['mexico', 'buoy1'],
      ['buoy1', 'buoy2'],
      ['buoy2', 'world']
    ]
  }
};

function startLevel1() {
  showScreen('screenLevel1');
  l1Stage = 1;
  loadLevel1Stage(1);
  if (!l1AnimId) renderLevel1Loop();
}

function loadLevel1Stage(stageNum) {
  const data = L1_STAGES_DATA[stageNum];
  l1Nodes = JSON.parse(JSON.stringify(data.nodes));
  l1RequiredLinks = data.links.map(pair => pair.slice());
  l1ConnectedLinks = [];
  l1SelectedNode = null;
  l1Packets = [];

  document.getElementById('l1StepBadge').textContent = data.badge;
  document.getElementById('l1InstructionText').textContent = data.instruction;
  document.getElementById('l1StatusMsg').textContent =
    '👆 Haz clic en los círculos brillantes para tender los cables y señales de Internet';
  document.getElementById('btnL1SendTest').classList.add('hidden');
  document.getElementById('btnL1NextStage').classList.add('hidden');

  speakText(data.instruction);
}

function isLinkInList(list, a, b) {
  return list.some(pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a));
}

function handleLevel1Click(e) {
  const canvas = document.getElementById('canvasLevel1');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const clicked = l1Nodes.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 14);
  if (!clicked) return;

  // Para hacerlo súper intuitivo para niños de 2° de primaria:
  // Si hacen clic en cualquier nodo que tenga una conexión pendiente, ¡lo conectamos automáticamente o con su pareja!
  const pendingLink = l1RequiredLinks.find(
    pair =>
      (pair[0] === clicked.id || pair[1] === clicked.id) &&
      !isLinkInList(l1ConnectedLinks, pair[0], pair[1])
  );

  if (pendingLink) {
    l1ConnectedLinks.push(pendingLink);
    SFX.connect();
    addScore(25);
    spawnDataPulses(pendingLink[0], pendingLink[1]);

    const remaining = l1RequiredLinks.length - l1ConnectedLinks.length;
    if (remaining === 0) {
      document.getElementById('l1StatusMsg').textContent =
        '🎉 ¡Red conectada! Ahora presiona el botón para enviar datos de prueba.';
      document.getElementById('btnL1SendTest').classList.remove('hidden');
      SFX.win();
    } else {
      document.getElementById('l1StatusMsg').textContent =
        `✅ ¡Conectado! Te faltan ${remaining} conexiones más.`;
    }
  } else {
    SFX.click();
  }
}

function spawnDataPulses(idA, idB) {
  const nA = l1Nodes.find(n => n.id === idA);
  const nB = l1Nodes.find(n => n.id === idB);
  if (!nA || !nB) return;
  for (let i = 0; i < 3; i++) {
    l1Packets.push({
      x1: nA.x,
      y1: nA.y,
      x2: nB.x,
      y2: nB.y,
      t: -i * 0.25,
      speed: 0.018
    });
  }
}

function renderLevel1Loop() {
  const canvas = document.getElementById('canvasLevel1');
  if (canvas && GameState.currentScreen === 'screenLevel1') {
    const ctx = canvas.getContext('2d');
    const stageData = L1_STAGES_DATA[l1Stage];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo según etapa
    if (stageData.isOcean) {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Continentes laterales
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(80, 220, 110, 0, Math.PI * 2);
      ctx.arc(820, 220, 110, 0, Math.PI * 2);
      ctx.fill();

      // Peces animados en el océano
      l1FishOffset += 0.03;
      ctx.font = '28px sans-serif';
      ctx.fillText('🐠', 310 + Math.sin(l1FishOffset) * 45, 130);
      ctx.fillText('🐙', 450, 360 + Math.cos(l1FishOffset) * 15);
      ctx.fillText('🐬', 560 + Math.cos(l1FishOffset) * 40, 115);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dibujar guías punteadas de cables pendientes
    l1RequiredLinks.forEach(pair => {
      const nA = l1Nodes.find(n => n.id === pair[0]);
      const nB = l1Nodes.find(n => n.id === pair[1]);
      const connected = isLinkInList(l1ConnectedLinks, pair[0], pair[1]);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(nA.x, nA.y);
      ctx.lineTo(nB.x, nB.y);
      if (connected) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 15;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Dibujar pulsos de datos viajando
    for (let i = l1Packets.length - 1; i >= 0; i--) {
      const p = l1Packets[i];
      p.t += p.speed;
      if (p.t >= 0 && p.t <= 1) {
        const px = p.x1 + (p.x2 - p.x1) * p.t;
        const py = p.y1 + (p.y2 - p.y1) * p.t;
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.t > 1) {
        l1Packets.splice(i, 1);
      }
    }

    // Dibujar Nodos
    const pulse = Math.sin(Date.now() * 0.006) * 5;
    l1Nodes.forEach(n => {
      const hasPending = l1RequiredLinks.some(
        pair =>
          (pair[0] === n.id || pair[1] === n.id) &&
          !isLinkInList(l1ConnectedLinks, pair[0], pair[1])
      );

      ctx.save();
      if (hasPending) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 8 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.emoji, n.x, n.y);

      // Etiqueta
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(n.label, n.x, n.y + n.r + 22);
      ctx.restore();
    });
  }
  l1AnimId = requestAnimationFrame(renderLevel1Loop);
}

/* ==========================================================================
   MISIÓN 2: CARRERA DE PAQUETES (DIVIDIR, CORRER Y REARMAR)
   ========================================================================== */
let l2ChosenEmoji = '🦖';
let l2ChosenName = 'Dibujo de Dinosaurio';
let l2LoopId = null;
let l2PlayerLane = 1; // 0, 1, 2
let l2Collected = 0;
let l2Items = [];
let l2SpawnTimer = 0;
let l2ExpectedSlot = 1;

function startLevel2() {
  showScreen('screenLevel2');
  document.getElementById('l2StageSlicer').classList.remove('hidden');
  document.getElementById('l2StageHighway').classList.add('hidden');
  document.getElementById('l2StageAssemble').classList.add('hidden');

  document.getElementById('wholeImageDisplay').classList.remove('hidden');
  document.getElementById('packetsDisplay').classList.add('hidden');
  document.getElementById('btnSlicePackets').classList.remove('hidden');
  document.getElementById('btnStartHighway').classList.add('hidden');

  document.getElementById('l2StepBadge').textContent = 'Paso 1: Cortar en Paquetes';
  const msg =
    'Cuando mandas un dibujo por Internet, ¡es demasiado grande para pasar entero por el cable! Primero la computadora lo divide en pedacitos llamados Paquetes.';
  document.getElementById('l2InstructionText').textContent = msg;
  speakText(msg);
}

function startHighwayGame() {
  document.getElementById('l2StageSlicer').classList.add('hidden');
  document.getElementById('l2StageHighway').classList.remove('hidden');
  document.getElementById('l2StepBadge').textContent = 'Paso 2: Autopista de Fibra Óptica';

  const msg =
    '¡Mueve a tu personaje arriba y abajo por los 3 cables de fibra óptica para atrapar los 4 Paquetes de tu dibujo!';
  document.getElementById('l2InstructionText').textContent = msg;
  speakText(msg);

  l2PlayerLane = 1;
  l2Collected = 0;
  l2Items = [];
  l2SpawnTimer = 0;
  document.getElementById('l2PacketCount').textContent = '0';

  stopLevel2Loop();
  l2LoopId = requestAnimationFrame(updateHighwayLoop);
}

function stopLevel2Loop() {
  if (l2LoopId) {
    cancelAnimationFrame(l2LoopId);
    l2LoopId = null;
  }
}

function updateHighwayLoop() {
  const canvas = document.getElementById('canvasLevel2');
  if (!canvas || GameState.currentScreen !== 'screenLevel2') return;
  const ctx = canvas.getContext('2d');
  const laneY = [75, 180, 285];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar los 3 carriles de Fibra Óptica
  laneY.forEach((y, idx) => {
    ctx.strokeStyle = idx === l2PlayerLane ? '#22d3ee' : '#1e3a8a';
    ctx.lineWidth = idx === l2PlayerLane ? 12 : 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  });

  // Generar paquetes y obstáculos suaves
  l2SpawnTimer++;
  if (l2SpawnTimer % 65 === 0) {
    const lane = Math.floor(Math.random() * 3);
    const isObstacle = Math.random() < 0.28;
    l2Items.push({
      x: canvas.width + 40,
      lane,
      type: isObstacle ? 'slow' : 'packet',
      speed: 4.6,
      label: isObstacle ? '🐌 Señal Lenta' : `📦 Paquete ${Math.min(4, l2Collected + 1)}`
    });
  }

  // Dibujar jugador
  const py = laneY[l2PlayerLane];
  ctx.save();
  ctx.beginPath();
  ctx.arc(110, py, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#0284c7';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#facc15';
  ctx.stroke();
  ctx.font = '34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(GameState.avatar, 110, py);
  ctx.restore();

  // Mover y dibujar objetos
  for (let i = l2Items.length - 1; i >= 0; i--) {
    const item = l2Items[i];
    item.x -= item.speed;
    const iy = laneY[item.lane];

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(item.x - 55, iy - 26, 110, 52, 14);
    ctx.fillStyle = item.type === 'packet' ? '#f97316' : '#475569';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = item.type === 'packet' ? '#fde047' : '#ef4444';
    ctx.stroke();

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, item.x, iy);
    ctx.restore();

    // Colisión con el jugador
    if (Math.abs(item.x - 110) < 55 && item.lane === l2PlayerLane) {
      l2Items.splice(i, 1);
      if (item.type === 'packet') {
        l2Collected++;
        SFX.packet();
        addScore(30);
        document.getElementById('l2PacketCount').textContent = l2Collected;
        if (l2Collected >= 4) {
          stopLevel2Loop();
          setTimeout(startAssembleStage, 400);
          return;
        }
      } else {
        SFX.error();
      }
      continue;
    }

    if (item.x < -80) l2Items.splice(i, 1);
  }

  l2LoopId = requestAnimationFrame(updateHighwayLoop);
}

function startAssembleStage() {
  document.getElementById('l2StageHighway').classList.add('hidden');
  document.getElementById('l2StageAssemble').classList.remove('hidden');
  document.getElementById('l2StepBadge').textContent = 'Paso 3: Unir los Paquetes';

  const msg =
    '¡Los paquetes llegaron por distintos caminos! Haz clic en los botones en orden: primero el 1, luego el 2, el 3 y el 4 para rearmar tu dibujo.';
  document.getElementById('l2InstructionText').textContent = msg;
  speakText(msg);

  l2ExpectedSlot = 1;
  document.getElementById('finalRevealedEmoji').classList.add('hidden');
  document.getElementById('assembledSlots').classList.remove('hidden');

  document.querySelectorAll('#assembledSlots .slot').forEach(s => {
    s.classList.remove('filled');
    s.textContent = s.dataset.slot;
  });

  const scrambled = [3, 1, 4, 2];
  const container = document.getElementById('scrambledPackets');
  container.innerHTML = '';

  scrambled.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'scramble-btn';
    btn.textContent = `📦 Paquete #${num}`;
    btn.onclick = () => {
      if (num === l2ExpectedSlot) {
        SFX.connect();
        btn.style.visibility = 'hidden';
        const slotEl = document.querySelector(`#assembledSlots .slot[data-slot="${num}"]`);
        slotEl.classList.add('filled');
        slotEl.textContent = `✅ Parte ${num}`;
        l2ExpectedSlot++;

        if (l2ExpectedSlot > 4) {
          document.getElementById('assembledSlots').classList.add('hidden');
          const finalEmoji = document.getElementById('finalRevealedEmoji');
          finalEmoji.textContent = l2ChosenEmoji;
          finalEmoji.classList.remove('hidden');
          SFX.win();

          setTimeout(() => {
            completeMission(
              2,
              '¡Misión 2 Superada!',
              `¡Tu ${l2ChosenName} llegó completito a la computadora de tu amigo!`,
              'En el Internet, las fotos, canciones y videos se dividen en pequeños pedacitos llamados PAQUETES para viajar rápido por los cables y se vuelven a juntar al llegar.',
              () => showScreen('screenMap')
            );
          }, 1100);
        }
      } else {
        SFX.error();
        speakText(`¡Busca primero el Paquete número ${l2ExpectedSlot}!`);
      }
    };
    container.appendChild(btn);
  });
}

/* ==========================================================================
   MISIÓN 3: EL DETECTIVE DE LOS SERVIDORES
   ========================================================================== */
const SERVER_REQUESTS = [
  {
    kid: '👧',
    text: '¡Quiero ver una caricatura de perritos espaciales!',
    server: 'video'
  },
  {
    kid: '👦',
    text: '¡Quiero jugar una carrera de carros en línea con mi primo!',
    server: 'games'
  },
  {
    kid: '🧒',
    text: '¡Necesito investigar qué comen las ballenas para mi tarea!',
    server: 'school'
  },
  {
    kid: '👧',
    text: '¡Quiero escuchar canciones alegres para bailar en mi fiesta!',
    server: 'music'
  },
  {
    kid: '👦',
    text: '¡Quiero leer un cuento de dinosaurios y volcanes!',
    server: 'school'
  },
  {
    kid: '🧒',
    text: '¡Quiero ver una película de superhéroes con mi familia!',
    server: 'video'
  }
];

let l3Index = 0;

function startLevel3() {
  showScreen('screenLevel3');
  l3Index = 0;
  renderLevel3Request();
}

function renderLevel3Request() {
  const item = SERVER_REQUESTS[l3Index];
  document.getElementById('l3ScoreBadge').textContent =
    `Peticiones resueltas: ${l3Index} / ${SERVER_REQUESTS.length}`;
  document.getElementById('clientKidEmoji').textContent = item.kid;
  document.getElementById('requestText').textContent = `"${item.text}"`;
  speakText(item.text);
}

function handleServerChoice(chosenServer) {
  const current = SERVER_REQUESTS[l3Index];
  if (!current) return;

  if (chosenServer === current.server) {
    SFX.packet();
    addScore(35);
    l3Index++;
    if (l3Index >= SERVER_REQUESTS.length) {
      completeMission(
        3,
        '¡Misión 3 Completada!',
        '¡Enviaste todas las búsquedas al Servidor correcto!',
        'Las páginas web, videos y videojuegos no flotan en el aire: están guardados en supercomputadoras gigantes llamadas SERVIDORES que trabajan día y noche.',
        () => showScreen('screenMap')
      );
    } else {
      renderLevel3Request();
    }
  } else {
    SFX.error();
    speakText('¡Ups! Ese no es el servidor correcto. Fíjate bien en lo que pide el niño.');
  }
}

/* ==========================================================================
   MISIÓN 4: ESCUDO PROTECTOR (INTERNET SEGURO)
   ========================================================================== */
const FIREWALL_CASES = [
  {
    icon: '📸',
    title: 'Foto familiar de tus abuelitos',
    desc: 'Tu abuelita te manda una foto del perrito de la familia.',
    safe: true
  },
  {
    icon: '🦠',
    title: '¡Archivo extraño: VIRUS_TRAVIESO.exe!',
    desc: 'Un programa desconocido que quiere desordenar tu computadora.',
    safe: false
  },
  {
    icon: '🪐',
    title: 'Página educativa del Sistema Solar',
    desc: 'Información de la escuela para aprender los nombres de los planetas.',
    safe: true
  },
  {
    icon: '🕵️',
    title: 'Mensaje de un desconocido en un juego',
    desc: '"¡Hola! Dime tu contraseña secreta y dónde vives."',
    safe: false
  },
  {
    icon: '🎁',
    title: 'Anuncio falso: "¡GANASTE 1,000 JUGUETES GRATIS!"',
    desc: 'Una ventana brillante sospechosa que te pide hacer clic sin permiso.',
    safe: false
  },
  {
    icon: '🎵',
    title: 'Canción infantil de la clase de música',
    desc: 'Tu maestra compartió la canción para practicar el baile escolar.',
    safe: true
  }
];

let l4Index = 0;

function startLevel4() {
  showScreen('screenLevel4');
  l4Index = 0;
  renderFirewallCase();
}

function renderFirewallCase() {
  const item = FIREWALL_CASES[l4Index];
  document.getElementById('firewallProgress').textContent =
    `Caso ${l4Index + 1} de ${FIREWALL_CASES.length}`;
  document.getElementById('fwIcon').textContent = item.icon;
  document.getElementById('fwTitle').textContent = item.title;
  document.getElementById('fwDesc').textContent = item.desc;
  speakText(`${item.title}. ${item.desc}`);
}

function handleFirewallDecision(allowClicked) {
  const item = FIREWALL_CASES[l4Index];
  if (!item) return;

  if (allowClicked === item.safe) {
    SFX.packet();
    addScore(40);
    l4Index++;
    if (l4Index >= FIREWALL_CASES.length) {
      completeMission(
        4,
        '¡Guardián Maestro del Internet!',
        '¡Protegiste la computadora y completaste las 4 Misiones!',
        'Usar el Internet es maravilloso para aprender y jugar, pero siempre debemos navegar con permiso de nuestros papás o maestros y nunca compartir datos personales.',
        () => showScreen('screenCertificate')
      );
    } else {
      renderFirewallCase();
    }
  } else {
    SFX.error();
    if (item.safe) {
      speakText('¡Este paquete sí es seguro! Viene de tu familia o escuela. Déjalo pasar.');
    } else {
      speakText('¡Cuidado! Eso es peligroso o un virus. ¡Usa el Escudo Bloqueador!');
    }
  }
}

/* ==========================================================================
   SISTEMA DE CONFETI PARA CELEBRACIONES
   ========================================================================== */
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    size: 8 + Math.random() * 8,
    color: ['#facc15', '#38bdf8', '#22c55e', '#f97316', '#ec4899', '#a855f7'][
      Math.floor(Math.random() * 6)
    ],
    vy: 3 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * Math.PI
  }));

  let frames = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frames++;
    if (frames < 140) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(step);
}

/* ==========================================================================
   INICIALIZACIÓN DE EVENTOS
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // Selección de Avatar
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.click();
      document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      GameState.avatar = btn.dataset.avatar;
    });
  });

  // Botón Comenzar Aventura
  document.getElementById('btnStartAdventure').addEventListener('click', () => {
    const nameInput = document.getElementById('playerNameInput').value.trim();
    GameState.playerName = nameInput || 'Explorador';
    showScreen('screenMap');
  });

  // Botón Home en la barra superior
  document.getElementById('btnHome').addEventListener('click', () => {
    showScreen('screenMap');
  });

  // Controles de Sonido y Voz
  document.getElementById('btnVoiceToggle').addEventListener('click', e => {
    GameState.voiceEnabled = !GameState.voiceEnabled;
    e.currentTarget.querySelector('.btn-label').textContent =
      `Voz: ${GameState.voiceEnabled ? 'SÍ' : 'NO'}`;
    if (!GameState.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  document.getElementById('btnSoundToggle').addEventListener('click', e => {
    GameState.soundEnabled = !GameState.soundEnabled;
    e.currentTarget.querySelector('.btn-label').textContent =
      GameState.soundEnabled ? 'Sonido' : 'Silencio';
  });

  // Botones de volver al mapa
  document.querySelectorAll('.btn-back[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.goto));
  });

  // Botones de lectura de voz
  document.getElementById('btnSpeakMap').addEventListener('click', () => {
    speakText(document.getElementById('mapSpeechText').textContent, true);
  });

  document.querySelectorAll('.btn-speak-small').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.speakTarget;
      const el = document.getElementById(targetId);
      if (el) speakText(el.textContent, true);
    });
  });

  // Diccionario de Bit en el mapa
  document.querySelectorAll('.glossary-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      SFX.click();
      speakText(chip.textContent, true);
    });
  });

  // Tarjetas de Misión en el Mapa
  document.querySelectorAll('.mission-card').forEach(card => {
    card.addEventListener('click', () => {
      const lvl = Number(card.dataset.level);
      if (lvl === 1) startLevel1();
      if (lvl === 2) startLevel2();
      if (lvl === 3) startLevel3();
      if (lvl === 4) startLevel4();
    });
  });

  // Eventos Misión 1
  const canvasL1 = document.getElementById('canvasLevel1');
  canvasL1.addEventListener('click', handleLevel1Click);

  document.getElementById('btnL1SendTest').addEventListener('click', () => {
    SFX.packet();
    l1RequiredLinks.forEach(pair => spawnDataPulses(pair[0], pair[1]));
    document.getElementById('btnL1SendTest').classList.add('hidden');
    document.getElementById('btnL1NextStage').classList.remove('hidden');
  });

  document.getElementById('btnL1NextStage').addEventListener('click', () => {
    if (l1Stage < 3) {
      l1Stage++;
      loadLevel1Stage(l1Stage);
    } else {
      completeMission(
        1,
        '¡Misión 1 Completada!',
        '¡Conectaste las casas, la ciudad y los cables submarinos del mundo!',
        'El INTERNET es una gran red mundial que conecta millones de computadoras, celulares y tabletas usando ondas Wi-Fi, rúters y largos cables debajo del mar.',
        () => showScreen('screenMap')
      );
    }
  });

  // Eventos Misión 2
  document.querySelectorAll('.drawing-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.click();
      document.querySelectorAll('.drawing-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      l2ChosenEmoji = btn.dataset.emoji;
      l2ChosenName = btn.dataset.name;
      document.getElementById('wholeImageDisplay').textContent = l2ChosenEmoji;
    });
  });

  document.getElementById('btnSlicePackets').addEventListener('click', () => {
    SFX.connect();
    document.getElementById('wholeImageDisplay').classList.add('hidden');
    document.getElementById('packetsDisplay').classList.remove('hidden');
    document.getElementById('btnSlicePackets').classList.add('hidden');
    document.getElementById('btnStartHighway').classList.remove('hidden');
    speakText('¡Mira! Tu dibujo se dividió en 4 paquetes pequeños numerados. ¡Ahora llévalos por el cable!');
  });

  document.getElementById('btnStartHighway').addEventListener('click', startHighwayGame);

  document.getElementById('btnLaneUp').addEventListener('click', () => {
    if (l2PlayerLane > 0) {
      l2PlayerLane--;
      SFX.click();
    }
  });

  document.getElementById('btnLaneDown').addEventListener('click', () => {
    if (l2PlayerLane < 2) {
      l2PlayerLane++;
      SFX.click();
    }
  });

  // Permitir cambiar de carril haciendo clic directamente sobre el cable en el lienzo
  const canvasL2 = document.getElementById('canvasLevel2');
  canvasL2.addEventListener('click', e => {
    const rect = canvasL2.getBoundingClientRect();
    const scaleY = canvasL2.height / rect.height;
    const my = (e.clientY - rect.top) * scaleY;
    if (my < 130) l2PlayerLane = 0;
    else if (my < 235) l2PlayerLane = 1;
    else l2PlayerLane = 2;
    SFX.click();
  });

  window.addEventListener('keydown', e => {
    if (GameState.currentScreen === 'screenLevel2') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (l2PlayerLane > 0) l2PlayerLane--;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (l2PlayerLane < 2) l2PlayerLane++;
      }
    }
  });

  // Eventos Misión 3
  document.querySelectorAll('.server-rack').forEach(rack => {
    rack.addEventListener('click', () => {
      handleServerChoice(rack.dataset.server);
    });
  });

  // Eventos Misión 4
  document.getElementById('btnFwAllow').addEventListener('click', () => handleFirewallDecision(true));
  document.getElementById('btnFwBlock').addEventListener('click', () => handleFirewallDecision(false));

  // Diploma
  document.getElementById('btnBackToMapFromCert').addEventListener('click', () => {
    showScreen('screenMap');
  });

  // Panel Profesor
  const teacherModal = document.getElementById('teacherModal');
  document.getElementById('btnTeacherMode').addEventListener('click', () => {
    teacherModal.classList.remove('hidden');
  });
  document.getElementById('btnCloseTeacherModal').addEventListener('click', () => {
    teacherModal.classList.add('hidden');
  });
  document.getElementById('btnUnlockAll').addEventListener('click', () => {
    GameState.unlocked = { 1: true, 2: true, 3: true, 4: true };
    updateHUD();
    SFX.win();
    teacherModal.classList.add('hidden');
  });
  document.querySelectorAll('[data-teacher-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.teacherGoto;
      teacherModal.classList.add('hidden');
      if (target === '1') startLevel1();
      else if (target === '2') startLevel2();
      else if (target === '3') startLevel3();
      else if (target === '4') startLevel4();
      else if (target === 'cert') showScreen('screenCertificate');
    });
  });
});
