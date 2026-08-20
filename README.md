# 休日診断

祇園茶寮 × タニタカフェ 柏の葉の休日診断・ぬりえ参加導線です。Next.jsで動作し、VercelからSupabaseへ参加状況を記録します。

## 記録する内容

- 診断結果：ぬりえ参加／選べる御膳＋和紅茶／二色わらび餅＋和紅茶
- 参加区分：先行参加／当日参加
- 流入元：ポスター／LINE／卓上QR
- 先行お試し、卓上QR読込、本番ぬりえ開始、作品送信
- LINE診断の個人別開封、開始、完了、回答内容
- 結果別クーポンの送信、利用状況

## LINE一斉配信からの1人1回診断

LINE配信用URLはLIFF URLを使います。LIFFのIDトークンをVercel側で検証し、`キャンペーンID + LINEユーザーID` の組み合わせを一意にすることで、同じキャンペーンでは1人1回だけ診断できます。2回目以降は以前の結果とクーポンを表示します。

LINE LoginチャンネルとMessaging APIチャンネルは、必ず同じLINE Developersプロバイダー内に作成してください。

診断結果ごとに次の内容をMessaging APIで本人へ送ります。

- ぬりえ：季節のぬりえ参加PASS
- 御膳：選べる御膳＋和紅茶 120円OFF
- 甘味：二色わらび餅＋和紅茶 120円OFF

店頭では `/redeem` をスタッフ端末で開き、クーポン番号とスタッフPINを入力して使用済みにします。

## Supabase

SupabaseのSQL Editorで次の順に実行してください。

1. `supabase/migrations/202608200001_holiday_diagnosis.sql`
2. `supabase/migrations/202608200002_line_campaign_coupons.sql`

## 環境変数

VercelのProject Settings → Environment Variablesへ登録します。

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SHEETS_SYNC_TOKEN=64文字以上のランダムな値
NEXT_PUBLIC_LIFF_ID=LINE Developersで発行されたLIFF ID
NEXT_PUBLIC_LIFF_URL=https://liff.line.me/LIFF_ID
NEXT_PUBLIC_APP_URL=https://kyujitsu-shindan.vercel.app/?source=line
LINE_LOGIN_CHANNEL_ID=LINE LoginのチャンネルID
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=Messaging APIの長期チャネルアクセストークン
DIAGNOSIS_CAMPAIGN_ID=weekend-2026-08-22
DIAGNOSIS_EVENT_START=2026-08-22
COUPON_STAFF_PIN=スタッフだけが知るPIN
```

`SUPABASE_SECRET_KEY` と `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` はVercelサーバー専用です。ソースコード、ブラウザ、Apps Script、チャットへ記載しないでください。

## QRのURL

```text
ポスター：https://公開URL/?source=poster
LINE：https://liff.line.me/LIFF_ID
卓上：https://公開URL/?source=table
```

## Googleスプレッドシート

`docs/google-sheets-sync.gs` を対象スプレッドシートのApps Scriptへ追加し、VercelとApps Scriptの両方に同じ `SHEETS_SYNC_TOKEN` を登録します。`SUPABASE_SECRET_KEY` はApps Scriptへ登録しません。`installHolidayDiagnosisSync` を1回実行すると、5分ごとに「参加ログ」「診断ファネル」「診断集計」へ反映されます。

「診断ファネル」ではLINE表示名、個人を識別する末尾6文字、開封・開始・完了、診断結果、回答、クーポン送信・利用まで確認できます。完全なLINEユーザーIDはスプレッドシートへ出しません。

「診断集計」では診断クリック率、完了率、結果別人数、クーポン利用率を自動集計します。LINEメッセージ自体の配信数と開封数だけは個人別に取得できないため、LINE Official Account Managerの集計値を手入力します。

## ローカル確認

```bash
npm install
cp .env.example .env.local
npm run dev
```
