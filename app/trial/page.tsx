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

  const common = {
    stroke: "#252925",
    strokeWidth: 6,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  const artwork = (
    <svg viewBox="0 0 700 900" aria-label={`${title}のぬりえ`}>
      <rect width="700" height="900" fill="#fff" />

      {drawingIndex === 0 && <g {...common}>
        {/* 朝顔 1 */}
        <path d="M132 214C95 169 115 109 163 94C196 83 221 101 237 122C255 98 286 86 317 101C365 124 369 184 332 221C303 250 270 265 235 292C203 262 164 250 132 214Z" fill={fillFor("a1")} onClick={()=>paint("a1")} />
        <circle cx="236" cy="177" r="35" fill={fillFor("a2")} onClick={()=>paint("a2")} />
        <path d="M236 142L236 107M205 152L181 126M266 152L292 127M204 191L171 203M268 191L301 205" fill="none" />

        {/* 朝顔 2 */}
        <path d="M294 360C269 322 286 277 326 260C352 249 378 261 392 279C409 260 436 250 462 263C504 284 510 331 480 365C454 394 422 407 391 432C363 409 320 398 294 360Z" fill={fillFor("a3")} onClick={()=>paint("a3")} />
        <circle cx="391" cy="328" r="27" fill={fillFor("a4")} onClick={()=>paint("a4")} />
        <path d="M391 301V274M368 309L349 289M414 309L434 290M367 343L342 351M416 343L442 352" fill="none" />

        {/* 葉 */}
        <path d="M91 362C143 312 214 327 234 386C184 411 129 405 91 362Z" fill={fillFor("a5")} onClick={()=>paint("a5")} />
        <path d="M182 471C232 422 299 438 317 495C268 517 220 510 182 471Z" fill={fillFor("a6")} onClick={()=>paint("a6")} />
        <path d="M111 362C150 360 191 371 222 389M201 471C239 473 279 485 306 500" fill="none" />
        <path d="M236 292C251 360 250 437 225 531M391 432C372 479 357 526 354 584" fill="none" />

        {/* 風鈴 */}
        <path d="M530 84V207" fill="none" />
        <path d="M458 232C470 184 494 162 530 162C567 162 591 184 603 232Z" fill={fillFor("a7")} onClick={()=>paint("a7")} />
        <path d="M472 232Q530 266 589 232L575 386Q530 425 485 386Z" fill={fillFor("a8")} onClick={()=>paint("a8")} />
        <circle cx="530" cy="326" r="20" fill={fillFor("a9")} onClick={()=>paint("a9")} />
        <path d="M530 346V442" fill="none" />
        <path d="M487 442Q530 414 574 442L558 574Q530 596 503 574Z" fill={fillFor("a10")} onClick={()=>paint("a10")} />
        <path d="M503 474Q530 456 558 474M508 513Q530 500 553 513" fill="none" />

        {/* 夏の小物 */}
        <path d="M102 674Q184 622 267 674L253 782Q184 820 116 782Z" fill={fillFor("a11")} onClick={()=>paint("a11")} />
        <ellipse cx="184" cy="674" rx="82" ry="28" fill={fillFor("a12")} onClick={()=>paint("a12")} />
        <path d="M439 682C475 642 531 648 557 691C524 721 474 717 439 682Z" fill={fillFor("a13")} onClick={()=>paint("a13")} />
        <path d="M469 685Q504 668 542 689" fill="none" />
        <circle cx="606" cy="650" r="14" fill="none" />
        <circle cx="632" cy="617" r="8" fill="none" />
      </g>}

      {drawingIndex === 1 && <g {...common}>
        {/* 大きな金魚 */}
        <path d="M120 298C148 221 251 190 332 226C373 245 400 280 407 319C394 362 360 396 313 412C230 441 145 400 120 333C116 321 116 309 120 298Z" fill={fillFor("b1")} onClick={()=>paint("b1")} />
        <path d="M397 304C464 241 539 208 604 237C588 289 555 323 516 344C560 361 589 398 594 450C523 467 459 435 399 376C421 352 425 327 397 304Z" fill={fillFor("b2")} onClick={()=>paint("b2")} />
        <path d="M232 221C256 174 302 154 349 176C333 218 305 242 268 253Z" fill={fillFor("b3")} onClick={()=>paint("b3")} />
        <path d="M235 413C265 455 312 467 353 443C334 407 305 388 270 380Z" fill={fillFor("b4")} onClick={()=>paint("b4")} />
        <circle cx="171" cy="292" r="11" fill="#252925" stroke="none" />
        <path d="M145 329Q174 347 202 329" fill="none" />
        <path d="M247 254Q276 291 247 329M294 242Q322 280 296 321M342 251Q366 286 344 316" fill="none" />
        <path d="M255 345Q282 372 309 346M310 334Q336 358 363 337" fill="none" />

        {/* 小さな金魚 */}
        <path d="M291 553C313 497 384 474 439 498C473 513 493 541 497 571C488 604 463 628 429 640C370 661 311 634 291 590C285 577 286 565 291 553Z" fill={fillFor("b5")} onClick={()=>paint("b5")} />
        <path d="M490 551C535 512 585 496 625 516C615 549 594 570 569 583C595 595 612 617 616 649C568 660 527 639 491 607C506 588 508 569 490 551Z" fill={fillFor("b6")} onClick={()=>paint("b6")} />
        <path d="M361 497C379 464 410 452 441 468C429 495 411 510 386 519Z" fill={fillFor("b7")} onClick={()=>paint("b7")} />
        <circle cx="326" cy="550" r="8" fill="#252925" stroke="none" />
        <path d="M365 525Q388 551 366 576M407 516Q428 543 409 568" fill="none" />

        {/* 水草 */}
        <path d="M109 746C77 704 86 660 126 630C154 673 147 714 109 746Z" fill={fillFor("b8")} onClick={()=>paint("b8")} />
        <path d="M147 772C120 724 137 682 181 659C202 706 189 744 147 772Z" fill={fillFor("b9")} onClick={()=>paint("b9")} />
        <path d="M572 765C544 716 558 671 604 645C630 692 619 735 572 765Z" fill={fillFor("b10")} onClick={()=>paint("b10")} />
        <path d="M112 735V824M151 760V824M575 754V824" fill="none" />

        {/* 水紋・泡 */}
        <ellipse cx="209" cy="703" rx="112" ry="31" fill="none" />
        <ellipse cx="209" cy="703" rx="66" ry="17" fill="none" />
        <ellipse cx="462" cy="761" rx="106" ry="28" fill="none" />
        <ellipse cx="462" cy="761" rx="61" ry="14" fill="none" />
        <circle cx="97" cy="132" r="17" fill="none" />
        <circle cx="139" cy="170" r="9" fill="none" />
        <circle cx="548" cy="124" r="14" fill="none" />
        <circle cx="592" cy="162" r="8" fill="none" />
      </g>}

      {drawingIndex === 2 && <g {...common}>
        {/* 湯のみ */}
        <ellipse cx="190" cy="258" rx="105" ry="31" fill={fillFor("c1")} onClick={()=>paint("c1")} />
        <path d="M87 261C94 368 122 434 190 448C258 434 286 368 293 261Z" fill={fillFor("c2")} onClick={()=>paint("c2")} />
        <ellipse cx="190" cy="258" rx="86" ry="21" fill={fillFor("c3")} onClick={()=>paint("c3")} />
        <path d="M143 183C122 157 143 133 163 111M193 181C174 153 197 126 215 102M240 183C222 155 245 132 262 112" fill="none" />
        <path d="M129 346Q190 378 251 346" fill="none" />

        {/* 茶葉 */}
        <path d="M449 143C489 104 539 112 555 155C516 179 476 176 449 143Z" fill={fillFor("c4")} onClick={()=>paint("c4")} />
        <path d="M518 199C554 160 605 169 620 210C582 235 545 229 518 199Z" fill={fillFor("c5")} onClick={()=>paint("c5")} />
        <path d="M445 145Q523 199 590 262" fill="none" />
        <path d="M516 200Q558 215 593 260" fill="none" />

        {/* 和菓子の皿 */}
        <ellipse cx="420" cy="514" rx="198" ry="62" fill={fillFor("c6")} onClick={()=>paint("c6")} />
        <ellipse cx="420" cy="504" rx="174" ry="43" fill="#fff" />

        {/* 練り切り・花 */}
        <path d="M317 500C291 474 299 438 329 427C342 401 379 397 398 421C429 416 451 444 443 474C463 498 449 532 419 538C403 563 365 565 345 542C316 545 296 526 317 500Z" fill={fillFor("c7")} onClick={()=>paint("c7")} />
        <circle cx="380" cy="484" r="22" fill={fillFor("c8")} onClick={()=>paint("c8")} />
        <path d="M380 462V430M361 472L338 448M399 472L423 448M360 496L332 505M400 496L428 505M369 505L355 532M391 505L406 532" fill="none" />

        {/* 桜餅 */}
        <path d="M457 474C478 431 540 421 570 456C590 480 580 512 550 530C515 551 471 535 457 502C453 492 453 483 457 474Z" fill={fillFor("c9")} onClick={()=>paint("c9")} />
        <path d="M462 500C496 476 536 473 570 490C544 523 497 535 462 500Z" fill={fillFor("c10")} onClick={()=>paint("c10")} />
        <path d="M486 488Q520 472 552 487" fill="none" />

        {/* 三色団子 */}
        <path d="M148 686L454 646" fill="none" />
        <circle cx="213" cy="678" r="47" fill={fillFor("c11")} onClick={()=>paint("c11")} />
        <circle cx="306" cy="666" r="47" fill={fillFor("c12")} onClick={()=>paint("c12")} />
        <circle cx="399" cy="654" r="47" fill={fillFor("c13")} onClick={()=>paint("c13")} />

        {/* もなか */}
        <path d="M470 691C503 652 568 652 601 691C570 730 503 731 470 691Z" fill={fillFor("c14")} onClick={()=>paint("c14")} />
        <path d="M488 691Q536 667 584 691Q536 716 488 691Z" fill={fillFor("c15")} onClick={()=>paint("c15")} />

        {/* 敷き紙 */}
        <path d="M92 805Q350 762 609 805" fill="none" />
        <path d="M122 816Q350 785 580 816" fill="none" />
        <circle cx="606" cy="353" r="13" fill="none" />
        <circle cx="634" cy="320" r="7" fill="none" />
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