/**
 * かぞえよう！ メインゲームロジック
 */
(() => {
  // ========== 状態管理 ==========
  let difficulty = 'easy';
  let method = 'select';
  let currentStageIndex = 0;
  let objects = []; // フィールド上のオブジェクト
  let animationFrameId = null;
  let recognizers = []; // 手書き認識器

  const DIFFICULTY_LABELS = {
    easy: 'かんたん',
    normal: 'ふつう',
    hard: 'むずかしい',
  };

  // ========== DOM要素 ==========
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ========== 画面遷移 ==========
  function showScreen(id) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    $(`#screen-${id}`).classList.add('active');
    if (id !== 'game') stopAnimation();
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

  // ========== タイトル画面 ==========
  function initTitle() {
    // 難易度ボタン
    $$('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-difficulty]').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        difficulty = btn.dataset.difficulty;
      });
    });
    // 回答方法ボタン
    $$('[data-method]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-method]').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        method = btn.dataset.method;
      });
    });
    // はじめるボタン
    $('#btn-start').addEventListener('click', () => {
      showStageSelect();
    });
  }

  // ========== ステージ選択画面 ==========
  function showStageSelect() {
    showScreen('stages');
    $('#stage-difficulty-label').textContent = DIFFICULTY_LABELS[difficulty];
    const list = $('#stage-list');
    list.innerHTML = '';
    const stages = STAGES[difficulty];
    stages.forEach((_, i) => {
      const card = document.createElement('div');
      card.className = 'stage-card' + (isCleared(difficulty, i) ? ' cleared' : '');
      card.innerHTML = `<div class="stage-num">${i + 1}</div>`;
      card.addEventListener('click', () => {
        currentStageIndex = i;
        startGame();
      });
      list.appendChild(card);
    });
  }

  $('#btn-back-title').addEventListener('click', () => showScreen('title'));

  // ========== ゲーム画面 ==========
  function startGame() {
    showScreen('game');
    const stage = STAGES[difficulty][currentStageIndex];
    const questions = stage.question.join('　');
    $('#game-question').textContent = questions;
    $('#game-stage-num').textContent = `${currentStageIndex + 1} / 5`;

    setupField(stage);
    setupAnswerArea(stage);
    if (stage.moving) startAnimation();
  }

  $('#btn-back-stages').addEventListener('click', () => {
    stopAnimation();
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

    // ターゲットを配置
    stage.target.forEach((emoji, ti) => {
      for (let i = 0; i < stage.targetCount[ti]; i++) {
        createObject(field, emoji, fw, fh, stage.moving, 'target', ti);
      }
    });

    // ディストラクターを配置
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

    const margin = 40;
    const x = margin + Math.random() * (fw - margin * 2);
    const y = margin + Math.random() * (fh - margin * 2);

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const obj = {
      el,
      x,
      y,
      vx: moving ? (Math.random() - 0.5) * 1.2 : 0,
      vy: moving ? (Math.random() - 0.5) * 1.2 : 0,
      type,
      targetIndex,
      emoji,
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
    const fw = field.clientWidth;
    const fh = field.clientHeight;
    const margin = 20;

    function frame() {
      objects.forEach((obj) => {
        if (obj.vx === 0 && obj.vy === 0) return;
        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.x < margin || obj.x > fw - margin) obj.vx *= -1;
        if (obj.y < margin || obj.y > fh - margin) obj.vy *= -1;

        obj.x = Math.max(margin, Math.min(fw - margin, obj.x));
        obj.y = Math.max(margin, Math.min(fh - margin, obj.y));

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

    // 各ターゲットごとに回答表示
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
          if (digitEl.textContent !== '') {
            digitEl.textContent = '';
            digitEl.classList.remove('filled');
          }
        });
        display.appendChild(digitEl);
        digits.push(digitEl);
      }
      groupDiv.appendChild(display);
      container.appendChild(groupDiv);
      answerGroups.push({ digits, numDigits });
    }

    // 数字パッド (0-9)
    const pad = document.createElement('div');
    pad.className = 'number-pad';
    for (let n = 0; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => {
        // 最初の空きスロットに数字を入れる
        for (const group of answerGroups) {
          for (const digit of group.digits) {
            if (digit.textContent === '') {
              digit.textContent = n;
              digit.classList.add('filled');
              return;
            }
          }
        }
      });
      pad.appendChild(btn);
    }
    container.appendChild(pad);

    // 提出ボタン
    const submitRow = document.createElement('div');
    submitRow.className = 'submit-row';
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit';
    submitBtn.textContent = 'こたえあわせ！';
    submitBtn.addEventListener('click', () => {
      const answers = answerGroups.map((g) => {
        const numStr = g.digits.map((d) => d.textContent).join('');
        return numStr === '' ? -1 : parseInt(numStr, 10);
      });
      if (answers.some((a) => a < 0 || isNaN(a))) return; // 未入力
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

      // 読み取り結果表示
      const resultDiv = document.createElement('div');
      resultDiv.className = 'draw-result';
      resultDiv.innerHTML = 'よみとりけっか: <span>?</span>';
      groupEl.appendChild(resultDiv);

      drawContainer.appendChild(groupEl);
      groups.push({ canvases, resultDiv, numDigits });
    }
    container.appendChild(drawContainer);

    // コントロール
    const controls = document.createElement('div');
    controls.className = 'draw-controls';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear';
    clearBtn.textContent = 'くりあ';
    clearBtn.addEventListener('click', () => {
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
      const answers = [];
      let gi = 0;
      for (const group of groups) {
        let numStr = '';
        for (let d = 0; d < group.numDigits; d++) {
          const r = recognizers[gi + d];
          const digit = r.recognize();
          if (digit < 0) {
            numStr = '';
            break;
          }
          numStr += digit;
        }
        gi += group.numDigits;
        answers.push(numStr === '' ? -1 : parseInt(numStr, 10));
      }
      if (answers.some((a) => a < 0 || isNaN(a))) return;
      checkAnswer(stage, answers);
    });
    controls.appendChild(submitBtn);
    container.appendChild(controls);

    area.appendChild(container);

    // 認識器を初期化
    requestAnimationFrame(() => {
      for (const group of groups) {
        for (const canvas of group.canvases) {
          const rec = new HandwritingRecognizer(canvas);
          rec.onStrokeEnd = () => {
            updateRecognitionResults(groups);
          };
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
    stopAnimation();

    const correct = stage.targetCount;
    const isCorrect = correct.every((c, i) => c === answers[i]);

    showScreen('result');

    const title = $('#result-title');
    title.textContent = isCorrect ? '🎉 せいかい！' : '😢 ざんねん…';
    title.className = 'result-title ' + (isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      setClear(difficulty, currentStageIndex);
    }

    // 答え合わせフィールドにオブジェクトを再配置
    const resultField = $('#result-field');
    resultField.innerHTML = '';
    const countDisplay = $('#result-count');
    countDisplay.textContent = '';

    // ターゲットオブジェクトだけ集める（ターゲットインデックスごと）
    const targetObjs = {};
    objects.forEach((obj) => {
      if (obj.type === 'target') {
        if (!targetObjs[obj.targetIndex]) targetObjs[obj.targetIndex] = [];
        targetObjs[obj.targetIndex].push(obj);
      }
    });

    // 全オブジェクトの位置を結果フィールドに合わせてスケーリング
    const gameField = $('#game-field');
    const gw = gameField.clientWidth || 360;
    const gh = gameField.clientHeight || 300;
    const rw = resultField.clientWidth || 500;
    const rh = resultField.clientHeight || 250;
    const sx = rw / gw;
    const sy = rh / gh;

    // 全オブジェクトを結果フィールドに再配置
    objects.forEach((obj) => {
      const el = document.createElement('div');
      el.className = 'game-obj';
      el.textContent = obj.emoji;
      el.style.left = (obj.x * sx) + 'px';
      el.style.top = (obj.y * sy) + 'px';
      el.style.fontSize = '1.5rem';
      if (obj.type === 'distractor') {
        el.style.opacity = '0.3';
      }
      el.dataset.type = obj.type;
      el.dataset.targetIndex = obj.targetIndex;
      resultField.appendChild(el);
    });

    // カウントアニメーション
    animateCount(resultField, targetObjs, stage, countDisplay, isCorrect);
  }

  function animateCount(field, targetObjs, stage, countDisplay, isCorrect) {
    const targetIndices = Object.keys(targetObjs).sort();
    let tIdx = 0;

    function countNextGroup() {
      if (tIdx >= targetIndices.length) {
        // 全カウント完了
        setTimeout(() => {
          showResultButtons(isCorrect);
        }, 500);
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
          tIdx++;
          setTimeout(countNextGroup, 800);
          return;
        }

        const obj = objs[count];
        // 対応するDOM要素にバッジをつける
        const elements = field.querySelectorAll(`.game-obj[data-target-index="${ti}"]`);
        if (elements[count]) {
          elements[count].style.transform = 'scale(1.3)';
          setTimeout(() => {
            elements[count].style.transform = 'scale(1)';
          }, 300);

          // 数字バッジ
          const badge = document.createElement('div');
          badge.className = 'count-badge';
          badge.textContent = count + 1;
          const rect = elements[count].getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          badge.style.left = (parseFloat(elements[count].style.left) + 20) + 'px';
          badge.style.top = (parseFloat(elements[count].style.top) - 8) + 'px';
          field.appendChild(badge);
        }

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

    btnNext.style.display = 'none';
    btnRetry.style.display = 'none';
    btnBack.style.display = 'inline-block';

    if (isCorrect && currentStageIndex < 4) {
      btnNext.style.display = 'inline-block';
    }
    if (!isCorrect) {
      btnRetry.style.display = 'inline-block';
    }
  }

  $('#btn-next').addEventListener('click', () => {
    currentStageIndex++;
    startGame();
  });
  $('#btn-retry').addEventListener('click', () => {
    startGame();
  });
  $('#btn-back-result').addEventListener('click', () => {
    showStageSelect();
  });

  // ========== 初期化 ==========
  initTitle();
  showScreen('title');
})();
