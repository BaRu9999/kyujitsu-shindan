"use client";

type Props = {
  index: number;
  fillFor: (id: string) => string;
  paint: (id: string) => void;
  title: string;
};

export default function Artwork({ index, fillFor, paint, title }: Props) {
  const common = {
    stroke: "#252925",
    strokeWidth: 5.5,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  const region = (id: string, d: string, extra: Record<string, unknown> = {}) => (
    <path key={id} d={d} fill={fillFor(id)} onClick={() => paint(id)} {...extra} />
  );

  const flower = (prefix: string, cx: number, cy: number, scale = 1) => {
    const petal = `M ${cx} ${cy} C ${cx-27*scale} ${cy-10*scale}, ${cx-42*scale} ${cy-43*scale}, ${cx-18*scale} ${cy-67*scale} C ${cx+4*scale} ${cy-67*scale}, ${cx+15*scale} ${cy-31*scale}, ${cx} ${cy} Z`;
    return <g>
      {[0,72,144,216,288].map((angle, i) => (
        <path key={`${prefix}p${i}`} d={petal} transform={`rotate(${angle} ${cx} ${cy})`} fill={fillFor(`${prefix}p${i}`)} onClick={() => paint(`${prefix}p${i}`)} />
      ))}
      <circle cx={cx} cy={cy} r={13*scale} fill={fillFor(`${prefix}c`)} onClick={() => paint(`${prefix}c`)} />
    </g>;
  };

  return (
    <svg viewBox="0 0 700 900" aria-label={`${title}のぬりえ`}>
      <rect width="700" height="900" fill="#fff" />

      {index === 0 && <g {...common}>
        {/* 朝顔の花とつる */}
        {flower("a1", 178, 205, 1.05)}
        {flower("a2", 305, 385, .88)}
        {flower("a3", 168, 560, .8)}
        <path d="M178 260C205 339 213 425 183 621C167 722 153 783 157 840" fill="none" />
        <path d="M304 437C282 506 252 567 202 626" fill="none" />
        <path d="M181 621C243 594 296 603 326 641" fill="none" />
        {region("al1", "M72 332C111 278 178 280 217 326C184 372 117 378 72 332Z")}
        {region("al2", "M219 475C259 421 322 428 353 480C315 520 258 519 219 475Z")}
        {region("al3", "M82 690C119 640 177 646 206 694C171 731 116 731 82 690Z")}
        {region("al4", "M238 657C279 617 333 627 354 676C314 704 270 697 238 657Z")}
        <path d="M88 329Q145 329 207 329M233 472Q289 474 344 481M96 687Q145 686 197 694M250 655Q299 657 344 677" fill="none" />
        {/* つぼみ */}
        {region("ab1", "M348 245C368 211 397 211 415 244C397 266 370 266 348 245Z")}
        <path d="M381 265C367 307 349 334 325 357" fill="none" />

        {/* 風鈴 */}
        <path d="M535 55V151" fill="none" />
        <circle cx="535" cy="154" r="10" fill={fillFor("ach")} onClick={() => paint("ach")} />
        {region("af1", "M447 225C461 173 492 145 535 145C578 145 608 173 623 225Z")}
        {region("af2", "M463 225Q535 258 607 225L592 393Q535 438 479 393Z")}
        {region("af3", "M501 274C520 249 551 249 570 273C553 302 531 318 503 334C474 318 454 300 438 273C456 249 482 249 501 274Z")}
        <path d="M535 393V454" fill="none" />
        <circle cx="535" cy="454" r="14" fill={fillFor("af4")} onClick={() => paint("af4")} />
        <path d="M535 468V503" fill="none" />
        {region("af5", "M482 503Q535 475 589 503L575 642Q535 670 496 642Z")}
        <path d="M501 545Q535 525 570 545M505 586Q535 570 567 586M511 620Q535 608 560 620" fill="none" />

        {/* 風と小花 */}
        <path d="M400 114C433 82 471 91 474 118C477 145 445 155 420 140M404 697C448 658 497 672 497 708C496 743 452 748 423 729" fill="none" />
        <circle cx="415" cy="169" r="11" fill="none" />
        <circle cx="386" cy="139" r="6" fill="none" />
        {flower("as1", 417, 772, .34)}
        {flower("as2", 585, 709, .29)}
        <path d="M65 825Q350 780 635 825" fill="none" />
      </g>}

      {index === 1 && <g {...common}>
        {/* 金魚1 */}
        {region("b1", "M81 245C110 171 207 143 292 176C342 195 378 229 389 273C376 322 338 359 289 375C204 402 110 364 82 299C76 281 76 261 81 245Z")}
        {region("b2", "M380 251C447 179 538 147 621 188C604 248 564 288 515 310C565 334 601 379 606 441C520 451 448 409 381 348C410 313 412 280 380 251Z")}
        {region("b3", "M214 168C243 114 301 98 348 132C334 176 304 202 262 216Z")}
        {region("b4", "M216 376C250 425 309 433 353 400C333 360 301 338 258 329Z")}
        <circle cx="132" cy="250" r="10" fill="#252925" stroke="none" />
        <path d="M105 288Q134 306 165 287" fill="none" />
        <path d="M201 211Q233 247 205 287M254 194Q286 236 258 278M310 200Q338 239 314 272" fill="none" />
        <path d="M209 311Q238 339 267 312M272 300Q301 327 331 303" fill="none" />

        {/* 金魚2 */}
        {region("b5", "M155 499C175 447 243 423 304 445C341 459 368 486 376 520C365 558 336 585 298 598C238 617 177 590 157 544C151 529 150 513 155 499Z")}
        {region("b6", "M366 491C414 446 474 427 527 454C515 492 490 517 459 533C491 548 513 577 517 615C463 626 416 601 368 562C387 537 389 512 366 491Z")}
        {region("b7", "M229 438C247 404 282 391 317 408C306 438 286 455 257 464Z")}
        <circle cx="194" cy="496" r="8" fill="#252925" stroke="none" />
        <path d="M235 475Q264 502 238 532M285 465Q311 497 287 526" fill="none" />

        {/* 金魚3 */}
        {region("b8", "M383 650C399 606 455 586 502 603C531 614 552 634 559 661C550 692 528 713 498 723C451 739 401 720 385 685C379 673 379 660 383 650Z")}
        {region("b9", "M551 643C590 608 634 596 667 619C658 648 639 668 616 680C641 691 656 713 658 740C615 749 579 731 553 702C568 684 569 661 551 643Z")}
        <circle cx="411" cy="647" r="7" fill="#252925" stroke="none" />

        {/* 水草 */}
        {region("bp1", "M70 735C45 692 59 651 101 625C126 668 113 710 70 735Z")}
        {region("bp2", "M113 777C89 731 107 688 151 665C174 709 158 752 113 777Z")}
        {region("bp3", "M573 802C547 754 563 710 611 683C634 731 620 775 573 802Z")}
        <path d="M71 724V844M115 765V844M575 790V844" fill="none" />

        {/* 水紋・泡・小石 */}
        <ellipse cx="220" cy="706" rx="118" ry="32" fill="none" />
        <ellipse cx="220" cy="706" rx="68" ry="17" fill="none" />
        <ellipse cx="467" cy="816" rx="116" ry="29" fill="none" />
        <ellipse cx="467" cy="816" rx="64" ry="14" fill="none" />
        <circle cx="75" cy="116" r="18" fill="none" /><circle cx="118" cy="151" r="9" fill="none" />
        <circle cx="565" cy="109" r="14" fill="none" /><circle cx="611" cy="153" r="8" fill="none" />
        <circle cx="535" cy="487" r="12" fill="none" /><circle cx="563" cy="459" r="7" fill="none" />
        {region("bst1", "M145 837Q175 813 207 837Q177 861 145 837Z")}
        {region("bst2", "M215 829Q252 801 291 829Q254 858 215 829Z")}
        {region("bst3", "M296 843Q323 823 351 843Q324 865 296 843Z")}
      </g>}

      {index === 2 && <g {...common}>
        {/* 急須 */}
        {region("c1", "M411 102C447 67 506 71 532 111C568 83 619 96 637 135C653 171 630 208 593 218H446C411 214 389 193 389 163C389 138 397 118 411 102Z")}
        {region("c2", "M438 161H590V289Q514 330 438 289Z")}
        <path d="M590 171C640 148 672 177 669 217C666 258 632 281 591 260" fill="none" />
        <path d="M439 175H390Q359 179 347 208" fill="none" />
        <circle cx="516" cy="99" r="22" fill={fillFor("c3")} onClick={() => paint("c3")} />
        <path d="M462 216Q516 240 568 216M469 257Q516 275 560 257" fill="none" />

        {/* 湯のみ */}
        <ellipse cx="185" cy="296" rx="106" ry="31" fill={fillFor("c4")} onClick={() => paint("c4")} />
        {region("c5", "M82 299C91 411 120 477 185 493C252 477 281 411 289 299Z")}
        <ellipse cx="185" cy="298" rx="86" ry="21" fill={fillFor("c6")} onClick={() => paint("c6")} />
        <path d="M136 220C116 193 138 168 158 146M185 219C168 191 191 166 209 141M233 222C215 194 239 170 256 150" fill="none" />
        <path d="M131 397Q185 429 240 397" fill="none" />

        {/* 茶葉 */}
        {region("cl1", "M385 341C423 299 480 303 502 347C467 376 422 376 385 341Z")}
        {region("cl2", "M469 384C504 344 557 348 578 390C545 418 504 415 469 384Z")}
        <path d="M385 343Q469 389 553 455" fill="none" />

        {/* 大皿 */}
        <ellipse cx="386" cy="613" rx="235" ry="80" fill={fillFor("c7")} onClick={() => paint("c7")} />
        <ellipse cx="386" cy="600" rx="209" ry="57" fill="#fff" />

        {/* 練り切り1 */}
        {region("c8", "M219 582C191 553 202 511 236 499C252 468 294 463 316 490C352 484 377 516 367 550C390 578 373 616 339 623C320 652 277 655 254 629C219 633 196 608 219 582Z")}
        <circle cx="294" cy="560" r="22" fill={fillFor("c9")} onClick={() => paint("c9")} />
        <path d="M294 538V503M273 548L248 522M315 548L340 522M272 572L242 581M316 572L346 581M282 581L267 611M306 581L322 611" fill="none" />

        {/* 練り切り2 */}
        {region("c10", "M386 582C359 553 370 512 403 500C419 471 458 465 480 491C515 485 540 516 530 549C553 577 537 613 504 621C485 649 444 652 422 627C389 630 365 607 386 582Z")}
        <circle cx="457" cy="560" r="20" fill={fillFor("c11")} onClick={() => paint("c11")} />
        <path d="M457 540V507M438 548L415 525M476 548L499 525M437 572L409 580M477 572L505 580" fill="none" />

        {/* 三色団子 */}
        <circle cx="260" cy="724" r="36" fill={fillFor("c12")} onClick={() => paint("c12")} />
        <circle cx="337" cy="724" r="36" fill={fillFor("c13")} onClick={() => paint("c13")} />
        <circle cx="414" cy="724" r="36" fill={fillFor("c14")} onClick={() => paint("c14")} />
        <path d="M219 765L457 681" fill="none" />

        {/* 桜餅 */}
        {region("c15", "M476 711C506 667 567 666 600 710C584 760 540 786 488 762C465 752 459 731 476 711Z")}
        {region("c16", "M481 704C514 686 552 689 585 711C561 733 512 737 481 704Z")}
        <path d="M497 691Q538 720 579 691" fill="none" />

        {/* 小花・敷物 */}
        {flower("cs1", 112, 123, .32)}
        {flower("cs2", 610, 490, .27)}
        <path d="M76 835Q350 786 632 835" fill="none" />
        <path d="M104 821L132 845M146 814L174 839M580 816L609 842" fill="none" />
      </g>}
    </svg>
  );
}
