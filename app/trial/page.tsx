"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./trial.module.css";

const palette = [
  ["朱", "#d64f45"], ["橙", "#e98a3c"], ["黄", "#f0c94b"], ["若草", "#6fa84f"],
  ["緑", "#2f7d55"], ["空", "#4f96c6"], ["青", "#5467ad"], ["白", "#ffffff"],
] as const;

const drawingTitles = ["朝顔と風鈴", "金魚と水紋", "和菓子とお茶"] as const;

type Entry = { entryId:string; participantCode:string; passType:string; coloring:string; expiresAt:number };
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

      {drawingIndex === 0 && <g stroke="#242723" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M116 192C124 126 202 92 259 132C300 162 296 224 260 256C221 291 153 280 124 236C114 221 111 206 116 192Z" fill={fillFor("a1")} onClick={()=>paint("a1")} />
        <path d="M170 126C182 162 190 200 190 255M120 190C159 190 207 188 260 176M138 240C175 218 216 192 250 148" fill="none" />
        <circle cx="192" cy="192" r="24" fill={fillFor("a2")} onClick={()=>paint("a2")} />

        <path d="M310 288C319 226 389 194 443 224C489 250 493 311 460 348C421 391 349 381 319 337C309 322 305 304 310 288Z" fill={fillFor("a3")} onClick={()=>paint("a3")} />
        <path d="M356 222C370 258 378 300 378 356M313 291C350 287 401 278 460 263M326 339C362 316 410 278 447 241" fill="none" />
        <circle cx="378" cy="289" r="22" fill={fillFor("a4")} onClick={()=>paint("a4")} />

        <path d="M100 390C156 344 224 359 248 420C192 438 146 432 100 390Z" fill={fillFor("a5")} onClick={()=>paint("a5")} />
        <path d="M246 442C308 397 374 420 391 480C331 491 285 480 246 442Z" fill={fillFor("a6")} onClick={()=>paint("a6")} />
        <path d="M192 258C218 335 229 430 208 548M378 356C351 430 328 500 326 590" fill="none" />

        <path d="M510 96V230" fill="none" />
        <path d="M446 238Q510 194 574 238L558 402Q510 448 462 402Z" fill={fillFor("a7")} onClick={()=>paint("a7")} />
        <path d="M469 258Q510 234 551 258M478 302Q510 285 542 302" fill="none" />
        <path d="M486 402H534L526 472H494Z" fill={fillFor("a8")} onClick={()=>paint("a8")} />
        <path d="M510 472V560" fill="none" />
        <path d="M452 560Q510 520 568 560Q510 632 452 560Z" fill={fillFor("a9")} onClick={()=>paint("a9")} />

        <path d="M94 680Q350 622 606 680" fill="none" />
        <path d="M126 695Q210 648 294 695L280 785Q210 824 140 785Z" fill={fillFor("a10")} onClick={()=>paint("a10")} />
        <path d="M151 695Q210 672 269 695Q210 730 151 695Z" fill={fillFor("a11")} onClick={()=>paint("a11")} />
        <path d="M420 682C452 652 492 658 510 692C482 714 444 711 420 682Z" fill={fillFor("a12")} onClick={()=>paint("a12")} />
      </g>}

      {drawingIndex === 1 && <g stroke="#242723" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="260" cy="305" rx="132" ry="82" fill={fillFor("b1")} onClick={()=>paint("b1")} />
        <path d="M378 296Q512 190 570 294Q526 392 382 338Z" fill={fillFor("b2")} onClick={()=>paint("b2")} />
        <path d="M238 225Q292 150 350 229Q298 258 238 225Z" fill={fillFor("b3")} onClick={()=>paint("b3")} />
        <path d="M238 385Q297 458 352 382Q298 352 238 385Z" fill={fillFor("b4")} onClick={()=>paint("b4")} />
        <circle cx="188" cy="286" r="11" fill="#242723" stroke="none" />
        <path d="M154 326Q187 347 218 327M318 258Q338 303 321 349" fill="none" />

        <ellipse cx="438" cy="548" rx="92" ry="58" fill={fillFor("b5")} onClick={()=>paint("b5")} />
        <path d="M520 542Q603 478 628 548Q593 616 522 577Z" fill={fillFor("b6")} onClick={()=>paint("b6")} />
        <path d="M420 492Q460 443 499 495Q460 518 420 492Z" fill={fillFor("b7")} onClick={()=>paint("b7")} />
        <path d="M420 602Q460 648 501 599Q460 578 420 602Z" fill={fillFor("b8")} onClick={()=>paint("b8")} />
        <circle cx="394" cy="535" r="8" fill="#242723" stroke="none" />

        <circle cx="104" cy="145" r="18" fill="none" />
        <circle cx="150" cy="118" r="10" fill="none" />
        <circle cx="576" cy="156" r="16" fill="none" />
        <circle cx="610" cy="196" r="9" fill="none" />
        <ellipse cx="330" cy="724" rx="250" ry="56" fill="none" />
        <ellipse cx="330" cy="724" rx="172" ry="31" fill="none" />

        <path d="M104 690Q139 612 176 686Q143 722 104 690Z" fill={fillFor("b9")} onClick={()=>paint("b9")} />
        <path d="M134 628Q169 560 202 629Q169 666 134 628Z" fill={fillFor("b10")} onClick={()=>paint("b10")} />
        <path d="M565 696Q598 624 630 694Q600 730 565 696Z" fill={fillFor("b11")} onClick={()=>paint("b11")} />
        <path d="M585 631Q616 568 645 632Q616 664 585 631Z" fill={fillFor("b12")} onClick={()=>paint("b12")} />
        <path d="M151 620V790M610 620V790" fill="none" />
      </g>}

      {drawingIndex === 2 && <g stroke="#242723" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="220" cy="358" rx="108" ry="28" fill="none" />
        <path d="M126 360Q136 505 220 518Q304 505 314 360Z" fill={fillFor("c1")} onClick={()=>paint("c1")} />
        <ellipse cx="220" cy="360" rx="94" ry="24" fill={fillFor("c2")} onClick={()=>paint("c2")} />
        <path d="M166 300Q220 248 274 300M184 272Q220 224 256 272" fill="none" />

        <ellipse cx="445" cy="580" rx="162" ry="48" fill="none" />
        <path d="M330 545Q375 466 420 545Q375 600 330 545Z" fill={fillFor("c3")} onClick={()=>paint("c3")} />
        <path d="M410 536Q456 452 502 536Q456 598 410 536Z" fill={fillFor("c4")} onClick={()=>paint("c4")} />
        <path d="M492 548Q538 476 580 548Q538 602 492 548Z" fill={fillFor("c5")} onClick={()=>paint("c5")} />
        <circle cx="375" cy="545" r="14" fill={fillFor("c6")} onClick={()=>paint("c6")} />
        <circle cx="456" cy="536" r="14" fill={fillFor("c7")} onClick={()=>paint("c7")} />
        <circle cx="538" cy="548" r="14" fill={fillFor("c8")} onClick={()=>paint("c8")} />

        <path d="M105 672H584" fill="none" />
        <path d="M124 689Q350 632 575 689L548 772Q350 830 151 772Z" fill={fillFor("c9")} onClick={()=>paint("c9")} />
        <path d="M153 690Q350 656 548 690Q350 744 153 690Z" fill={fillFor("c10")} onClick={()=>paint("c10")} />

        <circle cx="248" cy="698" r="46" fill={fillFor("c11")} onClick={()=>paint("c11")} />
        <path d="M202 697Q248 640 294 697Q248 756 202 697Z" fill={fillFor("c12")} onClick={()=>paint("c12")} />
        <path d="M248 652V744M204 697H292" fill="none" />

        <circle cx="376" cy="704" r="37" fill={fillFor("c13")} onClick={()=>paint("c13")} />
        <circle cx="456" cy="704" r="37" fill={fillFor("c14")} onClick={()=>paint("c14")} />
        <circle cx="536" cy="704" r="37" fill={fillFor("c15")} onClick={()=>paint("c15")} />
        <path d="M344 734L566 674" fill="none" />

        <path d="M470 220Q521 164 570 220Q521 274 470 220Z" fill={fillFor("c16")} onClick={()=>paint("c16")} />
        <path d="M520 219Q565 166 610 226Q562 272 520 219Z" fill={fillFor("c17")} onClick={()=>paint("c17")} />
        <path d="M520 218L480 300M565 220L548 305" fill="none" />
      </g>}
    </svg>
  );

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div className={styles.mark}>茶</div><div><p className={styles.brand}>祇園茶寮 × タニタカフェ 柏の葉</p><p className={styles.sub}>休日診断 先行お試しぬりえ</p></div></header>
    {loading && <section className={`${styles.card} ${styles.status}`}><div className={styles.statusMark}>茶</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認しています</h1></section>}
    {!loading && error && <section className={`${styles.card} ${styles.status}`}><div className={`${styles.statusMark} ${styles.errorMark}`}>!</div><p className={styles.kicker}>HOLIDAY COLORING PASS</p><h1 className={styles.title}>参加権を確認できませんでした</h1><p className={styles.lead}>{error}</p></section>}
    {!loading && !error && entry && !complete && <section className={styles.card}>
      <p className={styles.kicker}>先行お試し｜1回限定</p><h1 className={styles.title}>選んだぬりえを<br/>デジタルで塗ってみよう</h1><p className={styles.lead}>色を選んで、線で囲まれた白い面をタップしてください。</p>
      <div className={styles.badge}><strong>{title}</strong><span>約2〜3分｜8色</span></div><div className={styles.art}>{artwork}</div>
      <div className={styles.palette}>{palette.map(([name,color])=><button key={name} aria-label={`${name}を選ぶ`} title={name} className={`${styles.swatch} ${selectedColor===color?styles.swatchActive:""}`} style={{background:color}} onClick={()=>setSelectedColor(color)} />)}</div>
      <div className={styles.toolbar}><button className={`${styles.button} ${styles.secondary}`} onClick={undo}>1つ戻す</button><button className={`${styles.button} ${styles.secondary}`} onClick={reset}>最初から</button><button className={`${styles.button} ${styles.primary}`} onClick={()=>setComplete(true)}>完成</button></div><p className={styles.help}>線画はそのまま残り、色だけ自由に変更できます。</p>
    </section>}
    {!loading && !error && entry && complete && <section className={`${styles.card} ${styles.status}`}><div className={styles.statusMark}>✓</div><p className={styles.kicker}>TRIAL COMPLETED</p><h1 className={styles.title}>お試しぬりえ完成！</h1><p className={styles.lead}>先行参加特典を獲得済みです。お試し作品は提出・公開・LINE特典送信の対象外です。</p><div className={styles.completeArt}>{artwork}</div><div className={styles.perk}><strong>本番参加で特別カラー解放</strong><br/>金茶・抹茶・桜・藍の4色が追加されます。</div><p className={styles.small}>本イベントでは店内の卓上QRから参加してください。</p></section>}
  </div></main>;
}