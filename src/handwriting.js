/**
 * 手書き数字認識モジュール
 * Canvas上のストロークから数字を推定する簡易認識エンジン
 */
class HandwritingRecognizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this.strokes = [];
    this.currentStroke = [];

    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#333';

    this._bindEvents();
  }

  _bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      if (e.touches) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const start = (e) => {
      e.preventDefault();
      this.drawing = true;
      const pos = getPos(e);
      this.currentStroke = [pos];
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      if (!this.drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.currentStroke.push(pos);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const end = (e) => {
      if (!this.drawing) return;
      e.preventDefault();
      this.drawing = false;
      if (this.currentStroke.length > 0) {
        this.strokes.push([...this.currentStroke]);
      }
      this.currentStroke = [];
      if (this.onStrokeEnd) this.onStrokeEnd();
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    this.canvas.addEventListener('mouseup', end);
    this.canvas.addEventListener('mouseleave', end);
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    this.canvas.addEventListener('touchend', end, { passive: false });
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.strokes = [];
    this.currentStroke = [];
  }

  hasContent() {
    return this.strokes.length > 0;
  }

  /**
   * 簡易数字認識
   * ピクセル分布とストローク数から数字を推定
   */
  recognize() {
    if (this.strokes.length === 0) return -1;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // 3x3グリッドのピクセル密度を計算
    const grid = Array(9).fill(0);
    let totalInk = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (pixels[idx + 3] > 128) {
          const gx = Math.min(2, Math.floor((x / w) * 3));
          const gy = Math.min(2, Math.floor((y / h) * 3));
          grid[gy * 3 + gx]++;
          totalInk++;
        }
      }
    }

    if (totalInk < 10) return -1;

    // グリッド正規化
    const maxCell = Math.max(...grid);
    const norm = grid.map((v) => v / (maxCell || 1));

    // ストローク特徴
    const numStrokes = this.strokes.length;
    const allPoints = this.strokes.flat();
    const minX = Math.min(...allPoints.map((p) => p.x));
    const maxX = Math.max(...allPoints.map((p) => p.x));
    const minY = Math.min(...allPoints.map((p) => p.y));
    const maxY = Math.max(...allPoints.map((p) => p.y));
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const aspect = bboxH > 0 ? bboxW / bboxH : 1;

    // 上半分と下半分のインク比率
    const topInk = norm[0] + norm[1] + norm[2];
    const midInk = norm[3] + norm[4] + norm[5];
    const botInk = norm[6] + norm[7] + norm[8];
    const leftInk = norm[0] + norm[3] + norm[6];
    const rightInk = norm[2] + norm[5] + norm[8];
    const centerInk = norm[1] + norm[4] + norm[7];

    // 交差数の推定
    const midCrossings = this._countHorizontalCrossings(pixels, w, h, Math.floor(h / 2));
    const topCrossings = this._countHorizontalCrossings(pixels, w, h, Math.floor(h * 0.25));
    const botCrossings = this._countHorizontalCrossings(pixels, w, h, Math.floor(h * 0.75));

    // スコアリング方式で数字を判定
    const scores = Array(10).fill(0);

    // 0: 丸い形、真ん中が空
    if (norm[4] < 0.3 && topInk > 0.8 && botInk > 0.8) scores[0] += 3;
    if (numStrokes === 1 && norm[4] < norm[1] && norm[4] < norm[7]) scores[0] += 2;
    if (leftInk > 0.8 && rightInk > 0.8 && norm[4] < 0.4) scores[0] += 2;

    // 1: 細い、縦長
    if (aspect < 0.45) scores[1] += 4;
    if (centerInk > leftInk + 0.3 && centerInk > rightInk + 0.3) scores[1] += 2;
    if (numStrokes <= 2 && bboxW < w * 0.4) scores[1] += 2;

    // 2: 上が右寄り、下が左寄り
    if (norm[2] > norm[0] + 0.2 && norm[6] > norm[8] + 0.2) scores[2] += 3;
    if (botInk > topInk) scores[2] += 1;
    if (midCrossings === 1) scores[2] += 1;

    // 3: 右寄り
    if (rightInk > leftInk + 0.3) scores[3] += 3;
    if (topCrossings >= 1 && midCrossings >= 1 && botCrossings >= 1) scores[3] += 1;
    if (numStrokes === 1) scores[3] += 1;

    // 4: 上半分にインクが集中、角がある
    if (topInk > botInk + 0.3) scores[4] += 2;
    if (rightInk > 0.8 && norm[0] > 0.2) scores[4] += 2;
    if (numStrokes <= 3 && numStrokes >= 2) scores[4] += 2;

    // 5: 上が左寄り、下が右寄り(2の逆)
    if (norm[0] > norm[2] + 0.2 && norm[8] > norm[6] + 0.2) scores[5] += 3;
    if (topInk > 0.5 && midInk > 0.3) scores[5] += 1;

    // 6: 下に丸、上が左寄り
    if (botInk > topInk + 0.2 && leftInk > 0.6) scores[6] += 3;
    if (norm[6] > 0.3 && norm[7] > 0.3 && norm[8] > 0.2) scores[6] += 2;

    // 7: 上に横線、右下がり
    if (topInk > midInk + 0.3 && topInk > botInk + 0.3) scores[7] += 3;
    if (norm[0] > 0.2 && norm[2] > 0.2 && norm[8] > norm[6]) scores[7] += 2;
    if (numStrokes <= 2) scores[7] += 1;

    // 8: 上下に丸
    if (topInk > 0.6 && botInk > 0.6 && leftInk > 0.5 && rightInk > 0.5) scores[8] += 3;
    if (norm[4] < 0.5 && midCrossings >= 2) scores[8] += 2;
    if (numStrokes === 1) scores[8] += 1;

    // 9: 上に丸、右寄り
    if (topInk > botInk + 0.2 && rightInk > 0.5) scores[9] += 3;
    if (norm[0] > 0.2 && norm[1] > 0.2 && norm[2] > 0.2) scores[9] += 2;
    if (numStrokes === 1) scores[9] += 1;

    // 最高スコアの数字を返す
    let best = 0;
    for (let i = 1; i < 10; i++) {
      if (scores[i] > scores[best]) best = i;
    }

    return best;
  }

  _countHorizontalCrossings(pixels, w, h, y) {
    let crossings = 0;
    let wasInk = false;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const isInk = pixels[idx + 3] > 128;
      if (isInk && !wasInk) crossings++;
      wasInk = isInk;
    }
    return crossings;
  }
}
