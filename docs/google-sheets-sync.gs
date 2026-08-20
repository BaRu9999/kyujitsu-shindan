/**
 * 休日診断のSupabaseデータを、同じスプレッドシート内の
 * 「参加ログ」シートへ自動反映します。
 *
 * スクリプトプロパティに次の2項目を登録してください。
 * SUPABASE_URL
 * SUPABASE_SECRET_KEY
 * 旧形式の場合は SUPABASE_SERVICE_ROLE_KEY でも動作します。
 */
function syncHolidayDiagnosisLogs() {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = String(props.getProperty('SUPABASE_URL') || '').replace(/\/$/, '');
  const serviceRoleKey = props.getProperty('SUPABASE_SECRET_KEY') ||
    props.getProperty('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabaseの接続情報が未設定です。');
  }

  const response = UrlFetchApp.fetch(
    supabaseUrl + '/rest/v1/sheet_participation_export?select=*&order=created_at.desc&limit=5000',
    {
      method: 'get',
      headers: {
        apikey: serviceRoleKey,
        Authorization: 'Bearer ' + serviceRoleKey
      },
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('Supabase取得エラー: ' + response.getContentText());
  }

  const records = JSON.parse(response.getContentText());
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('参加ログ') || spreadsheet.insertSheet('参加ログ');
  const headers = [
    '参加番号', '診断日', '診断結果', '参加区分', '流入元',
    'ぬりえ参加権', '先行お試し済み', '作品状態', '初回登録日時',
    '最終更新日時', '卓上QR読込数', 'ぬりえ開始数', '作品送信数'
  ];
  const resultLabels = { coloring: 'ぬりえ参加', meal: '御膳＋ドリンク', sweet: 'わらび餅＋ドリンク' };
  const passLabels = { advance: '先行参加', same_day: '当日参加' };
  const statusLabels = {
    not_submitted: '未送信', submitted: '確認待ち', approved: '承認', rejected: '非承認'
  };

  const values = records.map(function(record) {
    return [
      record.participant_code,
      record.diagnosed_on,
      resultLabels[record.diagnosis_result] || record.diagnosis_result,
      passLabels[record.pass_type] || '',
      record.source,
      record.event_eligible ? 'あり' : 'なし',
      record.preview_used ? '済' : '未',
      statusLabels[record.artwork_status] || record.artwork_status,
      record.created_at,
      record.updated_at,
      Number(record.table_qr_count || 0),
      Number(record.coloring_start_count || 0),
      Number(record.artwork_submit_count || 0)
    ];
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (values.length) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
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
