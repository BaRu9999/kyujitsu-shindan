/**
 * 休日診断のSupabaseデータを、同じスプレッドシート内の
 * 「参加ログ」「診断ファネル」シートへ自動反映します。
 *
 * スクリプトプロパティ:
 * SHEETS_SYNC_TOKEN（必須）
 * SHEETS_SYNC_ENDPOINT（同期先を変える場合のみ）
 */
function syncHolidayDiagnosisLogs() {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('SHEETS_SYNC_ENDPOINT') ||
    'https://kyujitsu-shindan.vercel.app/api/sheets-export';
  const syncToken = props.getProperty('SHEETS_SYNC_TOKEN');

  if (!syncToken) throw new Error('SHEETS_SYNC_TOKENが未設定です。');

  const participants = fetchHolidayDataset_(endpoint, syncToken, 'participants');
  const funnel = fetchHolidayDataset_(endpoint, syncToken, 'funnel');
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  writeParticipationSheet_(spreadsheet, participants);
  writeFunnelSheet_(spreadsheet, funnel);
  writeSummarySheet_(spreadsheet, funnel);
}

function fetchHolidayDataset_(endpoint, syncToken, dataset) {
  const separator = endpoint.indexOf('?') === -1 ? '?' : '&';
  const response = UrlFetchApp.fetch(
    endpoint + separator + 'dataset=' + encodeURIComponent(dataset),
    {
      method: 'get',
      headers: { 'X-Sync-Token': syncToken },
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('同期API取得エラー(' + dataset + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function writeParticipationSheet_(spreadsheet, records) {
  const sheet = spreadsheet.getSheetByName('参加ログ') || spreadsheet.insertSheet('参加ログ');
  const headers = [
    '参加番号', '診断日', '診断結果', '参加区分', '流入元',
    'ぬりえ参加権', '先行お試し済み', '作品状態', '初回登録日時',
    '最終更新日時', '卓上QR読込数', 'ぬりえ開始数', '作品送信数',
    'キャンペーン', 'LINE表示名', 'LINE識別子', '回答内容',
    '内部発行ID', 'クーポン種別', '案内送信状態', '案内送信日時', '独自承認日時（予備）'
  ];
  const resultLabels = {
    coloring: 'ぬりえ参加', meal: '選べる御膳＋和紅茶', sweet: '二色わらび餅＋和紅茶'
  };
  const passLabels = { advance: '先行参加', same_day: '当日参加' };
  const statusLabels = {
    not_submitted: '未送信', submitted: '確認待ち', approved: '承認', rejected: '非承認'
  };
  const couponLabels = {
    coloring_pass: 'ぬりえ参加PASS',
    meal_tea_120_off: '御膳＋和紅茶 120円OFF',
    warabi_tea_120_off: '二色わらび餅＋和紅茶 120円OFF'
  };

  const values = records.map(function(record) {
    return [
      record.participant_code, record.diagnosed_on,
      resultLabels[record.diagnosis_result] || record.diagnosis_result,
      passLabels[record.pass_type] || '', record.source,
      record.event_eligible ? 'あり' : 'なし', record.preview_used ? '済' : '未',
      statusLabels[record.artwork_status] || record.artwork_status,
      record.created_at, record.updated_at,
      Number(record.table_qr_count || 0), Number(record.coloring_start_count || 0),
      Number(record.artwork_submit_count || 0), record.campaign_id || '',
      record.line_display_name || '', record.line_user_masked || '',
      formatAnswers_(record.answers), record.coupon_code || '',
      couponLabels[record.coupon_type] || record.coupon_type || '',
      record.coupon_send_status || '', record.coupon_sent_at || '',
      record.coupon_redeemed_at || ''
    ];
  });
  writeTable_(sheet, headers, values);
}

function writeFunnelSheet_(spreadsheet, records) {
  const sheet = spreadsheet.getSheetByName('診断ファネル') || spreadsheet.insertSheet('診断ファネル');
  const headers = [
    'キャンペーン', 'LINE表示名', 'LINE識別子', '流入元', '初回開封日時',
    '最終開封日時', '開封回数', '診断開始日時', '診断完了日時', '診断日',
    '診断結果', '回答内容', '参加番号', '内部発行ID', 'クーポン種別',
    '案内送信状態', '案内送信日時', '独自承認日時（予備）', '最終更新日時'
  ];
  const resultLabels = {
    coloring: 'ぬりえ参加', meal: '選べる御膳＋和紅茶', sweet: '二色わらび餅＋和紅茶'
  };
  const couponLabels = {
    coloring_pass: 'ぬりえ参加PASS',
    meal_tea_120_off: '御膳＋和紅茶 120円OFF',
    warabi_tea_120_off: '二色わらび餅＋和紅茶 120円OFF'
  };

  const values = records.map(function(record) {
    return [
      record.campaign_id, record.line_display_name || '', record.line_user_masked,
      record.source, record.first_opened_at, record.last_opened_at,
      Number(record.opened_count || 0), record.diagnosis_started_at || '',
      record.diagnosis_completed_at || '', record.diagnosed_on || '',
      resultLabels[record.diagnosis_result] || record.diagnosis_result || '未完了',
      formatAnswers_(record.answers), record.participant_code || '', record.coupon_code || '',
      couponLabels[record.coupon_type] || record.coupon_type || '',
      record.coupon_send_status || '', record.coupon_sent_at || '',
      record.coupon_redeemed_at || '', record.updated_at
    ];
  });
  writeTable_(sheet, headers, values);
}

function writeSummarySheet_(spreadsheet, records) {
  const sheet = spreadsheet.getSheetByName('診断集計') || spreadsheet.insertSheet('診断集計');
  const campaignId = records.length ? records[0].campaign_id : '';
  const isNativeCouponLayout = sheet.getRange('A1').getValue() === '休日診断 KPI（LINE標準クーポン）';
  const previousCampaignId = sheet.getRange('B2').getValue();
  const keepManualValues = isNativeCouponLayout && previousCampaignId === campaignId;
  const delivered = keepManualValues ? Number(sheet.getRange('B3').getValue() || 0) : 0;
  const lineOpened = keepManualValues ? Number(sheet.getRange('B4').getValue() || 0) : 0;
  const mealCouponUsed = keepManualValues ? Number(sheet.getRange('B5').getValue() || 0) : 0;
  const sweetCouponUsed = keepManualValues ? Number(sheet.getRange('B6').getValue() || 0) : 0;
  const current = records.filter(function(record) { return record.campaign_id === campaignId; });
  const appOpened = current.length;
  const started = current.filter(function(record) { return Boolean(record.diagnosis_started_at); }).length;
  const completed = current.filter(function(record) { return Boolean(record.diagnosis_completed_at); }).length;
  const paidCouponSent = current.filter(function(record) {
    return (record.diagnosis_result === 'meal' || record.diagnosis_result === 'sweet') &&
      record.coupon_send_status === 'sent';
  }).length;
  const nativeCouponUsed = mealCouponUsed + sweetCouponUsed;
  const resultCounts = { coloring: 0, meal: 0, sweet: 0 };
  current.forEach(function(record) {
    if (Object.prototype.hasOwnProperty.call(resultCounts, record.diagnosis_result)) {
      resultCounts[record.diagnosis_result] += 1;
    }
  });

  sheet.getRange('A1:E17').breakApart();
  sheet.clearContents();
  sheet.getRange('A1:B1').merge().setValue('休日診断 KPI（LINE標準クーポン）').setBackground('#195d48').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange('A2:B15').setValues([
    ['キャンペーン', campaignId],
    ['LINE配信数（手入力）', delivered],
    ['LINEメッセージ開封数（手入力）', lineOpened],
    ['御膳クーポン使用者数（LINE手入力）', mealCouponUsed],
    ['わらび餅クーポン使用者数（LINE手入力）', sweetCouponUsed],
    ['診断ページ開封者数', appOpened],
    ['診断開始者数', started],
    ['診断完了者数', completed],
    ['有料セットクーポン案内送信者数', paidCouponSent],
    ['LINEクーポン使用者数（合計）', nativeCouponUsed],
    ['LINEメッセージ開封率', delivered ? lineOpened / delivered : 0],
    ['診断クリック率', delivered ? appOpened / delivered : 0],
    ['診断完了率', appOpened ? completed / appOpened : 0],
    ['LINEクーポン利用率', paidCouponSent ? nativeCouponUsed / paidCouponSent : 0]
  ]);
  sheet.getRange('D1:E1').merge().setValue('診断結果別').setBackground('#195d48').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange('D2:E4').setValues([
    ['ぬりえ参加', resultCounts.coloring],
    ['御膳＋和紅茶', resultCounts.meal],
    ['二色わらび餅＋和紅茶', resultCounts.sweet]
  ]);
  sheet.getRange('B12:B15').setNumberFormat('0.0%');
  sheet.getRange('A1:E15').setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, 5);
  sheet.getRange('A17').setValue('※LINE配信数・メッセージ開封数・2種類のクーポン使用者数は、LINE Official Account Managerの前日までの集計値を入力してください。取引ごとの入力は不要です。');
  sheet.getRange('A17:E17').merge().setFontColor('#75695b').setFontSize(9);
}

function formatAnswers_(answers) {
  if (!answers) return '';
  const parsed = typeof answers === 'string' ? JSON.parse(answers) : answers;
  if (!Array.isArray(parsed)) return '';
  return parsed.map(function(item) {
    return (item.question || '') + '：' + (item.answer || '');
  }).join(' / ');
}

function writeTable_(sheet, headers, values) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (values.length) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#195d48')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
}

function installHolidayDiagnosisSync() {
  ScriptApp.getProjectTriggers()
    .filter(function(trigger) { return trigger.getHandlerFunction() === 'syncHolidayDiagnosisLogs'; })
    .forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('syncHolidayDiagnosisLogs')
    .timeBased()
    .everyMinutes(5)
    .create();
}
