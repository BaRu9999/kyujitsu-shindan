"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { questions, type Answer, type ResultKey } from "./lib/diagnosis";

type View = "intro" | "question" | "result" | "table-gate" | "coloring-ready" | "preview-gallery";
type PassType = "advance" | "same_day";
type LineStatus = "inactive" | "loading" | "ready" | "error";

type SavedDiagnosis = {
  result: ResultKey;
  diagnosedOn: string;
  token: string;
  source: string;
  previewUsed: boolean;
  eventEligible: boolean;
  passType: PassType | null;
  campaignId?: string;
  couponCode?: string;
  couponSent?: boolean;
};

const STORAGE_KEY = "kyujitsu-diagnosis-v2";
const EVENT_START = "2026-08-22";

const results = {
  coloring: {
    kicker: "親子わくわく",
    title: "季節のぬりえ時間",
    description: "ことばを選んで、今日だけの一枚を楽しむ休日。お席の卓上QRからぬりえを始められます。",
    color: "var(--teal)",
    mark: "ぬ",
  },
  meal: {
    kicker: "ごほうび御膳タイプ",
    title: "御膳と和紅茶の満足時間",
    description: "しっかり食べて、和紅茶でひと息。食事とお茶で休日をゆっくり味わいたいあなたに。",
    color: "var(--vermilion)",
    mark: "膳",
  },
  sweet: {
    kicker: "甘味ひとやすみタイプ",
    title: "二色わらび餅と和紅茶の休息時間",
    description: "二色のわらび餅と和紅茶で、気持ちをほどく休日。おしゃべりにも、ひとり時間にも。",
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
  const [answerIndexes, setAnswerIndexes] = useState<number[]>([]);
  const [lineIdToken, setLineIdToken] = useState("");
  const [lineStatus, setLineStatus] = useState<LineStatus>("inactive");
  const [lineError, setLineError] = useState("");
  const [coloringEntryError, setColoringEntryError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSource = params.get("source") || "direct";
    const isDemo = params.get("demo") === "1";
    const effectiveDay = isDemo && params.get("date") ? params.get("date")! : japanDayKey();
    queueMicrotask(() => {
      setSource(nextSource);
      setDemo(isDemo);
      setCurrentDay(effectiveDay);
    });

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
    if (["line", "poster", "table"].includes(nextSource)) {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        queueMicrotask(() => {
          setLineStatus("error");
          setLineError("LINE連携の設定がまだ完了していません。");
        });
        return;
      }
      queueMicrotask(() => setLineStatus("loading"));
      let cancelled = false;
      void (async () => {
        try {
          const liff = (await import("@line/liff")).default;
          await liff.init({ liffId });
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
            return;
          }
          const idToken = liff.getIDToken();
          if (!idToken) throw new Error("LINEの本人確認情報を取得できませんでした。");
          const response = await fetch("/api/line/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, action: "opened", source: nextSource }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "LINE参加情報を確認できませんでした。");
          if (cancelled) return;
          setLineIdToken(idToken);
          setLineStatus("ready");
          if (data.completed && data.diagnosis) {
            const existing = normalizeSavedDiagnosis(data.diagnosis as SavedDiagnosis);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
            setSaved(existing);
            if (nextSource === "table" && existing.result === "coloring" && effectiveDay >= EVENT_START) {
              setView("coloring-ready");
            } else if (effectiveDay < EVENT_START && existing.result === "coloring" && !existing.previewUsed) {
              setView("preview-gallery");
            } else {
              setView("result");
            }
          } else {
            setSaved(null);
            setView("intro");
          }
        } catch (error) {
          if (cancelled) return;
          setLineStatus("error");
          setLineError(error instanceof Error ? error.message : "LINE参加情報を確認できませんでした。");
        }
      })();
      return () => { cancelled = true; };
    }

    queueMicrotask(() => {
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
    });
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

  const chooseAnswer = async (answer: Answer, answerIndex: number) => {
    if (submitting) return;
    const nextScores = {
      coloring: scores.coloring + answer.score.coloring,
      meal: scores.meal + answer.score.meal,
      sweet: scores.sweet + answer.score.sweet,
    };
    const nextAnswerIndexes = [...answerIndexes, answerIndex];
    setScores(nextScores);
    setAnswerIndexes(nextAnswerIndexes);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    if (["line", "poster", "table"].includes(source) && lineIdToken) {
      setSubmitting(true);
      setLineError("");
      try {
        const response = await fetch("/api/line/diagnosis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: lineIdToken, answerIndexes: nextAnswerIndexes, source }),
        });
        const data = await response.json();
        if (!response.ok || !data.diagnosis) throw new Error(data.error || "診断結果を保存できませんでした。");
        const nextSaved = normalizeSavedDiagnosis(data.diagnosis as SavedDiagnosis);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
        setSaved(nextSaved);
        setView("result");
      } catch (error) {
        setLineError(error instanceof Error ? error.message : "診断結果を保存できませんでした。");
      } finally {
        setSubmitting(false);
      }
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
    setAnswerIndexes([]);
    setQuestionIndex(0);
    setView("intro");
    setReady(false);
  };

  const startDiagnosis = async () => {
    if (["line", "poster", "table"].includes(source)) {
      if (!lineIdToken) return;
      setSubmitting(true);
      setLineError("");
      try {
        const response = await fetch("/api/line/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: lineIdToken, action: "started", source }),
        });
        if (!response.ok) throw new Error("診断開始を記録できませんでした。");
      } catch (error) {
        setLineError(error instanceof Error ? error.message : "診断を開始できませんでした。");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }
    setView("question");
  };

  const beginColoring = async (trial: boolean) => {
    if (!saved || ready) return;
    setReady(true);
    setColoringEntryError("");

    if (demo) {
      const updated = trial && !saved.previewUsed ? { ...saved, previewUsed: true } : saved;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(updated);
      void syncParticipation(updated, trial ? "preview_started" : "coloring_started", { coloring: selectedColoring });
      return;
    }

    if (!lineIdToken) {
      setColoringEntryError("LINEから参加情報を確認できませんでした。LINE内でこの画面を開き直してください。");
      setReady(false);
      return;
    }

    try {
      const response = await fetch("/api/coloring/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: lineIdToken,
          mode: trial ? "trial" : "event",
          source,
          coloring: selectedColoring,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.entryUrl) {
        const messages: Record<string, string> = {
          trial_already_used: "お試しぬりえはすでに利用済みです。8月22日以降は卓上QRから本参加できます。",
          trial_period_ended: "先行お試し期間は終了しました。店内の卓上QRから本イベントへ参加してください。",
          event_not_started: "本イベントは8月22日から始まります。",
          table_qr_required: "本参加は店内の卓上QRから始めてください。",
          coloring_pass_not_found: "このLINEアカウントのぬりえ参加PASSを確認できませんでした。",
          coloring_entry_not_configured: "ぬりえギャラリーとの接続設定がまだ完了していません。",
        };
        throw new Error(messages[data.error] || "ぬりえギャラリーを開けませんでした。");
      }

      if (trial) {
        const updated = { ...saved, previewUsed: true };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSaved(updated);
      }
      window.location.assign(data.entryUrl);
    } catch (error) {
      setColoringEntryError(error instanceof Error ? error.message : "ぬりえギャラリーを開けませんでした。");
      setReady(false);
    }
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

  if (lineStatus === "loading") {
    return (
      <main className="paper-shell">
        {renderHeader()}
        <section className="center-panel line-status-panel" role="status">
          <span className="line-loader" aria-hidden="true" />
          <p className="section-kicker">LINE参加情報を確認中</p>
          <h1>少しだけ<br />お待ちください</h1>
          <p className="microcopy">同じキャンペーンでは、診断は1人1回だけです。</p>
        </section>
        <Decorations />
      </main>
    );
  }

  if (lineStatus === "error") {
    return (
      <main className="paper-shell">
        {renderHeader()}
        <section className="center-panel line-status-panel">
          <div className="stamp stamp-error">!</div>
          <p className="section-kicker">LINE連携を確認できませんでした</p>
          <h1>LINEから<br />もう一度開いてください</h1>
          <p className="lead">{lineError}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>もう一度確認する</button>
        </section>
        <Decorations />
      </main>
    );
  }

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
            <button className="primary-button" onClick={() => void beginColoring(isTrial)}>{isTrial ? "このぬりえを試す" : "このぬりえで始める"}</button>
          ) : (
            <div className="ready-card" role="status">
              <strong>「{selectedColoring}」を選びました</strong>
              <span>{demo
                ? (isTrial ? "先行お試しは使用済みです。8月22日は卓上QRからすぐ本参加できます。" : "ぬりえ画面との接続準備ができています")
                : "ぬりえギャラリーを開いています…"}</span>
              <em className={`gallery-stamp ${isAdvance ? "advance" : "same-day"}`}>
                {isTrial
                  ? "本番作品には「先行参加」スタンプが付きます"
                  : `作品ギャラリーに「${isAdvance ? "先行参加" : "当日参加"}」スタンプが付きます`}
              </em>
            </div>
          )}
          {coloringEntryError && <p className="form-error" role="alert">{coloringEntryError}</p>}
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
          <div className="weekend-result-banner" aria-label="土日限定">
            <b>土・日限定</b>
            <span>週末だけの休日診断</span>
          </div>
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
              <span>土日・診断結果限定セット特典</span>
              <strong>選べる御膳＋和紅茶</strong>
              <div className="set-photo-grid" aria-label="対象となる2種類の御膳と和紅茶">
                <figure className="set-photo-card">
                  <Image
                    src="/images/gozen-set-01.jpeg"
                    alt="対象御膳と和紅茶のセット写真1"
                    width={1448}
                    height={1086}
                    sizes="(max-width: 640px) 43vw, 240px"
                    priority
                  />
                  <figcaption>対象御膳 1</figcaption>
                </figure>
                <figure className="set-photo-card">
                  <Image
                    src="/images/gozen-set-02.jpeg"
                    alt="対象御膳と和紅茶のセット写真2"
                    width={1448}
                    height={1086}
                    sizes="(max-width: 640px) 43vw, 240px"
                    priority
                  />
                  <figcaption>対象御膳 2</figcaption>
                </figure>
              </div>
              <div className="price-row"><del>和紅茶 通常495円</del><b>セット時375円</b></div>
              <p>対象日に、お好きな御膳と和紅茶を一緒にご注文で、合計から120円OFF。LINEへ届く標準クーポンを会計時にお見せください。</p>
            </div>
          )}

          {saved.result === "sweet" && (
            <div className="offer-box price-offer">
              <span>土日・診断結果限定セット特典</span>
              <strong>二色わらび餅＋和紅茶</strong>
              <figure className="set-photo-card set-photo-wide">
                <Image
                  src="/images/warabi-tea-set.jpeg"
                  alt="二色わらび餅と和紅茶のセット写真"
                  width={1448}
                  height={1086}
                  sizes="(max-width: 640px) 86vw, 490px"
                  priority
                />
                <figcaption>二色わらび餅と和紅茶</figcaption>
              </figure>
              <div className="price-row"><del>通常 1,243円</del><b>1,123円</b></div>
              <p>対象日に使える、診断した方だけの120円OFF。LINEへ届く標準クーポンを会計時にお見せください。</p>
            </div>
          )}

          {saved.result === "coloring" && (
            <div className="validity">
              <span>本イベント参加番号</span><b>{formatPassNumber(saved)}</b>
              <small>8月22日以降の土日にこの端末で有効</small>
            </div>
          )}
          {saved.couponCode && (
            <div className={`line-coupon-status ${saved.couponSent ? "sent" : "pending"}`}>
              <span>{saved.couponSent ? "LINEへ案内を送信済み" : "LINE送信を確認中"}</span>
              <strong>{saved.result === "coloring" ? "ぬりえ参加PASS" : "LINE標準クーポン"}</strong>
              <small>
                {saved.result === "coloring"
                  ? "参加時は診断結果画面を確認してください。"
                  : "会計時にLINEのクーポン画面を提示し、お客様自身で使用済みにします。"}
              </small>
            </div>
          )}
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
              <button key={answer.label} className="answer-button" onClick={() => void chooseAnswer(answer, index)} disabled={submitting}>
                <span className="answer-number">{index + 1}</span>
                <span><strong>{answer.label}</strong>{answer.note && <small>{answer.note}</small>}</span>
                <span className="arrow">→</span>
              </button>
            ))}
          </div>
          {lineError && <p className="form-error" role="alert">{lineError}</p>}
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
        {["line", "poster", "table"].includes(source) && lineStatus === "ready" && <div className="line-ready-note"><b>LINE本人確認済み</b><span>このキャンペーンの診断は1人1回です。結果別クーポンは診断後にLINEへ届きます。</span></div>}
        {isPreviewPeriod && <div className="prelaunch-note"><b>ぬりえタイプの方限定</b><span>お試しギャラリーを1回楽しめて、8月22日の本参加権も保存されます。</span></div>}
        <button className="primary-button hero-button" onClick={() => void startDiagnosis()} disabled={submitting}>{submitting ? "確認中…" : "診断をはじめる"} <span>→</span></button>
        {lineError && <p className="form-error" role="alert">{lineError}</p>}
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
