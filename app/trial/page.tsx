"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./trial.module.css";

const palette = [
  ["朱", "#d64f45"], ["橙", "#e98a3c"], ["黄", "#f0c94b"], ["若草", "#6fa84f"],
  ["緑", "#2f7d55"], ["空", "#4f96c6"], ["青", "#5467ad"], ["白", "#ffffff"],
] as const;

type Entry = { entryId:string; participantCode:string; passType:string; coloring:string; expiresAt:number };
type HistoryItem = { id:string; previous:string };

const hash = (value:string) => {
  let h = 0;
  for (let i=0;i<value.length;i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

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

  const drawingIndex = useMemo(() => entry ? hash(entry.entryId || entry.participantCode) % 3 : 0, [entry]);
  const title = ["朝顔と風鈴", "金魚と水紋", "和菓子とお茶"][drawingIndex];
  const fillFor = (id:string) => fills[id] || "#ffffff";
  const paint = (id:string) => {
    const previous = fillFor(id);
    if (previous === selectedColor) return;
    setHistory(items => [...items.slice(-39), { id, previous }]);
    setFills(current => ({ ...current, [id]:selectedColor }));
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(items => items.slice(0,-1));
    setFills(current => ({ ...current, [last.id]:last.previous }));
  };
  const reset = () => { setFills({}); setHistory([]); };

  const artwork = (
    <svg viewBox="0 0 700 900" aria-label={`${title}のぬりえ`}>
      <rect width="700" height="900" fill="#fff" />
      {drawingIndex === 0 && <g stroke="#1f2722" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
        <path d="M95 174C124 116 202 111 235 170C186 184 153 218 139 270C95 252 72 216 95 174Z" fill={fillFor("a1")} onClick={()=>paint("a1")} />
        <path d="M235 170C282 121 351 135 370 198C318 198 273 224 241 269C208 243 205 205 235 170Z" fill={fillFor("a2")} onClick={()=>paint("a2")} />
        <path d="M139 270C153 218 186 184 235 170C247 224 252 270 241 319C190 318 154 304 139 270Z" fill={fillFor("a3")} onClick={()=>paint("a3")} />
        <circle cx="235" cy="190" r="34" fill={fillFor("a4")} onClick={()=>paint("a4")} />
        <path d="M242 320C285 388 295 461 267 536" fill="none" />
        <path d="M250 402C307 363 365 389 368 446C314 457 274 445 250 402Z" fill={fillFor("a5")} onClick={()=>paint("a5")} />
        <path d="M480 105V245" fill="none" />
        <path d="M420 250Q480 205 540 250L520 430Q480 475 440 430Z" fill={fillFor("a6")} onClick={()=>paint("a6")} />
        <path d="M447 430H513L490 508H470Z" fill={fillFor("a7")} onClick={()=>paint("a7")} />
        <path d="M480 508V590" fill="none" />
        <path d="M434 590Q480 548 526 590Q480 642 434 590Z" fill={fillFor("a8")} onClick={()=>paint("a8")} />
        <path d="M92 650Q196 590 300 650L278 766Q196 812 114 766Z" fill={fillFor("a9")} onClick={()=>paint("a9")} />
      </g>}
      {drawingIndex === 1 && <g stroke="#1f2722" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="320" cy="370" rx="145" ry="95" fill={fillFor("b1")} onClick={()=>paint("b1")} />
        <path d="M455 365Q565 260 602 374Q555 475 455 398Z" fill={fillFor("b2")} onClick={()=>paint("b2")} />
        <path d="M278 300Q331 210 391 298Q334 332 278 300Z" fill={fillFor("b3")} onClick={()=>paint("b3")} />
        <path d="M278 437Q331 525 391 440Q336 407 278 437Z" fill={fillFor("b4")} onClick={()=>paint("b4")} />
        <circle cx="239" cy="352" r="11" fill="#1f2722" stroke="none" />
        <path d="M196 386Q228 404 254 389" fill="none" />
        <ellipse cx="340" cy="620" rx="230" ry="62" fill="none" />
        <ellipse cx="340" cy="620" rx="160" ry="38" fill="none" />
        <path d="M110 190Q166 116 225 190Q170 250 110 190Z" fill={fillFor("b5")} onClick={()=>paint("b5")} />
        <path d="M495 170Q555 106 606 182Q548 235 495 170Z" fill={fillFor("b6")} onClick={()=>paint("b6")} />
        <path d="M128 744Q202 684 275 744Q208 809 128 744Z" fill={fillFor("b7")} onClick={()=>paint("b7")} />
        <path d="M430 744Q506 683 580 744Q504 810 430 744Z" fill={fillFor("b8")} onClick={()=>paint("b8")} />
      </g>}
      {drawingIndex === 2 && <g stroke="#1f2722" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
        <path d="M110 580Q350 520 590 580L548 716Q350 780 152 716Z" fill={fillFor("c1")} onClick={()=>paint("c1")} />
        <path d="M146 580Q350 536 554 580Q350 650 146 580Z" fill={fillFor("c2")} onClick={()=>paint("c2")} />
        <path d="M155 414Q240 343 325 414L302 556Q240 602 178 556Z" fill={fillFor("c3")} onClick={()=>paint("c3")} />
        <path d="M178 414Q240 376 302 414Q240 468 178 414Z" fill={fillFor("c4")} onClick={()=>paint("c4")} />
        <path d="M382 442Q470 365 558 442L536 560Q470 606 404 560Z" fill={fillFor("c5")} onClick={()=>paint("c5")} />
        <path d="M404 442Q470 399 536 442Q470 490 404 442Z" fill={fillFor("c6")} onClick={()=>paint("c6")} />
        <path d="M272 260Q350 190 428 260Q350 338 272 260Z" fill={fillFor("c7")} onClick={()=>paint("c7")} />
        <path d="M309 250Q350 208 391 250Q350 290 309 250Z" fill={fillFor("c8")} onClick={()=>paint("c8")} />
        <path d="M334 184Q350 132 365 184M310 168Q350 110 390 168" fill="none" />
        <path d="M83 246Q135 192 188 246Q134 302 83 246Z" fill={fillFor("c9")} onClick={()=>paint("c9")} />
        <path d="M513 224Q566 172 618 226Q566 278 513 224Z" fill={fillFor("c10")} onClick={()=>paint("c10")} />
      </g>}
    </svg>
  );

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div className={styles.mark}>茶</div><div><p className={styles.brand}>祇園茶寮 × タニタカフェ 柏の葉</p><p className={styles.sub}>休日診断 先行お試しぬりえ</p></div></header>
    {loading && <section className={`${styles.card} ${styles.status}`}><div className={styles.statusMark}>茶</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認しています</h1></section>}
    {!loading && error && <section className={`${styles.card} ${styles.status}`}><div className={`${styles.statusMark} ${styles.errorMark}`}>!</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認できませんでした</h1><p className={styles.lead}>{error}</p></section>}
    {!loading && !error && entry && !complete && <section className={styles.card}>
      <p className={styles.kicker}>先行お試し｜1回限定</p><h1 className={styles.title}>できあがったぬりえを<br/>デジタルで塗ってみよう</h1><p className={styles.lead}>AI生成はありません。色を選び、白い面をタップしてください。</p>
      <div className={styles.badge}><strong>{title}</strong><span>約2〜3分｜8色</span></div><div className={styles.art}>{artwork}</div>
      <div className={styles.palette}>{palette.map(([name,color])=><button key={name} aria-label={`${name}を選ぶ`} title={name} className={`${styles.swatch} ${selectedColor===color?styles.swatchActive:""}`} style={{background:color}} onClick={()=>setSelectedColor(color)} />)}</div>
      <div className={styles.toolbar}><button className={`${styles.button} ${styles.secondary}`} onClick={undo}>1つ戻す</button><button className={`${styles.button} ${styles.secondary}`} onClick={reset}>最初から</button><button className={`${styles.button} ${styles.primary}`} onClick={()=>setComplete(true)}>完成</button></div><p className={styles.help}>線の内側の白い面をタップして色をつけます。</p>
    </section>}
    {!loading && !error && entry && complete && <section className={`${styles.card} ${styles.status}`}><div className={styles.statusMark}>✓</div><p className={styles.kicker}>TRIAL COMPLETED</p><h1 className={styles.title}>お試しぬりえ完成！</h1><p className={styles.lead}>先行参加特典を獲得済みです。お試し作品は提出・公開・LINE特典送信の対象外です。</p><div className={styles.completeArt}>{artwork}</div><div className={styles.perk}><strong>本番参加で特別カラー解放</strong><br/>金茶・抹茶・桜・藍の4色が追加されます。</div><p className={styles.small}>本イベントでは店内の卓上QRから参加してください。</p></section>}
  </div></main>;
}
