"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type RedeemState = {
  redeemed: boolean;
  alreadyRedeemed: boolean;
  couponCode: string;
  couponType: string;
  redeemedAt: string;
};

const couponLabels: Record<string, string> = {
  coloring_pass: "季節のぬりえ参加PASS",
  meal_tea_120_off: "選べる御膳＋和紅茶 120円OFF",
  warabi_tea_120_off: "二色わらび餅＋和紅茶 120円OFF",
};

export default function RedeemPage() {
  const [couponCode, setCouponCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) queueMicrotask(() => setCouponCode(code.toUpperCase()));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/coupon/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "redeem_failed");
      setResult(data as RedeemState);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "redeem_failed";
      setError(message === "coupon_not_found"
        ? "クーポン番号が見つかりません。入力内容を確認してください。"
        : message === "unauthorized"
          ? "スタッフPINが違います。"
          : "処理できませんでした。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="paper-shell redeem-shell">
      <header className="site-header">
        <div>
          <p className="brand">祇園茶寮 × タニタカフェ 柏の葉</p>
          <p className="sub-brand">スタッフ用クーポン確認</p>
        </div>
        <span className="source-chip">STAFF</span>
      </header>
      <section className="center-panel redeem-panel">
        <p className="section-kicker">店頭スタッフ専用</p>
        <h1>クーポンを<br />使用済みにする</h1>
        <p className="lead">お客様の画面またはLINEに表示されたクーポン番号を入力してください。</p>
        <form className="redeem-form" onSubmit={submit}>
          <label>
            <span>クーポン番号</span>
            <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="GOZEN-123ABC" autoCapitalize="characters" required />
          </label>
          <label>
            <span>スタッフPIN</span>
            <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" required />
          </label>
          <button className="primary-button" disabled={submitting}>{submitting ? "確認中…" : "使用済みにする"}</button>
        </form>
        {error && <div className="redeem-message error" role="alert">{error}</div>}
        {result && (
          <div className={`redeem-message ${result.alreadyRedeemed ? "warning" : "success"}`} role="status">
            <strong>{result.alreadyRedeemed ? "使用済みのクーポンです" : "使用済みにしました"}</strong>
            <span>{couponLabels[result.couponType] || result.couponType}</span>
            <small>{result.couponCode}</small>
          </div>
        )}
        <Link className="text-button redeem-back" href="/">診断トップへ戻る</Link>
      </section>
    </main>
  );
}
