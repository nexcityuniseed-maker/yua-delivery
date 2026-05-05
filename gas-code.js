// ============================================
// YUA配送先マスタ - Google Apps Script Webhook
// ============================================
// ★初回: メニューの関数ドロップダウンで「setup」を選び▶実行 → 権限承認
// ★次に: デプロイ → 新しいデプロイ → ウェブアプリ → アクセス:全員 → デプロイ
//        → 発行されたURLをコピー

const SHEET_NAME = 'shops';
const HEADERS = ['id', 'name', 'address', 'tel', 'contact', 'place', 'note', 'days', 'time', 'items', 'updatedAt'];

const ROUTE_SHEET = 'route';
const ROUTE_HEADERS = ['id', 'date', 'vehicleId', 'driver', 'order', 'shopId', 'name', 'address', 'scheduledTime', 'items', 'qty', 'note', 'status', 'completedAt', 'importedAt', 'updatedAt'];

const SEED_DATA = [
  [1,  '焼肉大将軍 名駅店',   '名古屋市中村区名駅4-5-2',           '052-111-1111', '山田店長',     'back',     '裏のシャッター開いてます',                     '1,2,3,4,5',   '10:00〜11:00', '割り箸、おしぼり',     ''],
  [2,  'ラーメン一番星',       '名古屋市中村区椿町1-3',              '052-222-2222', '佐藤オーナー', 'kitchen',  '冷蔵庫横まで運んでください',                   '1,3,5',       '9:00〜10:30',  '麺、スープ原液',       ''],
  [3,  'カフェ ベル',           '名古屋市中区錦2-10-5',               '052-333-3333', '',             'counter',  '',                                             '2,4,6',       '9:00〜11:00',  'コーヒー豆、紙コップ', ''],
  [4,  '居酒屋まるきん 栄店',   '名古屋市中区栄3-15-8 サンプルビル1F', '052-444-4444', '鈴木店長',     'staff',    '開店前なのでインターホンを鳴らしてください',     '1,2,3,4,5,6', '11:00〜13:00', 'お米20kg、油',          ''],
  [5,  '寿司処 江戸',           '名古屋市中区大須2-8-1',              '052-555-5555', '',             'entrance', '',                                             '2,5',         '10:00〜12:00', '割り箸、醤油',          ''],
  [6,  '焼き鳥 鳥政',           '名古屋市中区新栄1-5-3',              '052-666-6666', '高橋店長',     'back',     '重いので台車を使ってください',                 '1,4',         '13:00〜15:00', '備長炭、タレ',          ''],
  [7,  '中華料理 龍門',         '名古屋市東区東桜1-12-4',             '052-777-7777', '',             'kitchen',  '',                                             '1,2,3,4,5',   '13:00〜15:00', '油、調味料一式',        ''],
  [8,  '和食 さくら',           '名古屋市東区葵3-2-1',                '052-888-8888', '伊藤女将',     'storage',  '2階の倉庫へ',                                  '1,3,5',       '14:00〜16:00', 'お米30kg、味噌',        ''],
  [9,  'とんかつ たなか 豊田店','豊田市若宮町1-52',                   '0565-11-1111', '田中社長',     'staff',    '',                                             '2,4,6',       '14:00〜16:00', 'パン粉、キャベツ',      ''],
  [10, '居酒屋 ほろ酔い 岡崎店','岡崎市康生通南2-25',                 '0564-22-2222', '',             'entrance', '',                                             '1,2,3,4,5,6', '16:00〜18:00', 'お米、割り箸、油',      ''],
];

// ===== 初回セットアップ（メニューから1回だけ実行） =====
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // スプレッドシート名を更新
  ss.rename('YUA配送先マスタ');
  // shopsシートを用意（既存の一枚目をリネーム）
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const sheets = ss.getSheets();
    sheet = sheets[0];
    sheet.setName(SHEET_NAME);
  }
  // ヘッダー行
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
       .setFontWeight('bold').setBackground('#e8f0fe').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // 既存データがあれば消してからサンプル投入
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, HEADERS.length).clearContent();
  if (SEED_DATA.length) {
    const rows = SEED_DATA.map(r => {
      const copy = r.slice();
      copy[10] = new Date().toISOString();
      return copy;
    });
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
  // 列幅を見やすく
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 260);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 240);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 110);
  sheet.setColumnWidth(10, 220);
  sheet.setColumnWidth(11, 180);
  SpreadsheetApp.getUi().alert('✅ セットアップ完了\n\n次はメニューの「デプロイ → 新しいデプロイ → ウェブアプリ」から公開してください。');
}

// ===== route シート初期化（F機能用：取込→ルート→ドライバーの一気通貫） =====
// ★この関数も1回だけ実行してください
function setupRoute() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROUTE_SHEET);
  if (!sheet) sheet = ss.insertSheet(ROUTE_SHEET);
  sheet.getRange(1, 1, 1, ROUTE_HEADERS.length).setValues([ROUTE_HEADERS]);
  sheet.getRange(1, 1, 1, ROUTE_HEADERS.length)
       .setFontWeight('bold').setBackground('#fce8b2').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  const widths = [50, 100, 70, 90, 60, 70, 180, 220, 100, 180, 80, 180, 80, 150, 150, 150];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  SpreadsheetApp.getUi().alert('✅ route シートを準備しました');
}

// ===== GET /exec → 全店舗取得 or GETパラメータで書き込み =====
// ブラウザからのCORS制限を回避するため、書き込みもGETで受け付ける
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return jsonCors({error: 'Sheet "' + SHEET_NAME + '" not found. Run setup() first.'});

    // actionパラメータがあれば書き込み処理
    const action = e.parameter.action;
    if (action) {
      const data = JSON.parse(e.parameter.data || '{}');
      if (action === 'upsert') return upsertShop(sheet, data.shop);
      if (action === 'delete') return deleteShop(sheet, data.id);
      if (action === 'bulk')   return bulkReplace(sheet, data.shops);
      // route シート関連
      if (action === 'route_get')    return routeGet(data);
      if (action === 'route_import') return routeImport(data);
      if (action === 'route_assign') return routeAssign(data);
      if (action === 'route_status') return routeStatus(data);
      if (action === 'route_clear')  return routeClearDate(data);
      return jsonCors({error: 'Unknown action: ' + action});
    }

    // actionなし → 全店舗を返す
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return jsonCors({shops: []});
    const headers = values[0];
    const shops = values.slice(1)
      .filter(row => row[0] !== '' && row[0] !== null)
      .map(row => rowToShop(headers, row));
    return jsonCors({shops: shops, count: shops.length});
  } catch (err) {
    return jsonCors({error: err.toString()});
  }
}

// ===== POST（互換性のため残す） =====
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return jsonCors({error: 'Sheet not found'});

    if (action === 'upsert') return upsertShop(sheet, payload.shop);
    if (action === 'delete') return deleteShop(sheet, payload.id);
    if (action === 'bulk')   return bulkReplace(sheet, payload.shops);
    if (action === 'route_get')    return routeGet(payload);
    if (action === 'route_import') return routeImport(payload);
    if (action === 'route_assign') return routeAssign(payload);
    if (action === 'route_status') return routeStatus(payload);
    if (action === 'route_clear')  return routeClearDate(payload);
    return jsonCors({error: 'Unknown action: ' + action});
  } catch (err) {
    return jsonCors({error: err.toString()});
  }
}

// ===== Helpers =====
function rowToShop(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  if (obj.days === '' || obj.days === null || obj.days === undefined) {
    obj.days = [];
  } else if (typeof obj.days === 'string') {
    obj.days = obj.days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
  } else if (typeof obj.days === 'number') {
    obj.days = [obj.days];
  }
  if (typeof obj.id === 'string' && /^\d+$/.test(obj.id)) obj.id = parseInt(obj.id);
  return obj;
}

function shopToRow(headers, shop) {
  return headers.map(h => {
    if (h === 'days' && Array.isArray(shop.days)) return shop.days.join(',');
    return shop[h] !== undefined && shop[h] !== null ? shop[h] : '';
  });
}

function upsertShop(sheet, shop) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  shop.updatedAt = new Date().toISOString();

  if (shop.id !== undefined && shop.id !== null && shop.id !== '') {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idCol]) === String(shop.id)) {
        const existing = rowToShop(headers, values[i]);
        const merged = Object.assign({}, existing, shop);
        const row = shopToRow(headers, merged);
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        return json({ok: true, mode: 'update', id: shop.id});
      }
    }
  }
  // Insert — auto-generate id
  let maxId = 0;
  for (let i = 1; i < values.length; i++) {
    const v = parseInt(values[i][idCol]);
    if (!isNaN(v) && v > maxId) maxId = v;
  }
  shop.id = maxId + 1;
  const row = shopToRow(headers, shop);
  sheet.appendRow(row);
  return json({ok: true, mode: 'insert', id: shop.id});
}

function deleteShop(sheet, id) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return json({ok: true, id: id});
    }
  }
  return json({error: 'Not found', id: id});
}

function bulkReplace(sheet, shops) {
  const headers = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  if (shops && shops.length) {
    const rows = shops.map(s => {
      if (!s.updatedAt) s.updatedAt = new Date().toISOString();
      return shopToRow(headers, s);
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return json({ok: true, count: shops ? shops.length : 0});
}

function json(obj) {
  return jsonCors(obj);
}

function jsonCors(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// route シート操作（F機能：取込→ルート→ドライバー）
// ============================================
function getRouteSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ROUTE_SHEET);
}

function rowToRoute_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let v = row[i];
    // Sheetsが自動変換するDate型を文字列に戻す
    if (v instanceof Date) {
      if (h === 'date') {
        v = v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
      } else if (h === 'scheduledTime') {
        v = String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
      } else {
        v = v.toISOString();
      }
    }
    obj[h] = v;
  });
  ['id', 'vehicleId', 'order', 'shopId'].forEach(k => {
    if (obj[k] === '' || obj[k] === null || obj[k] === undefined) {
      if (k === 'shopId') obj[k] = '';
      else if (k === 'vehicleId') obj[k] = 0;
      else obj[k] = null;
    } else if (typeof obj[k] === 'string' && /^\d+$/.test(obj[k])) {
      obj[k] = parseInt(obj[k]);
    } else if (typeof obj[k] === 'number') {
      obj[k] = obj[k];
    }
  });
  return obj;
}

function routeToRow_(headers, route) {
  return headers.map(h => route[h] !== undefined && route[h] !== null ? route[h] : '');
}

function routeGet(data) {
  const sheet = getRouteSheet_();
  if (!sheet) return jsonCors({error: 'route sheet not found. Run setupRoute() first.'});
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonCors({routes: [], count: 0});
  const headers = values[0];
  let rows = values.slice(1)
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(r => rowToRoute_(headers, r));
  if (data && data.date) rows = rows.filter(r => r.date === data.date);
  if (data && data.vehicleId !== undefined && data.vehicleId !== null && data.vehicleId !== '') {
    const vid = parseInt(data.vehicleId);
    rows = rows.filter(r => parseInt(r.vehicleId) === vid);
  }
  // 並び順: vehicleId → order
  rows.sort((a, b) => (a.vehicleId - b.vehicleId) || (a.order - b.order));
  return jsonCors({routes: rows, count: rows.length});
}

function routeImport(data) {
  const sheet = getRouteSheet_();
  if (!sheet) return jsonCors({error: 'route sheet not found'});
  const date = data && data.date;
  const items = (data && data.items) || [];
  const replace = !!(data && data.replace);
  if (!date) return jsonCors({error: 'date required'});

  // replace=true なら同じ日付の vehicleId=0（未割当）を先に消す
  if (replace) {
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const dateCol = headers.indexOf('date');
    const vidCol = headers.indexOf('vehicleId');
    const rowsToDelete = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i][dateCol] === date && parseInt(values[i][vidCol]) === 0) {
        rowsToDelete.push(i + 1);
      }
    }
    // 後ろから消す
    rowsToDelete.reverse().forEach(r => sheet.deleteRow(r));
  }

  const values2 = sheet.getDataRange().getValues();
  const headers2 = values2[0];
  let maxId = 0;
  for (let i = 1; i < values2.length; i++) {
    const v = parseInt(values2[i][0]);
    if (!isNaN(v) && v > maxId) maxId = v;
  }
  const now = new Date().toISOString();
  const newRows = items.map((it, idx) => {
    const r = Object.assign({
      date: date,
      vehicleId: 0,
      driver: '',
      order: idx + 1,
      shopId: '',
      name: '',
      address: '',
      scheduledTime: '',
      items: '',
      qty: '',
      note: '',
      status: 'pending',
      completedAt: '',
      importedAt: now,
      updatedAt: now,
    }, it);
    r.id = ++maxId;
    return routeToRow_(headers2, r);
  });
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers2.length).setValues(newRows);
  }
  return jsonCors({ok: true, count: newRows.length});
}

function routeAssign(data) {
  const sheet = getRouteSheet_();
  if (!sheet) return jsonCors({error: 'route sheet not found'});
  const assignments = (data && data.assignments) || [];
  if (!assignments.length) return jsonCors({ok: true, updated: 0});

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  const now = new Date().toISOString();
  const idMap = {};
  for (let i = 1; i < values.length; i++) {
    idMap[String(values[i][idCol])] = i;
  }
  let updated = 0;
  assignments.forEach(a => {
    const rowIdx = idMap[String(a.id)];
    if (rowIdx === undefined) return;
    const existing = rowToRoute_(headers, values[rowIdx]);
    const merged = Object.assign({}, existing, a, { updatedAt: now });
    const row = routeToRow_(headers, merged);
    sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([row]);
    updated++;
  });
  return jsonCors({ok: true, updated: updated});
}

function routeStatus(data) {
  const sheet = getRouteSheet_();
  if (!sheet) return jsonCors({error: 'route sheet not found'});
  if (!data || data.id === undefined || data.id === null) return jsonCors({error: 'id required'});
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  const statusCol = headers.indexOf('status');
  const completedAtCol = headers.indexOf('completedAt');
  const updatedAtCol = headers.indexOf('updatedAt');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(data.id)) {
      const status = data.status || 'pending';
      const now = new Date().toISOString();
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
      sheet.getRange(i + 1, completedAtCol + 1).setValue(status === 'done' ? (data.completedAt || now) : '');
      sheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
      return jsonCors({ok: true, id: data.id, status: status});
    }
  }
  return jsonCors({error: 'Not found', id: data.id});
}

function routeClearDate(data) {
  const sheet = getRouteSheet_();
  if (!sheet) return jsonCors({error: 'route sheet not found'});
  const date = data && data.date;
  if (!date) return jsonCors({error: 'date required'});
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const dateCol = headers.indexOf('date');
  const rowsToDelete = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][dateCol] === date) rowsToDelete.push(i + 1);
  }
  rowsToDelete.reverse().forEach(r => sheet.deleteRow(r));
  return jsonCors({ok: true, deleted: rowsToDelete.length});
}
