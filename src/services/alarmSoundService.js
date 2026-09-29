/**
 * Expiry Alarm & Audio Alert Service
 * 
 * Generates synthesized alarms, sirens, and chimes using the HTML5 Web Audio API.
 * Requires 0 external audio files, operates 100% offline, and works across all modern browsers.
 */

let audioCtx = null;
let currentOscillators = [];
let isRinging = false;
let ringIntervalId = null;

// Initialize Audio Context lazily on user gesture
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Available Alarm Sound Profiles
 */
export const ALARM_SOUND_TYPES = [
  {
    id: 'siren',
    name: '🚨 Emergency Siren',
    description: 'Alternating high-low tone for urgent perishable items',
    icon: '🚨'
  },
  {
    id: 'bell',
    name: '🔔 Harmonic Kitchen Chime',
    description: 'Pleasant multi-frequency harmonic bell chime',
    icon: '🔔'
  },
  {
    id: 'digital',
    name: '⏰ Digital Clock Beep',
    description: 'Classic rapid triple electronic beep',
    icon: '⏰'
  },
  {
    id: 'critical',
    name: '🛑 Critical Warning Alert',
    description: 'Deep pulsing attention tone for clinical / expired items',
    icon: '🛑'
  }
];

/**
 * Available Warning Sign Options
 */
export const WARNING_SIGN_OPTIONS = [
  {
    id: 'flashing-siren',
    name: '🚨 Flashing Siren',
    badge: 'SIREN ALERT',
    icon: '🚨',
    colorClasses: 'bg-rose-500 text-white ring-rose-400 animate-pulse',
    description: 'Pulsing emergency red beacon'
  },
  {
    id: 'hazard-triangle',
    name: '⚠️ Caution Triangle',
    badge: 'HAZARD CAUTION',
    icon: '⚠️',
    colorClasses: 'bg-amber-500 text-white ring-amber-400',
    description: 'Standard amber precautionary sign'
  },
  {
    id: 'critical-stop',
    name: '🛑 Critical Stop',
    badge: 'DO NOT CONSUME',
    icon: '🛑',
    colorClasses: 'bg-red-700 text-white ring-red-500 animate-bounce',
    description: 'High visibility stop / expired barrier'
  },
  {
    id: 'flame-urgent',
    name: '🔥 Urgent Quick-Use',
    badge: 'COOK OR CONSUME',
    icon: '🔥',
    colorClasses: 'bg-orange-500 text-white ring-orange-400 animate-pulse',
    description: 'Cook now before expiration'
  },
  {
    id: 'clock-countdown',
    name: '⏰ Countdown Timer',
    badge: 'EXPIRY IMMINENT',
    icon: '⏰',
    colorClasses: 'bg-indigo-600 text-white ring-indigo-400',
    description: 'Hourglass digital countdown sign'
  }
];

/**
 * Synthesizes and plays a single beep / chord
 */
function playTone(freq, type = 'sine', duration = 0.3, startTime = 0, volume = 0.4) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);

  currentOscillators.push(osc);
}

/**
 * Plays an alarm sound one-shot or continuous pattern
 */
export function playAlarmSound(soundType = 'siren', volume = 0.5) {
  stopAlarmSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  isRinging = true;

  if (soundType === 'siren') {
    // Alternating two-tone emergency siren (880Hz -> 660Hz)
    let cycle = 0;
    const playSirenStep = () => {
      if (!isRinging) return;
      const freq = cycle % 2 === 0 ? 880 : 660;
      playTone(freq, 'sawtooth', 0.28, 0, volume * 0.35);
      cycle++;
    };
    playSirenStep();
    ringIntervalId = setInterval(playSirenStep, 320);

  } else if (soundType === 'bell') {
    // Harmonic bell chord (C5 -> E5 -> G5)
    const playBellStep = () => {
      if (!isRinging) return;
      playTone(523.25, 'triangle', 0.6, 0, volume * 0.4); // C5
      playTone(659.25, 'sine', 0.7, 0.08, volume * 0.4); // E5
      playTone(783.99, 'sine', 0.9, 0.16, volume * 0.3); // G5
    };
    playBellStep();
    ringIntervalId = setInterval(playBellStep, 1100);

  } else if (soundType === 'digital') {
    // Rapid triple electronic beeps (Beep-Beep-Beep ... pause)
    const playDigitalStep = () => {
      if (!isRinging) return;
      playTone(1046.5, 'square', 0.09, 0, volume * 0.25);
      playTone(1046.5, 'square', 0.09, 0.13, volume * 0.25);
      playTone(1046.5, 'square', 0.12, 0.26, volume * 0.28);
    };
    playDigitalStep();
    ringIntervalId = setInterval(playDigitalStep, 900);

  } else if (soundType === 'critical') {
    // Deep heavy double pulse (440Hz -> 330Hz)
    const playCriticalStep = () => {
      if (!isRinging) return;
      playTone(440, 'sawtooth', 0.22, 0, volume * 0.4);
      playTone(330, 'square', 0.3, 0.25, volume * 0.35);
    };
    playCriticalStep();
    ringIntervalId = setInterval(playCriticalStep, 800);
  }
}

/**
 * Play a short 1-second preview of an alarm sound
 */
export function previewAlarmSound(soundType = 'siren', volume = 0.5) {
  playAlarmSound(soundType, volume);
  setTimeout(() => {
    stopAlarmSound();
  }, 1200);
}

/**
 * Stops all active alarm sounds and clears interval
 */
export function stopAlarmSound() {
  isRinging = false;
  if (ringIntervalId) {
    clearInterval(ringIntervalId);
    ringIntervalId = null;
  }
  currentOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  });
  currentOscillators = [];
}

/**
 * Checks if alarm is currently ringing
 */
export function isAlarmRinging() {
  return isRinging;
}

/**
 * Requests native browser desktop notification permissions
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Could not request notification permission:', err);
    return 'denied';
  }
}

/**
 * Triggers a desktop notification for an expiring product
 */
export function triggerDesktopExpiryNotification(item, daysRemaining) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const isExpired = daysRemaining < 0;
  const title = isExpired 
    ? `🚨 EXPIRED: ${item.name}` 
    : `⚠️ Expiry Warning: ${item.name} (${daysRemaining === 0 ? 'Today!' : `in ${daysRemaining} days`})`;

  const options = {
    body: isExpired 
      ? `This item expired on ${item.expiryDate}. Safe disposal or repurposing is recommended.`
      : `Expires on ${item.expiryDate}. Consider cooking or consuming to prevent waste.`,
    icon: '/favicon.ico',
    tag: `expiry-alarm-${item.id}`,
    renotify: true
  };

  try {
    new Notification(title, options);
  } catch (err) {
    console.warn('Desktop notification error:', err);
  }
}
