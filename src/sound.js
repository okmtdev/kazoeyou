/**
 * SE (効果音) & BGM モジュール - Web Audio API
 */
const SE = (() => {
  let ctx = null;
  let seEnabled = true;

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
    if (!seEnabled) return;
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

  return {
    count() {
      playTone(880, 0.12, 'sine', 0.25, 0);
      playTone(1320, 0.08, 'sine', 0.15, 0.03);
    },
    correct() {
      playTone(523, 0.15, 'square', 0.2, 0);
      playTone(659, 0.15, 'square', 0.2, 0.15);
      playTone(784, 0.15, 'square', 0.2, 0.3);
      playTone(1047, 0.4, 'square', 0.25, 0.45);
    },
    wrong() {
      playTone(330, 0.25, 'sawtooth', 0.15, 0);
      playTone(260, 0.4, 'sawtooth', 0.15, 0.25);
    },
    tap() {
      playTone(600, 0.06, 'sine', 0.15, 0);
    },
    numPick() {
      playTone(1200, 0.05, 'sine', 0.12, 0);
    },
    groupDone() {
      playTone(660, 0.1, 'triangle', 0.2, 0);
      playTone(880, 0.15, 'triangle', 0.2, 0.1);
    },
    toggleSE() {
      seEnabled = !seEnabled;
      return seEnabled;
    },
    isSEEnabled() {
      return seEnabled;
    },
    init() {
      getCtx();
    },
  };
})();

/**
 * BGM モジュール - Web Audio API でポップなループBGMを生成
 */
const BGM = (() => {
  let ctx = null;
  let enabled = false; // デフォルトOFF
  let playing = false;
  let gainNode = null;
  let sources = [];
  let loopTimer = null;

  // メロディ定義 (周波数, 拍数) - ポップなCメジャー系
  const melody = [
    [523, 0.5], [587, 0.5], [659, 0.5], [698, 0.5],
    [784, 1],   [659, 0.5], [784, 0.5],
    [880, 1],   [784, 0.5], [659, 0.5],
    [587, 1],   [523, 0.5], [587, 0.5],
    [659, 1],   [523, 1],
    [0, 0.5],
    [523, 0.5], [659, 0.5], [784, 0.5],
    [880, 0.5], [784, 0.5], [659, 0.5], [784, 0.5],
    [880, 1],   [1047, 0.5],[880, 0.5],
    [784, 1],   [659, 0.5], [523, 0.5],
    [587, 1],   [659, 1],
    [523, 1.5], [0, 0.5],
  ];

  // ベース
  const bass = [
    [262, 2], [349, 2], [392, 2], [262, 2],
    [262, 2], [349, 2], [392, 2], [262, 2],
  ];

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.08;
      gainNode.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function stopAll() {
    sources.forEach((s) => { try { s.stop(); } catch {} });
    sources = [];
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    playing = false;
  }

  function playLoop() {
    if (!enabled || playing) return;
    const c = getCtx();
    playing = true;
    const bpm = 140;
    const beatLen = 60 / bpm;

    // メロディ再生
    let time = c.currentTime + 0.05;
    let totalDuration = 0;
    melody.forEach(([freq, beats]) => {
      const dur = beats * beatLen;
      if (freq > 0) {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.1, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.95);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(time);
        osc.stop(time + dur);
        sources.push(osc);
      }
      time += dur;
      totalDuration += dur;
    });

    // ベース再生
    let bTime = c.currentTime + 0.05;
    bass.forEach(([freq, beats]) => {
      const dur = beats * beatLen;
      if (freq > 0) {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.06, bTime);
        g.gain.exponentialRampToValueAtTime(0.001, bTime + dur * 0.9);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(bTime);
        osc.stop(bTime + dur);
        sources.push(osc);
      }
      bTime += dur;
    });

    // ループ
    loopTimer = setTimeout(() => {
      playing = false;
      sources = [];
      if (enabled) playLoop();
    }, totalDuration * 1000);
  }

  return {
    start() {
      if (!enabled) return;
      getCtx();
      playLoop();
    },
    stop() {
      stopAll();
    },
    toggle() {
      enabled = !enabled;
      if (enabled) {
        getCtx();
        playLoop();
      } else {
        stopAll();
      }
      return enabled;
    },
    isEnabled() {
      return enabled;
    },
    init() {
      getCtx();
    },
  };
})();
