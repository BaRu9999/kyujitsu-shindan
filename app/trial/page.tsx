"use client";

import { useEffect, useMemo, useState } from "react";
import { buildLstepSegmentKeyword, buildLstepSegmentUrl } from "@/app/lib/segmentation";
import styles from "./trial.module.css";
import Artwork from "./Artwork";

const palette = [
  ["朱", "#d64f45"], ["橙", "#e98a3c"], ["黄", "#f0c94b"], ["若草", "#6fa84f"],
  ["緑", "#2f7d55"], ["空", "#4f96c6"], ["青", "#5467ad"], ["白", "#ffffff"],
] as const;

const drawingTitles = ["朝顔と風鈴", "金魚と水紋", "和菓子とお茶"] as const;

type Entry = { entryId:string; participantCode:string; passType:string; coloring:string; companion?:string; expiresAt:number };
type HistoryItem = { id:string; previous:string };

export default function TrialPage() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>(palette[4][1]);
  const [fills, setFills] = useState<Record<string,string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("entry") || "";
    if (!token) {
      setError("休日診断からお試し参加権を取得して開いてください。");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/coloring/verify", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok || !data.entry) throw new Error("参加権を確認できませんでした。休日診断から開き直してください。");
        setEntry(data.entry as Entry);
      } catch (e) {
        setError(e instanceof Error ? e.message : "参加権を確認できませんでした。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const drawingIndex = useMemo(() => {
    if (!entry) return 0;
    const index = drawingTitles.findIndex((name) => name === entry.coloring);
    return index >= 0 ? index : 0;
  }, [entry]);

  const title = drawingTitles[drawingIndex];
  const segmentKeyword = buildLstepSegmentKeyword("coloring", entry?.companion);
  const linePassUrl = buildLstepSegmentUrl("coloring", entry?.companion);
  const fillFor = (id:string) => fills[id] || "#ffffff";
  const paint = (id:string) => {
    const previous = fillFor(id);
    if (previous === selectedColor) return;
    setHistory(items => [...items.slice(-59), { id, previous }]);
    setFills(current => ({ ...current, [id]:selectedColor }));
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(items => items.slice(0,-1));
    setFills(current => ({ ...current, [last.id]:last.previous }));
  };
  const reset = () => { setFills({}); setHistory([]); };

  const artwork = <Artwork index={drawingIndex} fillFor={fillFor} paint={paint} title={title} />;

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.mark}>茶</div>
      <div><p className={styles.brand}>祇園茶寮 × タニタカフェ 柏の葉</p><p className={styles.sub}>休日診断 先行お試しぬりえ</p></div>
    </header>

    {loading && <section className={`${styles.card} ${styles.status}`}>
      <div className={styles.statusMark}>茶</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認しています</h1>
    </section>}

    {!loading && error && <section className={`${styles.card} ${styles.status}`}>
      <div className={`${styles.statusMark} ${styles.errorMark}`}>!</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認できませんでした</h1><p className={styles.lead}>{error}</p>
    </section>}

    {!loading && !error && entry && !complete && <section className={styles.card}>
      <p className={styles.kicker}>先行お試し｜1回限定</p>
      <h1 className={styles.title}>選んだぬりえを<br/>デジタルで塗ってみよう</h1>
      <p className={styles.lead}>色を選んで、線で囲まれた白い面をタップしてください。</p>
      <div className={styles.badge}><strong>{title}</strong><span>約2〜3分｜8色</span></div>
      <div className={styles.art}>{artwork}</div>
      <div className={styles.palette}>{palette.map(([name,color])=><button key={name} aria-label={`${name}を選ぶ`} title={name} className={`${styles.swatch} ${selectedColor===color?styles.swatchActive:""}`} style={{background:color}} onClick={()=>setSelectedColor(color)} />)}</div>
      <div className={styles.toolbar}>
        <button className={`${styles.button} ${styles.secondary}`} onClick={undo}>1つ戻す</button>
        <button className={`${styles.button} ${styles.secondary}`} onClick={reset}>最初から</button>
        <button className={`${styles.button} ${styles.primary}`} onClick={()=>setComplete(true)}>完成</button>
      </div>
      <p className={styles.help}>主役だけでなく、花・葉・水草・和菓子なども自由に塗れます。</p>
    </section>}

    {!loading && !error && entry && complete && <section className={`${styles.card} ${styles.status}`}>
      <div className={styles.statusMark}>✓</div><p className={styles.kicker}>TRIAL COMPLETED</p><h1 className={styles.title}>お試しぬりえ完成！</h1>
      <p className={styles.lead}>先行参加特典を獲得しました。下のボタンからLINEを開いて受け取りを完了してください。</p>
      <div className={styles.completeArt}>{artwork}</div>
      <div className={styles.perk}><strong>本番参加で特別カラー解放</strong><br/>金茶・抹茶・桜・藍の4色が追加されます。</div>
      <a className={styles.lineButton} href={linePassUrl}>LINEで参加権を受け取る</a>
      <p className={styles.lineHelp}>LINEが開いたら「{segmentKeyword}」をそのまま送信してください。送信後、参加権の受け取りが完了します。</p>
      <p className={styles.small}>スマートフォンのLINEから操作してください。本イベントでは店内の卓上QRから参加できます。</p>
    </section>}
  </div></main>;
}