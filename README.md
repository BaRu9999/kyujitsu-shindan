# 休日診断

祇園茶寮 × タニタカフェ 柏の葉の休日診断・ぬりえ参加導線です。Next.jsで動作し、VercelからSupabaseへ参加状況を記録します。

## 記録する内容

- 診断結果：ぬりえ参加／御膳＋ドリンク／わらび餅＋ドリンク
- 参加区分：先行参加／当日参加
- 流入元：ポスター／LINE／卓上QR
- 先行お試し、卓上QR読込、本番ぬりえ開始、作品送信

## Supabase

`supabase/migrations/202608200001_holiday_diagnosis.sql` をSupabaseのSQL Editorで実行してください。

## 環境変数

VercelのProject Settings → Environment Variablesへ登録します。

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SHEETS_SYNC_TOKEN=64文字以上のランダムな値
```

`SUPABASE_SECRET_KEY` はVercelサーバー専用です。ソースコード、ブラウザ、Apps Scriptへ記載しないでください。

## QRのURL

```text
ポスター：https://公開URL/?source=poster
LINE：https://公開URL/?source=line
卓上：https://公開URL/?source=table
```

## Googleスプレッドシート

`docs/google-sheets-sync.gs` を対象スプレッドシートのApps Scriptへ追加し、VercelとApps Scriptの両方に同じ `SHEETS_SYNC_TOKEN` を登録します。`SUPABASE_SECRET_KEY` はApps Scriptへ登録しません。`installHolidayDiagnosisSync` を1回実行すると、5分ごとに「参加ログ」へ反映されます。

## ローカル確認

```bash
npm install
cp .env.example .env.local
npm run dev
```
