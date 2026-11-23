// judge.js — 答え合わせ（結果の比較）の共通処理
//
// app.js（画面）と tests/problems/check.js（問題データのチェック）の両方から使う。
// 判定のルールを変えるときはこのファイルだけを直せば、画面とテストの両方に反映される。
//
// 判定のルール（CLAUDE.md「規約」・docs/requirements.md 3.3）:
//   - 列名は問わない（列の数と値だけを比べる）
//   - ordered が true のときは行の並び順も比べる。false のときは行の集合（重複を含む）として比べる
//   - 小数は誤差を避けるため小数第6位に丸めてから比べる
//
// 公開するもの: グローバル変数 Judge（下の「公開」を参照）。DOM には触らない。
(function (global) {
  'use strict';

  // 小数を比べるときの丸めの桁（1e6 = 小数第6位）
  const ROUND_SCALE = 1e6;

  // 結果が空（SELECT 以外の文だけを実行した場合など）のときに返す値
  function emptyResult() {
    return { columns: [], values: [] };
  }

  // 値を比較用にそろえる（数値は丸める。文字列・NULL・BLOB はそのまま）
  function normalize(v) {
    return typeof v === 'number' ? Math.round(v * ROUND_SCALE) / ROUND_SCALE : v;
  }

  // 各行を比較用の文字列にする
  function rowKeys(result) {
    return result.values.map((row) => JSON.stringify(row.map(normalize)));
  }

  // 2つの結果 { columns, values } が同じかどうか
  function sameResult(a, b, ordered) {
    if (a.columns.length !== b.columns.length) return false;
    if (a.values.length !== b.values.length) return false;
    const ra = rowKeys(a);
    const rb = rowKeys(b);
    if (!ordered) { ra.sort(); rb.sort(); }
    return ra.every((r, i) => r === rb[i]);
  }

  // 不正解の理由（利用者向けの日本語）。mine = 解答の結果、expected = 模範解答の結果
  function diffReason(mine, expected, ordered) {
    if (mine.columns.length !== expected.columns.length) {
      return `不正解：列の数が違います（期待: ${expected.columns.length} 列）`;
    }
    if (mine.values.length !== expected.values.length) {
      return `不正解：行の数が違います（期待: ${expected.values.length} 行）`;
    }
    if (ordered && sameResult(mine, expected, false)) {
      return '不正解：値は合っていますが、並び順が違います';
    }
    return '不正解：値が違います';
  }

  // SQL を実行し、最後の結果（列を返す最後の文 = 最後の SELECT の結果）を返す。
  // SQL のエラーは呼び出し側で捕まえる（sql.js の Error がそのまま投げられる）。
  //
  // db.exec() は「0 行の SELECT」の結果を返さない（列名も失われる）ため、
  // 文を1つずつ実行して、0 行でも列名つきの結果を返す。
  // これにより「期待される結果が 0 行」「解答が 0 行」のときも列数・行数を正しく比べられる。
  function lastResult(db, sql) {
    if (typeof db.iterateStatements !== 'function') {
      // 念のため（sql.js 1.6 未満）。0 行の結果は列なしになる
      const results = db.exec(sql);
      return results.length ? results[results.length - 1] : emptyResult();
    }
    let last = emptyResult();
    for (const stmt of db.iterateStatements(sql)) {
      try {
        const columns = stmt.getColumnNames();
        const values = [];
        while (stmt.step()) values.push(stmt.get());
        if (columns.length) last = { columns, values };
      } finally {
        stmt.free();
      }
    }
    return last;
  }

  // 初期データ（setupSql）を入れた新しいDBを作る。使い終わったら close() すること。
  function createDb(SQL, setupSql) {
    const db = new SQL.Database();
    try {
      db.run(setupSql);
    } catch (e) {
      db.close();
      throw e;
    }
    return db;
  }

  // 新しい初期DBを作って fn(db) を実行し、最後に必ずDBを閉じる
  function withFreshDb(SQL, setupSql, fn) {
    const db = createDb(SQL, setupSql);
    try {
      return fn(db);
    } finally {
      db.close();
    }
  }

  // 新しい初期DBで SQL を実行し、最後の結果を返す（答え合わせ・期待される結果の表示用）
  function runOnFreshDb(SQL, setupSql, sql) {
    return withFreshDb(SQL, setupSql, (db) => lastResult(db, sql));
  }

  // 公開
  global.Judge = Object.freeze({
    ROUND_SCALE,
    normalize,
    sameResult,
    diffReason,
    lastResult,
    createDb,
    withFreshDb,
    runOnFreshDb,
  });
})(typeof window !== 'undefined' ? window : this);
