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
    strokeWidth: 6,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <svg viewBox="0 0 700 900" aria-label={`${title}のぬりえ`}>
      <rect width="700" height="900" fill="#fff" />

      {index === 0 && <g {...common}>
        <path d="M78 175C88 118 143 84 195 99C222 107 242 125 252 148C266 122 290 108 320 110C371 114 402 162 386 210C372 250 333 274 254 310C184 270 112 248 83 205C77 196 75 185 78 175Z" fill={fillFor("a1")} onClick={()=>paint("a1")} />
        <circle cx="254" cy="192" r="34" fill={fillFor("a2")} onClick={()=>paint("a2")} />
        <path d="M254 158V125M224 169L199 144M284 169L309 144M223 206L192 219M286 206L318 219" fill="none" />

        <path d="M110 401C120 349 171 319 217 332C241 339 259 355 268 375C281 352 302 340 328 342C374 346 400 389 386 431C373 468 339 488 269 520C207 485 145 469 115 430C109 421 107 411 110 401Z" fill={fillFor("a3")} onClick={()=>paint("a3")} />
        <circle cx="269" cy="416" r="29" fill={fillFor("a4")} onClick={()=>paint("a4")} />
        <path d="M269 388V360M243 397L222 376M295 397L316 376M243 432L217 442M296 432L322 443" fill="none" />

        <path d="M82 544C90 500 130 474 170 485C191 491 207 505 215 522C226 502 244 492 267 494C306 497 329 534 317 570C306 602 276 620 216 646C162 617 109 603 86 570C81 562 79 553 82 544Z" fill={fillFor("a5")} onClick={()=>paint("a5")} />
        <circle cx="216" cy="557" r="24" fill={fillFor("a6")} onClick={()=>paint("a6")} />

        <path d="M70 326C123 277 193 292 216 351C165 378 109 371 70 326Z" fill={fillFor("a7")} onClick={()=>paint("a7")} />
        <path d="M201 589C249 544 312 558 332 612C285 634 239 627 201 589Z" fill={fillFor("a8")} onClick={()=>paint("a8")} />
        <path d="M112 695C159 651 221 664 241 716C196 740 150 731 112 695Z" fill={fillFor("a9")} onClick={()=>paint("a9")} />
        <path d="M96 322Q157 321 207 350M216 585Q273 585 322 612M129 691Q181 691 232 715" fill="none" />
        <path d="M253 310C258 405 252 507 217 648M217 648C194 707 175 756 169 810" fill="none" />

        <path d="M520 58V183" fill="none" />
        <circle cx="520" cy="184" r="10" fill={fillFor("a10")} onClick={()=>paint("a10")} />
        <path d="M440 235C456 184 483 161 520 161C559 161 586 184 601 235Z" fill={fillFor("a11")} onClick={()=>paint("a11")} />
        <path d="M455 235Q520 269 586 235L572 386Q520 429 469 386Z" fill={fillFor("a12")} onClick={()=>paint("a12")} />
        <path d="M489 283C502 265 526 264 539 282C552 269 574 275 579 294C568 317 548 329 520 343C491 329 471 317 462 294C468 275 491 269 489 283Z" fill={fillFor("a13")} onClick={()=>paint("a13")} />
        <circle cx="520" cy="371" r="17" fill={fillFor("a14")} onClick={()=>paint("a14")} />
        <path d="M520 388V468" fill="none" />
        <path d="M474 468Q520 440 567 468L553 610Q520 636 488 610Z" fill={fillFor("a15")} onClick={()=>paint("a15")} />
        <path d="M494 516Q520 498 548 516M499 557Q520 544 543 557" fill="none" />

        <circle cx="425" cy="154" r="13" fill="none" />
        <circle cx="405" cy="112" r="7" fill="none" />
        <path d="M380 92Q397 69 417 88Q399 110 380 92Z" fill={fillFor("a16")} onClick={()=>paint("a16")} />
        <path d="M397 762Q433 724 470 761Q433 798 397 762Z" fill={fillFor("a17")} onClick={()=>paint("a17")} />
        <path d="M487 714Q522 677 558 714Q522 752 487 714Z" fill={fillFor("a18")} onClick={()=>paint("a18")} />
      </g>}

      {index === 1 && <g {...common}>
        <path d="M96 258C121 189 211 156 290 182C337 197 373 229 387 269C374 318 336 354 289 369C210 395 122 360 96 299C90 285 90 271 96 258Z" fill={fillFor("b1")} onClick={()=>paint("b1")} />
        <path d="M376 250C442 181 527 153 603 189C588 244 552 282 506 306C554 326 588 367 594 422C511 439 442 400 379 341C404 307 405 279 376 250Z" fill={fillFor("b2")} onClick={()=>paint("b2")} />
        <path d="M219 176C243 128 291 108 339 132C326 174 296 200 258 213Z" fill={fillFor("b3")} onClick={()=>paint("b3")} />
        <path d="M221 370C252 414 303 425 347 399C329 361 297 341 258 332Z" fill={fillFor("b4")} onClick={()=>paint("b4")} />
        <circle cx="145" cy="252" r="11" fill="#252925" stroke="none" />
        <path d="M120 291Q148 308 177 290" fill="none" />
        <path d="M207 216Q236 251 210 286M258 200Q288 239 262 277M310 203Q337 239 314 270" fill="none" />
        <path d="M221 307Q249 335 276 307M278 296Q305 321 333 299" fill="none" />

        <path d="M174 496C193 448 256 426 310 445C343 457 367 481 375 511C365 546 339 572 304 583C250 601 195 579 176 538C170 524 169 509 174 496Z" fill={fillFor("b5")} onClick={()=>paint("b5")} />
        <path d="M366 490C410 446 465 427 512 450C502 484 480 508 452 524C482 537 503 563 507 597C456 608 412 586 368 550C385 528 386 509 366 490Z" fill={fillFor("b6")} onClick={()=>paint("b6")} />
        <path d="M238 440C255 409 286 396 317 412C307 440 288 456 263 464Z" fill={fillFor("b7")} onClick={()=>paint("b7")} />
        <circle cx="210" cy="491" r="8" fill="#252925" stroke="none" />

        <path d="M392 632C408 589 462 571 507 587C535 597 554 617 561 642C553 672 531 692 502 702C456 717 410 699 394 665C389 653 388 642 392 632Z" fill={fillFor("b8")} onClick={()=>paint("b8")} />
        <path d="M554 627C592 593 633 583 661 602C653 631 635 650 614 660C637 672 650 691 652 715C612 723 581 707 555 681C568 663 569 645 554 627Z" fill={fillFor("b9")} onClick={()=>paint("b9")} />
        <circle cx="420" cy="627" r="7" fill="#252925" stroke="none" />

        <path d="M80 727C55 688 68 649 107 624C131 663 119 702 80 727Z" fill={fillFor("b10")} onClick={()=>paint("b10")} />
        <path d="M119 767C96 724 112 685 154 662C174 703 160 743 119 767Z" fill={fillFor("b11")} onClick={()=>paint("b11")} />
        <path d="M568 786C544 741 558 699 603 674C625 717 613 758 568 786Z" fill={fillFor("b12")} onClick={()=>paint("b12")} />
        <path d="M81 716V832M121 756V832M570 774V832" fill="none" />

        <ellipse cx="220" cy="682" rx="112" ry="31" fill="none" />
        <ellipse cx="220" cy="682" rx="65" ry="16" fill="none" />
        <ellipse cx="468" cy="805" rx="110" ry="28" fill="none" />
        <ellipse cx="468" cy="805" rx="62" ry="14" fill="none" />
        <circle cx="76" cy="118" r="17" fill="none" />
        <circle cx="119" cy="151" r="9" fill="none" />
        <circle cx="559" cy="111" r="14" fill="none" />
        <circle cx="605" cy="151" r="8" fill="none" />
        <ellipse cx="176" cy="828" rx="32" ry="13" fill={fillFor("b13")} onClick={()=>paint("b13")} />
        <ellipse cx="248" cy="822" rx="39" ry="16" fill={fillFor("b14")} onClick={()=>paint("b14")} />
        <ellipse cx="320" cy="835" rx="27" ry="11" fill={fillFor("b15")} onClick={()=>paint("b15")} />
      </g>}

      {index === 2 && <g {...common}>
        <path d="M427 95C465 62 528 72 547 119C589 91 642 113 646 158C649 197 615 224 577 221H448C415 220 389 198 389 166C389 137 404 113 427 95Z" fill={fillFor("c1")} onClick={()=>paint("c1")} />
        <path d="M447 153H579V274Q513 310 447 274Z" fill={fillFor("c2")} onClick={()=>paint("c2")} />
        <path d="M580 168C632 149 660 178 657 215C654 252 622 272 580 252" fill="none" />
        <path d="M447 166H402Q380 168 370 191" fill="none" />
        <circle cx="516" cy="95" r="20" fill={fillFor("c3")} onClick={()=>paint("c3")} />

        <ellipse cx="190" cy="299" rx="105" ry="31" fill={fillFor("c4")} onClick={()=>paint("c4")} />
        <path d="M88 301C96 411 123 475 190 490C258 475 286 411 293 301Z" fill={fillFor("c5")} onClick={()=>paint("c5")} />
        <ellipse cx="190" cy="301" rx="85" ry="21" fill={fillFor("c6")} onClick={()=>paint("c6")} />
        <path d="M142 224C122 198 143 173 164 151M191 221C174 194 196 169 214 144M238 224C221 197 243 173 260 154" fill="none" />
        <path d="M136 397Q190 428 245 397" fill="none" />

        <path d="M401 312C439 273 492 278 512 319C478 344 438 344 401 312Z" fill={fillFor("c7")} onClick={()=>paint("c7")} />
        <path d="M479 352C514 315 562 320 581 359C549 384 512 382 479 352Z" fill={fillFor("c8")} onClick={()=>paint("c8")} />
        <path d="M401 314Q482 363 558 426" fill="none" />

        <ellipse cx="390" cy="609" rx="226" ry="76" fill={fillFor("c9")} onClick={()=>paint("c9")} />
        <ellipse cx="390" cy="597" rx="201" ry="54" fill="#fff" />

        <path d="M238 578C211 550 221 510 254 498C269 468 308 463 330 489C364 483 388 514 378 546C401 573 385 609 353 616C335 643 294 646 272 622C239 625 217 603 238 578Z" fill={fillFor("c10")} onClick={()=>paint("c10")} />
        <circle cx="309" cy="558" r="22" fill={fillFor("c11")} onClick={()=>paint("c11")} />
        <path d="M309 536V502M289 546L265 521M330 546L353 521M288 570L259 579M331 570L360 579M297 579L282 609M321 579L337 609" fill="none" />

        <path d="M402 578C376 550 386 511 418 499C434 471 471 465 492 490C526 484 550 514 541 546C563 572 548 607 516 615C498 641 458 644 436 620C405 623 382 603 402 578Z" fill={fillFor("c12")} onClick={()=>paint("c12")} />
        <circle cx="472" cy="558" r="20" fill={fillFor("c13")} onClick={()=>paint("c13")} />
        <path d="M472 538V506M453 546L431 524M491 546L513 524M452 569L425 577M492 569L519 577" fill="none" />

        <circle cx="267" cy="716" r="34" fill={fillFor("c14")} onClick={()=>paint("c14")} />
        <circle cx="338" cy="716" r="34" fill={fillFor("c15")} onClick={()=>paint("c15")} />
        <circle cx="409" cy="716" r="34" fill={fillFor("c16")} onClick={()=>paint("c16")} />
        <path d="M230 755L445 677" fill="none" />

        <path d="M467 704C497 661 557 661 588 703C573 751 529 775 480 753C459 744 452 724 467 704Z" fill={fillFor("c17")} onClick={()=>paint("c17")} />
        <path d="M468 705Q527 727 587 703" fill="none" />
        <path d="M491 685Q527 714 563 684" fill="none" />

        <path d="M110 808Q390 754 642 808" fill="none" />
        <path d="M90 105C127 69 176 77 194 116C161 142 125 139 90 105Z" fill={fillFor("c18")} onClick={()=>paint("c18")} />
        <path d="M115 105Q161 132 200 168" fill="none" />
      </g>}
    </svg>
  );
}
