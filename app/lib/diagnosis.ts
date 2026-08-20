export type ResultKey = "coloring" | "meal" | "sweet";

export type Answer = {
  label: string;
  note?: string;
  score: Record<ResultKey, number>;
};

export type Question = {
  eyebrow: string;
  title: string;
  answers: Answer[];
};

export const questions: Question[] = [
  {
    eyebrow: "まずは、今日のこと",
    title: "今日は、誰と一緒ですか？",
    answers: [
      { label: "子どもと", note: "いっしょに楽しみたい", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "家族と", note: "ゆっくり過ごしたい", score: { coloring: 1, meal: 2, sweet: 0 } },
      { label: "友人と", note: "おしゃべりも楽しみたい", score: { coloring: 0, meal: 1, sweet: 2 } },
      { label: "ひとりで", note: "自分の時間を味わいたい", score: { coloring: 0, meal: 1, sweet: 2 } },
    ],
  },
  {
    eyebrow: "いまの気分をひとつ",
    title: "今日、いちばん大切にしたいことは？",
    answers: [
      { label: "一緒に楽しむ", note: "小さな思い出をつくりたい", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "しっかり満たす", note: "食事で休日の満足感を味わいたい", score: { coloring: 0, meal: 3, sweet: 0 } },
      { label: "ほっと休む", note: "甘味とお茶で気持ちをゆるめたい", score: { coloring: 0, meal: 0, sweet: 3 } },
    ],
  },
  {
    eyebrow: "お店での過ごし方",
    title: "どんな時間が心地よさそう？",
    answers: [
      { label: "手を動かして楽しむ", note: "短時間でもわくわくしたい", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "食事をゆっくり味わう", note: "休日らしい満足感がほしい", score: { coloring: 0, meal: 3, sweet: 0 } },
      { label: "お茶を飲みながら休む", note: "余白のある時間にしたい", score: { coloring: 0, meal: 0, sweet: 3 } },
    ],
  },
  {
    eyebrow: "最後は、直感で",
    title: "気になる言葉を選んでください",
    answers: [
      { label: "つくる", note: "手を動かして楽しむ", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "満たす", note: "食事をゆっくり味わう", score: { coloring: 0, meal: 3, sweet: 0 } },
      { label: "ほどく", note: "甘味とお茶でひと息", score: { coloring: 0, meal: 0, sweet: 3 } },
    ],
  },
];

export const calculateDiagnosis = (answerIndexes: number[]) => {
  if (answerIndexes.length !== questions.length) {
    throw new Error("invalid_answer_count");
  }

  const scores: Record<ResultKey, number> = { coloring: 0, meal: 0, sweet: 0 };
  const answers = answerIndexes.map((answerIndex, questionIndex) => {
    const answer = questions[questionIndex]?.answers[answerIndex];
    if (!answer) throw new Error("invalid_answer");
    scores.coloring += answer.score.coloring;
    scores.meal += answer.score.meal;
    scores.sweet += answer.score.sweet;
    return {
      question: questions[questionIndex].title,
      answer: answer.label,
      answerIndex,
    };
  });

  const result = (Object.entries(scores) as [ResultKey, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  return { result, scores, answers };
};

export const couponTypeForResult: Record<ResultKey, string> = {
  coloring: "coloring_pass",
  meal: "meal_tea_120_off",
  sweet: "warabi_tea_120_off",
};
