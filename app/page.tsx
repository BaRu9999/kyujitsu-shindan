"use client";

import { useEffect, useMemo, useState } from "react";

type ResultKey = "coloring" | "meal" | "sweet";
type View = "intro" | "question" | "result" | "table-gate" | "coloring-ready" | "preview-gallery";
type PassType = "advance" | "same_day";

type Answer = {
  label: string;
  note?: string;
  score: Record<ResultKey, number>;
};

type Question = {
  eyebrow: string;
  title: string;
  answers: Answer[];
};

type SavedDiagnosis = {
  result: ResultKey;
  diagnosedOn: string;
  token: string;
  source: string;
  previewUsed: boolean;
  eventEligible: boolean;
  passType: PassType | null;
};

const STORAGE_KEY = "kyujitsu-diagnosis-v2";
const EVENT_START = "2026-08-22";

const questions: Question[] = [
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
    title: "今日、いちばん楽しみたいのは？",
    answers: [
      { label: "一緒に遊ぶ時間", note: "小さな思い出をつくりたい", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "しっかりした食事", note: "満足できる休日にしたい", score: { coloring: 0, meal: 3, sweet: 0 } },
      { label: "甘味でひと休み", note: "ほっと気持ちをゆるめたい", score: { coloring: 0, meal: 0, sweet: 3 } },
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
      { label: "季節のぬりえ", note: "今日だけの一枚", score: { coloring: 3, meal: 0, sweet: 0 } },
      { label: "ごほうび御膳", note: "食事とお茶で満たされる", score: { coloring: 0, meal: 3, sweet: 0 } },
      { label: "もちもちわらび餅", note: "甘味とお茶でひと息", score: { coloring: 0, meal: 0, sweet: 3 } },
    ],
  },
];

const results = {
  coloring: {
    kicker: "親子わくわく",
    title: "季節のぬりえ時間",
    description: "ことばを選んで、今日だけの一枚を楽しむ休日。お席の卓上QRからぬりえを始められます。",
    color: "var(--teal)",
    mark: "ぬ",
  },
  meal: {
    kicker: "ごほうび御膳",
    title: "御膳とお茶の満足時間",
    description: "しっかり食べて、食後はお茶でひと息。休日をゆっくり味わいたいあなたに。",
    color: "var(--vermilion)",
    mark: "膳",
  },
  sweet: {
    kicker: "ほっと甘味",
    title: "わらび餅とお茶の休息時間",
    description: "もちもちの甘味とドリンクで、気持ちをほどく休日。おしゃべりにも、ひとり時間にも。",
    color: "var(--mustard)",
    mark: "甘",
  },
} satisfies Record<ResultKey, { kicker: string; title: string; description: string; color: string; mark: string }>;

const japanDayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const isDiagnosisValid = (diagnosis: SavedDiagnosis, day: string) =>
  diagnosis.diagnosedOn === day || (diagnosis.result === "coloring" && diagnosis.eventEligible);

const makeToken = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const normalizeSavedDiagnosis = (diagnosis: SavedDiagnosis) => ({
  ...diagnosis,
  passType: diagnosis.result === "coloring"
    ? diagnosis.passType || (diagnosis.diagnosedOn < EVENT_START ? "advance" : "same_day")
    : null,
}) satisfies SavedDiagnosis;

const formatPassNumber = (diagnosis: SavedDiagnosis) => {
  if (diagnosis.result !== "coloring") return diagnosis.token;
  return `${diagnosis.passType === "advance" ? "PRE" : "DAY"}-${diagnosis.token}`;
};

type ParticipationEvent =
  | "diagnosis_completed"
  | "table_qr_opened"
  | "preview_started"
  | "coloring_started"
  | "artwork_submitted";

const syncParticipation = async (
  diagnosis: SavedDiagnosis,
  eventType: ParticipationEvent,
  metadata: Record<string, string | number | boolean | null> = {},
) => {
  try {
    await fetch("/api/participation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantCode: formatPassNumber(diagnosis),
        token: diagnosis.token,
        result: diagnosis.result,
        passType: diagnosis.passType,
        source: diagnosis.source,
        diagnosedOn: diagnosis.diagnosedOn,
        eventEligible: diagnosis.eventEligible,
        previewUsed: diagnosis.previewUsed,
        eventType,
        metadata,
      }),
    });
  } catch {
    // Supabase未接続時も診断そのものは端末内保存で続行します。
  }
};

export default function Home() {
  const [view, setView] = useState<View>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<ResultKey, number>>({ coloring: 0, meal: 0, sweet: 0 });
  const [saved, setSaved] = useState<SavedDiagnosis | null>(null);
  const [source, setSource] = useState("direct");
  const [selectedColoring, setSelectedColoring] = useState("秋の茶寮");
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [currentDay, setCurrentDay] = useState(japanDayKey());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSource = params.get("source") || "direct";
    const isDemo = params.get("demo") === "1";
    const effectiveDay = isDemo && params.get("date") ? params.get("date")! : japanDayKey();
    setSource(nextSource);
    setDemo(isDemo);
    setCurrentDay(effectiveDay);

    let validSaved: SavedDiagnosis | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as SavedDiagnosis) : null;
      if (parsed) {
        const normalized = normalizeSavedDiagnosis(parsed);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        if (isDiagnosisValid(normalized, effectiveDay)) validSaved = normalized;
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSaved(validSaved);

    if (nextSource === "table") {
      if (!validSaved) setView("table-gate");
      else if (validSaved.result === "coloring" && effectiveDay >= EVENT_START) {
        setView("coloring-ready");
        void syncParticipation(validSaved, "table_qr_opened", { openedOn: effectiveDay });
      }
      else if (validSaved.result === "coloring" && !validSaved.previewUsed) setView("preview-gallery");
      else setView("result");
      return;
    }
    if (validSaved) setView("result");
  }, []);

  const currentQuestion = questions[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;
  const isPreviewPeriod = currentDay < EVENT_START;

  const sourceLabel = useMemo(() => {
    if (source === "line") return "LINEから参加";
    if (source === "poster") return "ポスターから参加";
    if (source === "table") return "店内・卓上から参加";
    return "店内限定";
  }, [source]);

  const chooseAnswer = (answer: Answer) => {
    const nextScores = {
      coloring: scores.coloring + answer.score.coloring,
      meal: scores.meal + answer.score.meal,
      sweet: scores.sweet + answer.score.sweet,
    };
    setScores(nextScores);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const result = (Object.entries(nextScores) as [ResultKey, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const nextSaved: SavedDiagnosis = {
      result,
      diagnosedOn: currentDay,
      token: makeToken(),
      source,
      previewUsed: false,
      eventEligible: result === "coloring",
      passType: result === "coloring" ? (currentDay < EVENT_START ? "advance" : "same_day") : null,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
    setSaved(nextSaved);
    setView("result");
    void syncParticipation(nextSaved, "diagnosis_completed", { score: nextScores[result] });
  };

  const restartForDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
    setScores({ coloring: 0, meal: 0, sweet: 0 });
    setQuestionIndex(0);
    setView("intro");
    setReady(false);
  };

  const beginColoring = (trial: boolean) => {
    setReady(true);
    if (!saved) return;
    const updated = trial && !saved.previewUsed ? { ...saved, previewUsed: true } : saved;
    if (updated !== saved) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(updated);
    }
    void syncParticipation(updated, trial ? "preview_started" : "coloring_started", {
      coloring: selectedColoring,
    });
  };

  const renderHeader = () => (
    <header className="site-header">
      <div>
        <p className="brand">祇園茶寮 × タニタカフェ 柏の葉</p>
        <p className="sub-brand">ことばで選ぶ、今日の休日</p>
      </div>
      <span className="source-chip">{sourceLabel}</span>
    </header>
  );

  if (view === "table-gate") {
    return (
      <main className="paper-shell">
        {renderHeader()}
        <section className="center-panel gate-panel">
          <div className="stamp stamp-blue">卓上</div>
          <p className="section-kicker">ぬりえを始める前に</p>
          <h1>先に休日診断を<br />お楽しみください</h1>
          <p className="lead">ポスターのQRから4つの質問に答えると、本日の参加権利が保存されます。</p>
          <div className="gate-instruction"><span>STEP 1</span><strong>店頭ポスターの診断QRを読み込む</strong></div>
          <p className="microcopy">診断後、もう一度この卓上QRを読み込んでください</p>
        </section>
        <Decorations />
      </main>
    );
  }

  if ((view === "coloring-ready" || view === "preview-gallery") && saved) {
    const isTrial = view === "preview-gallery";
    const isAdvance = saved.passType === "advance";
    return (
      <main className="paper-shell">
        {renderHeader()}
        <section className="center-panel coloring-panel">
          <div className={`pass-badge ${isAdvance ? "advance" : "same-day"}`}>
            <small>{isAdvance ? "事前登録済み" : "本日登録"}</small>
            <strong>{isAdvance ? "先行参加PASS" : "当日参加PASS"}</strong>
            <span>{formatPassNumber(saved)}</span>
          </div>
          <div className="permission-row">
            <span className="valid-dot" /> {isTrial ? "先行お試し権を確認しました" : "本参加権を確認しました"}
          </div>
          <p className="section-kicker">{isTrial ? "8月20日・21日だけの先行体験" : "8月22日からの本イベント"}</p>
          <h1>{isTrial ? <>お試しの一枚を<br />選んでください</> : <>今日の一枚を<br />選んでください</>}</h1>
          {!isTrial && (
            <div className={`palette-perk ${isAdvance ? "advance" : "standard"}`}>
              <b>{isAdvance ? "先行参加特典" : "当日参加"}</b>
              <span>{isAdvance ? "限定色「金茶」を含む先行カラーパレット" : "6〜8色のスタンダードカラーパレット"}</span>
            </div>
          )}
          <div className="coloring-choices" role="radiogroup" aria-label="ぬりえを選ぶ">
            {["秋の茶寮", "どうぶつの昼下がり", "和菓子の時間"].map((item, index) => (
              <button
                key={item}
                className={`coloring-choice ${selectedColoring === item ? "selected" : ""}`}
                onClick={() => { if (!ready) setSelectedColoring(item); }}
                disabled={ready}
                role="radio"
                aria-checked={selectedColoring === item}
              >
                <span className={`line-art art-${index + 1}`} aria-hidden="true" />
                <strong>{item}</strong>
                <small>{isTrial ? "お試し版・1回だけ" : "6〜8色・約3分"}</small>
              </button>
            ))}
          </div>
          {!ready ? (
            <button className="primary-button" onClick={() => beginColoring(isTrial)}>{isTrial ? "このぬりえを試す" : "このぬりえで始める"}</button>
          ) : (
            <div className="ready-card" role="status">
              <strong>「{selectedColoring}」を選びました</strong>
              <span>{isTrial ? "先行お試しは使用済みです。8月22日は卓上QRからすぐ本参加できます。" : "ぬりえ画面との接続準備ができています"}</span>
              <em className={`gallery-stamp ${isAdvance ? "advance" : "same-day"}`}>
                {isTrial
                  ? "本番作品には「先行参加」スタンプが付きます"
                  : `作品ギャラリーに「${isAdvance ? "先行参加" : "当日参加"}」スタンプが付きます`}
              </em>
            </div>
          )}
          <p className="token-line">本参加番号 <b>{formatPassNumber(saved)}</b></p>
        </section>
        <Decorations />
      </main>
    );
  }

  if (view === "result" && saved) {
    const result = results[saved.result];
    const isTable = source === "table";
    const isAdvance = saved.passType === "advance";
    return (
      <main className="paper-shell result-shell" style={{ "--result-color": result.color } as React.CSSProperties}>
        {renderHeader()}
        <section className="result-card">
          <div className="result-mark" aria-hidden="true">{result.mark}</div>
          <p className="result-label">あなたの休日タイプは</p>
          <p className="result-kicker">{result.kicker}</p>
          <h1>{result.title}</h1>
          <p className="result-description">{result.description}</p>

          {saved.result === "coloring" && (
            <div className="offer-box coloring-offer">
              <div className={`pass-badge compact ${isAdvance ? "advance" : "same-day"}`}>
                <small>{isAdvance ? "事前登録済み" : "本日登録"}</small>
                <strong>{isAdvance ? "先行参加PASS" : "当日参加PASS"}</strong>
                <span>{formatPassNumber(saved)}</span>
              </div>
              <span>{isPreviewPeriod ? "8月20日・21日 先行お試し" : "参加無料・予約不要"}</span>
              <strong>{isPreviewPeriod ? "8月22日の本参加権を獲得しました" : "ぬりえ本参加権を獲得しました"}</strong>
              <p>{isPreviewPeriod
                ? "今日・明日は、お試しぬりえギャラリーを1回だけ楽しめます。本番当日は卓上QRからすぐ参加できます。"
                : isAdvance
                  ? "先行参加特典の限定色と作品スタンプをご用意しています。卓上の「ぬりえを始めるQR」を読み込んでください。"
                  : "お席に着いたら、卓上の「ぬりえを始めるQR」を読み込んでください。"}</p>
              {isPreviewPeriod && !saved.previewUsed && (
                <button className="primary-button" onClick={() => setView("preview-gallery")}>先行お試しを楽しむ</button>
              )}
              {isPreviewPeriod && saved.previewUsed && (
                <div className="preview-used"><span>✓</span><strong>先行お試し済み</strong><small>8月22日はこの端末で卓上QRを読み込むだけ</small></div>
              )}
              {!isPreviewPeriod && isTable && <button className="primary-button" onClick={() => setView("coloring-ready")}>ぬりえを選ぶ</button>}
            </div>
          )}

          {saved.result === "meal" && (
            <div className="offer-box price-offer">
              <span>本日のおすすめセット</span>
              <strong>御膳＋対象ドリンク</strong>
              <div className="price-row"><del>通常 2,497円</del><b>2,377円</b></div>
              <p>120円お得。ご注文時にこの画面をスタッフへお見せください。</p>
            </div>
          )}

          {saved.result === "sweet" && (
            <div className="offer-box price-offer">
              <span>本日のおすすめセット</span>
              <strong>わらび餅＋対象ドリンク</strong>
              <div className="price-row"><del>通常 1,243円</del><b>1,123円</b></div>
              <p>120円お得。ご注文時にこの画面をスタッフへお見せください。</p>
            </div>
          )}

          <div className="validity">
            <span>{saved.result === "coloring" ? "本イベント参加番号" : "本日の参加番号"}</span><b>{formatPassNumber(saved)}</b>
            <small>{saved.result === "coloring" ? "8月22日以降もこの端末で有効" : "当日限り・1回まで"}</small>
          </div>
          {demo && <button className="text-button" onClick={restartForDemo}>デモ用：結果をリセット</button>}
        </section>
        <Decorations />
      </main>
    );
  }

  if (view === "question") {
    return (
      <main className="paper-shell question-shell">
        {renderHeader()}
        <section className="question-panel">
          <div className="progress-meta">
            <span>QUESTION {questionIndex + 1}</span><span>{questionIndex + 1} / {questions.length}</span>
          </div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p className="section-kicker">{currentQuestion.eyebrow}</p>
          <h1>{currentQuestion.title}</h1>
          <div className="answer-list">
            {currentQuestion.answers.map((answer, index) => (
              <button key={answer.label} className="answer-button" onClick={() => chooseAnswer(answer)}>
                <span className="answer-number">{index + 1}</span>
                <span><strong>{answer.label}</strong>{answer.note && <small>{answer.note}</small>}</span>
                <span className="arrow">→</span>
              </button>
            ))}
          </div>
        </section>
        <Decorations />
      </main>
    );
  }

  return (
    <main className="paper-shell intro-shell">
      {renderHeader()}
      <section className="hero-panel">
        <div className="date-ribbon">
          <span>{isPreviewPeriod ? "8月22日本スタート" : "8月22日から"}</span>
          <b>{isPreviewPeriod ? "今日・明日は先行お試し" : "土日・祝日限定"}</b>
        </div>
        <p className="hero-kicker">4つのことばでわかる</p>
        <h1><span>今日の</span><br />休日診断</h1>
        <p className="hero-copy">今の気分に合う、店内での過ごし方をご案内します。考えすぎず、気になることばを選んでください。</p>
        {isPreviewPeriod && <div className="prelaunch-note"><b>ぬりえタイプの方限定</b><span>お試しギャラリーを1回楽しめて、8月22日の本参加権も保存されます。</span></div>}
        <button className="primary-button hero-button" onClick={() => setView("question")}>診断をはじめる <span>→</span></button>
        <div className="intro-facts"><span>約30秒</span><span>全4問</span><span>参加無料</span></div>
      </section>
      <div className="type-preview" aria-label="3つの診断結果">
        <span className="preview-teal">ぬりえ</span>
        <span className="preview-red">御膳</span>
        <span className="preview-yellow">甘味</span>
      </div>
      <Decorations />
    </main>
  );
}

function Decorations() {
  return (
    <div className="decorations" aria-hidden="true">
      <span className="pencil pencil-red" />
      <span className="pencil pencil-yellow" />
      <span className="pencil pencil-green" />
      <span className="grid-corner" />
      <span className="paper-diamond diamond-one" />
      <span className="paper-diamond diamond-two" />
    </div>
  );
}
