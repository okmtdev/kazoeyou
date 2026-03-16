/**
 * かぞえよう！ メインゲームロジック
 */
(() => {
  // ========== 状態管理 ==========
  let difficulty = 'easy';
  let method = 'select';
  let currentStageIndex = 0;
  let objects = [];
  let animationFrameId = null;
  let recognizers = [];
  let isCheckingAnswer = false;

  const DIFFICULTY_LABELS = {
    easy: '🌱 かんたん',
    normal: '🌟 ふつう',
    hard: '🔥 むずかしい',
    extra: '👑 えくすとら',
  };

  // ========== DOM要素 ==========
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ========== 画面遷移 ==========
  function showScreen(id) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
    if (id !== 'game') {
      stopAnimation();
      BGM.stop();
    }
  }

  // ========== localStorage ==========
  function getClearData() {
    try {
      return JSON.parse(localStorage.getItem('kazoeyou_clear') || '{}');
    } catch {
      return {};
    }
  }
  function setClear(diff, index) {
    const data = getClearData();
    if (!data[diff]) data[diff] = [];
    if (!data[diff].includes(index)) data[diff].push(index);
    localStorage.setItem('kazoeyou_clear', JSON.stringify(data));
  }
  function isCleared(diff, index) {
    const data = getClearData();
    return data[diff] && data[diff].includes(index);
  }

  // むずかしい全クリ判定
  function isHardAllCleared() {
    const data = getClearData();
    if (!data.hard) return false;
    for (let i = 0; i < STAGES.hard.length; i++) {
      if (!data.hard.includes(i)) return false;
    }
    return true;
  }

  // えくすとらボタンの表示更新
  function updateExtraButton() {
    const btn = $('#btn-extra');
    btn.style.display = isHardAllCleared() ? 'flex' : 'none';
  }

  // ========== SE / BGM トグル ==========
  $('#btn-se-toggle').addEventListener('click', () => {
    SE.init();
    const on = SE.toggleSE();
    const btn = $('#btn-se-toggle');
    btn.textContent = on ? '🔊 SE' : '🔇 SE';
    btn.classList.toggle('btn-sound-off', !on);
    if (on) SE.tap();
  });

  $('#btn-bgm-toggle').addEventListener('click', () => {
    BGM.init();
    const on = BGM.toggle();
    const btn = $('#btn-bgm-toggle');
    btn.textContent = on ? '🔊 BGM' : '🔇 BGM';
    btn.classList.toggle('btn-sound-off', !on);
  });

  // ========== タイトル画面: 難易度選択 ==========
  function initTitle() {
    $$('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        SE.init();
        SE.tap();
        difficulty = btn.dataset.difficulty;
        showMethodScreen();
      });
    });
  }

  // ========== 回答方法選択画面 ==========
  function showMethodScreen() {
    showScreen('method');
    $('#method-difficulty-label').textContent = DIFFICULTY_LABELS[difficulty];
  }

  $$('[data-method]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SE.tap();
      method = btn.dataset.method;
      showStageSelect();
    });
  });

  $('#btn-back-to-title').addEventListener('click', () => {
    SE.tap();
    showScreen('title');
    updateExtraButton();
  });

  // ========== ステージ選択画面 ==========
  function showStageSelect() {
    showScreen('stages');
    $('#stage-difficulty-label').textContent = DIFFICULTY_LABELS[difficulty];
    const list = $('#stage-list');
    list.innerHTML = '';
    const stages = STAGES[difficulty];
    stages.forEach((stage, i) => {
      const card = document.createElement('div');
      card.className = 'stage-card' + (isCleared(difficulty, i) ? ' cleared' : '');
      card.innerHTML = `
        <div class="stage-emoji">${stage.stageEmoji}</div>
        <div class="stage-name">${stage.stageName}</div>
      `;
      card.addEventListener('click', () => {
        SE.tap();
        currentStageIndex = i;
        startGame();
      });
      list.appendChild(card);
    });
  }

  $('#btn-back-method').addEventListener('click', () => {
    SE.tap();
    showMethodScreen();
  });

  // ========== ゲーム画面 ==========
  function startGame() {
    isCheckingAnswer = false;
    showScreen('game');

    const overlay = $('#result-overlay');
    overlay.style.display = 'none';
    $('#result-buttons').style.display = 'none';
    $('#answer-area').style.display = '';

    const stages = STAGES[difficulty];
    const stage = stages[currentStageIndex];
    const questions = stage.question.join('　');
    $('#game-question').textContent = questions;
    $('#game-stage-num').textContent = `${currentStageIndex + 1} / ${stages.length}`;

    // 回答エリアを先にセットアップ (フィールドサイズ確定のため)
    setupAnswerArea(stage);

    // レイアウト確定後にフィールド配置
    requestAnimationFrame(() => {
      setupField(stage);
      if (stage.moving) startAnimation();
    });

    // BGM開始
    BGM.start();
  }

  $('#btn-back-stages').addEventListener('click', () => {
    SE.tap();
    stopAnimation();
    BGM.stop();
    showStageSelect();
  });

  // ========== フィールドにオブジェクトを配置 ==========
  function setupField(stage) {
    const field = $('#game-field');
    field.innerHTML = '';
    objects = [];

    const fieldRect = field.getBoundingClientRect();
    const fw = fieldRect.width || 360;
    const fh = fieldRect.height || 300;

    stage.target.forEach((emoji, ti) => {
      for (let i = 0; i < stage.targetCount[ti]; i++) {
        createObject(field, emoji, fw, fh, stage.moving, 'target', ti);
      }
    });

    for (let i = 0; i < stage.distractorCount; i++) {
      const emoji = stage.distractors[i % stage.distractors.length];
      createObject(field, emoji, fw, fh, stage.moving, 'distractor', -1);
    }
  }

  function createObject(field, emoji, fw, fh, moving, type, targetIndex) {
    const el = document.createElement('div');
    el.className = 'game-obj';
    el.textContent = emoji;
    el.dataset.type = type;
    el.dataset.targetIndex = targetIndex;

    const marginX = 30;
    const marginTop = 20;
    const marginBottom = 40;
    const x = marginX + Math.random() * (fw - marginX * 2);
    const y = marginTop + Math.random() * (fh - marginTop - marginBottom);

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const obj = {
      el, x, y,
      vx: moving ? (Math.random() - 0.5) * 1.2 : 0,
      vy: moving ? (Math.random() - 0.5) * 1.2 : 0,
      type, targetIndex, emoji,
    };

    if (!moving) {
      el.style.animation = `float ${2 + Math.random() * 2}s ease-in-out infinite`;
      el.style.animationDelay = `${Math.random() * 2}s`;
    }

    objects.push(obj);
    field.appendChild(el);
  }

  // ========== アニメーション ==========
  function startAnimation() {
    const field = $('#game-field');
    const margin = 20;
    const marginBottom = 40;

    function frame() {
      const fw = field.clientWidth;
      const fh = field.clientHeight;
      objects.forEach((obj) => {
        if (obj.vx === 0 && obj.vy === 0) return;
        obj.x += obj.vx;
        obj.y += obj.vy;
        if (obj.x < margin || obj.x > fw - margin) obj.vx *= -1;
        if (obj.y < margin || obj.y > fh - marginBottom) obj.vy *= -1;
        obj.x = Math.max(margin, Math.min(fw - margin, obj.x));
        obj.y = Math.max(margin, Math.min(fh - marginBottom, obj.y));
        obj.el.style.left = obj.x + 'px';
        obj.el.style.top = obj.y + 'px';
      });
      animationFrameId = requestAnimationFrame(frame);
    }
    animationFrameId = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ========== 回答エリアのセットアップ ==========
  function setupAnswerArea(stage) {
    const area = $('#answer-area');
    area.innerHTML = '';
    recognizers = [];
    const numTargets = stage.target.length;
    if (method === 'select') {
      setupSelectAnswer(area, stage, numTargets);
    } else {
      setupDrawAnswer(area, stage, numTargets);
    }
  }

  // ---------- せんたく回答 ----------
  function setupSelectAnswer(area, stage, numTargets) {
    const container = document.createElement('div');
    container.className = 'select-answer';

    const answerGroups = [];
    for (let t = 0; t < numTargets; t++) {
      const correctNum = stage.targetCount[t];
      const numDigits = correctNum >= 10 ? 2 : 1;
      const groupDiv = document.createElement('div');
      groupDiv.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:4px;';
      const label = document.createElement('span');
      label.textContent = stage.target[t];
      label.style.fontSize = '1.5rem';
      groupDiv.appendChild(label);
      const display = document.createElement('div');
      display.className = 'answer-display';
      const digits = [];
      for (let d = 0; d < numDigits; d++) {
        const digitEl = document.createElement('div');
        digitEl.className = 'answer-digit';
        digitEl.dataset.group = t;
        digitEl.dataset.digit = d;
        digitEl.addEventListener('click', () => {
          if (isCheckingAnswer) return;
          if (digitEl.textContent !== '') {
            digitEl.textContent = '';
            digitEl.classList.remove('filled');
            SE.tap();
          }
        });
        display.appendChild(digitEl);
        digits.push(digitEl);
      }
      groupDiv.appendChild(display);
      container.appendChild(groupDiv);
      answerGroups.push({ digits, numDigits });
    }

    const pad = document.createElement('div');
    pad.className = 'number-pad';
    for (let n = 0; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => {
        if (isCheckingAnswer) return;
        for (const group of answerGroups) {
          for (const digit of group.digits) {
            if (digit.textContent === '') {
              digit.textContent = n;
              digit.classList.add('filled');
              SE.numPick();
              return;
            }
          }
        }
      });
      pad.appendChild(btn);
    }
    container.appendChild(pad);

    const submitRow = document.createElement('div');
    submitRow.className = 'submit-row';
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'こたえあわせ！';
    submitBtn.addEventListener('click', () => {
      if (isCheckingAnswer) return;
      const answers = answerGroups.map((g) => {
        const numStr = g.digits.map((d) => d.textContent).join('');
        return numStr === '' ? -1 : parseInt(numStr, 10);
      });
      if (answers.some((a) => a < 0 || isNaN(a))) return;
      SE.tap();
      checkAnswer(stage, answers);
    });
    submitRow.appendChild(submitBtn);
    container.appendChild(submitRow);
    area.appendChild(container);
  }

  // ---------- てがき回答 ----------
  function setupDrawAnswer(area, stage, numTargets) {
    const container = document.createElement('div');
    container.className = 'draw-answer';
    const drawContainer = document.createElement('div');
    drawContainer.className = 'draw-container';
    const canvasSize = window.innerWidth < 480 ? 100 : window.innerWidth < 769 ? 120 : 140;

    const groups = [];
    for (let t = 0; t < numTargets; t++) {
      const correctNum = stage.targetCount[t];
      const numDigits = correctNum >= 10 ? 2 : 1;
      const groupEl = document.createElement('div');
      groupEl.className = 'draw-digit-group';
      const label = document.createElement('div');
      label.className = 'draw-digit-label';
      label.textContent = stage.target[t];
      label.style.fontSize = '1.5rem';
      groupEl.appendChild(label);
      const canvases = [];
      const canvasRow = document.createElement('div');
      canvasRow.style.cssText = 'display:flex; gap:4px;';
      for (let d = 0; d < numDigits; d++) {
        const canvas = document.createElement('canvas');
        canvas.className = 'draw-canvas';
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        canvas.style.width = canvasSize + 'px';
        canvas.style.height = canvasSize + 'px';
        canvasRow.appendChild(canvas);
        canvases.push(canvas);
      }
      groupEl.appendChild(canvasRow);
      const resultDiv = document.createElement('div');
      resultDiv.className = 'draw-result';
      resultDiv.innerHTML = 'よみとりけっか: <span>?</span>';
      groupEl.appendChild(resultDiv);
      drawContainer.appendChild(groupEl);
      groups.push({ canvases, resultDiv, numDigits });
    }
    container.appendChild(drawContainer);

    const controls = document.createElement('div');
    controls.className = 'draw-controls';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear';
    clearBtn.textContent = 'くりあ';
    clearBtn.addEventListener('click', () => {
      if (isCheckingAnswer) return;
      SE.tap();
      recognizers.forEach((r) => r.clear());
      groups.forEach((g) => {
        g.resultDiv.innerHTML = 'よみとりけっか: <span>?</span>';
      });
    });
    controls.appendChild(clearBtn);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'こたえあわせ！';
    submitBtn.addEventListener('click', () => {
      if (isCheckingAnswer) return;
      const answers = [];
      let gi = 0;
      for (const group of groups) {
        let numStr = '';
        for (let d = 0; d < group.numDigits; d++) {
          const r = recognizers[gi + d];
          const digit = r.recognize();
          if (digit < 0) { numStr = ''; break; }
          numStr += digit;
        }
        gi += group.numDigits;
        answers.push(numStr === '' ? -1 : parseInt(numStr, 10));
      }
      if (answers.some((a) => a < 0 || isNaN(a))) return;
      SE.tap();
      checkAnswer(stage, answers);
    });
    controls.appendChild(submitBtn);
    container.appendChild(controls);
    area.appendChild(container);

    requestAnimationFrame(() => {
      for (const group of groups) {
        for (const canvas of group.canvases) {
          const rec = new HandwritingRecognizer(canvas);
          rec.onStrokeEnd = () => updateRecognitionResults(groups);
          recognizers.push(rec);
        }
      }
    });
  }

  function updateRecognitionResults(groups) {
    let ri = 0;
    for (const group of groups) {
      let numStr = '';
      for (let d = 0; d < group.numDigits; d++) {
        const r = recognizers[ri + d];
        if (r.hasContent()) {
          const digit = r.recognize();
          numStr += digit >= 0 ? digit : '?';
        } else {
          numStr += '?';
        }
      }
      ri += group.numDigits;
      group.resultDiv.innerHTML = `よみとりけっか: <span>${numStr}</span>`;
    }
  }

  // ========== 答え合わせ ==========
  function checkAnswer(stage, answers) {
    isCheckingAnswer = true;
    stopAnimation();
    BGM.stop();

    const correct = stage.targetCount;
    const isCorrect = correct.every((c, i) => c === answers[i]);
    if (isCorrect) setClear(difficulty, currentStageIndex);

    const field = $('#game-field');
    objects.forEach((obj) => {
      obj.el.style.animation = 'none';
      if (obj.type === 'distractor') {
        obj.el.style.transition = 'opacity 0.5s';
        obj.el.style.opacity = '0.2';
      }
    });

    $('#answer-area').style.display = 'none';
    const overlay = $('#result-overlay');
    overlay.style.display = 'flex';
    const resultTitle = $('#result-title');
    const resultCount = $('#result-count');
    const resultSummary = $('#result-summary');
    const resultButtons = $('#result-buttons');
    resultTitle.textContent = '';
    resultCount.textContent = '';
    resultSummary.innerHTML = '';
    resultButtons.style.display = 'none';

    const targetObjs = {};
    objects.forEach((obj) => {
      if (obj.type === 'target') {
        if (!targetObjs[obj.targetIndex]) targetObjs[obj.targetIndex] = [];
        targetObjs[obj.targetIndex].push(obj);
      }
    });

    animateCount(field, targetObjs, stage, resultCount, resultTitle, resultSummary, isCorrect, answers);
  }

  function animateCount(field, targetObjs, stage, countDisplay, titleDisplay, summaryDisplay, isCorrect, answers) {
    const targetIndices = Object.keys(targetObjs).sort();
    let tIdx = 0;

    function countNextGroup() {
      if (tIdx >= targetIndices.length) {
        setTimeout(() => {
          let summaryHtml = '';
          for (let i = 0; i < stage.target.length; i++) {
            const emoji = stage.target[i];
            const correctVal = stage.targetCount[i];
            const userVal = answers[i];
            const match = correctVal === userVal;
            summaryHtml += `<div class="result-summary-row">
              ${emoji}
              きみのこたえ: <span class="${match ? 'correct-val' : 'wrong-val'}">${userVal}</span>
              せいかい: <span class="correct-val">${correctVal}</span>
            </div>`;
          }
          summaryDisplay.innerHTML = summaryHtml;
          titleDisplay.textContent = isCorrect ? '🎉 せいかい！' : '😢 ざんねん…';
          titleDisplay.className = 'result-title ' + (isCorrect ? 'correct' : 'wrong');
          if (isCorrect) { SE.correct(); } else { SE.wrong(); }
          showResultButtons(isCorrect);
        }, 600);
        return;
      }

      const ti = targetIndices[tIdx];
      const objs = targetObjs[ti];
      const emoji = stage.target[ti];
      let count = 0;
      countDisplay.textContent = `${emoji}  : 0`;

      function countNext() {
        if (count >= objs.length) {
          countDisplay.textContent = `${emoji}  : ${objs.length} こ！`;
          SE.groupDone();
          tIdx++;
          setTimeout(countNextGroup, 800);
          return;
        }
        const obj = objs[count];
        obj.el.style.transition = 'transform 0.2s';
        obj.el.style.transform = 'scale(1.4)';
        obj.el.style.zIndex = '5';
        setTimeout(() => { obj.el.style.transform = 'scale(1)'; }, 300);

        const badge = document.createElement('div');
        badge.className = 'count-badge';
        badge.textContent = count + 1;
        badge.style.left = (obj.x + 20) + 'px';
        badge.style.top = (obj.y - 8) + 'px';
        field.appendChild(badge);

        SE.count();
        count++;
        countDisplay.textContent = `${emoji}  : ${count}`;
        setTimeout(countNext, 450);
      }
      setTimeout(countNext, 400);
    }
    countNextGroup();
  }

  function showResultButtons(isCorrect) {
    const btnNext = $('#btn-next');
    const btnRetry = $('#btn-retry');
    const btnBack = $('#btn-back-result');
    const resultButtons = $('#result-buttons');
    const stages = STAGES[difficulty];

    btnNext.style.display = 'none';
    btnRetry.style.display = 'none';
    btnBack.style.display = 'inline-block';

    if (isCorrect && currentStageIndex < stages.length - 1) {
      btnNext.style.display = 'inline-block';
    }
    if (!isCorrect) {
      btnRetry.style.display = 'inline-block';
    }
    resultButtons.style.display = 'flex';
  }

  $('#btn-next').addEventListener('click', () => {
    SE.tap();
    currentStageIndex++;
    startGame();
  });
  $('#btn-retry').addEventListener('click', () => {
    SE.tap();
    startGame();
  });
  $('#btn-back-result').addEventListener('click', () => {
    SE.tap();
    showStageSelect();
  });

  // ========== 初期化 ==========
  initTitle();
  updateExtraButton();
  showScreen('title');
})();
