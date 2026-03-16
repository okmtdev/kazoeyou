/**
 * ステージデータ定義
 * 各ステージは以下のプロパティを持つ:
 *   target: 数える対象の絵文字(1つ or 2つ)
 *   targetCount: 正解の数(1つ or 2つ)
 *   distractors: 数えなくてよいもの
 *   distractorCount: 数えなくてよいものの数
 *   moving: 動くかどうか
 */

const STAGES = {
  easy: [
    {
      target: ['🍎'],
      targetCount: [5],
      distractors: ['🌿'],
      distractorCount: 2,
      moving: false,
      question: ['🍎 は いくつ？'],
    },
    {
      target: ['🐟'],
      targetCount: [7],
      distractors: ['🪨'],
      distractorCount: 2,
      moving: false,
      question: ['🐟 は いくつ？'],
    },
    {
      target: ['⭐'],
      targetCount: [4],
      distractors: ['☁️'],
      distractorCount: 1,
      moving: false,
      question: ['⭐ は いくつ？'],
    },
    {
      target: ['🌸'],
      targetCount: [8],
      distractors: ['🍃'],
      distractorCount: 3,
      moving: false,
      question: ['🌸 は いくつ？'],
    },
    {
      target: ['🐤'],
      targetCount: [6],
      distractors: ['🌳'],
      distractorCount: 2,
      moving: false,
      question: ['🐤 は いくつ？'],
    },
  ],
  normal: [
    {
      target: ['🦋'],
      targetCount: [6],
      distractors: ['🌼'],
      distractorCount: 3,
      moving: true,
      question: ['🦋 は いくつ？'],
    },
    {
      target: ['🐠'],
      targetCount: [8],
      distractors: ['🫧'],
      distractorCount: 3,
      moving: true,
      question: ['🐠 は いくつ？'],
    },
    {
      target: ['🐝'],
      targetCount: [5],
      distractors: ['🌻'],
      distractorCount: 2,
      moving: true,
      question: ['🐝 は いくつ？'],
    },
    {
      target: ['🎈'],
      targetCount: [9],
      distractors: ['☁️'],
      distractorCount: 3,
      moving: true,
      question: ['🎈 は いくつ？'],
    },
    {
      target: ['🐞'],
      targetCount: [7],
      distractors: ['🍀'],
      distractorCount: 2,
      moving: true,
      question: ['🐞 は いくつ？'],
    },
  ],
  hard: [
    {
      target: ['🍎', '🍊'],
      targetCount: [5, 4],
      distractors: ['🌿', '🍂', '🪨'],
      distractorCount: 6,
      moving: true,
      question: ['🍎 は いくつ？', '🍊 は いくつ？'],
    },
    {
      target: ['🐟', '🐙'],
      targetCount: [6, 3],
      distractors: ['🫧', '🪨', '🌊'],
      distractorCount: 7,
      moving: true,
      question: ['🐟 は いくつ？', '🐙 は いくつ？'],
    },
    {
      target: ['⭐', '🌙'],
      targetCount: [8, 5],
      distractors: ['☁️', '✈️', '🪁'],
      distractorCount: 6,
      moving: true,
      question: ['⭐ は いくつ？', '🌙 は いくつ？'],
    },
    {
      target: ['🌸', '🌺'],
      targetCount: [7, 4],
      distractors: ['🍃', '🐛', '🌿', '🪲'],
      distractorCount: 8,
      moving: true,
      question: ['🌸 は いくつ？', '🌺 は いくつ？'],
    },
    {
      target: ['🐤', '🐸'],
      targetCount: [6, 5],
      distractors: ['🌳', '🍄', '🪺', '🌿'],
      distractorCount: 7,
      moving: true,
      question: ['🐤 は いくつ？', '🐸 は いくつ？'],
    },
  ],
};
