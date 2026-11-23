// 中級 後半 I26〜I50（25問） level: 'intermediate'
// 到達目標: 副問い合わせ・日付/文字列関数・集合演算を使って、欲しい形で結果を出せる。
//
// カテゴリ内訳:
//   サブクエリ（副問い合わせ）（WHERE IN / スカラー / FROM句 / 相関 / EXISTS・NOT EXISTS をすべて含む） 13問
//   日付・文字列関数（strftime, date, julianday, substr, ||, length, replace など）        7問
//   集合演算（UNION / UNION ALL / INTERSECT / EXCEPT）                                    5問
//
// 日付を使う問題は、問題文に基準日（今日）= 2026-01-01 を明記する。
// 形式は docs/requirements.md 3.2 節、作成ルールは 6 節。データの特徴は problems/setup.js の先頭コメント。
// 書き方: PROBLEMS.push({ id: 'I26', level: 'intermediate', category: '...', title: '...', ... });
//
// 問題の並び（カテゴリごとに易→難）:
//   副問い合わせ   I26 WHERE IN / I27 NOT IN と NULL / I28〜I30 スカラー / I31・I32 FROM句
//                  I33〜I35 相関 / I36 EXISTS / I37・I38 NOT EXISTS
//   日付・文字列   I39 strftime / I40 date / I41 || / I42 substr・instr / I43 replace・length
//                  I44 julianday / I45 年齢の計算
//   集合演算       I46 UNION / I47 UNION ALL / I48 INTERSECT / I49・I50 EXCEPT
// 「有効な注文」= status が 'delivered' または 'shipped' の注文（問題文ではその都度明記する）。

PROBLEMS.push(
  // ------------------------------------------------------------------
  // 副問い合わせ（13問）
  // ------------------------------------------------------------------
  {
    id: 'I26',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '低い評価が付いた商品',
    desc: '低い評価のレビューが付いたことのある商品を探します。'
      + 'reviews テーブル（レビュー）で、評価（rating）が 3 以下のレビューが1件以上付いたことのある商品を、products テーブルから取り出してください。'
      + 'ちょうど 3 のレビューも含めます。1つの商品は1行だけ出します。列は id, name, price の順です。並び順は問いません。',
    hint: 'まず「評価 3 以下のレビューが付いた product_id の一覧」を SELECT で作り、それを WHERE id IN ( ... ) のかっこの中に入れます。',
    answer: 'SELECT id, name, price FROM products WHERE id IN (SELECT product_id FROM reviews WHERE rating <= 3)',
    explanation: 'IN (副問い合わせ) は「かっこの中の結果のどれかに一致する行」を選びます。同じ商品に低い評価が何件あっても、商品は1行のままです。'
      + 'JOIN で書くと、低い評価が2件以上ある商品（信楽焼のマグカップなど）が重複して出ます。また = (副問い合わせ) にすると、SQLite ではエラーにならず最初の1件とだけ比べてしまいます。',
    alternatives: [
      'SELECT DISTINCT p.id, p.name, p.price FROM products p JOIN reviews r ON r.product_id = p.id WHERE r.rating <= 3',
    ],
    wrongAnswers: [
      'SELECT p.id, p.name, p.price FROM products p JOIN reviews r ON r.product_id = p.id WHERE r.rating <= 3',
      'SELECT id, name, price FROM products WHERE id = (SELECT product_id FROM reviews WHERE rating <= 3)',
      'SELECT id, name, price FROM products WHERE id IN (SELECT product_id FROM reviews WHERE rating < 3)',
    ],
  },
  {
    id: 'I27',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '部下のいない社員（NOT IN と NULL）',
    desc: '部下のいない社員を、副問い合わせで探します。'
      + 'employees テーブル（社員）から、部下が1人もいない社員（だれの manager_id にも自分の id が入っていない社員）を取り出してください。'
      + '退職者も含めます。列は id, name の順です。並び順は問いません。'
      + 'なお、社長（employee 1）は上司がいないため manager_id が NULL です。',
    hint: '「上司として登場する id の一覧」を副問い合わせで作り、NOT IN で除きます。その一覧に NULL が混ざるとどうなるかに注意しましょう。',
    answer: 'SELECT id, name FROM employees WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL)',
    explanation: 'x NOT IN (a, b, NULL) は「x <> a AND x <> b AND x <> NULL」の意味になり、x <> NULL が不明（NULL）になるため、どの行も選ばれません。'
      + 'manager_id には社長の NULL があるので、副問い合わせで IS NOT NULL を付けて NULL を除く必要があります。付け忘れると 0 行になります。',
    alternatives: [
      'SELECT e.id, e.name FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees s WHERE s.manager_id = e.id)',
    ],
    wrongAnswers: [
      'SELECT id, name FROM employees WHERE id NOT IN (SELECT manager_id FROM employees)',
      'SELECT id, name FROM employees WHERE id IN (SELECT manager_id FROM employees)',
    ],
  },
  {
    id: 'I28',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '最も早く発売された商品',
    desc: 'いちばん早く発売された商品を探します。'
      + 'products テーブルから、発売日（released_on）が全商品の中で最も早い商品を取り出してください。'
      + '最も早い日に発売された商品が複数あるときは、そのすべてを出します。列は id, name, released_on の順です。並び順は問いません。',
    hint: '最も早い発売日は SELECT MIN(released_on) FROM products で求められます。この1つの値を返す副問い合わせを、WHERE の = の右側に書きます。',
    answer: 'SELECT id, name, released_on FROM products WHERE released_on = (SELECT MIN(released_on) FROM products)',
    explanation: '1行1列だけを返す副問い合わせ（スカラー副問い合わせ）は、ふつうの値と同じように比較に使えます。'
      + 'ORDER BY released_on LIMIT 1 だと、同じ日に発売された商品が5つあるのに1件しか出ません。「最小の値を持つ行すべて」が欲しいときは MIN と比べます。',
    wrongAnswers: [
      'SELECT id, name, released_on FROM products ORDER BY released_on LIMIT 1',
      "SELECT id, name, released_on FROM products WHERE released_on < '2023-01-01'",
    ],
  },
  {
    id: 'I29',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '在籍中の社員の平均より給与が高い人',
    desc: '平均より給与が高い社員を探します。'
      + 'employees テーブルから、在籍中（退職日 left_on が NULL）の社員のうち、給与（salary）が「在籍中の社員全員の平均給与」より高い社員を取り出してください。'
      + '平均の計算にも退職者は含めません。平均とちょうど同じ給与の人は含めません。列は id, name, salary の順です。並び順は問いません。',
    hint: '平均給与は WHERE の中では AVG(salary) と直接書けません。SELECT AVG(salary) FROM employees WHERE ... を副問い合わせにして比べます。',
    answer: 'SELECT id, name, salary FROM employees WHERE left_on IS NULL AND salary > (SELECT AVG(salary) FROM employees WHERE left_on IS NULL)',
    explanation: '副問い合わせは外側の WHERE とは別に実行されるので、平均を求める範囲（在籍中だけ）も副問い合わせの中に書く必要があります。'
      + '副問い合わせの WHERE を忘れると、給与の低い退職者が平均に入って平均が下がり、給与 450000 円の社員まで含まれてしまいます。',
    wrongAnswers: [
      'SELECT id, name, salary FROM employees WHERE left_on IS NULL AND salary > (SELECT AVG(salary) FROM employees)',
      'SELECT id, name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)',
    ],
  },
  {
    id: 'I30',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '全商品の平均価格との差',
    desc: '商品の価格が、全商品の平均価格とどれだけ違うかを求めます。'
      + 'products テーブルから、カテゴリID（category_id）が 5（調理器具）の商品について、価格と「全商品（40商品すべて）の平均価格」との差を求めてください。'
      + '列は id, name, price, 差 の順で、差は price - 全商品の平均価格 を ROUND で小数第1位に丸めます（平均より安い商品はマイナスになります）。並び順は問いません。',
    hint: '副問い合わせは SELECT の列の中にも書けます。(SELECT AVG(price) FROM products) は、外側の WHERE に関係なく全商品の平均を返します。',
    answer: 'SELECT id, name, price, ROUND(price - (SELECT AVG(price) FROM products), 1) AS 差 FROM products WHERE category_id = 5',
    explanation: 'SELECT 句に書いたスカラー副問い合わせは、どの行でも同じ「全商品の平均」を返します。外側の WHERE category_id = 5 は副問い合わせの中には効きません。'
      + '副問い合わせの中にも category_id = 5 を書くと「調理器具の平均」との差になり、別の答えになります。',
    wrongAnswers: [
      'SELECT id, name, price, ROUND(price - (SELECT AVG(price) FROM products WHERE category_id = 5), 1) FROM products WHERE category_id = 5',
      'SELECT id, name, price, ROUND(price - AVG(price), 1) FROM products WHERE category_id = 5',
    ],
  },
  {
    id: 'I31',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '注文1件あたりの平均購入金額',
    desc: '注文1件あたりの平均購入金額（客単価）を求めます。'
      + 'status が \'delivered\' または \'shipped\' の注文について、1注文あたりの購入金額の平均を求めてください。'
      + '注文の購入金額は、その注文の明細（order_items）の quantity * unit_price の合計です（送料は含めません）。'
      + '結果は1行1列で、平均を ROUND で小数第1位に丸めます。',
    hint: 'まず「注文ごとの購入金額」を GROUP BY order_id で求める SELECT を作り、それを FROM ( ... ) のかっこに入れて、外側で AVG を取ります。FROM 句の副問い合わせには別名を付けると読みやすくなります。',
    answer: "SELECT ROUND(AVG(total), 1) FROM (SELECT oi.order_id, SUM(oi.quantity * oi.unit_price) AS total FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status IN ('delivered', 'shipped') GROUP BY oi.order_id) AS t",
    explanation: 'FROM 句の副問い合わせは、結果を1つの表のように扱えます。「集計した結果をさらに集計する」ときに使います。'
      + '明細の AVG(quantity * unit_price) は「明細1行あたり」の平均で、1注文に明細が複数あるため「1注文あたり」の平均とは違う値になります。',
    wrongAnswers: [
      "SELECT ROUND(AVG(oi.quantity * oi.unit_price), 1) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status IN ('delivered', 'shipped')",
      'SELECT ROUND(AVG(total), 1) FROM (SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id) AS t',
      "SELECT ROUND(AVG(total + o.shipping_fee), 1) FROM (SELECT order_id, SUM(quantity * unit_price) AS total FROM order_items GROUP BY order_id) AS t JOIN orders o ON o.id = t.order_id WHERE o.status IN ('delivered', 'shipped')",
    ],
  },
  {
    id: 'I32',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '注文回数ごとの顧客数',
    desc: '注文回数ごとに、その回数の顧客が何人いるかを数えます。'
      + 'orders テーブルで、status が \'delivered\' または \'shipped\' の注文を customer_id ごとに数え、「その注文回数の顧客が何人いるか」を求めてください。'
      + '有効な注文が1件もない顧客は数えません（orders にある customer_id をそのまま使い、customers テーブルとの結合はしません）。'
      + '列は 注文回数, 顧客数 の順で、注文回数の少ない順に並べます。',
    hint: '顧客ごとの注文回数を GROUP BY customer_id で求め、その結果を FROM 句の副問い合わせにします。外側では注文回数で GROUP BY して COUNT(*) します。',
    answer: "SELECT order_count, COUNT(*) AS customer_count FROM (SELECT customer_id, COUNT(*) AS order_count FROM orders WHERE status IN ('delivered', 'shipped') GROUP BY customer_id) AS t GROUP BY order_count ORDER BY order_count",
    ordered: true,
    explanation: 'GROUP BY は1回の SELECT で1段階しかまとめられないので、「顧客ごと」→「回数ごと」の2段階の集計は FROM 句の副問い合わせで重ねます。'
      + 'キャンセルや返品も数えてしまうと、一部の顧客の注文回数が増えて分布が変わります。',
    wrongAnswers: [
      'SELECT order_count, COUNT(*) FROM (SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id) AS t GROUP BY order_count ORDER BY order_count',
      "SELECT order_count, COUNT(*) FROM (SELECT customer_id, COUNT(*) AS order_count FROM orders WHERE status = 'delivered' GROUP BY customer_id) AS t GROUP BY order_count ORDER BY order_count",
    ],
  },
  {
    id: 'I33',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '自分のカテゴリの平均より高い商品',
    desc: '同じカテゴリの平均価格より高い商品を探します。'
      + 'products テーブルから、価格（price）が「その商品と同じカテゴリ（category_id）の商品の平均価格」より高い商品を取り出してください。'
      + '平均とちょうど同じ価格の商品は含めません（商品が1つしかないカテゴリの商品は、自分自身が平均なので含まれません）。'
      + '列は id, name, category_id, price の順です。並び順は問いません。',
    hint: '副問い合わせの中から外側の行を参照できます（相関副問い合わせ）。外側の products に別名 p を付け、副問い合わせの WHERE で p.category_id と比べます。',
    answer: 'SELECT p.id, p.name, p.category_id, p.price FROM products p WHERE p.price > (SELECT AVG(p2.price) FROM products p2 WHERE p2.category_id = p.category_id)',
    explanation: '相関副問い合わせは、外側の行ごとに「その行のカテゴリの平均」を計算し直します。カテゴリごとに比べる基準が変わるのがポイントです。'
      + '全商品の平均と比べると、安い文房具は1つも残らず、高い家具はすべて残ってしまいます。>= にすると、1商品だけのカテゴリ（竹の弁当箱）が含まれます。',
    wrongAnswers: [
      'SELECT id, name, category_id, price FROM products WHERE price > (SELECT AVG(price) FROM products)',
      'SELECT p.id, p.name, p.category_id, p.price FROM products p WHERE p.price >= (SELECT AVG(p2.price) FROM products p2 WHERE p2.category_id = p.category_id)',
    ],
  },
  {
    id: 'I34',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '商品ごとのレビュー件数と平均評価',
    desc: '商品ごとのレビュー件数と平均評価を求めます。'
      + 'products テーブルのカテゴリID（category_id）が 5（調理器具）の商品について、レビュー件数と平均評価を求めてください。'
      + '列は id, name, レビュー件数, 平均評価 の順です。平均評価は rating の平均を ROUND で小数第2位に丸めます。'
      + 'レビューが1件もない商品も含め、その場合のレビュー件数は 0、平均評価は NULL とします。並び順は問いません。',
    hint: 'SELECT の列の中に、外側の商品 p.id を使った副問い合わせ (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) を書けます。平均評価も同じ形で書けます。',
    answer: 'SELECT p.id, p.name, (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count, (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = p.id) AS avg_rating FROM products p WHERE p.category_id = 5',
    explanation: 'SELECT 句の相関副問い合わせは、商品1行ごとにレビューを数えるので、レビューのない商品でも COUNT(*) が 0 になって行が残ります（AVG は対象がないので NULL）。'
      + 'INNER JOIN してから GROUP BY すると、レビューのない計量スプーンセットと土鍋6号が消えます。LEFT JOIN でも COUNT(*) にすると 0 ではなく 1 になります。',
    alternatives: [
      'SELECT p.id, p.name, COUNT(r.id), ROUND(AVG(r.rating), 2) FROM products p LEFT JOIN reviews r ON r.product_id = p.id WHERE p.category_id = 5 GROUP BY p.id, p.name',
    ],
    wrongAnswers: [
      'SELECT p.id, p.name, COUNT(*), ROUND(AVG(r.rating), 2) FROM products p JOIN reviews r ON r.product_id = p.id WHERE p.category_id = 5 GROUP BY p.id, p.name',
      'SELECT p.id, p.name, COUNT(*), ROUND(AVG(r.rating), 2) FROM products p LEFT JOIN reviews r ON r.product_id = p.id WHERE p.category_id = 5 GROUP BY p.id, p.name',
      'SELECT p.id, p.name, (SELECT COUNT(*) FROM reviews), (SELECT ROUND(AVG(rating), 2) FROM reviews) FROM products p WHERE p.category_id = 5',
    ],
  },
  {
    id: 'I35',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '部署ごとの一番新しいメンバー',
    desc: '部署ごとに、いちばん最近入社した社員を探します。'
      + 'employees テーブルから、部署ごとに「在籍中（left_on が NULL）の社員のうち、入社日（hired_on）が最も新しい社員」を取り出してください。'
      + '退職者は、比べる対象にも含めません。部署のない社員（department_id が NULL）は対象外です。'
      + '列は department_id, id, name, hired_on の順です。並び順は問いません。',
    hint: '外側の社員 e と同じ部署で、在籍中の社員の MAX(hired_on) を相関副問い合わせで求め、e.hired_on と比べます。「在籍中」の条件は外側と副問い合わせの両方に必要です。',
    answer: 'SELECT e.department_id, e.id, e.name, e.hired_on FROM employees e WHERE e.left_on IS NULL AND e.department_id IS NOT NULL AND e.hired_on = (SELECT MAX(e2.hired_on) FROM employees e2 WHERE e2.department_id = e.department_id AND e2.left_on IS NULL)',
    explanation: '「グループの中で最大の値を持つ行」は、相関副問い合わせで同じグループの MAX を求めて比べると取り出せます。'
      + '副問い合わせに left_on IS NULL を書き忘れると、退職者の入社日が最大になる物流と商品企画では、外側の条件でその退職者が除かれて行が消えます。',
    wrongAnswers: [
      'SELECT e.department_id, e.id, e.name, e.hired_on FROM employees e WHERE e.left_on IS NULL AND e.hired_on = (SELECT MAX(e2.hired_on) FROM employees e2 WHERE e2.department_id = e.department_id)',
      'SELECT e.department_id, e.id, e.name, e.hired_on FROM employees e WHERE e.hired_on = (SELECT MAX(e2.hired_on) FROM employees e2 WHERE e2.department_id = e.department_id)',
    ],
  },
  {
    id: 'I36',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '満点のレビューを書いた会員（EXISTS）',
    desc: '満点（評価 5）のレビューを書いたことのある会員を探します。'
      + 'customers テーブル（会員）から、評価（rating）5 のレビューを1件以上書いたことのある会員を取り出してください。'
      + '1人の会員は1行だけ出します。列は id, name の順です。並び順は問いません。',
    hint: 'WHERE EXISTS (SELECT 1 FROM reviews r WHERE r.customer_id = c.id AND ...) は、条件に合うレビューが1件でもあれば真になります。外側の会員と結び付ける条件を忘れないようにしましょう。',
    answer: 'SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM reviews r WHERE r.customer_id = c.id AND r.rating = 5)',
    explanation: 'EXISTS は副問い合わせが1行でも返すかどうかだけを見るので、評価5のレビューを何件書いた会員でも1行になります（JOIN だと件数分重複します）。'
      + '副問い合わせに r.customer_id = c.id がないと「評価5のレビューがどこかに1件でもあるか」という意味になり、全会員が出てしまいます。',
    alternatives: [
      'SELECT id, name FROM customers WHERE id IN (SELECT customer_id FROM reviews WHERE rating = 5)',
    ],
    wrongAnswers: [
      'SELECT c.id, c.name FROM customers c JOIN reviews r ON r.customer_id = c.id WHERE r.rating = 5',
      'SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM reviews r WHERE r.rating = 5)',
      'SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM reviews r WHERE r.customer_id = c.id AND r.rating >= 4)',
    ],
  },
  {
    id: 'I37',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '有効な注文が1件もない会員（NOT EXISTS）',
    desc: '実際に買ったこと（有効な注文）が一度もない会員を探します。'
      + 'customers テーブルから、status が \'delivered\' または \'shipped\' の注文が1件もない会員を取り出してください。'
      + '注文がまったくない会員に加えて、キャンセルなどの注文しかない会員も含めます。列は id, name の順です。並び順は問いません。',
    hint: 'NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND ...) は、条件に合う注文が1件もないときに真になります。status の条件は副問い合わせの中に書きます。',
    answer: "SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status IN ('delivered', 'shipped'))",
    explanation: 'NOT EXISTS は「条件に合う行が存在しない」ことを調べます。副問い合わせの中に status の条件を書くので、キャンセルの注文しかない福田 康さん（customer 43）も対象になります。'
      + 'status の条件を書き忘れると「注文がまったくない会員」だけになり、customer 43 が漏れます。',
    alternatives: [
      "SELECT id, name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE status IN ('delivered', 'shipped'))",
    ],
    wrongAnswers: [
      'SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)',
      "SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.status IN ('delivered', 'shipped'))",
      "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL OR o.status NOT IN ('delivered', 'shipped')",
    ],
  },
  {
    id: 'I38',
    level: 'intermediate',
    category: 'サブクエリ（副問い合わせ）',
    title: '買っていない商品へのレビュー',
    desc: '買っていない商品に書かれたレビューを探します。'
      + 'reviews テーブルから、「レビューを書いた会員が、その商品を有効な注文（status が \'delivered\' または \'shipped\'）で一度も買っていない」レビューを取り出してください。'
      + '会員と商品の組み合わせで判定します（その会員がほかの商品を買っていても関係ありません）。返品した注文は「買った」に含めません。'
      + '列は id, product_id, customer_id, rating の順です。並び順は問いません。',
    hint: 'NOT EXISTS の中で orders と order_items を JOIN し、「会員がレビューの会員と同じ」かつ「商品がレビューの商品と同じ」かつ「有効な注文」という3つの条件を書きます。',
    answer: "SELECT r.id, r.product_id, r.customer_id, r.rating FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.customer_id = r.customer_id AND oi.product_id = r.product_id AND o.status IN ('delivered', 'shipped'))",
    explanation: '相関の条件は1つとは限りません。会員と商品の両方を外側のレビューと結び付けることで、「この人がこの商品を買ったか」を調べられます。'
      + '注文のない会員のレビューに加えて、返品した人の低い評価も見つかります。status の条件を忘れると返品も「買った」扱いになり、返品した人のレビューが漏れます。',
    wrongAnswers: [
      'SELECT r.id, r.product_id, r.customer_id, r.rating FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.customer_id = r.customer_id AND oi.product_id = r.product_id)',
      "SELECT r.id, r.product_id, r.customer_id, r.rating FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = r.customer_id AND o.status IN ('delivered', 'shipped'))",
    ],
  },

  // ------------------------------------------------------------------
  // 日付・文字列関数（7問）
  // ------------------------------------------------------------------
  {
    id: 'I39',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '月ごとの注文件数（strftime）',
    desc: '日付から年月を取り出して、月ごとの注文件数を数えます。'
      + 'orders テーブルから、注文日（ordered_on）の年月ごとに注文件数を数えてください。status は問わず、すべての注文を数えます。'
      + '列は 年月, 注文件数 の順で、年月は \'2025-01\' のような「年4桁-月2桁」の文字列にします。年月の古い順に並べます。'
      + '注文が1件もない月（2025年8月）は出しません。',
    hint: 'strftime(\'%Y-%m\', 日付) で \'2025-01\' のような年月の文字列が取り出せます。その式で GROUP BY します。',
    answer: "SELECT strftime('%Y-%m', ordered_on) AS ym, COUNT(*) AS order_count FROM orders GROUP BY ym ORDER BY ym",
    ordered: true,
    explanation: 'strftime は日付を好きな形の文字列に変換する関数で、%Y は年、%m は月、%d は日を表します。大文字の %M は「分」なので、日付だけのデータでは全部 \'00\' になってしまいます。'
      + '\'YYYY-MM-DD\' 形式なら substr(ordered_on, 1, 7) でも同じ結果になります。',
    alternatives: [
      'SELECT substr(ordered_on, 1, 7), COUNT(*) FROM orders GROUP BY substr(ordered_on, 1, 7) ORDER BY substr(ordered_on, 1, 7)',
    ],
    wrongAnswers: [
      "SELECT strftime('%m', ordered_on) AS m, COUNT(*) FROM orders GROUP BY m ORDER BY m",
      "SELECT strftime('%Y-%M', ordered_on) AS ym, COUNT(*) FROM orders GROUP BY ym ORDER BY ym",
    ],
  },
  {
    id: 'I40',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '直近14日間の注文（date）',
    desc: '日付の計算で、直近14日間の注文を取り出します。'
      + '基準日（今日）を 2026-01-01 とします。orders テーブルから、今日の 14 日前の日から今日までに注文された注文を取り出してください。'
      + '14 日前のその日の注文も含めます。status は問いません。列は id, customer_id, ordered_on, status の順です。並び順は問いません。',
    hint: 'date(\'2026-01-01\', \'-14 days\') で 14 日前の日付が \'YYYY-MM-DD\' の文字列で得られます。月末をまたぐ計算も date 関数に任せましょう。',
    answer: "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on >= date('2026-01-01', '-14 days') AND ordered_on <= '2026-01-01'",
    explanation: 'date(基準日, \'-14 days\') のように修飾子を付けると、日付の足し算・引き算ができます（\'+1 month\'、\'start of month\' なども使えます）。'
      + '\'2026-01-01\' - 14 と書くと文字列が数値 2026 に変わって 2012 になり、日付として比べられません。> にすると 14 日前ちょうどの注文が漏れます。',
    alternatives: [
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on BETWEEN date('2026-01-01', '-14 days') AND '2026-01-01'",
    ],
    wrongAnswers: [
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on > date('2026-01-01', '-14 days')",
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on >= '2026-01-01' - 14",
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on >= date('2026-01-01', '-1 month')",
    ],
  },
  {
    id: 'I41',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '原価の表示ラベルを作る（||）',
    desc: '文字列をつなげて、商品の表示用ラベルを作ります。'
      + 'products テーブルのカテゴリID（category_id）が 8（筆記具）の商品について、「商品名: 原価円」という表示用の文字列を作ってください。'
      + '例えば シャープペンシル なら \'シャープペンシル: 180円\' です（コロンは半角で、後ろに半角スペースを1つ入れます）。'
      + '原価（cost）が NULL の商品は \'筆ペン: 未設定\' のように、原価の部分を「未設定」にします（「円」は付けません）。'
      + '列は id, ラベル の順です。並び順は問いません。',
    hint: '文字列は || でつなげます。ただし、つなぐものに NULL が1つでもあると結果全体が NULL になります。COALESCE で NULL のときの文字列を用意しましょう。',
    answer: "SELECT id, name || ': ' || COALESCE(cost || '円', '未設定') AS label FROM products WHERE category_id = 8",
    explanation: '|| は文字列の連結で、数値もそのまま文字列としてつながります。cost が NULL だと cost || \'円\' は NULL になるので、COALESCE で \'未設定\' に置き換えます。'
      + 'COALESCE を付けないと筆ペンのラベルが NULL になります。concat 関数は NULL を空文字として扱うので、\'筆ペン: 円\' になってしまいます。',
    alternatives: [
      "SELECT id, name || ': ' || CASE WHEN cost IS NULL THEN '未設定' ELSE cost || '円' END FROM products WHERE category_id = 8",
    ],
    wrongAnswers: [
      "SELECT id, name || ': ' || cost || '円' FROM products WHERE category_id = 8",
      "SELECT id, concat(name, ': ', cost, '円') FROM products WHERE category_id = 8",
    ],
  },
  {
    id: 'I42',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '氏名を姓と名に分ける（substr・instr）',
    desc: '会員の氏名を、文字列関数で姓と名に分けます。'
      + 'customers テーブルの name は「姓 名」の形で、姓と名の間に半角スペースが1つ入っています。'
      + '都道府県（prefecture）が \'東京都\' の会員について、name を姓と名に分けてください。姓の文字数は人によって違います（1〜3文字）。'
      + '列は id, 姓, 名 の順です。並び順は問いません。',
    hint: 'instr(name, \' \') で半角スペースが何文字目にあるかが分かります。substr(文字列, 開始位置, 文字数) で、その前と後ろを切り出します。文字数を省略すると最後までになります。',
    answer: "SELECT id, substr(name, 1, instr(name, ' ') - 1) AS last_name, substr(name, instr(name, ' ') + 1) AS first_name FROM customers WHERE prefecture = '東京都'",
    explanation: '区切り文字の位置は人によって違うので、instr で位置を求めてから substr で切り出します。スペースの1つ前までが姓、1つ後ろからが名です。'
      + 'substr(name, 1, 2) のように文字数を決め打ちすると、3文字の姓（長谷川）が途中で切れ、名の側もずれます。',
    wrongAnswers: [
      "SELECT id, substr(name, 1, 2), substr(name, 4) FROM customers WHERE prefecture = '東京都'",
      "SELECT id, substr(name, 1, instr(name, ' ')), substr(name, instr(name, ' ')) FROM customers WHERE prefecture = '東京都'",
    ],
  },
  {
    id: 'I43',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '文字の出現回数を数える（replace・length）',
    desc: '商品名に特定の文字がいくつ含まれるかを数えます。'
      + 'products テーブルから、商品名（name）に長音記号「ー」が含まれる商品について、「ー」がいくつ含まれるかを数えてください。'
      + '「ー」が1つも含まれない商品は出しません。列は id, name, 個数 の順です。'
      + '個数の多い順に並べ、同じ個数なら id の小さい順に並べます。',
    hint: 'replace(name, \'ー\', \'\') で「ー」を消した文字列が作れます。元の文字数（length）から消したあとの文字数を引くと、消えた文字の数になります。',
    answer: "SELECT id, name, length(name) - length(replace(name, 'ー', '')) AS cnt FROM products WHERE name LIKE '%ー%' ORDER BY cnt DESC, id",
    ordered: true,
    explanation: 'SQL には「文字の出現回数」を直接数える関数がないので、replace で消して length の差を取るのが定番の方法です（SQLite の length は文字数を返します）。'
      + 'instr(name, \'ー\') は「最初に現れる位置」なので個数ではありません。LIKE だけでは含むかどうかしか分からず、「ー」が2つあるホーローケトルなどを区別できません。',
    alternatives: [
      "SELECT id, name, length(name) - length(replace(name, 'ー', '')) FROM products WHERE length(name) - length(replace(name, 'ー', '')) > 0 ORDER BY 3 DESC, id",
    ],
    wrongAnswers: [
      "SELECT id, name, instr(name, 'ー') AS cnt FROM products WHERE name LIKE '%ー%' ORDER BY cnt DESC, id",
      "SELECT id, name, 1 AS cnt FROM products WHERE name LIKE '%ー%' ORDER BY cnt DESC, id",
      "SELECT id, name, length(name) - length(replace(name, 'ー', '')) AS cnt FROM products WHERE name LIKE '%ー%' ORDER BY cnt, id",
    ],
  },
  {
    id: 'I44',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '登録から初回購入までの日数（julianday）',
    desc: '会員登録から最初の購入までに何日かかったかを求めます。'
      + '2025年1月1日〜3月31日（両端を含む）に会員登録（registered_on）した会員について、登録日から「最初の有効な注文（status が \'delivered\' または \'shipped\'）の注文日」までの日数を求めてください。'
      + '登録した日に注文した場合は 0 日です。有効な注文が1件もない会員は出しません。'
      + '列は id, name, 日数 の順で、日数は整数（CAST(... AS INTEGER)）にします。並び順は問いません。',
    hint: 'julianday(日付) は日付を通し番号の日数（小数）に変えます。2つの julianday の差が日数です。最初の注文日は MIN(o.ordered_on) で求められます。',
    answer: "SELECT c.id, c.name, CAST(julianday(MIN(o.ordered_on)) - julianday(c.registered_on) AS INTEGER) AS days FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.registered_on BETWEEN '2025-01-01' AND '2025-03-31' AND o.status IN ('delivered', 'shipped') GROUP BY c.id, c.name",
    explanation: '日付の文字列どうしを - で引くと、先頭の年の数字だけが引き算されて 0 になってしまいます。日数の差は julianday どうしの差で求めます。'
      + 'キャンセルの注文も含めると、最初の注文をキャンセルした橋本 陽介さん（customer 25）の日数が変わります。',
    wrongAnswers: [
      "SELECT c.id, c.name, CAST(julianday(MIN(o.ordered_on)) - julianday(c.registered_on) AS INTEGER) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.registered_on BETWEEN '2025-01-01' AND '2025-03-31' GROUP BY c.id, c.name",
      "SELECT c.id, c.name, MIN(o.ordered_on) - c.registered_on FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.registered_on BETWEEN '2025-01-01' AND '2025-03-31' AND o.status IN ('delivered', 'shipped') GROUP BY c.id, c.name",
    ],
  },
  {
    id: 'I45',
    level: 'intermediate',
    category: '日付・文字列関数',
    title: '今日時点の年齢',
    desc: '会員の生年月日から、今日時点の満年齢を求めます。'
      + '基準日（今日）を 2026-01-01 とします。都道府県（prefecture）が \'東京都\' の会員について、今日時点の満年齢を求めてください。'
      + '誕生日を迎えた日に1つ年を取ります（誕生日が1月1日の人は、今日すでに年を取っています）。生年月日（birth_date）が NULL の会員も含め、年齢は NULL とします。'
      + '列は id, name, birth_date, 年齢 の順です。並び順は問いません。',
    hint: '年の差（strftime(\'%Y\', ...) どうしの差）を出し、今年の誕生日がまだ来ていなければ 1 を引きます。「月-日」は strftime(\'%m-%d\', ...) で取り出して文字列のまま比べられます。比較の結果は 1（真）か 0（偽）になります。',
    answer: "SELECT id, name, birth_date, CAST(strftime('%Y', '2026-01-01') AS INTEGER) - CAST(strftime('%Y', birth_date) AS INTEGER) - (strftime('%m-%d', birth_date) > strftime('%m-%d', '2026-01-01')) AS age FROM customers WHERE prefecture = '東京都'",
    explanation: '満年齢は「年の差」から、今年の誕生日がまだ来ていなければ 1 を引きます。SQLite の比較式は 1 か 0 を返すので、そのまま引き算に使えます。'
      + '年の差だけだと、今日はまだ1月1日なので、1月1日生まれの山田 太郎さん以外の全員が1歳多くなります。',
    alternatives: [
      "SELECT id, name, birth_date, (CAST(strftime('%Y%m%d', '2026-01-01') AS INTEGER) - CAST(strftime('%Y%m%d', birth_date) AS INTEGER)) / 10000 FROM customers WHERE prefecture = '東京都'",
    ],
    wrongAnswers: [
      "SELECT id, name, birth_date, CAST(strftime('%Y', '2026-01-01') AS INTEGER) - CAST(strftime('%Y', birth_date) AS INTEGER) FROM customers WHERE prefecture = '東京都'",
      "SELECT id, name, birth_date, CAST(strftime('%Y', '2026-01-01') AS INTEGER) - CAST(strftime('%Y', birth_date) AS INTEGER) - (strftime('%m-%d', birth_date) >= strftime('%m-%d', '2026-01-01')) FROM customers WHERE prefecture = '東京都'",
      "SELECT id, name, birth_date, CAST(strftime('%Y', '2026-01-01') AS INTEGER) - CAST(strftime('%Y', birth_date) AS INTEGER) - (strftime('%m-%d', birth_date) > strftime('%m-%d', '2026-01-01')) FROM customers WHERE prefecture = '東京都' AND birth_date IS NOT NULL",
    ],
  },

  // ------------------------------------------------------------------
  // 集合演算（5問）
  // ------------------------------------------------------------------
  {
    id: 'I46',
    level: 'intermediate',
    category: '集合演算',
    title: '要対応の商品リスト（UNION）',
    desc: '在庫切れの商品と評価の低い商品をまとめて、要対応の商品リストを作ります。'
      + '次の2つの条件の「どちらか（または両方）」に当てはまる商品の一覧を作ってください。'
      + '(1) products テーブルで在庫（stock）が 0 の商品。(2) reviews テーブルでの平均評価（rating の平均）が 3.0 以下の商品（ちょうど 3.0 も含みます）。'
      + '両方に当てはまる商品も1行だけ出します。列は id, name の順です。並び順は問いません。',
    hint: '(1) と (2) をそれぞれ SELECT id, name ... で書き、UNION でつなぎます。(2) は reviews を GROUP BY product_id して HAVING で絞り、products と JOIN して name を出します。',
    answer: 'SELECT id, name FROM products WHERE stock = 0 UNION SELECT p.id, p.name FROM products p JOIN reviews r ON r.product_id = p.id GROUP BY p.id, p.name HAVING AVG(r.rating) <= 3.0',
    explanation: 'UNION は2つの SELECT の結果を縦につなげ、重複した行を1つにまとめます。つなぐ SELECT どうしは列の数をそろえます。'
      + '信楽焼のマグカップは在庫0で平均評価も 3.0 なので、UNION ALL だと2回出ます。< 3.0 にすると平均がちょうど 3.0 のステンレス片手鍋が漏れます。',
    wrongAnswers: [
      'SELECT id, name FROM products WHERE stock = 0 UNION ALL SELECT p.id, p.name FROM products p JOIN reviews r ON r.product_id = p.id GROUP BY p.id, p.name HAVING AVG(r.rating) <= 3.0',
      'SELECT id, name FROM products WHERE stock = 0 UNION SELECT p.id, p.name FROM products p JOIN reviews r ON r.product_id = p.id GROUP BY p.id, p.name HAVING AVG(r.rating) < 3.0',
    ],
  },
  {
    id: 'I47',
    level: 'intermediate',
    category: '集合演算',
    title: '会員ごとの活動回数（UNION ALL）',
    desc: '会員ID（customer_id）が 1〜10 の会員について、「注文した回数」と「レビューを書いた回数」の合計（活動回数）を求めてください。'
      + '注文は status を問わずすべて数えます。orders と reviews の customer_id を使い、注文もレビューもない会員は出しません。'
      + '列は customer_id, 活動回数 の順です。並び順は問いません。',
    hint: 'orders の customer_id と reviews の customer_id を縦につなげて1つの列にし、それを FROM 句の副問い合わせにして GROUP BY customer_id で数えます。重複を消さないつなぎ方を選びましょう。',
    answer: 'SELECT customer_id, COUNT(*) AS activity_count FROM (SELECT customer_id FROM orders UNION ALL SELECT customer_id FROM reviews) AS t WHERE customer_id BETWEEN 1 AND 10 GROUP BY customer_id',
    explanation: 'UNION ALL は重複を消さずにそのままつなげるので、1回の活動が1行になり、件数を正しく数えられます（重複を探さない分、UNION より速くもあります）。'
      + 'UNION にすると同じ customer_id がまとめられ、どの会員も 1 か 2 にしかなりません。',
    wrongAnswers: [
      'SELECT customer_id, COUNT(*) FROM (SELECT customer_id FROM orders UNION SELECT customer_id FROM reviews) AS t WHERE customer_id BETWEEN 1 AND 10 GROUP BY customer_id',
      'SELECT customer_id, COUNT(*) FROM orders WHERE customer_id BETWEEN 1 AND 10 GROUP BY customer_id',
    ],
  },
  {
    id: 'I48',
    level: 'intermediate',
    category: '集合演算',
    title: '年始と年末の両方に買った会員（INTERSECT）',
    desc: '年始と年末の両方に買ってくれた会員を探します。'
      + 'orders テーブルで、2025年1月と2025年12月の「両方」に、status が \'delivered\' または \'shipped\' の注文をした会員の customer_id を取り出してください。'
      + '1つの会員は1行だけ出します。列は customer_id の1列です。並び順は問いません。',
    hint: '「1月に有効な注文をした customer_id」と「12月に有効な注文をした customer_id」をそれぞれ SELECT で書き、INTERSECT でつなぐと、両方にある値だけが残ります。',
    answer: "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-01-31' AND status IN ('delivered', 'shipped') INTERSECT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-12-01' AND '2025-12-31' AND status IN ('delivered', 'shipped')",
    explanation: 'INTERSECT は2つの結果の両方にある行だけを（重複なしで）返します。1つの WHERE に「1月 AND 12月」と書くと、1行の注文日が同時に両方の月になることはないので 0 行になります。'
      + 'status の条件を片方でも忘れると、12月の注文が返品だけだった渡辺 大輔さん（customer 6）が入ってしまいます。',
    alternatives: [
      "SELECT DISTINCT o1.customer_id FROM orders o1 JOIN orders o2 ON o2.customer_id = o1.customer_id WHERE o1.ordered_on BETWEEN '2025-01-01' AND '2025-01-31' AND o1.status IN ('delivered', 'shipped') AND o2.ordered_on BETWEEN '2025-12-01' AND '2025-12-31' AND o2.status IN ('delivered', 'shipped')",
    ],
    wrongAnswers: [
      "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-01-31' INTERSECT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-12-01' AND '2025-12-31'",
      "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-01-31' AND status IN ('delivered', 'shipped') UNION SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-12-01' AND '2025-12-31' AND status IN ('delivered', 'shipped')",
      "SELECT DISTINCT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-01-31' AND ordered_on BETWEEN '2025-12-01' AND '2025-12-31'",
    ],
  },
  {
    id: 'I49',
    level: 'intermediate',
    category: '集合演算',
    title: '今の定価と違う単価で売れた商品（EXCEPT）',
    desc: '今の定価とは違う単価で売れたことのある商品を探します。'
      + 'order_items テーブル（注文明細）に記録された「商品ID（product_id）と販売単価（unit_price）の組み合わせ」のうち、'
      + 'products テーブルの「商品ID（id）と現在の定価（price）の組み合わせ」と一致しないものを、重複なしで取り出してください。'
      + '注文の status は問いません。列は product_id, unit_price の順です。並び順は問いません。',
    hint: 'A EXCEPT B は「A にあって B にない行」を返します。比べるのは行全体なので、2列を並べた SELECT どうしで EXCEPT すると、組み合わせで比べられます。',
    answer: 'SELECT product_id, unit_price FROM order_items EXCEPT SELECT id, price FROM products',
    explanation: 'EXCEPT は列の組み合わせ（行全体）で比べ、結果の重複も取り除きます。価格改定前の単価や、値下げ販売の単価が見つかります。'
      + 'product_id だけで EXCEPT すると「どの商品も products にある」ので 0 行になります。左右を逆にすると「一度もその定価で売れていない商品」という別の意味になります。',
    alternatives: [
      'SELECT DISTINCT oi.product_id, oi.unit_price FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.unit_price <> p.price',
    ],
    wrongAnswers: [
      'SELECT product_id FROM order_items EXCEPT SELECT id FROM products',
      'SELECT id, price FROM products EXCEPT SELECT product_id, unit_price FROM order_items',
      'SELECT oi.product_id, oi.unit_price FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.unit_price <> p.price',
    ],
  },
  {
    id: 'I50',
    level: 'intermediate',
    category: '集合演算',
    title: '下半期に来なくなった会員（EXCEPT）',
    desc: '上半期には買っていたのに、下半期に買わなくなった会員を探します。'
      + 'orders テーブルで、2025年の上半期（1月1日〜6月30日）に有効な注文（status が \'delivered\' または \'shipped\'）をしたが、'
      + '下半期（7月1日〜12月31日）には有効な注文を1件もしていない会員の customer_id を取り出してください。'
      + 'orders にある customer_id をそのまま使います（customers テーブルとの結合はしません）。列は customer_id の1列です。並び順は問いません。',
    hint: '「上半期に有効な注文をした customer_id」EXCEPT「下半期に有効な注文をした customer_id」と書きます。どちらから引くか（EXCEPT の左右）に注意しましょう。',
    answer: "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-06-30' AND status IN ('delivered', 'shipped') EXCEPT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-07-01' AND '2025-12-31' AND status IN ('delivered', 'shipped')",
    explanation: 'EXCEPT は左の結果から右の結果にある値を除きます。上半期の会員から下半期の会員を除くと、「離れてしまった会員」の候補が分かります。'
      + '左右を逆にすると「下半期に新しく来た会員」になります。customers に存在しない customer 51（order 69）も含まれる点は、データ不整合として確認が必要です。',
    alternatives: [
      "SELECT DISTINCT o.customer_id FROM orders o WHERE o.ordered_on BETWEEN '2025-01-01' AND '2025-06-30' AND o.status IN ('delivered', 'shipped') AND NOT EXISTS (SELECT 1 FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.ordered_on BETWEEN '2025-07-01' AND '2025-12-31' AND o2.status IN ('delivered', 'shipped'))",
    ],
    wrongAnswers: [
      "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-07-01' AND '2025-12-31' AND status IN ('delivered', 'shipped') EXCEPT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-06-30' AND status IN ('delivered', 'shipped')",
      "SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-06-30' AND status IN ('delivered', 'shipped') INTERSECT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-07-01' AND '2025-12-31' AND status IN ('delivered', 'shipped')",
      "SELECT c.id FROM customers c WHERE c.id IN (SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-01-01' AND '2025-06-30' AND status IN ('delivered', 'shipped') EXCEPT SELECT customer_id FROM orders WHERE ordered_on BETWEEN '2025-07-01' AND '2025-12-31' AND status IN ('delivered', 'shipped'))",
    ],
  },
);
