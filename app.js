// app.js — SQL練習帳の画面ロジック
//
// 読み込み順（index.html）: sql.js -> problems/setup.js -> problems/*.js -> judge.js -> app.js
// 使うグローバル: initSqlJs（sql.js）、SETUP_SQL・PROBLEMS（problems/）、Judge（judge.js）
//
// このファイルの構成（上から順に）:
//   1. 設定（レベルの定義・保存キー）
//   1b. 画面の配置（一覧の出し入れ・横並び／縦並び。<html data-sidebar / data-layout> と保存）
//   2. 問題データの読み込みと整理（壊れた問題は除外して console に理由を出す）
//   3. 進捗の保存と読み込み（localStorage。形式は docs/requirements.md 3.6）
//   4. 画面の部品（表・メッセージ・要素の作成）
//   5. 一覧の描画（レベルタブ・問題一覧・全体の進捗・前後の問題へのボタン）
//   6. 問題の表示（初級〜上級 / 実践 / 準備中）
//   6b. URL とタブの題名（?id= で開く・replaceState・#problem-page-link・紹介文 #intro の開閉）
//   7. 操作（実行・答え合わせ・自己完了・リセット）
//   8. 起動
//
// URL の扱い（v1.2.0〜。docs/requirements-v1.2.md 4.3）:
//   - index.html?id=I27 で開くと、その問題を最初に開く（「最後に開いた問題」より優先）。
//     存在しない id・不正な値は無視して従来どおり開く（console に1行出すだけ）。
//   - 問題を開くたびに history.replaceState でアドレスを ?id=<id> にする（履歴は増やさない。
//     ほかのパラメータ・ハッシュは消える）。file:// などで使えなくても止まらない。
//   - タブの題名は「<タイトル>（<レベル><番号>）｜SQL練習帳」。問題がないときは index.html の題名に戻す。
//   - #problem-page-link（静的ページ q/<id>.html へのリンク）と #intro（紹介文）は、
//     index.html にあるときだけ動かす（ない古い index.html でも例外にしない）。
//   - 紹介文は、URL に有効な id がある・進捗が1問以上ある・最後に開いた問題が保存されている、
//     のどれかなら起動時に閉じる。開閉の状態は保存しない。
//
// 規約: 画面に出す文字列は必ず textContent で入れる（innerHTML に文字列を入れない）。
// 動作確認: tests/app/run-app-test.ps1（Edge ヘッドレスで画面を操作して確かめる）。
//
// 起動状態を <html data-app-status="..."> に書く（loading / ready / error）。
// 自動テストはこれを見て起動の完了を待つ。調査のときも開発者ツールで確認できる。
(async function () {
  'use strict';

  // ===========================================================================
  // 1. 設定
  // ===========================================================================

  // レベルの表示順・表示名。problems/*.js の level の値と合わせる
  const LEVELS = [
    { key: 'beginner', label: '初級' },
    { key: 'intermediate', label: '中級' },
    { key: 'advanced', label: '上級' },
    { key: 'practice', label: '実践' },
  ];
  const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.key, l.label]));

  // 進捗の保存キー（v1.0.0〜）。形式: { "version": 2, "solved": { "B01": true } }
  const PROGRESS_KEY = 'sqlrenshu-progress-v2';
  const PROGRESS_VERSION = 2;
  // 読めなかった進捗データを上書きする前に、元の文字列を退避しておくキー（原因調査用）
  const PROGRESS_BACKUP_KEY = 'sqlrenshu-progress-v2-unreadable';
  // 最後に開いた問題の id（任意の機能。読めなくても先頭の問題を開くだけ）
  const LAST_PROBLEM_KEY = 'sqlrenshu-last-problem';
  // v0.1.0 の保存キー（index ベース）。問題が入れ替わったため読まない・消さない
  //   'sqlrenshu-progress'

  // タブの題名の末尾に付けるサイト名（6b.）。問題がないときは index.html の <title> に戻す
  const SITE_NAME = 'SQL練習帳';
  const BASE_TITLE = document.title;
  // 問題を開く URL のパラメータ名（index.html?id=I27）と、静的な問題ページの場所（q/I27.html）
  const URL_ID_PARAM = 'id';
  const PROBLEM_PAGE_DIR = 'q/';

  const SQLJS_BASE ='https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
  const NARROW_QUERY = '(max-width: 720px)'; // style.css のスマホ用の切り替え幅と合わせる

  // 画面の配置の保存キー（v1.1.0〜）。形式: { "version": 1, "sidebar": "open"|"closed", "layout": "split"|"stack" }
  // 仕様: docs/ui-layout-spec.md
  const UI_KEY = 'sqlrenshu-ui';
  const UI_VERSION = 1;
  // 保存がない・読めないときの配置（既定値はユーザーの選択で決める。docs/ui-layout-spec.md「保存」）
  const UI_DEFAULTS = { sidebar: 'closed', layout: 'split' };
  // 項目ごとに使える値。<html data-sidebar / data-layout> に入れる値と同じ
  const UI_VALUES = { sidebar: ['open', 'closed'], layout: ['split', 'stack'] };

  const $ = (id) => document.getElementById(id);
  const editor = $('editor');

  function setAppStatus(status) {
    document.documentElement.dataset.appStatus = status;
  }
  setAppStatus('loading');

  // ===========================================================================
  // 1b. 画面の配置（一覧の出し入れ・横並び／縦並び）
  // ===========================================================================
  //
  // <html data-sidebar="open|closed" data-layout="split|stack"> を付け外しし、見た目は style.css が決める。
  // 画面のちらつきを減らすため、問題の表示より前（このすぐ下）で反映する。
  // 進捗の保存（3.）とは独立させる: ここでの localStorage の失敗は console に出すだけで、
  // 利用者への注意は進捗側（storageWarning）が出す。ボタンがない古い index.html でも例外にしない。

  // 保存された文字列を解釈する。読めない項目は既定値にする（読める項目は生かす）
  function parseUiPrefs(raw) {
    const prefs = { ...UI_DEFAULTS };
    if (raw === null || raw === undefined) return prefs;
    let obj;
    try { obj = JSON.parse(raw); } catch { obj = null; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.version !== UI_VERSION) {
      console.warn(`[SQL練習帳] 画面の配置（${UI_KEY}）を読めなかったため、既定の配置で始めます。`);
      return prefs;
    }
    Object.keys(UI_VALUES).forEach((k) => {
      if (UI_VALUES[k].includes(obj[k])) prefs[k] = obj[k];
    });
    return prefs;
  }

  function loadUiPrefs() {
    let raw = null;
    try {
      raw = localStorage.getItem(UI_KEY);
    } catch (e) {
      console.warn('[SQL練習帳] localStorage を読めないため、画面の配置は既定のままにします:', e);
    }
    return parseUiPrefs(raw);
  }

  function saveUiPrefs() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ version: UI_VERSION, ...uiPrefs }));
      return true;
    } catch (e) {
      console.warn('[SQL練習帳] 画面の配置を保存できません（このページを開いている間だけ有効です）:', e);
      return false;
    }
  }

  // <html> の属性と2つのボタン（あれば）を uiPrefs に合わせる
  function applyUiPrefs() {
    const root = document.documentElement;
    root.dataset.sidebar = uiPrefs.sidebar;
    root.dataset.layout = uiPrefs.layout;

    const sidebarBtn = $('sidebar-toggle');
    if (sidebarBtn) {
      const open = uiPrefs.sidebar === 'open';
      sidebarBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      sidebarBtn.textContent = open ? '一覧を隠す' : '一覧を出す';
    }
    const layoutBtn = $('layout-toggle');
    if (layoutBtn) {
      layoutBtn.textContent = uiPrefs.layout === 'split' ? '縦に並べる' : '横に並べる';
    }
  }

  function setUiPref(key, value) {
    if (!UI_VALUES[key] || !UI_VALUES[key].includes(value)) return;
    uiPrefs[key] = value;
    applyUiPrefs();
    saveUiPrefs();
  }

  const uiPrefs = loadUiPrefs();
  applyUiPrefs();
  {
    const sidebarBtn = $('sidebar-toggle');
    if (sidebarBtn) {
      sidebarBtn.addEventListener('click', () => {
        setUiPref('sidebar', uiPrefs.sidebar === 'open' ? 'closed' : 'open');
        // 隠している間は一覧の位置を合わせられないので、出したときに選択中の問題へ合わせる
        if (uiPrefs.sidebar === 'open') scrollActiveIntoView();
      });
    }
    const layoutBtn = $('layout-toggle');
    if (layoutBtn) {
      layoutBtn.addEventListener('click', () => {
        setUiPref('layout', uiPrefs.layout === 'split' ? 'stack' : 'split');
      });
    }
  }

  // ===========================================================================
  // 2. 問題データの読み込みと整理
  // ===========================================================================

  // PROBLEMS から表示できる問題だけを取り出し、レベルごとに番号を付ける。
  // 形式の誤りは tests/problems/check.html で見つける前提だが、
  // 画面が止まらないよう、ここでも最低限の確認をして壊れた問題は飛ばす。
  function loadProblems() {
    const source = typeof PROBLEMS !== 'undefined' && Array.isArray(PROBLEMS) ? PROBLEMS : null;
    const byLevel = Object.fromEntries(LEVELS.map((l) => [l.key, []]));
    const byId = new Map();
    const skipped = [];
    if (!source) return { ok: false, byLevel, byId, skipped };

    source.forEach((p, i) => {
      const where = `PROBLEMS[${i}]`;
      if (!p || typeof p !== 'object') { skipped.push(`${where}: オブジェクトではありません`); return; }
      if (typeof p.id !== 'string' || !p.id) { skipped.push(`${where}: id がありません`); return; }
      if (byId.has(p.id)) { skipped.push(`${where}: id "${p.id}" が重複しています`); return; }
      if (!byLevel[p.level]) { skipped.push(`${where} (${p.id}): level "${p.level}" は不明です`); return; }
      if (typeof p.title !== 'string') { skipped.push(`${where} (${p.id}): title がありません`); return; }
      if (p.level !== 'practice' && typeof p.answer !== 'string') {
        skipped.push(`${where} (${p.id}): answer がありません`); return;
      }
      const list = byLevel[p.level];
      const item = { data: p, id: p.id, level: p.level, num: list.length + 1 };
      list.push(item);
      byId.set(p.id, item);
    });
    skipped.forEach((s) => console.warn('[SQL練習帳] 問題を表示できないため飛ばしました: ' + s));
    return { ok: true, byLevel, byId, skipped };
  }

  // 「中級 12. 平均より高い商品」
  function problemLabel(item) {
    return `${LEVEL_LABEL[item.level]} ${item.num}. ${item.data.title}`;
  }

  // ===========================================================================
  // 3. 進捗の保存と読み込み
  // ===========================================================================
  //
  // localStorage は「無効にされている」「容量がいっぱい」「データが壊れている」ことがある。
  // どの場合も例外を外に出さず、進捗なしとして動き続ける。

  let storageWarning = ''; // 利用者に一度だけ伝える注意（保存できない等）

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[SQL練習帳] localStorage を読めません:', e);
      storageWarning = 'このブラウザでは進捗を保存できません（ストレージが無効になっています）。ページを閉じると進捗は消えます。';
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('[SQL練習帳] localStorage に保存できません:', e);
      storageWarning = '進捗を保存できませんでした（ブラウザのストレージが無効か、容量がいっぱいです）。ページを閉じると進捗は消えます。';
      return false;
    }
  }

  // 保存された文字列を解釈して { "B01": true, ... } を返す。読めない場合は null
  function parseProgress(raw) {
    let obj;
    try { obj = JSON.parse(raw); } catch { return null; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (obj.version !== PROGRESS_VERSION) return null;
    const s = obj.solved;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    const solved = {};
    // true 以外の値は捨てる（"yes" や 1 なども完了扱いにしない）
    Object.keys(s).forEach((id) => { if (s[id] === true) solved[id] = true; });
    return solved;
  }

  function loadProgress() {
    const raw = storageGet(PROGRESS_KEY);
    if (raw === null) return {};
    const solved = parseProgress(raw);
    if (solved) return solved;
    // 壊れたデータ・未知の形式。次の保存で上書きされるので、元の文字列を退避しておく
    console.warn(`[SQL練習帳] 進捗データ（${PROGRESS_KEY}）を読めなかったため、進捗なしで始めます。元のデータは ${PROGRESS_BACKUP_KEY} に退避しました。`);
    storageSet(PROGRESS_BACKUP_KEY, raw);
    return {};
  }

  // 現在の問題データにない id（削除された問題など）も消さずに保存し続ける
  function saveProgress() {
    return storageSet(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION, solved }));
  }

  function setSolved(id, value) {
    if (value) solved[id] = true;
    else delete solved[id];
    return saveProgress();
  }

  function isSolved(id) {
    return solved[id] === true;
  }

  function countSolved(items) {
    return items.filter((it) => isSolved(it.id)).length;
  }

  // ===========================================================================
  // 4. 画面の部品
  // ===========================================================================

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function clear(node) {
    node.replaceChildren();
  }

  function setMessage(text, kind) {
    const msg = $('message');
    msg.textContent = text || '';
    msg.className = kind || '';
  }

  // 結果 { columns, values } を表にする。列がない（SELECT 以外だけ実行した）ときは何も出さない
  function buildTable(res) {
    if (!res || !res.columns.length) return null;
    const table = document.createElement('table');
    const thead = table.createTHead();
    const head = thead.insertRow();
    res.columns.forEach((c) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c;
      head.appendChild(th);
    });
    const tbody = table.createTBody();
    res.values.forEach((row) => {
      const tr = tbody.insertRow();
      row.forEach((v) => {
        const td = tr.insertCell();
        if (v === null) { td.textContent = 'NULL'; td.className = 'null'; }
        else if (v instanceof Uint8Array) td.textContent = `(BLOB ${v.length} バイト)`;
        else td.textContent = String(v);
      });
    });
    return table;
  }

  function showTable(box, res) {
    clear(box);
    const table = buildTable(res);
    if (table) box.appendChild(table);
  }

  function isNarrow() {
    try { return window.matchMedia(NARROW_QUERY).matches; } catch { return false; }
  }

  // sql.js のエラーを利用者向けの文にする
  function errorText(e) {
    return 'エラー: ' + (e && e.message ? e.message : String(e));
  }

  // ===========================================================================
  // 5. 一覧の描画
  // ===========================================================================

  const store = loadProblems();
  const solved = loadProgress();
  let currentLevel = LEVELS[0].key;
  let currentId = null;              // 表示中の問題の id（準備中のレベルでは null）
  const lastIdByLevel = {};          // レベルを切り替えて戻ったときに同じ問題を開くため

  function allItems() {
    return LEVELS.flatMap((l) => store.byLevel[l.key]);
  }

  function renderProgressSummary() {
    const items = allItems();
    $('progress-summary').textContent = items.length
      ? `全体の進捗: ${countSolved(items)} / ${items.length} 問`
      : '';
  }

  function renderLevelTabs() {
    const nav = $('level-tabs');
    clear(nav);
    LEVELS.forEach((lv) => {
      const items = store.byLevel[lv.key];
      const done = countSolved(items);
      const b = el('button', 'level-tab');
      b.type = 'button';
      b.dataset.level = lv.key;
      const active = lv.key === currentLevel;
      if (active) b.classList.add('active');
      if (items.length && done === items.length) b.classList.add('complete');
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
      b.appendChild(el('span', 'level-name', lv.label));
      b.appendChild(el('span', 'level-progress', items.length ? `${done}/${items.length}` : '準備中'));
      b.onclick = () => selectLevel(lv.key);
      nav.appendChild(b);
    });
  }

  function renderProblemList() {
    const list = $('problem-list');
    clear(list);
    const items = store.byLevel[currentLevel];
    if (!items.length) {
      list.appendChild(el('p', 'list-empty', `${LEVEL_LABEL[currentLevel]}の問題を準備中です。`));
      return;
    }
    let lastCategory = null;
    let activeButton = null;
    items.forEach((it) => {
      const category = it.data.category || '';
      if (category && category !== lastCategory) {
        list.appendChild(el('div', 'list-group', category));
      }
      lastCategory = category;

      const b = el('button');
      b.type = 'button';
      b.dataset.id = it.id;
      b.appendChild(el('span', 'problem-num', `${it.num}.`));
      b.appendChild(el('span', 'problem-name', it.data.title));
      if (isSolved(it.id)) {
        const d = el('span', 'done', '✓');
        d.title = '完了';
        d.setAttribute('aria-label', '完了');
        b.appendChild(d);
      }
      if (it.id === currentId) {
        b.classList.add('active');
        b.setAttribute('aria-current', 'true');
        activeButton = b;
      }
      b.onclick = () => selectProblem(it.id, { byUser: true });
      list.appendChild(b);
    });
    scrollActiveIntoView(activeButton);
  }

  // 選択中の問題が一覧（#problem-list の中のスクロール）で見えるようにする。
  // scrollIntoView はページ全体や #list-box までスクロールしてしまい、起動時にヘッダーが
  // 画面の外に出るため使わない（v1.1.0）。一覧が隠れている（大きさ 0）ときは何もしない。
  function scrollActiveIntoView(button) {
    const list = $('problem-list');
    const target = button || list.querySelector('button.active');
    scrollWithin(list, target);
  }

  // target が box（中でスクロールする要素）の見える範囲に入るよう、box の中だけをスクロールする。
  // ページ全体は動かさない。box がスクロールしない（隠れている・中身が収まる）ときは何もしない
  function scrollWithin(box, target) {
    if (!box || !target) return;
    try {
      const viewH = box.clientHeight;
      if (!viewH || box.scrollHeight <= viewH) return; // 隠れている・スクロールしない高さ
      const br = box.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const top = tr.top - br.top - box.clientTop + box.scrollTop; // box の中身の先頭からの位置
      const margin = 8;
      if (top < box.scrollTop) box.scrollTop = Math.max(0, top - margin);
      else if (top + tr.height > box.scrollTop + viewH) box.scrollTop = top + tr.height - viewH + margin;
    } catch { /* 位置を測れない古いブラウザ: スクロールしないだけ */ }
  }

  // 一覧まわり（タブ・一覧・全体の進捗）をまとめて描き直す
  function renderNavigation() {
    renderLevelTabs();
    renderProblemList();
    renderProgressSummary();
    const item = currentId ? store.byId.get(currentId) : null;
    $('list-current').textContent = item ? problemLabel(item) : '';
    renderPrevNext(item);
  }

  // ---- 前後の問題へ（#prev-btn / #next-btn。docs/reviews.md N1） ----
  // 一覧を隠した配置（既定）でも、一覧を出さずに次の問題へ進めるようにする。
  // 対象は「今のレベルの一覧の並び順」での前後。レベルはまたがない（先頭・末尾ではボタンを押せない）。
  // ボタンがない古い index.html でも例外にしない（ボタンがなければ何もしない）。

  // item の前後の問題 { prev, next }（ない側は null）
  function neighbors(item) {
    if (!item) return { prev: null, next: null };
    const list = store.byLevel[item.level] || [];
    const i = list.indexOf(item);
    if (i < 0) return { prev: null, next: null };
    return { prev: list[i - 1] || null, next: list[i + 1] || null };
  }

  // ボタンの押せる／押せないと、行き先の問題名（title。マウスを乗せると出る）を合わせる。
  // ボタンの文言は index.html のまま変えない
  function renderPrevNext(item) {
    const { prev, next } = neighbors(item);
    [['prev-btn', prev], ['next-btn', next]].forEach(([id, target]) => {
      const b = $(id);
      if (!b) return;
      b.disabled = !target;
      b.title = target ? problemLabel(target) : '';
    });
  }

  // 問題文とお手本の列（index.html の .ws-col-problem。古い index.html では null）。
  // 横並び（style.css）ではこの列が sticky で、中でスクロールする
  function problemColumn() {
    return document.querySelector('.ws-col-problem');
  }

  // step = -1（前）/ +1（次）
  function goRelative(step) {
    const item = currentId ? store.byId.get(currentId) : null;
    const n = neighbors(item);
    const target = step < 0 ? n.prev : n.next;
    if (target) selectProblem(target.id, { byUser: true });
  }

  // 正解・完了の直後に添える一言。次の問題があり、#next-btn があれば、そこへフォーカスを移す
  // （Enter / Space で次へ進める）。フォーカスでページが動かないよう preventScroll を付ける
  function nextStepHint(item) {
    const { next } = neighbors(item);
    if (!next) return ' このレベルの最後の問題です。';
    const b = $('next-btn');
    if (!b || b.disabled) return '';
    try { b.focus({ preventScroll: true }); } catch { /* フォーカスできなくても文言は出す */ }
    // 横並びでは問題列が中でスクロールするので、ボタンが列の外に隠れていれば列の中だけ動かす
    scrollWithin(problemColumn(), b);
    return ' 次の問題へ進めます。';
  }

  function selectLevel(levelKey) {
    currentLevel = levelKey;
    const items = store.byLevel[levelKey];
    // 前回このレベルで開いた問題 → 未完了の最初の問題 → 先頭、の順に選ぶ
    const remembered = lastIdByLevel[levelKey] && store.byId.get(lastIdByLevel[levelKey]);
    const target = remembered || items.find((it) => !isSolved(it.id)) || items[0];
    // レベルを切り替えたら一覧を見たいはずなので、畳まれていれば開く
    $('list-box').open = true;
    if (target) selectProblem(target.id, { byUser: false });
    else showEmptyLevel(levelKey);
  }

  // ===========================================================================
  // 6. 問題の表示
  // ===========================================================================

  let SQL = null;       // sql.js（読み込み前・失敗時は null）
  let db = null;        // 「実行」用のDB（利用者が自由に変更してよい）
  const expectedCache = new Map(); // id -> { result } または { error }（answer の実行結果）

  // 初期DBで answer を実行した結果（期待される結果）。SQL の読み込み前は null
  function getExpected(item) {
    if (!SQL) return null;
    if (!expectedCache.has(item.id)) {
      try {
        expectedCache.set(item.id, { result: Judge.runOnFreshDb(SQL, SETUP_SQL, item.data.answer) });
      } catch (e) {
        console.error(`[SQL練習帳] ${item.id} の模範解答を実行できません:`, e);
        expectedCache.set(item.id, { error: e });
      }
    }
    return expectedCache.get(item.id);
  }

  function setVisible(id, visible) {
    $(id).hidden = !visible;
  }

  // 問題文の共通部分（レベル・カテゴリ・タイトル・問題文・ヒント）
  function showProblemHeader(item) {
    const p = item.data;
    $('problem-level').textContent = `${LEVEL_LABEL[item.level]} ${item.num}`;
    $('problem-category').textContent = p.category || '';
    $('problem-title').textContent = p.title;
    $('problem-desc').textContent = p.desc || '';
    $('problem-hint').textContent = p.hint || '（ヒントはありません）';
    setVisible('hint-box', true);
    $('hint-box').open = false;
  }

  function resetWorkArea() {
    editor.value = '';
    clear($('result'));
    setMessage(storageWarning, storageWarning ? 'ng' : '');
  }

  function selectProblem(id, { byUser } = {}) {
    const item = store.byId.get(id);
    if (!item) return;
    currentId = id;
    currentLevel = item.level;
    lastIdByLevel[item.level] = id;
    storageSet(LAST_PROBLEM_KEY, id);

    showProblemHeader(item);
    if (item.level === 'practice') showPracticeParts(item);
    else showGradedParts(item);
    resetWorkArea();
    renderNavigation();
    syncPageForProblem(item);
    // 前の問題で問題列を下までスクロールしていても、新しい問題は先頭（タイトル・前後のボタン）から見せる
    const col = problemColumn();
    if (col) col.scrollTop = 0;

    if (byUser) {
      if (isNarrow()) $('list-box').open = false;   // スマホでは一覧を畳んで問題を見せる
      else editor.focus();                         // スマホでは画面キーボードが開くので focus しない
    }
  }

  // 初級〜上級: 期待される結果・答え合わせ・模範解答を出し、実践用の枠を隠す
  function showGradedParts(item) {
    setVisible('expected-box', true);
    setVisible('answer-box', true);
    setVisible('check-btn', true);
    setVisible('practice-box', false);

    $('answer-box').open = false;
    $('answer-sql').textContent = item.data.answer;
    $('answer-explanation').textContent = item.data.explanation || '（解説はありません）';
    renderExpected(item);
  }

  function renderExpected(item) {
    const box = $('expected');
    clear(box); // 空のときは style.css が「準備しています」と表示する
    const exp = getExpected(item);
    if (!exp) { $('check-btn').disabled = true; return; }
    if (exp.error) {
      box.appendChild(el('p', 'expected-error',
        `この問題の期待される結果を作れませんでした（問題データの誤りです）。${errorText(exp.error)}`));
      $('check-btn').disabled = true;
      return;
    }
    const table = buildTable(exp.result);
    if (table) box.appendChild(table);
    else box.appendChild(el('p', 'expected-error', '期待される結果に列がありません（問題データの誤りです）。'));
    const rows = exp.result.values.length;
    box.appendChild(el('p', 'expected-count', `${rows} 行`));
    $('check-btn').disabled = false;
  }

  // 実践: 期待される結果・答え合わせ・模範解答を隠し、チェックポイントと解答例を出す
  function showPracticeParts(item) {
    setVisible('expected-box', false);
    setVisible('answer-box', false);
    setVisible('check-btn', false);
    setVisible('practice-box', true);

    const p = item.data;
    const ul = $('checkpoints');
    clear(ul);
    const checkpoints = Array.isArray(p.checkpoints) ? p.checkpoints : [];
    checkpoints.forEach((text) => {
      // チェックボックスは考える手がかり。状態は保存しない
      const li = el('li');
      const label = el('label');
      const box = el('input');
      box.type = 'checkbox';
      label.appendChild(box);
      label.appendChild(el('span', '', String(text)));
      li.appendChild(label);
      ul.appendChild(li);
    });
    if (!checkpoints.length) ul.appendChild(el('li', '', '（チェックポイントはありません）'));

    const examples = $('examples');
    clear(examples);
    const list = Array.isArray(p.examples) ? p.examples : [];
    list.forEach((ex, i) => {
      const div = el('div', 'example');
      if (list.length > 1) div.appendChild(el('p', 'example-title', `解答例 ${i + 1}`));
      div.appendChild(el('pre', '', ex && ex.sql ? String(ex.sql) : ''));
      if (ex && ex.note) div.appendChild(el('p', '', String(ex.note)));
      examples.appendChild(div);
    });
    if (!list.length) examples.appendChild(el('p', '', '（解答例はありません）'));
    $('examples-box').open = false;

    renderSelfCheck(item);
  }

  function renderSelfCheck(item) {
    const b = $('self-check-btn');
    const done = isSolved(item.id);
    b.classList.toggle('done', done);
    b.setAttribute('aria-pressed', done ? 'true' : 'false');
    b.textContent = done ? '完了済み（もう一度押すと未完了に戻す）' : '確認した（完了にする）';
  }

  // 問題がまだないレベル（問題データの作成中など）
  function showEmptyLevel(levelKey) {
    currentId = null;
    currentLevel = levelKey;
    const label = LEVEL_LABEL[levelKey] || '';
    $('problem-level').textContent = label;
    $('problem-category').textContent = '';
    $('problem-title').textContent = '問題を準備中です';
    $('problem-desc').textContent = `${label}の問題は準備中です。ほかのレベルを選ぶか、下の欄で自由にSQLを試してください。`;
    $('problem-hint').textContent = '';
    setVisible('hint-box', false);
    setVisible('expected-box', false);
    setVisible('answer-box', false);
    setVisible('practice-box', false);
    setVisible('check-btn', false);
    resetWorkArea();
    renderNavigation();
    syncPageForProblem(null);
  }

  // ===========================================================================
  // 6b. URL とタブの題名（v1.2.0〜。docs/requirements-v1.2.md 4.3）
  // ===========================================================================
  //
  // ここで扱う要素（#intro・#problem-page-link）は v1.2.0 で index.html に足したもの。
  // ない index.html でも動くよう、要素があるときだけ触る。

  // URL の ?id= を読む。{ id: 有効な問題の id か null, given: パラメータがあったか }
  function readUrlProblemId() {
    let raw = null;
    try {
      raw = new URLSearchParams(location.search).get(URL_ID_PARAM);
    } catch (e) {
      console.warn('[SQL練習帳] アドレスの ?id= を読めませんでした:', e);
      return { id: null, given: false };
    }
    if (raw === null) return { id: null, given: false };
    if (store.byId.has(raw)) return { id: raw, given: true };
    // 長い値で console があふれないよう、先頭だけ出す
    const shown = JSON.stringify(raw.length > 40 ? raw.slice(0, 40) + '…' : raw);
    console.warn(`[SQL練習帳] アドレスの ?${URL_ID_PARAM}=${shown} に当たる問題がないため、いつもどおりの問題を開きます。`);
    return { id: null, given: true };
  }

  // 「平均より高い商品（中級27）｜SQL練習帳」
  function pageTitle(item) {
    return `${item.data.title}（${LEVEL_LABEL[item.level]}${item.num}）｜${SITE_NAME}`;
  }

  // アドレスを ?id=<id>（item が null ならパラメータなし）に置き換える。履歴は増やさない。
  // file:// や古いブラウザでは例外になることがあるので、失敗しても console に出すだけにする
  function replaceAddress(item) {
    try {
      if (!window.history || typeof history.replaceState !== 'function') return;
      const query = item ? `?${URL_ID_PARAM}=${encodeURIComponent(item.id)}` : '';
      if (location.search === query && !location.hash) return; // 同じなら書き換えない
      history.replaceState(history.state, '', location.pathname + query);
    } catch (e) {
      console.warn('[SQL練習帳] アドレスを書き換えられませんでした（問題の表示には影響しません）:', e);
    }
  }

  // 問題を開いた（item）・問題がなくなった（null）ときに、題名・アドレス・問題ページへのリンクを合わせる
  function syncPageForProblem(item) {
    document.title = item ? pageTitle(item) : BASE_TITLE;
    replaceAddress(item);
    const link = $('problem-page-link');
    if (link) {
      if (item) {
        link.setAttribute('href', `${PROBLEM_PAGE_DIR}${encodeURIComponent(item.id)}.html`);
        link.hidden = false;
      } else {
        link.removeAttribute('href');
        link.hidden = true;
      }
    }
  }

  // 紹介文 #intro を起動時に閉じるか決める。初めての人には開いたまま（index.html の open）見せ、
  // 戻ってきた人・問題を指定して来た人には閉じる。開閉の状態は保存しない
  function applyIntroState({ hasUrlId, hasProgress, hasLastProblem }) {
    const intro = $('intro');
    if (!intro) return;
    if (hasUrlId || hasProgress || hasLastProblem) intro.open = false;
  }

  // ===========================================================================
  // 7. 操作
  // ===========================================================================

  function resetDb() {
    const next = Judge.createDb(SQL, SETUP_SQL); // 失敗したら例外（呼び出し側で表示）
    if (db) db.close();
    db = next;
    renderSchema();
  }

  function renderSchema() {
    const box = $('schema');
    clear(box);
    if (!db) return;
    try {
      const tables = Judge.lastResult(db, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
      tables.values.forEach(([name]) => {
        box.appendChild(el('h3', '', name));
        const quoted = '"' + String(name).replace(/"/g, '""') + '"';
        const cols = Judge.lastResult(db, `PRAGMA table_info(${quoted})`);
        const ul = el('ul');
        cols.values.forEach((c) => ul.appendChild(el('li', '', `${c[1]} (${c[2] || '型なし'})`)));
        box.appendChild(ul);
      });
    } catch (e) {
      console.error('[SQL練習帳] テーブル一覧を作れません:', e);
      box.appendChild(el('p', '', 'テーブル一覧を表示できませんでした。「データをリセット」を押してください。'));
    }
  }

  function run() {
    const sql = editor.value.trim();
    if (!sql) { setMessage('SQLを入力してください'); return; }
    if (!db) { setMessage('SQLエンジンの準備ができていません', 'ng'); return; }
    try {
      const res = Judge.lastResult(db, sql);
      showTable($('result'), res);
      setMessage(res.columns.length ? `${res.values.length} 件` : '実行しました（結果の行はありません）');
    } catch (e) {
      clear($('result'));
      setMessage(errorText(e), 'ng');
    }
    renderSchema(); // CREATE TABLE などでテーブルが変わった場合に備える
  }

  // 答え合わせ: 初期状態のDBで解答SQLを実行し、期待される結果（answer の結果）と比べる
  function check() {
    const item = currentId && store.byId.get(currentId);
    if (!item || item.level === 'practice' || !SQL) return;
    const sql = editor.value.trim();
    if (!sql) { setMessage('SQLを入力してください'); return; }
    const exp = getExpected(item);
    if (!exp || exp.error) { setMessage('この問題は答え合わせができません（問題データの誤りです）', 'ng'); return; }

    let mine;
    try {
      mine = Judge.runOnFreshDb(SQL, SETUP_SQL, sql);
    } catch (e) {
      clear($('result'));
      setMessage(errorText(e), 'ng');
      return;
    }
    showTable($('result'), mine);
    const ordered = item.data.ordered === true;
    if (Judge.sameResult(mine, exp.result, ordered)) {
      const saved = setSolved(item.id, true);
      renderNavigation();
      const base = saved ? '正解！ 🎉' : '正解！ 🎉（ただし進捗を保存できませんでした）';
      setMessage(base + nextStepHint(item), 'ok');
    } else {
      setMessage(Judge.diffReason(mine, exp.result, ordered), 'ng');
    }
  }

  // 実践: 学習者が自分で完了にする（もう一度押すと未完了に戻す）
  function toggleSelfCheck() {
    const item = currentId && store.byId.get(currentId);
    if (!item || item.level !== 'practice') return;
    const next = !isSolved(item.id);
    const saved = setSolved(item.id, next);
    renderSelfCheck(item);
    renderNavigation();
    const text = next ? '完了にしました。' : '未完了に戻しました。';
    let message = saved ? text : text + '（ただし進捗を保存できませんでした）';
    if (next) message += nextStepHint(item); // 完了にしたときだけ次へ進めることを伝える
    setMessage(message, saved ? 'ok' : 'ng');
  }

  function onReset() {
    if (!SQL) { setMessage('SQLエンジンの準備ができていません', 'ng'); return; }
    try {
      resetDb();
      setMessage('データを初期状態に戻しました');
    } catch (e) {
      console.error('[SQL練習帳] データのリセットに失敗:', e);
      setMessage('データを初期状態に戻せませんでした。ページを再読み込みしてください。' + errorText(e), 'ng');
    }
  }

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  });
  $('run-btn').onclick = run;
  $('check-btn').onclick = check;
  $('reset-btn').onclick = onReset;
  $('self-check-btn').onclick = toggleSelfCheck;
  // 前後の問題へ（ボタンがない古い index.html では登録しない）
  if ($('prev-btn')) $('prev-btn').addEventListener('click', () => goRelative(-1));
  if ($('next-btn')) $('next-btn').addEventListener('click', () => goRelative(+1));
  // 畳んだ一覧を開き直したとき、選択中の問題が見える位置にする
  $('list-box').addEventListener('toggle', () => { if ($('list-box').open) scrollActiveIntoView(); });

  // ===========================================================================
  // 8. 起動
  // ===========================================================================

  // 起動できないとき: 原因を画面に出して終わる（問題文は読める状態のまま）
  function fail(text, e) {
    if (e) console.error('[SQL練習帳] ' + text, e);
    setMessage(text, 'ng');
    $('run-btn').disabled = true;
    $('check-btn').disabled = true;
    setAppStatus('error');
  }

  // (1) 問題を表示する（sql.js の読み込みを待たずに問題文を読めるようにする）
  if (!store.ok || typeof SETUP_SQL !== 'string') {
    $('problem-title').textContent = '問題を読み込めませんでした';
    setVisible('expected-box', false);
    setVisible('answer-box', false);
    setVisible('practice-box', false);
    renderPrevNext(null); // 前後のボタンも押せなくする
    syncPageForProblem(null); // 問題ページへのリンクを隠す（アドレスの ?id= は消す）
    fail('問題データ（problems/ フォルダのファイル）を読み込めませんでした。ページを再読み込みしてください。');
    return;
  }
  // 最初に開く問題: URL の ?id= → 最後に開いた問題 → 先頭の問題
  const urlProblem = readUrlProblemId();
  const lastId = storageGet(LAST_PROBLEM_KEY);
  // 紹介文の開閉は、selectProblem が「最後に開いた問題」を保存する前の状態で決める
  applyIntroState({
    hasUrlId: urlProblem.id !== null,
    hasProgress: Object.keys(solved).length > 0,
    hasLastProblem: lastId !== null && lastId !== '',
  });
  const first = (urlProblem.id && store.byId.get(urlProblem.id))
    || (lastId && store.byId.get(lastId))
    || LEVELS.map((l) => store.byLevel[l.key][0]).find(Boolean);
  if (first) {
    selectProblem(first.id, { byUser: false });
    // スマホ幅では一覧を畳み、最初の画面で問題文が見えるようにする（docs/reviews.md M4）。
    // 一覧の見出しに現在の問題名が出るので、畳んでも位置は分かる。
    // レベルタブを押したとき（selectLevel）は一覧を開く。PC 幅は開いたまま。
    if (isNarrow()) $('list-box').open = false;
  } else {
    showEmptyLevel(LEVELS[0].key);
  }

  // (2) 答え合わせの処理（judge.js）があるか
  if (typeof Judge === 'undefined') {
    fail('答え合わせの処理（judge.js）を読み込めませんでした。ページを再読み込みしてください。');
    return;
  }

  // (3) SQLエンジン（sql.js）を読み込む
  try {
    if (typeof initSqlJs !== 'function') throw new Error('sql-wasm.js が読み込まれていません');
    SQL = await initSqlJs({ locateFile: (f) => SQLJS_BASE + f });
  } catch (e) {
    fail('SQLエンジンの読み込みに失敗しました（ネット接続を確認して、ページを再読み込みしてください）', e);
    return;
  }

  // (4) 練習用DBを作る
  try {
    resetDb();
  } catch (e) {
    fail('練習用データベースを作れませんでした（problems/setup.js の誤りの可能性があります）。' + errorText(e), e);
    return;
  }

  $('run-btn').disabled = false;
  // 表示中の問題を描き直す（期待される結果の表は SQL の読み込み後に作れる）
  if (currentId) {
    const item = store.byId.get(currentId);
    if (item.level !== 'practice') renderExpected(item);
  }
  if (!storageWarning) setMessage('');
  else setMessage(storageWarning, 'ng');
  setAppStatus('ready');
  if (!isNarrow() && currentId) editor.focus();
})();
