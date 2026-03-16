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
    if (ctx.state === 'suspended') ctx.resume();
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
    count() { playTone(880, 0.12, 'sine', 0.25, 0); playTone(1320, 0.08, 'sine', 0.15, 0.03); },
    correct() {
      playTone(523, 0.15, 'square', 0.2, 0); playTone(659, 0.15, 'square', 0.2, 0.15);
      playTone(784, 0.15, 'square', 0.2, 0.3); playTone(1047, 0.4, 'square', 0.25, 0.45);
    },
    wrong() { playTone(330, 0.25, 'sawtooth', 0.15, 0); playTone(260, 0.4, 'sawtooth', 0.15, 0.25); },
    tap() { playTone(600, 0.06, 'sine', 0.15, 0); },
    numPick() { playTone(1200, 0.05, 'sine', 0.12, 0); },
    groupDone() { playTone(660, 0.1, 'triangle', 0.2, 0); playTone(880, 0.15, 'triangle', 0.2, 0.1); },
    toggleSE() { seEnabled = !seEnabled; return seEnabled; },
    isSEEnabled() { return seEnabled; },
    init() { getCtx(); },
  };
})();

/**
 * BGM モジュール - 難易度別ループBGM
 */
const BGM = (() => {
  let ctx = null;
  let enabled = false;
  let playing = false;
  let gainNode = null;
  let sources = [];
  let loopTimer = null;
  let currentTrack = 'normal';

  // ========== かんたん / ふつう用: ほのぼのポップ (BPM 130) ==========
  const normalMelody = [
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
  const normalBass = [
    [262, 2], [349, 2], [392, 2], [262, 2],
    [262, 2], [349, 2], [392, 2], [262, 2],
  ];

  // ========== むずかしい / えくすとら用: アップテンポ激しめポップ (BPM 168) ==========
  // Aメロ: 駆け上がる勢いのあるフレーズ
  const hardMelody = [
    // A: 疾走感のあるイントロ
    [659, 0.25], [784, 0.25], [880, 0.25], [1047, 0.25],
    [988, 0.5],  [880, 0.25], [784, 0.25],
    [880, 0.5],  [659, 0.5],
    [784, 0.25], [880, 0.25], [784, 0.25], [659, 0.25],
    [587, 0.75], [0, 0.25],
    // B: 高音で跳ねるフレーズ
    [1047, 0.25],[988, 0.25], [880, 0.25], [784, 0.25],
    [880, 0.5],  [1047, 0.5],
    [1175, 0.25],[1047, 0.25],[880, 0.25], [784, 0.25],
    [880, 0.75], [0, 0.25],
    // C: 力強い展開
    [659, 0.5],  [784, 0.25], [880, 0.25],
    [1047, 0.5], [988, 0.25], [880, 0.25],
    [784, 0.5],  [880, 0.25], [1047, 0.25],
    [1175, 0.75],[1047, 0.25],
    // D: クライマックス → 解決
    [1319, 0.25],[1175, 0.25],[1047, 0.25],[880, 0.25],
    [784, 0.5],  [880, 0.5],
    [1047, 0.25],[880, 0.25], [784, 0.25], [659, 0.25],
    [784, 0.75], [0, 0.25],
    // E: 繰り返しフレーズ (勢い維持)
    [880, 0.25], [0, 0.25],   [880, 0.25], [1047, 0.25],
    [1175, 0.5], [1047, 0.25],[880, 0.25],
    [784, 0.25], [0, 0.25],   [784, 0.25], [880, 0.25],
    [1047, 0.5], [880, 0.25], [784, 0.25],
    // F: 着地
    [659, 0.5],  [784, 0.5],
    [880, 0.5],  [1047, 0.5],
    [1175, 1],   [1047, 0.5], [880, 0.25], [784, 0.25],
    [659, 1],    [0, 0.5],
  ];
  // 激しめベース: 8分音符でドライブ感
  const hardBass = [
    // パート1 (E-A-B-E)
    [165, 0.5], [165, 0.5], [220, 0.5], [220, 0.5],
    [247, 0.5], [247, 0.5], [165, 0.5], [165, 0.5],
    // パート2 (C-D-E-E)
    [262, 0.5], [262, 0.5], [294, 0.5], [294, 0.5],
    [330, 0.5], [330, 0.5], [330, 0.5], [330, 0.5],
    // パート3 (A-B-C-D)
    [220, 0.5], [220, 0.5], [247, 0.5], [247, 0.5],
    [262, 0.5], [262, 0.5], [294, 0.5], [294, 0.5],
    // パート4 (E-D-C-E) 解決
    [330, 0.5], [330, 0.5], [294, 0.5], [294, 0.5],
    [262, 0.5], [262, 0.5], [330, 0.5], [330, 0.5],
    // パート5 (リピート)
    [220, 0.5], [262, 0.5], [330, 0.5], [262, 0.5],
    [220, 0.5], [247, 0.5], [262, 0.5], [294, 0.5],
    // パート6 着地
    [330, 0.5], [330, 0.5], [262, 0.5], [262, 0.5],
    [220, 0.5], [220, 0.5], [165, 0.5], [165, 0.5],
  ];
  // ドラムパターン (激しめ): キック + スネア風
  const hardDrumPattern = [
    // 1=kick, 2=snare, 0=rest  (16分相当)
    1, 0, 0, 1, 2, 0, 1, 0,
    1, 0, 1, 0, 2, 0, 0, 1,
  ];

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.08;
      gainNode.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stopAll() {
    sources.forEach((s) => { try { s.stop(); } catch {} });
    sources = [];
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    playing = false;
  }

  function playMelodyTrack(c, melodyData, bpm, oscType, volume, startTime) {
    let time = startTime;
    const beatLen = 60 / bpm;
    let totalDuration = 0;
    melodyData.forEach(([freq, beats]) => {
      const dur = beats * beatLen;
      if (freq > 0) {
        const osc = c.createOscillator();
        osc.type = oscType;
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(volume, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.92);
        osc.connect(g);
        g.connect(gainNode);
        osc.start(time);
        osc.stop(time + dur);
        sources.push(osc);
      }
      time += dur;
      totalDuration += dur;
    });
    return totalDuration;
  }

  function playDrumTrack(c, totalDuration, bpm, startTime) {
    const beatLen = 60 / bpm;
    const stepLen = beatLen / 4; // 16分音符
    const sampleRate = c.sampleRate;
    let time = startTime;
    let step = 0;

    while (time < startTime + totalDuration) {
      const hit = hardDrumPattern[step % hardDrumPattern.length];
      if (hit > 0) {
        // ノイズベースのパーカッション
        const dur = hit === 1 ? 0.08 : 0.06;
        const bufLen = Math.floor(sampleRate * dur);
        const buf = c.createBuffer(1, bufLen, sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
        }
        const src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        const vol = hit === 1 ? 0.06 : 0.04;
        g.gain.setValueAtTime(vol, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        // キックは低音フィルタ、スネアは高音
        const filter = c.createBiquadFilter();
        filter.type = hit === 1 ? 'lowpass' : 'highpass';
        filter.frequency.value = hit === 1 ? 300 : 2000;
        src.connect(filter);
        filter.connect(g);
        g.connect(gainNode);
        src.start(time);
        sources.push(src);
      }
      time += stepLen;
      step++;
    }
  }

  function playLoop() {
    if (!enabled || playing) return;
    const c = getCtx();
    playing = true;
    const startTime = c.currentTime + 0.05;

    let totalDuration;

    if (currentTrack === 'hard') {
      const bpm = 168;
      // メロディ (square波で明るく激しく)
      totalDuration = playMelodyTrack(c, hardMelody, bpm, 'square', 0.1, startTime);
      // ベース (sawtooth波でドライブ感)
      playMelodyTrack(c, hardBass, bpm, 'sawtooth', 0.055, startTime);
      // ドラム
      playDrumTrack(c, totalDuration, bpm, startTime);
    } else {
      const bpm = 130;
      // メロディ
      totalDuration = playMelodyTrack(c, normalMelody, bpm, 'triangle', 0.1, startTime);
      // ベース
      playMelodyTrack(c, normalBass, bpm, 'sine', 0.06, startTime);
    }

    loopTimer = setTimeout(() => {
      playing = false;
      sources = [];
      if (enabled) playLoop();
    }, totalDuration * 1000);
  }

  return {
    start(diff) {
      if (!enabled) return;
      currentTrack = (diff === 'hard' || diff === 'extra') ? 'hard' : 'normal';
      getCtx();
      stopAll();
      playLoop();
    },
    stop() { stopAll(); },
    toggle() {
      enabled = !enabled;
      if (!enabled) stopAll();
      return enabled;
    },
    isEnabled() { return enabled; },
    init() { getCtx(); },
  };
})();
