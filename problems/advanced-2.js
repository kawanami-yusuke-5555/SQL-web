// 上級 後半 A16〜A30（15問） level: 'advanced'
// 到達目標: 中級〜上級前半の手法を組み合わせて、複雑な要求に応える。
//
// カテゴリ内訳:
//   再帰CTE（カテゴリ階層・組織階層・連番/日付の生成）   4問
//   グループ内上位N件                                    3問
//   ピボット（縦横変換）（CASE 式で列に振り分ける）       2問
//   連続期間・欠番（gaps and islands）                    2問
//   総合問題（複数の手法を組み合わせる）                  4問
//
// 使えるデータ: categories の3階層、employees の最大4階層、2025年8月の注文0件（月の一覧の生成）、
// 顧客ごとの連続購入月（例: customer 1 は 1〜7月と 9〜12月）。詳細は problems/setup.js の先頭コメント。
// 書き方: PROBLEMS.push({ id: 'A16', level: 'advanced', category: '...', title: '...', ... });
//
// 問題の並び（カテゴリごとに易→難）:
//   再帰CTE      A16 月の一覧の生成 / A17 カテゴリの配下 / A18 組織の経路 / A19 配下を含めたカテゴリ売上
//   上位N件      A20 ROW_NUMBER（絞り込みは順位付けの前） / A21 RANK（同数を含める） / A22 集計してから四半期ごとに順位
//   ピボット     A23 月 × status の件数 / A24 最上位カテゴリ × 四半期の売上
//   連続期間     A25 注文のない期間（欠番） / A26 連続して購入した月（islands）
//   複合         A27 月の生成 + 累計 + LAG / A28 LEFT JOIN 集計 + 平均ウィンドウ /
//                A29 初回購入月ごとのリピート率 / A30 組織の配下集計 + RANK

PROBLEMS.push(
  // ---------------------------------------------------------------- 再帰CTE
  {
    id: 'A16',
    level: 'advanced',
    category: '再帰CTE',
    title: '注文のない月も含めた月別の注文件数',
    desc: '注文のない月も 0 件として含めた、月別の注文件数の表を作ります。'
      + 'orders テーブルから、2025年1月〜12月の各月の注文件数を求めてください。status は問わず、キャンセル・返品も1件と数えます。'
      + '2025年8月は注文が1件もありませんが、この月も注文件数 0 として1行に含めます（12 行になります）。'
      + '列は month（\'2025-01\' の形式の文字列）, order_count の順です。month の古い順に並べます。',
    hint: '注文のない月は orders に1行もないため、GROUP BY だけでは出てきません。WITH RECURSIVE で 2025-01 から 2025-12 までの月の一覧を作り、orders を LEFT JOIN します。'
      + 'LEFT JOIN 後に件数を数えるときは COUNT(*) ではなく COUNT(orders の列) を使います。',
    answer: 'WITH RECURSIVE months(month_start) AS ('
      + " SELECT '2025-01-01'"
      + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-12-01'"
      + ')'
      + " SELECT strftime('%Y-%m', m.month_start) AS month, COUNT(o.id) AS order_count"
      + ' FROM months m'
      + " LEFT JOIN orders o ON strftime('%Y-%m', o.ordered_on) = strftime('%Y-%m', m.month_start)"
      + ' GROUP BY m.month_start'
      + ' ORDER BY m.month_start',
    ordered: true,
    explanation: '再帰CTEは「最初の行（UNION ALL の前）」から始め、「前の行から次の行を作る部分（UNION ALL の後）」を WHERE の条件が偽になるまで繰り返します。'
      + 'こうして作った月の一覧を基準に LEFT JOIN すると、注文のない8月も行として残ります。COUNT(*) にすると、8月の「相手のいない1行」まで数えて 1 になってしまいます。',
    alternatives: [
      'WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 12)'
        + " SELECT printf('2025-%02d', n.i) AS month,"
        + " (SELECT COUNT(*) FROM orders o WHERE strftime('%Y-%m', o.ordered_on) = printf('2025-%02d', n.i)) AS order_count"
        + ' FROM n ORDER BY n.i',
    ],
    wrongAnswers: [
      "SELECT strftime('%Y-%m', ordered_on) AS month, COUNT(*) AS order_count FROM orders GROUP BY month ORDER BY month",
      'WITH RECURSIVE months(month_start) AS ('
        + " SELECT '2025-01-01'"
        + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-12-01'"
        + ')'
        + " SELECT strftime('%Y-%m', m.month_start) AS month, COUNT(*) AS order_count"
        + ' FROM months m'
        + " LEFT JOIN orders o ON strftime('%Y-%m', o.ordered_on) = strftime('%Y-%m', m.month_start)"
        + ' GROUP BY m.month_start ORDER BY m.month_start',
      'WITH RECURSIVE months(month_start) AS ('
        + " SELECT '2025-01-01'"
        + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-11-01'"
        + ')'
        + " SELECT strftime('%Y-%m', m.month_start) AS month, COUNT(o.id) AS order_count"
        + ' FROM months m'
        + " LEFT JOIN orders o ON strftime('%Y-%m', o.ordered_on) = strftime('%Y-%m', m.month_start)"
        + ' GROUP BY m.month_start ORDER BY m.month_start',
    ],
  },
  {
    id: 'A17',
    level: 'advanced',
    category: '再帰CTE',
    title: 'キッチンの配下のカテゴリをすべて',
    desc: '階層になったカテゴリを、再帰CTE で上から下までたどります。'
      + 'categories テーブル（parent_id が親カテゴリのID）から、カテゴリ「キッチン」（id = 1）と、その配下にあるすべてのカテゴリ（子・孫…）を取り出してください。'
      + '列は id, name, depth の順です。depth はキッチンからの深さで、キッチン自身を 0、その子を 1、孫を 2 とします。並び順は問いません。',
    hint: 'WITH RECURSIVE の最初の行を「id = 1 のカテゴリ（depth 0）」にし、次の行は「parent_id が直前に見つけたカテゴリの id であるカテゴリ（depth + 1）」として categories を JOIN します。',
    answer: 'WITH RECURSIVE sub(id, name, depth) AS ('
      + ' SELECT id, name, 0 FROM categories WHERE id = 1'
      + ' UNION ALL'
      + ' SELECT c.id, c.name, s.depth + 1 FROM categories c JOIN sub s ON c.parent_id = s.id'
      + ')'
      + ' SELECT id, name, depth FROM sub',
    explanation: '自己結合を1回するだけでは「子」までしか届かず、孫の和食器・洋食器が漏れます。'
      + '再帰CTEなら、新しい行が見つからなくなるまで JOIN を繰り返すので、階層が何段あっても配下をすべてたどれます。',
    wrongAnswers: [
      'SELECT id, name, CASE WHEN id = 1 THEN 0 ELSE 1 END AS depth FROM categories WHERE id = 1 OR parent_id = 1',
      'WITH RECURSIVE sub(id, name, depth) AS ('
        + ' SELECT id, name, 1 FROM categories WHERE id = 1'
        + ' UNION ALL'
        + ' SELECT c.id, c.name, s.depth + 1 FROM categories c JOIN sub s ON c.parent_id = s.id'
        + ')'
        + ' SELECT id, name, depth FROM sub',
      'WITH RECURSIVE sub(id, name, depth) AS ('
        + ' SELECT id, name, 0 FROM categories WHERE parent_id = 1'
        + ' UNION ALL'
        + ' SELECT c.id, c.name, s.depth + 1 FROM categories c JOIN sub s ON c.parent_id = s.id'
        + ')'
        + ' SELECT id, name, depth FROM sub',
    ],
  },
  {
    id: 'A18',
    level: 'advanced',
    category: '再帰CTE',
    title: '社長から各社員までの経路',
    desc: '組織図をたどって、社員ごとに社長からの経路と階層を求めます。'
      + 'employees テーブル（manager_id が上司の社員ID、社長は manager_id が NULL）を使い、在籍中の社員（left_on が NULL）それぞれについて、組織の何段目にいるかと、社長から本人までの経路を求めてください。'
      + '列は id, name, level, path の順です。level は社長を 1、社長の直属の部下を 2 …とします。'
      + 'path は社長から本人までの社員名を、上の人から順に \' > \'（前後に半角スペース）でつないだ文字列です（例: \'大西 正樹 > 佐藤 恵子\'）。社長の path は社長の名前だけです。並び順は問いません。',
    hint: '最初の行は manager_id IS NULL の社員（level 1、path は自分の名前）。次の行は「manager_id が直前の社員の id である社員」を JOIN し、level + 1、path || \' > \' || 名前 とします。'
      + '在籍中かどうかの絞り込みは、最後の SELECT で行います。',
    answer: 'WITH RECURSIVE org(id, name, level, path, left_on) AS ('
      + ' SELECT id, name, 1, name, left_on FROM employees WHERE manager_id IS NULL'
      + ' UNION ALL'
      + " SELECT e.id, e.name, o.level + 1, o.path || ' > ' || e.name, e.left_on FROM employees e JOIN org o ON e.manager_id = o.id"
      + ')'
      + ' SELECT id, name, level, path FROM org WHERE left_on IS NULL',
    explanation: '再帰の各段で「上司の path に自分の名前を足す」ので、上から順の経路が積み上がります。名前を前に足す（e.name || \' > \' || o.path）と、本人から社長へ向かう逆順になります。'
      + '組織は最大4階層で、深さはデータによって違いますが、再帰CTEなら段数を決めずにたどれます。',
    wrongAnswers: [
      'WITH RECURSIVE org(id, name, level, path, left_on) AS ('
        + ' SELECT id, name, 1, name, left_on FROM employees WHERE manager_id IS NULL'
        + ' UNION ALL'
        + " SELECT e.id, e.name, o.level + 1, e.name || ' > ' || o.path, e.left_on FROM employees e JOIN org o ON e.manager_id = o.id"
        + ')'
        + ' SELECT id, name, level, path FROM org WHERE left_on IS NULL',
      'WITH RECURSIVE org(id, name, level, path, left_on) AS ('
        + ' SELECT id, name, 0, name, left_on FROM employees WHERE manager_id IS NULL'
        + ' UNION ALL'
        + " SELECT e.id, e.name, o.level + 1, o.path || ' > ' || e.name, e.left_on FROM employees e JOIN org o ON e.manager_id = o.id"
        + ')'
        + ' SELECT id, name, level, path FROM org WHERE left_on IS NULL',
      'WITH RECURSIVE org(id, name, level, path) AS ('
        + ' SELECT id, name, 1, name FROM employees WHERE manager_id IS NULL'
        + ' UNION ALL'
        + " SELECT e.id, e.name, o.level + 1, o.path || ' > ' || e.name FROM employees e JOIN org o ON e.manager_id = o.id"
        + ')'
        + ' SELECT id, name, level, path FROM org',
    ],
  },
  {
    id: 'A19',
    level: 'advanced',
    category: '再帰CTE',
    title: '配下のカテゴリを含めたカテゴリ別売上',
    desc: '13 個のすべてのカテゴリについて、そのカテゴリ自身と配下のすべてのカテゴリ（子・孫）に属する商品の売上金額の合計を求めてください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文の明細の quantity * unit_price の合計です（送料は含めません）。'
      + 'キッチン（id 1）のように、親カテゴリに直接属する商品もあるので、自分自身の商品も含めます。売上のないカテゴリ（季節雑貨）は 0 とします。'
      + '列は id, name, sales の順です。並び順は問いません。',
    hint: 'まず再帰CTEで「(祖先のカテゴリID, 子孫のカテゴリID)」の組をすべて作ります。最初の行は各カテゴリと自分自身の組 (id, id)、次の行で子カテゴリをたどります。'
      + '次に、カテゴリIDごとの売上を別のCTEで集計し、子孫のカテゴリIDで結び付けて、祖先ごとに合計します。',
    answer: 'WITH RECURSIVE tree(ancestor_id, category_id) AS ('
      + ' SELECT id, id FROM categories'
      + ' UNION ALL'
      + ' SELECT t.ancestor_id, c.id FROM tree t JOIN categories c ON c.parent_id = t.category_id'
      + '),'
      + ' sales AS ('
      + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS amount'
      + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY p.category_id'
      + ')'
      + ' SELECT c.id, c.name, COALESCE(SUM(s.amount), 0) AS sales'
      + ' FROM categories c'
      + ' JOIN tree t ON t.ancestor_id = c.id'
      + ' LEFT JOIN sales s ON s.category_id = t.category_id'
      + ' GROUP BY c.id, c.name',
    explanation: '「祖先と子孫の組」の表（閉包テーブル）を再帰CTEで作ると、どの段のカテゴリでも「配下全体の合計」を同じ書き方で集計できます。'
      + '自分自身との組 (id, id) を入れないと、親カテゴリに直接属する商品（竹の弁当箱など）の売上が抜け、最下層のカテゴリは 0 になります。最上位の4カテゴリの合計は、全体の売上と一致します。',
    wrongAnswers: [
      'WITH RECURSIVE tree(ancestor_id, category_id) AS ('
        + ' SELECT parent_id, id FROM categories WHERE parent_id IS NOT NULL'
        + ' UNION ALL'
        + ' SELECT t.ancestor_id, c.id FROM tree t JOIN categories c ON c.parent_id = t.category_id'
        + '),'
        + ' sales AS ('
        + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id'
        + ')'
        + ' SELECT c.id, c.name, COALESCE(SUM(s.amount), 0) AS sales'
        + ' FROM categories c'
        + ' LEFT JOIN tree t ON t.ancestor_id = c.id'
        + ' LEFT JOIN sales s ON s.category_id = t.category_id'
        + ' GROUP BY c.id, c.name',
      'SELECT c.id, c.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS sales'
        + ' FROM categories c'
        + ' LEFT JOIN products p ON p.category_id = c.id OR p.category_id IN (SELECT id FROM categories WHERE parent_id = c.id)'
        + ' LEFT JOIN order_items oi ON oi.product_id = p.id'
        + " LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('delivered', 'shipped')"
        + ' WHERE o.id IS NOT NULL OR oi.order_id IS NULL'
        + ' GROUP BY c.id, c.name',
      'WITH RECURSIVE tree(ancestor_id, category_id) AS ('
        + ' SELECT id, id FROM categories'
        + ' UNION ALL'
        + ' SELECT t.ancestor_id, c.id FROM tree t JOIN categories c ON c.parent_id = t.category_id'
        + '),'
        + ' sales AS ('
        + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM order_items oi JOIN products p ON p.id = oi.product_id'
        + ' GROUP BY p.category_id'
        + ')'
        + ' SELECT c.id, c.name, COALESCE(SUM(s.amount), 0) AS sales'
        + ' FROM categories c'
        + ' JOIN tree t ON t.ancestor_id = c.id'
        + ' LEFT JOIN sales s ON s.category_id = t.category_id'
        + ' GROUP BY c.id, c.name',
    ],
  },

  // ---------------------------------------------------------------- グループ内上位N件
  {
    id: 'A20',
    level: 'advanced',
    category: 'グループ内上位N件',
    title: 'カテゴリごとの高額商品 上位2件（廃番を除く）',
    desc: 'カテゴリごとに、価格の高い商品を上位 2 件ずつ取り出します。'
      + 'products テーブルから、廃番でない商品（is_discontinued が 0）だけを対象に、カテゴリ（category_id）ごとに価格（price）の高い順で上位 2 件の商品を取り出してください。'
      + '廃番の商品を除いたうえで順位を付けるので、どのカテゴリも商品が2つ以上あれば必ず2件になります（商品が1つのカテゴリは1件）。上位2件の中と境界に同じ価格の商品はありません。'
      + '列は category_id, id, name, price の順です。category_id の小さい順、同じカテゴリの中では price の高い順に並べます。',
    hint: 'ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) でカテゴリ内の順位を付け、外側のクエリで順位が 2 以下の行を選びます。'
      + 'ウィンドウ関数の結果は同じクエリの WHERE では使えないので、CTE か FROM 句の副問い合わせに入れます。廃番の除外は、順位を付ける前に行います。',
    answer: 'WITH ranked AS ('
      + ' SELECT category_id, id, name, price,'
      + ' ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn'
      + ' FROM products WHERE is_discontinued = 0'
      + ')'
      + ' SELECT category_id, id, name, price FROM ranked WHERE rn <= 2 ORDER BY category_id, price DESC',
    ordered: true,
    explanation: 'グループ内の上位N件は「PARTITION BY で区切って順位を付け、外側で順位 <= N を選ぶ」のが定番です。'
      + 'WHERE is_discontinued = 0 を外側（順位を付けた後）に書くと、廃番の土鍋6号や2025年手帳が順位を1つ占めたまま除かれ、そのカテゴリは1件しか残りません。',
    wrongAnswers: [
      'WITH ranked AS ('
        + ' SELECT category_id, id, name, price, is_discontinued,'
        + ' ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn'
        + ' FROM products'
        + ')'
        + ' SELECT category_id, id, name, price FROM ranked WHERE rn <= 2 AND is_discontinued = 0 ORDER BY category_id, price DESC',
      'SELECT category_id, id, name, price FROM products WHERE is_discontinued = 0 ORDER BY price DESC LIMIT 2',
      'WITH ranked AS ('
        + ' SELECT category_id, id, name, price,'
        + ' ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price) AS rn'
        + ' FROM products WHERE is_discontinued = 0'
        + ')'
        + ' SELECT category_id, id, name, price FROM ranked WHERE rn <= 2 ORDER BY category_id, price DESC',
    ],
  },
  {
    id: 'A21',
    level: 'advanced',
    category: 'グループ内上位N件',
    title: 'カテゴリごとの売れ筋 上位2位（同数は含める）',
    desc: '商品のカテゴリ（products.category_id）ごとに、販売数量の多い商品の上位 2 位までを求めてください。'
      + '販売数量は、status が \'delivered\' または \'shipped\' の注文の明細の quantity の合計です。対象はこの条件で1個以上売れた商品だけです。'
      + '同じ販売数量の商品は同じ順位とし、2位が同数で複数あるときはすべて含めます（順位は RANK の付け方で、1位が2つなら次は3位）。'
      + '列は category_id, product_id, name, total_quantity, rank の順です。category_id の小さい順、同じカテゴリの中では rank の小さい順、同じ rank なら product_id の小さい順に並べます。',
    hint: 'まず CTE で商品ごとの販売数量を集計し、次に RANK() OVER (PARTITION BY category_id ORDER BY 販売数量 DESC) で順位を付けて、rank <= 2 を選びます。'
      + 'ROW_NUMBER は同数でも別の番号を付けるので、同数の商品が漏れます。',
    answer: 'WITH qty AS ('
      + ' SELECT p.category_id, p.id AS product_id, p.name, SUM(oi.quantity) AS total_quantity'
      + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY p.category_id, p.id, p.name'
      + '), ranked AS ('
      + ' SELECT *, RANK() OVER (PARTITION BY category_id ORDER BY total_quantity DESC) AS rnk FROM qty'
      + ')'
      + ' SELECT category_id, product_id, name, total_quantity, rnk AS rank FROM ranked WHERE rnk <= 2'
      + ' ORDER BY category_id, rnk, product_id',
    ordered: true,
    explanation: '「上位N位まで（同数は含める）」は RANK で順位を付けて rank <= N を選びます。洋食器（category 11）では2位が同数で2商品あり、このカテゴリだけ3行になります。'
      + 'ROW_NUMBER を使うと同数のどちらか一方しか残らず、どちらが残るかも決まりません。キャンセル・返品の明細を含めると、数量と順位が変わります。',
    wrongAnswers: [
      'WITH qty AS ('
        + ' SELECT p.category_id, p.id AS product_id, p.name, SUM(oi.quantity) AS total_quantity'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id, p.id, p.name'
        + '), ranked AS ('
        + ' SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY total_quantity DESC, product_id) AS rnk FROM qty'
        + ')'
        + ' SELECT category_id, product_id, name, total_quantity, rnk AS rank FROM ranked WHERE rnk <= 2'
        + ' ORDER BY category_id, rnk, product_id',
      'WITH qty AS ('
        + ' SELECT p.category_id, p.id AS product_id, p.name, SUM(oi.quantity) AS total_quantity'
        + ' FROM order_items oi JOIN products p ON p.id = oi.product_id'
        + ' GROUP BY p.category_id, p.id, p.name'
        + '), ranked AS ('
        + ' SELECT *, RANK() OVER (PARTITION BY category_id ORDER BY total_quantity DESC) AS rnk FROM qty'
        + ')'
        + ' SELECT category_id, product_id, name, total_quantity, rnk AS rank FROM ranked WHERE rnk <= 2'
        + ' ORDER BY category_id, rnk, product_id',
      'WITH qty AS ('
        + ' SELECT p.category_id, p.id AS product_id, p.name, SUM(oi.quantity) AS total_quantity'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id, p.id, p.name'
        + '), ranked AS ('
        + ' SELECT *, RANK() OVER (ORDER BY total_quantity DESC) AS rnk FROM qty'
        + ')'
        + ' SELECT category_id, product_id, name, total_quantity, rnk AS rank FROM ranked WHERE rnk <= 2'
        + ' ORDER BY category_id, rnk, product_id',
    ],
  },
  {
    id: 'A22',
    level: 'advanced',
    category: 'グループ内上位N件',
    title: '四半期ごとの売上上位3商品',
    desc: '2025年の四半期（1〜3月が 1、4〜6月が 2、7〜9月が 3、10〜12月が 4）ごとに、売上金額の多い商品の上位 3 件を求めてください。'
      + '売上金額は、status が \'delivered\' または \'shipped\' の注文の明細の quantity * unit_price の合計です（送料は含めず、unit_price は注文時点の単価なので products.price は使いません）。'
      + '同じ四半期で売上金額が同じなら product_id の小さい方を上位とします（上位3件の境界に同額はありません）。'
      + '列は quarter（整数）, rank（1〜3 の整数）, product_id, name, sales の順です。quarter の小さい順、同じ四半期の中では rank の小さい順に並べます。',
    hint: '四半期は月の番号から (月 + 2) / 3 の整数の割り算で求められます（月は CAST(strftime(\'%m\', ordered_on) AS INTEGER)）。'
      + 'CTE で「四半期 × 商品」の売上を集計してから、ROW_NUMBER() OVER (PARTITION BY 四半期 ORDER BY 売上 DESC, product_id) で順位を付けます。',
    answer: 'WITH q AS ('
      + " SELECT (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales"
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY quarter, oi.product_id'
      + '), ranked AS ('
      + ' SELECT quarter, product_id, sales, ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY sales DESC, product_id) AS rn FROM q'
      + ')'
      + ' SELECT r.quarter, r.rn AS rank, r.product_id, p.name, r.sales'
      + ' FROM ranked r JOIN products p ON p.id = r.product_id'
      + ' WHERE r.rn <= 3'
      + ' ORDER BY r.quarter, r.rn',
    ordered: true,
    explanation: '「集計してから順位を付ける」ときは、集計を CTE に分けると読みやすくなります。PARTITION BY quarter を忘れると、年間を通した順位になって上位3件しか残りません。'
      + '値上げのあった鉄のフライパンなどは products.price で計算すると実際の売上と変わり、キャンセル注文を含めると第4四半期の順位が入れ替わります。',
    wrongAnswers: [
      'WITH q AS ('
        + " SELECT (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' GROUP BY quarter, oi.product_id'
        + '), ranked AS ('
        + ' SELECT quarter, product_id, sales, ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY sales DESC, product_id) AS rn FROM q'
        + ')'
        + ' SELECT r.quarter, r.rn AS rank, r.product_id, p.name, r.sales'
        + ' FROM ranked r JOIN products p ON p.id = r.product_id WHERE r.rn <= 3 ORDER BY r.quarter, r.rn',
      'WITH q AS ('
        + " SELECT (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.product_id, SUM(oi.quantity * p.price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY quarter, oi.product_id'
        + '), ranked AS ('
        + ' SELECT quarter, product_id, sales, ROW_NUMBER() OVER (PARTITION BY quarter ORDER BY sales DESC, product_id) AS rn FROM q'
        + ')'
        + ' SELECT r.quarter, r.rn AS rank, r.product_id, p.name, r.sales'
        + ' FROM ranked r JOIN products p ON p.id = r.product_id WHERE r.rn <= 3 ORDER BY r.quarter, r.rn',
      'WITH q AS ('
        + " SELECT (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY quarter, oi.product_id'
        + '), ranked AS ('
        + ' SELECT quarter, product_id, sales, ROW_NUMBER() OVER (ORDER BY sales DESC, product_id) AS rn FROM q'
        + ')'
        + ' SELECT r.quarter, r.rn AS rank, r.product_id, p.name, r.sales'
        + ' FROM ranked r JOIN products p ON p.id = r.product_id WHERE r.rn <= 3 ORDER BY r.quarter, r.rn',
    ],
  },

  // ---------------------------------------------------------------- ピボット
  {
    id: 'A23',
    level: 'advanced',
    category: 'ピボット（縦横変換）',
    title: '月別・ステータス別の注文件数を横に並べる',
    desc: '月ごとの注文件数を、状態（status）別に横に並べた集計表にします。'
      + 'orders テーブルから、注文のある月ごとに、status 別の注文件数を1行に横に並べてください（注文のない2025年8月は含めません）。'
      + '列は month（\'2025-01\' の形式の文字列）, delivered, shipped, cancelled, returned, total の順です。delivered 〜 returned はそれぞれの status の件数、total はその月の全注文の件数です。'
      + '件数がない status は NULL ではなく 0 にします。month の古い順に並べます。',
    hint: 'GROUP BY で月ごとにまとめ、SUM(CASE WHEN status = \'delivered\' THEN 1 ELSE 0 END) のように、列ごとに条件付きで数えます。'
      + 'ELSE 0 を書かないと、該当する行がない月は NULL になります。',
    answer: "SELECT strftime('%Y-%m', ordered_on) AS month,"
      + " SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,"
      + " SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,"
      + " SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,"
      + " SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned,"
      + ' COUNT(*) AS total'
      + ' FROM orders GROUP BY month ORDER BY month',
    ordered: true,
    explanation: '縦に並んだ「月 × status」の件数を、CASE 式で列に振り分けて横に並べるのがピボットです。値の種類ごとに1列ずつ CASE を書きます。'
      + 'COUNT(CASE WHEN … THEN 1 ELSE 0 END) は 0 も「NULL でない値」として数えるので、どの列も total と同じになってしまいます。COUNT を使うなら ELSE を書かずに NULL にします。',
    alternatives: [
      "SELECT strftime('%Y-%m', ordered_on) AS month,"
        + " COUNT(CASE WHEN status = 'delivered' THEN 1 END),"
        + " COUNT(CASE WHEN status = 'shipped' THEN 1 END),"
        + " COUNT(CASE WHEN status = 'cancelled' THEN 1 END),"
        + " COUNT(CASE WHEN status = 'returned' THEN 1 END),"
        + ' COUNT(*)'
        + ' FROM orders GROUP BY month ORDER BY month',
    ],
    wrongAnswers: [
      "SELECT strftime('%Y-%m', ordered_on) AS month,"
        + " COUNT(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END),"
        + " COUNT(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END),"
        + " COUNT(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END),"
        + " COUNT(CASE WHEN status = 'returned' THEN 1 ELSE 0 END),"
        + ' COUNT(*)'
        + ' FROM orders GROUP BY month ORDER BY month',
      "SELECT strftime('%Y-%m', ordered_on) AS month,"
        + " SUM(CASE WHEN status = 'delivered' THEN 1 END),"
        + " SUM(CASE WHEN status = 'shipped' THEN 1 END),"
        + " SUM(CASE WHEN status = 'cancelled' THEN 1 END),"
        + " SUM(CASE WHEN status = 'returned' THEN 1 END),"
        + ' COUNT(*)'
        + ' FROM orders GROUP BY month ORDER BY month',
    ],
  },
  {
    id: 'A24',
    level: 'advanced',
    category: 'ピボット（縦横変換）',
    title: '最上位カテゴリ × 四半期の売上表',
    desc: '最上位のカテゴリ（parent_id が NULL の4カテゴリ）ごとに、2025年の四半期別の売上金額を1行に横に並べてください。'
      + '商品は、属するカテゴリをさかのぼった最上位のカテゴリに集計します（カテゴリは最大3階層で、最上位のカテゴリに直接属する商品もあります）。'
      + '売上は status が \'delivered\' または \'shipped\' の注文の明細の quantity * unit_price の合計（送料は含めない）。四半期は 1〜3月が 1、4〜6月が 2、7〜9月が 3、10〜12月が 4 です。'
      + '売上のない欄は 0 とし、商品のない「季節雑貨」も 0 が並ぶ1行として含めます。列は id, name, q1, q2, q3, q4 の順です。並び順は問いません。',
    hint: 'categories を親・祖父母と2回 LEFT JOIN し、COALESCE(祖父母の id, 親の id, 自分の id) で最上位のカテゴリIDが求まります（A19 のように再帰CTEでたどってもかまいません）。'
      + '明細ごとに「最上位カテゴリID・四半期・金額」を CTE で用意し、最上位のカテゴリから LEFT JOIN して、SUM(CASE WHEN 四半期 = 1 THEN 金額 ELSE 0 END) のように列を作ります。',
    answer: 'WITH cat_top AS ('
      + ' SELECT c.id AS category_id, COALESCE(g.id, p.id, c.id) AS top_id'
      + ' FROM categories c LEFT JOIN categories p ON p.id = c.parent_id LEFT JOIN categories g ON g.id = p.parent_id'
      + '), s AS ('
      + " SELECT ct.top_id, (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.quantity * oi.unit_price AS amount"
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + ' JOIN products pr ON pr.id = oi.product_id JOIN cat_top ct ON ct.category_id = pr.category_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ')'
      + ' SELECT t.id, t.name,'
      + ' SUM(CASE WHEN s.quarter = 1 THEN s.amount ELSE 0 END) AS q1,'
      + ' SUM(CASE WHEN s.quarter = 2 THEN s.amount ELSE 0 END) AS q2,'
      + ' SUM(CASE WHEN s.quarter = 3 THEN s.amount ELSE 0 END) AS q3,'
      + ' SUM(CASE WHEN s.quarter = 4 THEN s.amount ELSE 0 END) AS q4'
      + ' FROM categories t LEFT JOIN s ON s.top_id = t.id'
      + ' WHERE t.parent_id IS NULL'
      + ' GROUP BY t.id, t.name',
    explanation: 'ピボットの前に「どの行をどの列に入れるか」の材料（最上位カテゴリと四半期）を CTE でそろえておくと、本体は CASE を並べるだけになります。'
      + '親を1段だけたどる COALESCE(p.id, c.id) では、和食器などの3段目の商品が「食器」に集計され、キッチンの売上が少なく出ます。最上位のカテゴリから LEFT JOIN するので、季節雑貨も 0 の行として残ります。',
    wrongAnswers: [
      'WITH cat_top AS ('
        + ' SELECT c.id AS category_id, COALESCE(p.id, c.id) AS top_id'
        + ' FROM categories c LEFT JOIN categories p ON p.id = c.parent_id'
        + '), s AS ('
        + " SELECT ct.top_id, (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.quantity * oi.unit_price AS amount"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' JOIN products pr ON pr.id = oi.product_id JOIN cat_top ct ON ct.category_id = pr.category_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ')'
        + ' SELECT t.id, t.name,'
        + ' SUM(CASE WHEN s.quarter = 1 THEN s.amount ELSE 0 END), SUM(CASE WHEN s.quarter = 2 THEN s.amount ELSE 0 END),'
        + ' SUM(CASE WHEN s.quarter = 3 THEN s.amount ELSE 0 END), SUM(CASE WHEN s.quarter = 4 THEN s.amount ELSE 0 END)'
        + ' FROM categories t LEFT JOIN s ON s.top_id = t.id WHERE t.parent_id IS NULL GROUP BY t.id, t.name',
      'WITH cat_top AS ('
        + ' SELECT c.id AS category_id, COALESCE(g.id, p.id, c.id) AS top_id'
        + ' FROM categories c LEFT JOIN categories p ON p.id = c.parent_id LEFT JOIN categories g ON g.id = p.parent_id'
        + '), s AS ('
        + " SELECT ct.top_id, (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.quantity * oi.unit_price AS amount"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' JOIN products pr ON pr.id = oi.product_id JOIN cat_top ct ON ct.category_id = pr.category_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ')'
        + ' SELECT t.id, t.name,'
        + ' SUM(CASE WHEN s.quarter = 1 THEN s.amount ELSE 0 END), SUM(CASE WHEN s.quarter = 2 THEN s.amount ELSE 0 END),'
        + ' SUM(CASE WHEN s.quarter = 3 THEN s.amount ELSE 0 END), SUM(CASE WHEN s.quarter = 4 THEN s.amount ELSE 0 END)'
        + ' FROM categories t JOIN s ON s.top_id = t.id WHERE t.parent_id IS NULL GROUP BY t.id, t.name',
      'WITH cat_top AS ('
        + ' SELECT c.id AS category_id, COALESCE(g.id, p.id, c.id) AS top_id'
        + ' FROM categories c LEFT JOIN categories p ON p.id = c.parent_id LEFT JOIN categories g ON g.id = p.parent_id'
        + '), s AS ('
        + " SELECT ct.top_id, (CAST(strftime('%m', o.ordered_on) AS INTEGER) + 2) / 3 AS quarter, oi.quantity * oi.unit_price AS amount"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' JOIN products pr ON pr.id = oi.product_id JOIN cat_top ct ON ct.category_id = pr.category_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ')'
        + ' SELECT t.id, t.name,'
        + ' SUM(CASE WHEN s.quarter = 1 THEN s.amount END), SUM(CASE WHEN s.quarter = 2 THEN s.amount END),'
        + ' SUM(CASE WHEN s.quarter = 3 THEN s.amount END), SUM(CASE WHEN s.quarter = 4 THEN s.amount END)'
        + ' FROM categories t LEFT JOIN s ON s.top_id = t.id WHERE t.parent_id IS NULL GROUP BY t.id, t.name',
    ],
  },

  // ---------------------------------------------------------------- 連続期間・欠番
  {
    id: 'A25',
    level: 'advanced',
    category: '連続期間・欠番',
    title: '注文が途切れた期間',
    desc: '注文が1件もない日が続いた期間（注文の空白期間）を探します。'
      + 'orders テーブルの注文日（ordered_on）を使い、最初の注文日から最後の注文日までの間で、注文が1件もない日が 2 日以上続いた期間を求めてください。status は問いません。'
      + '列は gap_start, gap_end, days の順です。gap_start は注文のない最初の日、gap_end は注文のない最後の日（どちらも \'2025-01-06\' の形式の文字列）、days は注文のない日の数（整数）です。'
      + '例えば 1月5日の次の注文が 1月8日なら、1月6日〜1月7日の 2 日間です。ちょうど 2 日の期間も含めます。gap_start の古い順に並べます。',
    hint: '注文のある日付を重複なしで取り出し、LEAD(ordered_on) OVER (ORDER BY ordered_on) で「次に注文のあった日」を並べます。'
      + '2つの日付の差は julianday(次の日) - julianday(その日) で求まり、注文のない日の数はそこから 1 を引いた値です。期間の両端は date(日付, \'+1 day\') と date(日付, \'-1 day\') で作れます。',
    answer: 'WITH d AS (SELECT DISTINCT ordered_on FROM orders),'
      + ' g AS (SELECT ordered_on, LEAD(ordered_on) OVER (ORDER BY ordered_on) AS next_on FROM d)'
      + " SELECT date(ordered_on, '+1 day') AS gap_start, date(next_on, '-1 day') AS gap_end,"
      + ' CAST(julianday(next_on) - julianday(ordered_on) AS INTEGER) - 1 AS days'
      + ' FROM g'
      + ' WHERE julianday(next_on) - julianday(ordered_on) - 1 >= 2'
      + ' ORDER BY gap_start',
    ordered: true,
    explanation: '欠番（すき間）は「並べたときの隣の値との差」で見つけます。LEAD で次の注文日を横に並べ、差が 3 日以上（間の空白が 2 日以上）の行を選びます。'
      + '差そのものを日数にすると、注文のある両端の日まで数えて1日ずつ多くなります。最後の注文日は LEAD が NULL になり、条件に合わないので自然に除かれます。',
    wrongAnswers: [
      'WITH d AS (SELECT DISTINCT ordered_on FROM orders),'
        + ' g AS (SELECT ordered_on, LEAD(ordered_on) OVER (ORDER BY ordered_on) AS next_on FROM d)'
        + " SELECT date(ordered_on, '+1 day'), date(next_on, '-1 day'), CAST(julianday(next_on) - julianday(ordered_on) AS INTEGER) - 1"
        + ' FROM g WHERE julianday(next_on) - julianday(ordered_on) - 1 > 2 ORDER BY 1',
      'WITH d AS (SELECT DISTINCT ordered_on FROM orders),'
        + ' g AS (SELECT ordered_on, LEAD(ordered_on) OVER (ORDER BY ordered_on) AS next_on FROM d)'
        + ' SELECT ordered_on, next_on, CAST(julianday(next_on) - julianday(ordered_on) AS INTEGER)'
        + ' FROM g WHERE julianday(next_on) - julianday(ordered_on) - 1 >= 2 ORDER BY 1',
      'WITH d AS (SELECT DISTINCT ordered_on FROM orders),'
        + ' g AS (SELECT ordered_on, LEAD(ordered_on) OVER (ORDER BY ordered_on) AS next_on FROM d)'
        + " SELECT date(ordered_on, '+1 day'), date(next_on, '-1 day'), CAST(julianday(next_on) - julianday(ordered_on) AS INTEGER) - 1"
        + ' FROM g WHERE julianday(next_on) - julianday(ordered_on) >= 2 ORDER BY 1',
    ],
  },
  {
    id: 'A26',
    level: 'advanced',
    category: '連続期間・欠番',
    title: '連続購入が3か月以上の期間',
    desc: '顧客ごとに、有効な注文（status が \'delivered\' または \'shipped\'）があった月が 3 か月以上続いた期間を求めてください。'
      + '「続いた」とは月の番号が1つずつ続いていることで、同じ月に何回注文しても1か月と数えます（2025年8月は注文が休止されているため、7月と9月は続いていません）。'
      + '列は customer_id, start_month, end_month, months の順です。start_month と end_month は期間の最初と最後の月（\'2025-01\' の形式の文字列）、months は期間の月数（整数）です。ちょうど 3 か月の期間も含めます。'
      + 'customer_id の小さい順、同じ顧客なら start_month の古い順に並べます。',
    hint: 'まず顧客と月の番号の組を重複なしで取り出します。次に「月の番号 - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY 月の番号)」を計算すると、続いている月どうしは同じ値になります。'
      + 'その値と customer_id で GROUP BY し、MIN・MAX・COUNT で期間を求めて、HAVING で 3 か月以上を選びます。月の文字列は printf(\'2025-%02d\', 月の番号) で作れます。',
    answer: 'WITH m AS ('
      + " SELECT DISTINCT customer_id, CAST(strftime('%m', ordered_on) AS INTEGER) AS mon"
      + " FROM orders WHERE status IN ('delivered', 'shipped')"
      + '), g AS ('
      + ' SELECT customer_id, mon, mon - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mon) AS grp FROM m'
      + ')'
      + " SELECT customer_id, printf('2025-%02d', MIN(mon)) AS start_month, printf('2025-%02d', MAX(mon)) AS end_month, COUNT(*) AS months"
      + ' FROM g'
      + ' GROUP BY customer_id, grp'
      + ' HAVING COUNT(*) >= 3'
      + ' ORDER BY customer_id, start_month',
    ordered: true,
    explanation: '連続した値は「値 - 連番」が一定になる性質を使うと、1つのグループにまとめられます（gaps and islands の定番の解き方）。例えば 1,2,3 月と 5,6 月は、月 - 連番がそれぞれ 0 と 1 になります。'
      + '月を DISTINCT にしないと、同じ月の2回目の注文で連番だけが進み、続いている月が別のグループに分かれてしまいます。',
    wrongAnswers: [
      'WITH m AS ('
        + " SELECT customer_id, CAST(strftime('%m', ordered_on) AS INTEGER) AS mon"
        + " FROM orders WHERE status IN ('delivered', 'shipped')"
        + '), g AS ('
        + ' SELECT customer_id, mon, mon - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mon) AS grp FROM m'
        + ')'
        + " SELECT customer_id, printf('2025-%02d', MIN(mon)), printf('2025-%02d', MAX(mon)), COUNT(*)"
        + ' FROM g GROUP BY customer_id, grp HAVING COUNT(*) >= 3 ORDER BY 1, 2',
      'WITH m AS ('
        + " SELECT DISTINCT customer_id, CAST(strftime('%m', ordered_on) AS INTEGER) AS mon"
        + ' FROM orders'
        + '), g AS ('
        + ' SELECT customer_id, mon, mon - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mon) AS grp FROM m'
        + ')'
        + " SELECT customer_id, printf('2025-%02d', MIN(mon)), printf('2025-%02d', MAX(mon)), COUNT(*)"
        + ' FROM g GROUP BY customer_id, grp HAVING COUNT(*) >= 3 ORDER BY 1, 2',
      'WITH m AS ('
        + " SELECT DISTINCT customer_id, CAST(strftime('%m', ordered_on) AS INTEGER) AS mon"
        + " FROM orders WHERE status IN ('delivered', 'shipped')"
        + '), g AS ('
        + ' SELECT customer_id, mon, mon - ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY mon) AS grp FROM m'
        + ')'
        + " SELECT customer_id, printf('2025-%02d', MIN(mon)), printf('2025-%02d', MAX(mon)), COUNT(*)"
        + ' FROM g GROUP BY customer_id, grp HAVING COUNT(*) > 3 ORDER BY 1, 2',
    ],
  },

  // ---------------------------------------------------------------- 総合問題
  {
    id: 'A27',
    level: 'advanced',
    category: '総合問題',
    title: '月別売上の累計と前月差（8月も含む）',
    desc: '2025年1月〜12月の各月の売上金額と、1月からの累計、前月との差を求めてください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文の明細の quantity * unit_price の合計です（送料は含めません）。注文のない8月も売上 0 の行として含めます（12 行）。'
      + '列は month（\'2025-01\' の形式の文字列）, sales, cumulative_sales, diff_from_prev の順です。diff_from_prev は「その月の売上 - 前月の売上」で、前月のない1月は NULL とします（9月は8月の 0 と比べます）。month の古い順に並べます。',
    hint: '再帰CTEで月の一覧を作り、月別の売上（CTE で集計）を LEFT JOIN して COALESCE で 0 にします。'
      + 'そのうえで SUM(…) OVER (ORDER BY month) で累計、LAG(…) OVER (ORDER BY month) で前月の売上を求めます。',
    answer: 'WITH RECURSIVE months(month_start) AS ('
      + " SELECT '2025-01-01'"
      + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-12-01'"
      + '), monthly AS ('
      + " SELECT strftime('%Y-%m', o.ordered_on) AS month, SUM(oi.quantity * oi.unit_price) AS sales"
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY month'
      + '), filled AS ('
      + " SELECT strftime('%Y-%m', m.month_start) AS month, COALESCE(s.sales, 0) AS sales"
      + " FROM months m LEFT JOIN monthly s ON s.month = strftime('%Y-%m', m.month_start)"
      + ')'
      + ' SELECT month, sales,'
      + ' SUM(sales) OVER (ORDER BY month) AS cumulative_sales,'
      + ' sales - LAG(sales) OVER (ORDER BY month) AS diff_from_prev'
      + ' FROM filled ORDER BY month',
    ordered: true,
    explanation: '再帰CTEで「すべての月」をそろえてからウィンドウ関数を使うのがポイントです。月をそろえずに LAG を使うと、9月の「前の行」が7月になり、休止した8月を飛ばした差になってしまいます。'
      + 'LAG に既定値 0 を渡す（LAG(sales, 1, 0)）と、1月の差が NULL ではなく1月の売上そのものになります。',
    wrongAnswers: [
      'WITH monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS month, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') GROUP BY month"
        + ')'
        + ' SELECT month, sales, SUM(sales) OVER (ORDER BY month), sales - LAG(sales) OVER (ORDER BY month)'
        + ' FROM monthly ORDER BY month',
      'WITH RECURSIVE months(month_start) AS ('
        + " SELECT '2025-01-01'"
        + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-12-01'"
        + '), monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS month, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') GROUP BY month"
        + '), filled AS ('
        + " SELECT strftime('%Y-%m', m.month_start) AS month, COALESCE(s.sales, 0) AS sales"
        + " FROM months m LEFT JOIN monthly s ON s.month = strftime('%Y-%m', m.month_start)"
        + ')'
        + ' SELECT month, sales, SUM(sales) OVER (ORDER BY month), sales - LAG(sales, 1, 0) OVER (ORDER BY month)'
        + ' FROM filled ORDER BY month',
      'WITH RECURSIVE months(month_start) AS ('
        + " SELECT '2025-01-01'"
        + " UNION ALL SELECT date(month_start, '+1 month') FROM months WHERE month_start < '2025-12-01'"
        + '), monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS month, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') GROUP BY month"
        + '), filled AS ('
        + " SELECT strftime('%Y-%m', m.month_start) AS month, s.sales AS sales"
        + " FROM months m LEFT JOIN monthly s ON s.month = strftime('%Y-%m', m.month_start)"
        + ')'
        + ' SELECT month, sales, SUM(sales) OVER (ORDER BY month), sales - LAG(sales) OVER (ORDER BY month)'
        + ' FROM filled ORDER BY month',
    ],
  },
  {
    id: 'A28',
    level: 'advanced',
    category: '総合問題',
    title: 'カテゴリ平均より売れている商品',
    desc: '同じカテゴリの平均より売上金額が大きい商品を探します。'
      + '全 40 商品について売上金額を求め、同じカテゴリ（products.category_id）の商品の平均売上金額より売上金額が大きい商品を取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文の明細の quantity * unit_price の合計で、一度も売れていない商品（キャンセル・返品だけの商品も）は売上 0 として平均の計算に含めます。'
      + '平均と等しい商品は含めません（商品が1つだけのカテゴリは、その商品が平均と等しいので出てきません）。'
      + '列は category_id, id, name, sales, category_avg の順です。category_avg はカテゴリの平均売上金額を小数第1位に ROUND した値です。並び順は問いません。',
    hint: 'products を基準に order_items と orders を LEFT JOIN し、SUM(CASE WHEN status が有効 THEN 金額 END) を COALESCE で 0 にして商品ごとの売上を求めます。'
      + 'WHERE で status を絞ると、売れていない商品の行が消えてしまいます。次に AVG(sales) OVER (PARTITION BY category_id) でカテゴリ平均を横に並べ、外側で比べます。',
    answer: 'WITH sales AS ('
      + ' SELECT p.id, p.name, p.category_id,'
      + " COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped') THEN oi.quantity * oi.unit_price END), 0) AS sales"
      + ' FROM products p'
      + ' LEFT JOIN order_items oi ON oi.product_id = p.id'
      + ' LEFT JOIN orders o ON o.id = oi.order_id'
      + ' GROUP BY p.id, p.name, p.category_id'
      + '), w AS ('
      + ' SELECT *, AVG(sales) OVER (PARTITION BY category_id) AS cat_avg FROM sales'
      + ')'
      + ' SELECT category_id, id, name, sales, ROUND(cat_avg, 1) AS category_avg FROM w WHERE sales > cat_avg',
    explanation: 'LEFT JOIN で売れていない商品を 0 として残す集計と、PARTITION BY のウィンドウ関数による「グループ平均との比較」を組み合わせています。GROUP BY と違い、ウィンドウ関数なら行を残したまま平均を横に並べられます。'
      + 'WHERE で status を絞ると売れていない商品が消え、平均が高く出ます（インテリアのアロマディフューザーは、売れていない花瓶を 0 として含めたときだけ平均を上回ります）。比較は丸める前の平均で行います。',
    wrongAnswers: [
      'WITH sales AS ('
        + ' SELECT p.id, p.name, p.category_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM products p JOIN order_items oi ON oi.product_id = p.id JOIN orders o ON o.id = oi.order_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.id, p.name, p.category_id'
        + '), w AS (SELECT *, AVG(sales) OVER (PARTITION BY category_id) AS cat_avg FROM sales)'
        + ' SELECT category_id, id, name, sales, ROUND(cat_avg, 1) FROM w WHERE sales > cat_avg',
      'WITH sales AS ('
        + ' SELECT p.id, p.name, p.category_id,'
        + " COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped') THEN oi.quantity * oi.unit_price END), 0) AS sales"
        + ' FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id LEFT JOIN orders o ON o.id = oi.order_id'
        + ' GROUP BY p.id, p.name, p.category_id'
        + '), w AS (SELECT *, AVG(sales) OVER (PARTITION BY category_id) AS cat_avg FROM sales)'
        + ' SELECT category_id, id, name, sales, ROUND(cat_avg, 1) FROM w WHERE sales >= cat_avg',
      'WITH sales AS ('
        + ' SELECT p.id, p.name, p.category_id, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS sales'
        + ' FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id'
        + ' GROUP BY p.id, p.name, p.category_id'
        + '), w AS (SELECT *, AVG(sales) OVER (PARTITION BY category_id) AS cat_avg FROM sales)'
        + ' SELECT category_id, id, name, sales, ROUND(cat_avg, 1) FROM w WHERE sales > cat_avg',
    ],
  },
  {
    id: 'A29',
    level: 'advanced',
    category: '総合問題',
    title: '初回購入月ごとのリピート率',
    desc: '初回購入月ごとに、リピーターの人数とリピート率を求めます。'
      + 'customers テーブルにいる顧客を、有効な注文（status が \'delivered\' または \'shipped\'）を初めてした月（初回購入月）でグループに分け、グループごとの人数と、有効な注文が2件以上ある顧客（リピーター）の人数・割合を求めてください。'
      + '有効な注文が1件もない顧客は含めません。customers に存在しない顧客ID の注文（order 69）も含めません。'
      + '列は first_month（\'2025-01\' の形式の文字列）, customers, repeaters, repeat_rate の順です。repeat_rate は repeaters / customers × 100 を小数第1位に ROUND した値（例: 80.0）です。first_month の古い順に並べます。',
    hint: '1つ目の CTE で、customers と JOIN した有効な注文から、顧客ごとの最初の注文日（MIN）と有効な注文件数（COUNT）を求めます。'
      + 'それを初回購入月で GROUP BY し、SUM(CASE WHEN 件数 >= 2 THEN 1 ELSE 0 END) でリピーターを数えます。割合は 100.0 を掛けてから割ると、整数の割り算（切り捨て）になりません。',
    answer: 'WITH valid AS ('
      + ' SELECT o.customer_id, o.ordered_on FROM orders o JOIN customers c ON c.id = o.customer_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + '), firsts AS ('
      + ' SELECT customer_id, MIN(ordered_on) AS first_on, COUNT(*) AS order_count FROM valid GROUP BY customer_id'
      + ')'
      + " SELECT strftime('%Y-%m', first_on) AS first_month, COUNT(*) AS customers,"
      + ' SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) AS repeaters,'
      + ' ROUND(100.0 * SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS repeat_rate'
      + ' FROM firsts GROUP BY first_month ORDER BY first_month',
    ordered: true,
    explanation: '「顧客ごとに集計（初回の月と件数）」→「その結果を月ごとに集計」と、2段階の GROUP BY を CTE でつないでいます。条件付きの数え上げには CASE 式を使います。'
      + 'キャンセルだけの顧客（customer 43）を含めると10月の人数が増え、存在しない顧客の注文を含めると5月の人数が増えます。整数どうしの割り算 repeaters / customers は 0 か 1 に切り捨てられます。',
    wrongAnswers: [
      'WITH firsts AS ('
        + ' SELECT customer_id, MIN(ordered_on) AS first_on, COUNT(*) AS order_count FROM orders'
        + " WHERE status IN ('delivered', 'shipped') GROUP BY customer_id"
        + ')'
        + " SELECT strftime('%Y-%m', first_on), COUNT(*), SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END),"
        + ' ROUND(100.0 * SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1)'
        + ' FROM firsts GROUP BY 1 ORDER BY 1',
      'WITH firsts AS ('
        + ' SELECT o.customer_id, MIN(o.ordered_on) AS first_on, COUNT(*) AS order_count'
        + ' FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY o.customer_id'
        + ')'
        + " SELECT strftime('%Y-%m', first_on), COUNT(*), SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END),"
        + ' ROUND(100.0 * SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1)'
        + ' FROM firsts GROUP BY 1 ORDER BY 1',
      'WITH valid AS ('
        + ' SELECT o.customer_id, o.ordered_on FROM orders o JOIN customers c ON c.id = o.customer_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + '), firsts AS ('
        + ' SELECT customer_id, MIN(ordered_on) AS first_on, COUNT(*) AS order_count FROM valid GROUP BY customer_id'
        + ')'
        + " SELECT strftime('%Y-%m', first_on), COUNT(*), SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END),"
        + ' ROUND(SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) / COUNT(*) * 100, 1)'
        + ' FROM firsts GROUP BY 1 ORDER BY 1',
    ],
  },
  {
    id: 'A30',
    level: 'advanced',
    category: '総合問題',
    title: '部長ごとの配下の人数と人件費',
    desc: '部長ごとに、配下の社員の人数と給与の合計を集計して順位を付けます。'
      + '社長の直属の部下（manager_id が 1 の社員。各部の部長）それぞれについて、組織上の配下（直属の部下だけでなく、部下の部下… もすべて）にいる在籍中の社員（left_on が NULL）の人数と、その給与（salary）の合計を求め、人数の多い順に順位を付けてください。'
      + '部長本人は人数にも給与にも含めません。配下は department_id ではなく manager_id のつながりでたどります（部署のない社員も、上司がいれば配下に含めます）。'
      + '順位は人数の多い順で、同じ人数なら同じ順位とし、次の順位は飛ばします（RANK の付け方）。'
      + '列は id, name, members, total_salary, rank の順です。rank の小さい順、同じ rank なら id の小さい順に並べます。',
    hint: '再帰CTEで「(部長の id, 配下の社員の id)」の組を作ります。最初の行は manager_id = 1 の社員と自分自身の組、次の行で manager_id をたどって部下を足していきます。'
      + 'その後、部長本人の行と退職者を除いて部長ごとに COUNT・SUM し、RANK() OVER (ORDER BY 人数 DESC) で順位を付けます。',
    answer: 'WITH RECURSIVE sub(head_id, member_id) AS ('
      + ' SELECT id, id FROM employees WHERE manager_id = 1'
      + ' UNION ALL'
      + ' SELECT s.head_id, e.id FROM sub s JOIN employees e ON e.manager_id = s.member_id'
      + '), agg AS ('
      + ' SELECT s.head_id, COUNT(*) AS members, SUM(e.salary) AS total_salary'
      + ' FROM sub s JOIN employees e ON e.id = s.member_id'
      + ' WHERE s.member_id <> s.head_id AND e.left_on IS NULL'
      + ' GROUP BY s.head_id'
      + ')'
      + ' SELECT h.id, h.name, a.members, a.total_salary, RANK() OVER (ORDER BY a.members DESC) AS rank'
      + ' FROM employees h JOIN agg a ON a.head_id = h.id'
      + ' ORDER BY rank, h.id',
    ordered: true,
    explanation: '再帰CTEで組織をたどり、集計し、ウィンドウ関数で順位を付ける、という3段の組み合わせです。部署（department_id）で数えると、総務部長の配下にいる部署なしの新入社員が漏れ、退職者のいる部も数が変わります。'
      + '直属の部下だけを数えると、係長の下にいる社員が抜けます。人数が同じ部長が2組あるので、ROW_NUMBER では同じ人数なのに順位が分かれてしまいます。',
    wrongAnswers: [
      'SELECT h.id, h.name, COUNT(e.id), SUM(e.salary), RANK() OVER (ORDER BY COUNT(e.id) DESC) AS rnk'
        + ' FROM employees h JOIN employees e ON e.department_id = h.department_id AND e.id <> h.id AND e.left_on IS NULL'
        + ' WHERE h.manager_id = 1 GROUP BY h.id, h.name ORDER BY rnk, h.id',
      'SELECT h.id, h.name, COUNT(e.id), SUM(e.salary), RANK() OVER (ORDER BY COUNT(e.id) DESC) AS rnk'
        + ' FROM employees h JOIN employees e ON e.manager_id = h.id AND e.left_on IS NULL'
        + ' WHERE h.manager_id = 1 GROUP BY h.id, h.name ORDER BY rnk, h.id',
      'WITH RECURSIVE sub(head_id, member_id) AS ('
        + ' SELECT id, id FROM employees WHERE manager_id = 1'
        + ' UNION ALL'
        + ' SELECT s.head_id, e.id FROM sub s JOIN employees e ON e.manager_id = s.member_id'
        + '), agg AS ('
        + ' SELECT s.head_id, COUNT(*) AS members, SUM(e.salary) AS total_salary'
        + ' FROM sub s JOIN employees e ON e.id = s.member_id'
        + ' WHERE s.member_id <> s.head_id AND e.left_on IS NULL GROUP BY s.head_id'
        + ')'
        + ' SELECT h.id, h.name, a.members, a.total_salary, ROW_NUMBER() OVER (ORDER BY a.members DESC, h.id) AS rnk'
        + ' FROM employees h JOIN agg a ON a.head_id = h.id ORDER BY rnk, h.id',
      'WITH RECURSIVE sub(head_id, member_id) AS ('
        + ' SELECT id, id FROM employees WHERE manager_id = 1'
        + ' UNION ALL'
        + ' SELECT s.head_id, e.id FROM sub s JOIN employees e ON e.manager_id = s.member_id'
        + '), agg AS ('
        + ' SELECT s.head_id, COUNT(*) AS members, SUM(e.salary) AS total_salary'
        + ' FROM sub s JOIN employees e ON e.id = s.member_id'
        + ' WHERE s.member_id <> s.head_id GROUP BY s.head_id'
        + ')'
        + ' SELECT h.id, h.name, a.members, a.total_salary, RANK() OVER (ORDER BY a.members DESC) AS rnk'
        + ' FROM employees h JOIN agg a ON a.head_id = h.id ORDER BY rnk, h.id',
    ],
  },
);
