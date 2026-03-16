/**
 * SE (効果音) モジュール - Web Audio API
 * npm不要、ブラウザのみで動作
 */
const SE = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playTone(freq, duration, type, volume, delay) {
    if (!enabled) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.3, c.currentTime + (delay || 0));
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (delay || 0) + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + (delay || 0));
    osc.stop(c.currentTime + (delay || 0) + duration);
  }

  function playNoise(duration, volume) {
    if (!enabled) return;
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume || 0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  }

  return {
    // 数え上げの「ポン」
    count() {
      playTone(880, 0.12, 'sine', 0.25, 0);
      playTone(1320, 0.08, 'sine', 0.15, 0.03);
    },

    // 正解！ファンファーレ
    correct() {
      playTone(523, 0.15, 'square', 0.2, 0);
      playTone(659, 0.15, 'square', 0.2, 0.15);
      playTone(784, 0.15, 'square', 0.2, 0.3);
      playTone(1047, 0.4, 'square', 0.25, 0.45);
    },

    // 不正解
    wrong() {
      playTone(330, 0.25, 'sawtooth', 0.15, 0);
      playTone(260, 0.4, 'sawtooth', 0.15, 0.25);
    },

    // ボタンタップ
    tap() {
      playTone(600, 0.06, 'sine', 0.15, 0);
    },

    // 数字選択
    numPick() {
      playTone(1200, 0.05, 'sine', 0.12, 0);
    },

    // グループカウント完了
    groupDone() {
      playTone(660, 0.1, 'triangle', 0.2, 0);
      playTone(880, 0.15, 'triangle', 0.2, 0.1);
    },

    // SE の有効/無効
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    isEnabled() {
      return enabled;
    },

    // 初回タッチでAudioContextを初期化
    init() {
      getCtx();
    },
  };
})();
