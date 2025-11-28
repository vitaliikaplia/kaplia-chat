// Notification sounds using Web Audio API
// 10 different pleasant notification sounds

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Sound definitions with names
export const soundOptions = [
  { id: 'chime', name: 'Дзвіночок' },
  { id: 'pop', name: 'Поп' },
  { id: 'ding', name: 'Дінь' },
  { id: 'bubble', name: 'Бульбашка' },
  { id: 'magic', name: 'Магія' },
  { id: 'xylophone', name: 'Ксилофон' },
  { id: 'water', name: 'Крапля' },
  { id: 'bell', name: 'Дзвін' },
  { id: 'whistle', name: 'Свист' },
  { id: 'coin', name: 'Монетка' },
];

// 1. Chime - two-tone pleasant chime
function playChime(ctx) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.frequency.setValueAtTime(830, now);
  osc2.frequency.setValueAtTime(1245, now);
  osc1.type = 'sine';
  osc2.type = 'sine';

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.5);
  osc2.stop(now + 0.5);
}

// 2. Pop - quick pop sound
function playPop(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}

// 3. Ding - single bell-like tone
function playDing(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(1200, now);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

  osc.start(now);
  osc.stop(now + 0.6);
}

// 4. Bubble - rising bubble sound
function playBubble(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}

// 5. Magic - sparkle/magic sound with harmonics
function playMagic(ctx) {
  const now = ctx.currentTime;
  const frequencies = [523, 659, 784, 1047];

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, now);
    osc.type = 'sine';

    const startTime = now + i * 0.05;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

// 6. Xylophone - wooden xylophone hit
function playXylophone(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(880, now);
  osc.type = 'triangle';

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

// 7. Water drop
function playWater(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.start(now);
  osc.stop(now + 0.25);
}

// 8. Bell - church bell-like
function playBell(ctx) {
  const now = ctx.currentTime;
  const frequencies = [440, 880, 1320];

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, now);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.2 / (i + 1), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.start(now);
    osc.stop(now + 0.8);
  });
}

// 9. Whistle - short whistle
function playWhistle(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.linearRampToValueAtTime(1500, now + 0.1);
  osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.start(now);
  osc.stop(now + 0.25);
}

// 10. Coin - Mario-style coin collect
function playCoin(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(988, now); // B5
  osc.frequency.setValueAtTime(1319, now + 0.08); // E6
  osc.type = 'square';

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.setValueAtTime(0.2, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

// Map of sound functions
const soundFunctions = {
  chime: playChime,
  pop: playPop,
  ding: playDing,
  bubble: playBubble,
  magic: playMagic,
  xylophone: playXylophone,
  water: playWater,
  bell: playBell,
  whistle: playWhistle,
  coin: playCoin,
};

// Play sound by ID
export function playSound(soundId = 'chime') {
  try {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playFn = soundFunctions[soundId] || soundFunctions.chime;
    playFn(ctx);
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Legacy function for backwards compatibility
export function playNotificationSound() {
  const savedSound = localStorage.getItem('kaplia_sound_type') || 'chime';
  playSound(savedSound);
}
