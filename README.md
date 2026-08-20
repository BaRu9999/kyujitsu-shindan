# 休日診断

祇園茶寮 × タニタカフェ 柏の葉の休日診断・ぬりえ参加導線です。Next.jsで動作し、VercelからSupabaseへ参加状況を記録します。

## 記録する内容

- 診断結果：ぬりえ参加／選べる御膳＋和紅茶／二色わらび餅＋和紅茶
- 参加区分：先行参加／当日参加
- 流入元：ポスター／LINE／卓上QR
- 先行お試し、卓上QR読込、本番ぬりえ開始、作品送信
- お試しぬりえはLINEユーザーごとに1回だけ、本番は先行参加者だけ特別カラーパレットを解放
- LINE診断の個人別開封、開始、完了、回答内容
- 結果別クーポンの送信、利用状況

## LINE一斉配信からの1人1回診断

LINE配信用URLはLIFF URLを使います。LIFFのIDトークンをVercel側で検証し、`キャンペーンID + LINEユーザーID` の組み合わせを一意にすることで、同じキャンペーンでは1人1回だけ診断できます。2回目以降は以前の結果とクーポンを表示します。

LINE LoginチャンネルとMessaging APIチャンネルは、必ず同じLINE Developersプロバイダー内に作成してください。

診断結果ごとに次の内容をMessaging APIで本人へ送ります。御膳・甘味はLINE標準クーポンへのリンクを使うため、店頭での番号入力は不要です。

- ぬりえ：季節のぬりえ参加PASS
- 御膳：選べる御膳＋和紅茶 120円OFF（LINE標準クーポン）
- 甘味：二色わらび餅＋和紅茶 120円OFF（LINE標準クーポン）

会計時はお客様がLINE標準クーポンを開き、スタッフ確認後にお客様自身で「使用済みにする」を押します。`/redeem` は独自クーポンの予備確認画面として残しています。

## Supabase

SupabaseのSQL Editorで次の順に実行してください。

1. `supabase/migrations/202608200001_holiday_diagnosis.sql`
2. `supabase/migrations/202608200002_line_campaign_coupons.sql`
3. `supabase/migrations/202608200003_table_same_day_coloring_pass.sql`

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
LINE_MEAL_COUPON_URL=https://lin.ee/YYe02WS
LINE_SWEET_COUPON_URL=https://lin.ee/98j6aS5
DIAGNOSIS_CAMPAIGN_ID=weekend-2026-08-22-native
DIAGNOSIS_EVENT_START=2026-08-22
COLORING_GALLERY_URL=https://ぬりえギャラリーのVercelドメイン/
COLORING_ENTRY_SECRET=両方のVercelプロジェクトに設定する32文字以上の同一ランダム値
COUPON_STAFF_PIN=スタッフだけが知るPIN
```

`SUPABASE_SECRET_KEY`、`LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`、`COLORING_ENTRY_SECRET` はVercelサーバー専用です。ソースコード、ブラウザ、Apps Script、チャットへ記載しないでください。

`COLORING_ENTRY_SECRET` は休日診断とぬりえギャラリーの両プロジェクトへ、同じ値を設定します。休日診断が発行した有効時間つき参加トークンだけを、ぬりえギャラリーが受け付けます。

## 先行お試しから本参加まで

1. LINEの休日診断で「ぬりえ参加」になった人へ先行参加PASSを保存
2. 8月21日までは、お試しギャラリーの参加URLを1回だけ発行
3. お試し作品は本番の作品提出・特典付与の対象外
4. 8月22日以降は店内の卓上QRからLINE本人確認し、参加権がない人へ当日参加PASSを自動発行
5. 御膳・甘味の診断結果とクーポンは保持したまま、ぬりえ参加PASSを別管理
6. 先行参加PASSは「金茶・抹茶・桜・藍」の限定色を追加、当日参加PASSはスタンダード8色
7. 作品データへ先行参加／当日参加とパレット区分を保存

## QRのURL

```text
ポスター：https://liff.line.me/LIFF_ID?source=poster
LINE：https://liff.line.me/LIFF_ID?source=line
卓上：https://liff.line.me/LIFF_ID?source=table
```

1人1回判定と先行参加特典をLINEユーザーに結び付けるため、卓上QRも通常のVercel URLではなくLIFF URLを使用します。

## Googleスプレッドシート

`docs/google-sheets-sync.gs` を対象スプレッドシートのApps Scriptへ追加し、VercelとApps Scriptの両方に同じ `SHEETS_SYNC_TOKEN` を登録します。`SUPABASE_SECRET_KEY` はApps Scriptへ登録しません。`installHolidayDiagnosisSync` を1回実行すると、5分ごとに「参加ログ」「診断ファネル」「診断集計」へ反映されます。

「診断ファネル」ではLINE表示名、個人を識別する末尾6文字、開封・開始・完了、診断結果、回答、クーポン案内送信まで確認できます。完全なLINEユーザーIDはスプレッドシートへ出しません。

「診断集計」では診断クリック率、完了率、結果別人数、クーポン利用率を集計します。LINEメッセージの配信数・開封数とLINE標準クーポンの使用者数は、LINE Official Account Managerの集計値を手入力します。取引ごとのスタッフ入力は不要です。

## ローカル確認

```bash
npm install
cp .env.example .env.local
npm run dev
```
