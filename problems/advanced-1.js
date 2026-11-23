// 上級 前半 A01〜A15（15問） level: 'advanced'
// 到達目標: CTE・ウィンドウ関数などで複雑な要求に応える。
//
// カテゴリ内訳（カテゴリごとに易→難）:
//   CTE（WITH句）（複数CTEの連結を含む）                              4問  A01〜A04
//   順位系ウィンドウ関数（ROW_NUMBER / RANK / DENSE_RANK / NTILE）    4問  A05〜A08
//   集計ウィンドウ関数（累計・移動平均・構成比、PARTITION BY / フレーム指定） 4問  A09〜A12
//   LAG / LEAD（前月比・前回注文からの間隔）                          3問  A13〜A15
//
// RANK と DENSE_RANK の違いが結果に出るよう、setup.js の【タイの一覧】の同値データを使う。
// 形式は docs/requirements.md 3.2 節、作成ルールは 6 節。書き方は docs/problem-guide.md。
// 「売上」はすべて status が 'delivered' または 'shipped' の注文、金額は quantity * unit_price（送料を含まない）。
// 書き方: PROBLEMS.push({ id: 'A01', level: 'advanced', category: '...', title: '...', ... });

PROBLEMS.push(
  // ==================================================================
  // CTE（4問）
  // ==================================================================
  {
    id: 'A01',
    level: 'advanced',
    category: 'CTE（WITH句）',
    title: 'WITH 句で注文ごとの合計を作る',
    desc: '注文ごとの合計金額を WITH 句で求め、金額の大きい注文を探します。'
      + 'orders テーブル（注文）と order_items テーブル（注文明細）から、明細の合計金額が 12000 円以上の注文を取り出してください。'
      + '対象は status が \'delivered\' または \'shipped\' の注文だけで、合計金額は明細の quantity * unit_price の合計です（送料は含めません）。'
      + 'ちょうど 12000 円の注文も含めます。'
      + '列は 注文ID（orders.id）, customer_id, ordered_on, 合計金額 の順です。並び順は問いません。'
      + 'まず WITH 句で「注文ごとの合計金額」の表を作り、そこから絞り込んでみましょう。',
    hint: 'WITH 名前 AS (SELECT ...) と書くと、その SELECT の結果に名前を付けて、後ろの SELECT で表のように使えます。'
      + 'CTE の中で GROUP BY して合計を出し、外側の SELECT の WHERE で 12000 以上に絞ります。',
    answer: 'WITH order_totals AS ('
      + ' SELECT o.id, o.customer_id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY o.id, o.customer_id, o.ordered_on'
      + ')'
      + ' SELECT id, customer_id, ordered_on, total FROM order_totals WHERE total >= 12000',
    explanation: 'WITH 句（CTE）は、副問い合わせに名前を付けて先に書いておく書き方です。「注文ごとの合計」という途中の表に名前が付くので、外側の SELECT が普通の表と同じように読めます。'
      + 'この問題は HAVING でも書けますが、途中の表を何度も使ったり、段階を重ねたりする次の問題から CTE の便利さが効いてきます。'
      + 'キャンセルされた 12000 円の注文（order 124）が混ざらないよう、status の条件は CTE の中で付けます。',
    alternatives: [
      'SELECT o.id, o.customer_id, o.ordered_on, SUM(oi.quantity * oi.unit_price)'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY o.id, o.customer_id, o.ordered_on HAVING SUM(oi.quantity * oi.unit_price) >= 12000',
    ],
    wrongAnswers: [
      // ちょうど 12000 円の注文が漏れる
      'WITH order_totals AS ('
        + ' SELECT o.id, o.customer_id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY o.id, o.customer_id, o.ordered_on'
        + ')'
        + ' SELECT id, customer_id, ordered_on, total FROM order_totals WHERE total > 12000',
      // キャンセル・返品の注文も含めてしまう
      'WITH order_totals AS ('
        + ' SELECT o.id, o.customer_id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' GROUP BY o.id, o.customer_id, o.ordered_on'
        + ')'
        + ' SELECT id, customer_id, ordered_on, total FROM order_totals WHERE total >= 12000',
      // 注文ごとに合計せず、明細1行の金額で絞ってしまう
      'SELECT o.id, o.customer_id, o.ordered_on, oi.quantity * oi.unit_price'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND oi.quantity * oi.unit_price >= 12000",
    ],
  },
  {
    id: 'A02',
    level: 'advanced',
    category: 'CTE（WITH句）',
    title: '平均より売れている商品（CTE を2回使う）',
    desc: '商品ごとの売上金額を求め、その売上金額が「売れた商品の売上金額の平均」より大きい商品を取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文だけで、金額は quantity * unit_price の合計です（送料は含めません）。'
      + '平均は、この条件で売上が1円以上ある商品だけの平均です（一度も売れていない商品を 0 円として平均に入れません）。平均とちょうど同じ商品は含めません。'
      + '列は 商品ID（products.id）, name, 売上金額 の順です。並び順は問いません。',
    hint: '商品ごとの売上を CTE にしておけば、外側の SELECT で「その CTE の行」と「その CTE から計算した平均（SELECT AVG(...) FROM CTE名）」の両方に使えます。',
    answer: 'WITH product_sales AS ('
      + ' SELECT oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales'
      + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY oi.product_id'
      + ')'
      + ' SELECT p.id, p.name, ps.sales'
      + ' FROM product_sales ps JOIN products p ON p.id = ps.product_id'
      + ' WHERE ps.sales > (SELECT AVG(sales) FROM product_sales)',
    explanation: '同じ集計を「行として使う」ところと「平均を出す」ところの2か所で使うので、CTE にしておくと集計を1回書くだけで済みます。'
      + '副問い合わせで書くと同じ GROUP BY を2回書くことになり、条件を直すときに片方だけ直し忘れる原因になります。'
      + '明細1行ごとの平均（AVG(quantity * unit_price)）と比べると、「商品ごとの売上の平均」とは別の値になるので結果が変わります。',
    alternatives: [
      'SELECT p.id, p.name, SUM(oi.quantity * oi.unit_price)'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.id, p.name'
        + ' HAVING SUM(oi.quantity * oi.unit_price) > ('
        + '  SELECT AVG(s) FROM (SELECT SUM(oi2.quantity * oi2.unit_price) AS s'
        + '  FROM order_items oi2 JOIN orders o2 ON o2.id = oi2.order_id'
        + "  WHERE o2.status IN ('delivered', 'shipped') GROUP BY oi2.product_id))",
    ],
    wrongAnswers: [
      // 明細1行ごとの金額の平均と比べてしまう
      'WITH product_sales AS ('
        + ' SELECT oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY oi.product_id'
        + ')'
        + ' SELECT p.id, p.name, ps.sales'
        + ' FROM product_sales ps JOIN products p ON p.id = ps.product_id'
        + ' WHERE ps.sales > (SELECT AVG(quantity * unit_price) FROM order_items)',
      // キャンセル・返品の注文も売上に入れてしまう
      'WITH product_sales AS ('
        + ' SELECT oi.product_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM order_items oi'
        + ' GROUP BY oi.product_id'
        + ')'
        + ' SELECT p.id, p.name, ps.sales'
        + ' FROM product_sales ps JOIN products p ON p.id = ps.product_id'
        + ' WHERE ps.sales > (SELECT AVG(sales) FROM product_sales)',
    ],
  },
  {
    id: 'A03',
    level: 'advanced',
    category: 'CTE（WITH句）',
    title: '売上とレビューを別々に集計してから結合する',
    desc: '食器の商品（category_id が 10 または 11 の商品）について、売上金額・レビュー件数・平均評価を1行ずつ取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文だけで、金額は quantity * unit_price の合計です（送料は含めません）。'
      + 'レビューは reviews テーブルの全件を使い、平均評価は rating の平均を小数第2位に ROUND します。'
      + '売上がない商品は売上金額 0、レビューがない商品はレビュー件数 0・平均評価 NULL とします。'
      + '列は 商品ID（products.id）, name, 売上金額, レビュー件数, 平均評価 の順です。並び順は問いません。',
    hint: 'order_items と reviews を一度に JOIN すると、「明細の行数 × レビューの行数」に行が増えてしまいます。'
      + '「商品ごとの売上」と「商品ごとのレビュー」をそれぞれ CTE で集計して1商品1行にしてから、products に LEFT JOIN しましょう。'
      + 'WITH a AS (...), b AS (...) のように、CTE はカンマで区切って複数書けます。',
    answer: 'WITH sales AS ('
      + ' SELECT oi.product_id, SUM(oi.quantity * oi.unit_price) AS amount'
      + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY oi.product_id'
      + '), review_stats AS ('
      + ' SELECT product_id, COUNT(*) AS cnt, ROUND(AVG(rating), 2) AS avg_rating'
      + ' FROM reviews GROUP BY product_id'
      + ')'
      + ' SELECT p.id, p.name, COALESCE(s.amount, 0), COALESCE(r.cnt, 0), r.avg_rating'
      + ' FROM products p'
      + ' LEFT JOIN sales s ON s.product_id = p.id'
      + ' LEFT JOIN review_stats r ON r.product_id = p.id'
      + ' WHERE p.category_id IN (10, 11)',
    explanation: '1つの商品に明細が5行、レビューが4件あると、両方を直接 JOIN した時点で 5 × 4 = 20 行になり、SUM の売上は4倍、COUNT のレビュー件数は5倍にふくらみます。'
      + '先に CTE で「1商品1行」に集計してから結合すれば、行が増えることはありません。'
      + 'COUNT(DISTINCT r.id) でレビュー件数だけ直しても、売上の SUM はふくらんだままなので正しくなりません。',
    wrongAnswers: [
      // 明細とレビューを直接 JOIN して集計する（行が掛け算で増える）
      'SELECT p.id, p.name, SUM(oi.quantity * oi.unit_price), COUNT(r.id), ROUND(AVG(r.rating), 2)'
        + ' FROM products p'
        + ' JOIN order_items oi ON oi.product_id = p.id'
        + " JOIN orders o ON o.id = oi.order_id AND o.status IN ('delivered', 'shipped')"
        + ' LEFT JOIN reviews r ON r.product_id = p.id'
        + ' WHERE p.category_id IN (10, 11)'
        + ' GROUP BY p.id, p.name',
      // レビュー件数だけ DISTINCT で直しても、売上はふくらんだまま
      'SELECT p.id, p.name, SUM(oi.quantity * oi.unit_price), COUNT(DISTINCT r.id), ROUND(AVG(r.rating), 2)'
        + ' FROM products p'
        + ' JOIN order_items oi ON oi.product_id = p.id'
        + " JOIN orders o ON o.id = oi.order_id AND o.status IN ('delivered', 'shipped')"
        + ' LEFT JOIN reviews r ON r.product_id = p.id'
        + ' WHERE p.category_id IN (10, 11)'
        + ' GROUP BY p.id, p.name',
    ],
  },
  {
    id: 'A04',
    level: 'advanced',
    category: 'CTE（WITH句）',
    title: 'CTE をつないで会員を区分ごとに集計する',
    desc: '会員ごとの購入金額を求めて区分に分け、区分ごとの人数と購入金額の合計を取り出してください。'
      + '購入金額は status が \'delivered\' または \'shipped\' の注文の quantity * unit_price の合計です（送料は含めません）。'
      + '対象は customers テーブルに登録されていて、この条件の注文が1件以上ある会員だけです（customers にいない顧客ID の注文は含めません）。'
      + '区分は、購入金額が 50000 円以上なら \'A\'、20000 円以上なら \'B\'、それ未満なら \'C\' です（ちょうど 50000 円は \'A\'、ちょうど 20000 円は \'B\'）。'
      + '列は 区分, 人数, 購入金額の合計 の順で、区分の A, B, C の順に並べます。',
    hint: 'CTE は前に書いた CTE を参照できます。1つ目の CTE で会員ごとの購入金額、2つ目の CTE で CASE を使って区分を付け、最後の SELECT で区分ごとに GROUP BY します。',
    answer: 'WITH customer_sales AS ('
      + ' SELECT c.id, SUM(oi.quantity * oi.unit_price) AS amount'
      + ' FROM customers c'
      + ' JOIN orders o ON o.customer_id = c.id'
      + ' JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY c.id'
      + '), classified AS ('
      + " SELECT id, amount, CASE WHEN amount >= 50000 THEN 'A' WHEN amount >= 20000 THEN 'B' ELSE 'C' END AS grade"
      + ' FROM customer_sales'
      + ')'
      + ' SELECT grade, COUNT(*), SUM(amount) FROM classified GROUP BY grade ORDER BY grade',
    ordered: true,
    explanation: 'CTE をカンマでつなぐと、「会員ごとの金額 → 区分を付ける → 区分ごとに集計」のように処理を段階に分けて書けます。'
      + '1つの SELECT にまとめると GROUP BY を2段重ねた副問い合わせになり、読みにくくなります。'
      + 'customers と結合しないと、存在しない顧客ID 51 の注文（order 69）が1人分として数えられます。',
    wrongAnswers: [
      // customers と結合せず、存在しない顧客ID 51 の注文まで数えてしまう
      'WITH customer_sales AS ('
        + ' SELECT o.customer_id AS id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY o.customer_id'
        + '), classified AS ('
        + " SELECT id, amount, CASE WHEN amount >= 50000 THEN 'A' WHEN amount >= 20000 THEN 'B' ELSE 'C' END AS grade"
        + ' FROM customer_sales'
        + ')'
        + ' SELECT grade, COUNT(*), SUM(amount) FROM classified GROUP BY grade ORDER BY grade',
      // キャンセル・返品の注文も購入金額に入れてしまう
      'WITH customer_sales AS ('
        + ' SELECT c.id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM customers c'
        + ' JOIN orders o ON o.customer_id = c.id'
        + ' JOIN order_items oi ON oi.order_id = o.id'
        + ' GROUP BY c.id'
        + '), classified AS ('
        + " SELECT id, amount, CASE WHEN amount >= 50000 THEN 'A' WHEN amount >= 20000 THEN 'B' ELSE 'C' END AS grade"
        + ' FROM customer_sales'
        + ')'
        + ' SELECT grade, COUNT(*), SUM(amount) FROM classified GROUP BY grade ORDER BY grade',
    ],
  },

  // ==================================================================
  // 順位系ウィンドウ関数（4問）
  // ==================================================================
  {
    id: 'A05',
    level: 'advanced',
    category: '順位系ウィンドウ関数',
    title: 'ROW_NUMBER で通し番号を振る',
    desc: '文房具の商品に、価格の安い順の通し番号を振ります。'
      + 'products テーブル（商品）から、文房具の商品（category_id が 8 または 9 の商品）を取り出し、価格の安い順に 1 から始まる通し番号を付けてください。'
      + '同じ価格の商品は id の小さい方を先にし、番号は重ならないように 1, 2, 3, … と振ります。'
      + '列は 通し番号, id, name, price の順で、通し番号の順に並べます。',
    hint: 'ROW_NUMBER() OVER (ORDER BY 列) は、OVER の中の順番で 1, 2, 3, … と番号を振ります。行を減らさずに、各行に値を付け足すのがウィンドウ関数です。',
    answer: 'SELECT ROW_NUMBER() OVER (ORDER BY price, id) AS rn, id, name, price'
      + ' FROM products WHERE category_id IN (8, 9) ORDER BY rn',
    ordered: true,
    explanation: 'ROW_NUMBER は同じ値があっても必ず別の番号を振るので、OVER (ORDER BY price, id) のように同値の並べ方まで決めておかないと、どちらが先になるかが実行のたびに変わりえます。'
      + 'RANK にすると、150 円のボールペン2本がどちらも 1 になり、次が 3 になります。'
      + 'GROUP BY と違い、ウィンドウ関数は行をまとめずに各行へ値を付け足します。',
    alternatives: [
      'SELECT ROW_NUMBER() OVER (ORDER BY price, id), id, name, price'
        + ' FROM products WHERE category_id IN (8, 9) ORDER BY price, id',
    ],
    wrongAnswers: [
      // RANK だと同じ価格が同じ番号になる
      'SELECT RANK() OVER (ORDER BY price) AS rn, id, name, price'
        + ' FROM products WHERE category_id IN (8, 9) ORDER BY rn, id',
      // 高い順に振ってしまう
      'SELECT ROW_NUMBER() OVER (ORDER BY price DESC, id) AS rn, id, name, price'
        + ' FROM products WHERE category_id IN (8, 9) ORDER BY rn',
    ],
  },
  {
    id: 'A06',
    level: 'advanced',
    category: '順位系ウィンドウ関数',
    title: 'RANK と DENSE_RANK の違い',
    desc: '会員ごとの注文件数を数え、件数の多い順の順位を RANK と DENSE_RANK の両方で付けてください。'
      + '注文件数は status が \'delivered\' または \'shipped\' の注文だけを数え、customers テーブルに登録されている会員だけを対象にします。'
      + '取り出すのは、DENSE_RANK の順位が 5 以内の会員です（5位の会員が複数いれば全員）。'
      + '列は 会員ID（customers.id）, name, 注文件数, RANK の順位, DENSE_RANK の順位 の順で、注文件数の多い順、同じ件数なら会員ID の小さい順に並べます。',
    hint: 'RANK は同じ値に同じ順位を付け、その人数分だけ次の順位を飛ばします（1, 2, 2, 4）。DENSE_RANK は飛ばしません（1, 2, 2, 3）。'
      + 'ウィンドウ関数の結果は同じ SELECT の WHERE では使えないので、CTE（または FROM 句の副問い合わせ）で順位を付けてから外側で絞り込みます。',
    answer: 'WITH order_counts AS ('
      + ' SELECT c.id, c.name, COUNT(*) AS cnt'
      + ' FROM customers c JOIN orders o ON o.customer_id = c.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY c.id, c.name'
      + '), ranked AS ('
      + ' SELECT id, name, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk, DENSE_RANK() OVER (ORDER BY cnt DESC) AS drnk'
      + ' FROM order_counts'
      + ')'
      + ' SELECT id, name, cnt, rnk, drnk FROM ranked WHERE drnk <= 5 ORDER BY cnt DESC, id',
    ordered: true,
    explanation: '2位が2人いると、RANK では次が 4位、DENSE_RANK では次が 3位になります。「上位5位まで」という同じ言葉でも、RANK で絞るか DENSE_RANK で絞るかで出てくる人数が変わります。'
      + 'WHERE はウィンドウ関数より先に処理されるため、WHERE DENSE_RANK() OVER (...) <= 5 とは書けず、CTE で順位を付けてから外側で絞ります。'
      + 'キャンセルを含めて数えると件数が変わる会員がいるので、status の条件も忘れないようにします。',
    wrongAnswers: [
      // RANK で絞ってしまう（人数が減る）
      'WITH order_counts AS ('
        + ' SELECT c.id, c.name, COUNT(*) AS cnt'
        + ' FROM customers c JOIN orders o ON o.customer_id = c.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY c.id, c.name'
        + '), ranked AS ('
        + ' SELECT id, name, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk, DENSE_RANK() OVER (ORDER BY cnt DESC) AS drnk'
        + ' FROM order_counts'
        + ')'
        + ' SELECT id, name, cnt, rnk, drnk FROM ranked WHERE rnk <= 5 ORDER BY cnt DESC, id',
      // キャンセル・返品の注文も数えてしまう
      'WITH order_counts AS ('
        + ' SELECT c.id, c.name, COUNT(*) AS cnt'
        + ' FROM customers c JOIN orders o ON o.customer_id = c.id'
        + ' GROUP BY c.id, c.name'
        + '), ranked AS ('
        + ' SELECT id, name, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk, DENSE_RANK() OVER (ORDER BY cnt DESC) AS drnk'
        + ' FROM order_counts'
        + ')'
        + ' SELECT id, name, cnt, rnk, drnk FROM ranked WHERE drnk <= 5 ORDER BY cnt DESC, id',
      // RANK と DENSE_RANK の列を逆にしてしまう
      'WITH order_counts AS ('
        + ' SELECT c.id, c.name, COUNT(*) AS cnt'
        + ' FROM customers c JOIN orders o ON o.customer_id = c.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY c.id, c.name'
        + '), ranked AS ('
        + ' SELECT id, name, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk, DENSE_RANK() OVER (ORDER BY cnt DESC) AS drnk'
        + ' FROM order_counts'
        + ')'
        + ' SELECT id, name, cnt, drnk, rnk FROM ranked WHERE drnk <= 5 ORDER BY cnt DESC, id',
    ],
  },
  {
    id: 'A07',
    level: 'advanced',
    category: '順位系ウィンドウ関数',
    title: '部署ごとの給与順位（PARTITION BY）',
    desc: '部署ごとに、社員の給与の順位を付けます。'
      + 'employees テーブル（社員）と departments テーブル（部署）から、在籍中（left_on が NULL）で部署に所属している（department_id が NULL でない）社員について、'
      + '部署の中での給与の高い順の順位を RANK で付けてください。順位は部署ごとに 1 から数え直します。'
      + '列は 部署名（departments.name）, 社員ID（employees.id）, 社員名（employees.name）, salary, 部署内の順位 の順で、'
      + '部署ID の小さい順、同じ部署の中では給与の高い順に並べます（同じ部署の中に同じ給与の社員はいません）。',
    hint: 'OVER (PARTITION BY 列 ORDER BY 列) と書くと、PARTITION BY の値ごとにグループを分けて、その中で順位を付けます。GROUP BY と違い、行はまとまりません。',
    answer: 'SELECT d.name, e.id, e.name, e.salary,'
      + ' RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS dept_rank'
      + ' FROM employees e JOIN departments d ON d.id = e.department_id'
      + ' WHERE e.left_on IS NULL'
      + ' ORDER BY e.department_id, e.salary DESC',
    ordered: true,
    explanation: 'PARTITION BY department_id を付けると、部署ごとに区切ってから順位を付けるので、どの部署にも 1位がいます。'
      + 'PARTITION BY を忘れると対象の社員全体を通した順位になり、1位は給与の最も高い部長1人だけになります。'
      + 'WHERE はウィンドウ関数より先に処理されるので、退職者は順位の計算に入りません。',
    alternatives: [
      'SELECT d.name, e.id, e.name, e.salary,'
        + ' ROW_NUMBER() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC)'
        + ' FROM employees e JOIN departments d ON d.id = e.department_id'
        + ' WHERE e.left_on IS NULL'
        + ' ORDER BY e.department_id, e.salary DESC',
    ],
    wrongAnswers: [
      // PARTITION BY がなく、全社での順位になる
      'SELECT d.name, e.id, e.name, e.salary,'
        + ' RANK() OVER (ORDER BY e.salary DESC) AS dept_rank'
        + ' FROM employees e JOIN departments d ON d.id = e.department_id'
        + ' WHERE e.left_on IS NULL'
        + ' ORDER BY e.department_id, e.salary DESC',
      // 給与の低い順に順位を付けてしまう
      'SELECT d.name, e.id, e.name, e.salary,'
        + ' RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary) AS dept_rank'
        + ' FROM employees e JOIN departments d ON d.id = e.department_id'
        + ' WHERE e.left_on IS NULL'
        + ' ORDER BY e.department_id, e.salary DESC',
    ],
  },
  {
    id: 'A08',
    level: 'advanced',
    category: '順位系ウィンドウ関数',
    title: 'NTILE で会員を4つのグループに分ける',
    desc: '会員を購入金額の多い順に並べて NTILE で4つのグループ（1〜4）に分け、グループごとの人数・最小の購入金額・最大の購入金額を取り出してください。'
      + '購入金額は status が \'delivered\' または \'shipped\' の注文の quantity * unit_price の合計です（送料は含めません）。'
      + '対象は customers テーブルに登録されていて、この条件の注文が1件以上ある会員だけです。'
      + '購入金額の多い会員がグループ 1 になり、同じ購入金額の会員は会員ID の小さい方を先に並べてから分けます。'
      + '列は グループ番号, 人数, 最小の購入金額, 最大の購入金額 の順で、グループ番号の順に並べます。',
    hint: 'NTILE(4) OVER (ORDER BY ...) は、並べた行をできるだけ同じ人数の4グループに分けます。割り切れないときは、前のグループが1人ずつ多くなります。'
      + 'CTE で会員ごとの購入金額 → グループ番号を付ける → GROUP BY でグループごとに集計、の順に組み立てます。',
    answer: 'WITH customer_sales AS ('
      + ' SELECT c.id, SUM(oi.quantity * oi.unit_price) AS amount'
      + ' FROM customers c'
      + ' JOIN orders o ON o.customer_id = c.id'
      + ' JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY c.id'
      + '), tiles AS ('
      + ' SELECT id, amount, NTILE(4) OVER (ORDER BY amount DESC, id) AS grp FROM customer_sales'
      + ')'
      + ' SELECT grp, COUNT(*), MIN(amount), MAX(amount) FROM tiles GROUP BY grp ORDER BY grp',
    ordered: true,
    explanation: 'NTILE(n) は順番に並べた行を n 個のグループに等分します。人数が割り切れないときは前のグループから1人ずつ多くなるので、人数の列で確かめられます。'
      + 'グループの境目に同じ金額の会員がいると、どちらが前のグループに入るかが決まらないため、OVER の ORDER BY に会員ID も加えます。'
      + 'customers と結合しないと、存在しない顧客ID 51 が1人として入り、人数の配分が変わります。',
    wrongAnswers: [
      // 少ない順に分けてしまう（グループ 1 が購入金額の少ない会員になる）
      'WITH customer_sales AS ('
        + ' SELECT c.id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM customers c'
        + ' JOIN orders o ON o.customer_id = c.id'
        + ' JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY c.id'
        + '), tiles AS ('
        + ' SELECT id, amount, NTILE(4) OVER (ORDER BY amount, id) AS grp FROM customer_sales'
        + ')'
        + ' SELECT grp, COUNT(*), MIN(amount), MAX(amount) FROM tiles GROUP BY grp ORDER BY grp',
      // customers と結合せず、存在しない顧客ID 51 まで入れてしまう
      'WITH customer_sales AS ('
        + ' SELECT o.customer_id AS id, SUM(oi.quantity * oi.unit_price) AS amount'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY o.customer_id'
        + '), tiles AS ('
        + ' SELECT id, amount, NTILE(4) OVER (ORDER BY amount DESC, id) AS grp FROM customer_sales'
        + ')'
        + ' SELECT grp, COUNT(*), MIN(amount), MAX(amount) FROM tiles GROUP BY grp ORDER BY grp',
    ],
  },

  // ==================================================================
  // 集計ウィンドウ（4問）
  // ==================================================================
  {
    id: 'A09',
    level: 'advanced',
    category: '集計ウィンドウ関数',
    title: '月別売上の累計',
    desc: '2025年の月ごとの売上金額と、1月からその月までの売上の累計を取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文だけで、金額は quantity * unit_price の合計です（送料は含めません）。'
      + 'customers テーブルとは結合せず、orders にある注文をすべて対象にします。'
      + '月は ordered_on から作った \'2025-01\' の形の文字列で表します。注文が1件もない月（8月）の行は出しません（8月も含める方法は A13 で扱います）。'
      + '列は 月, 売上金額, 累計 の順で、月の順に並べます。',
    hint: 'SUM(列) OVER (ORDER BY 列) は、並び順の先頭からその行までの合計（累計）になります。'
      + 'まず CTE で月ごとの売上を作り、その結果に対してウィンドウ関数を使います。月は strftime(\'%Y-%m\', ordered_on) で作れます。',
    answer: 'WITH monthly AS ('
      + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY ym'
      + ')'
      + ' SELECT ym, sales, SUM(sales) OVER (ORDER BY ym) AS running_total FROM monthly ORDER BY ym',
    ordered: true,
    explanation: 'SUM に OVER (ORDER BY ym) を付けると、集計の範囲が「先頭の月から今の行の月まで」になり、累計が求まります。'
      + 'OVER () のように ORDER BY を書かないと範囲が全行になり、どの行にも年間の合計が並びます。'
      + '12月の累計が年間の売上合計と一致することで、計算が合っているか確かめられます。',
    wrongAnswers: [
      // OVER () で全体の合計になる
      'WITH monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY ym'
        + ')'
        + ' SELECT ym, sales, SUM(sales) OVER () AS running_total FROM monthly ORDER BY ym',
      // キャンセル・返品も売上に入れてしまう
      'WITH monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + ' GROUP BY ym'
        + ')'
        + ' SELECT ym, sales, SUM(sales) OVER (ORDER BY ym) AS running_total FROM monthly ORDER BY ym',
      // customers と結合して、存在しない顧客の注文（order 69）を落としてしまう
      'WITH monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY ym'
        + ')'
        + ' SELECT ym, sales, SUM(sales) OVER (ORDER BY ym) AS running_total FROM monthly ORDER BY ym',
    ],
  },
  {
    id: 'A10',
    level: 'advanced',
    category: '集計ウィンドウ関数',
    title: 'カテゴリ別売上の構成比',
    desc: '商品のカテゴリ（products.category_id）ごとの売上金額と、全体の売上に対する構成比（%）を取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文だけで、金額は quantity * unit_price の合計です（送料は含めません）。'
      + 'カテゴリは商品に直接付いている category_id で分け、親カテゴリへのまとめ直しはしません。売上のないカテゴリは出しません。'
      + '構成比は「カテゴリの売上 ÷ 全カテゴリの売上合計 × 100」を小数第1位に ROUND した値です（整数の割り算で切り捨てにならないよう注意）。'
      + '列は category_id, カテゴリ名（categories.name）, 売上金額, 構成比 の順です。並び順は問いません。',
    hint: 'SUM(列) OVER () は、行をまとめずに「全行の合計」を各行に付けます。カテゴリ別に集計した CTE に対して使えば、分母の全体合計が求まります。'
      + 'SQLite では整数どうしの割り算は小数点以下が切り捨てられるので、100.0 のように小数を掛けてから割ります。',
    answer: 'WITH category_sales AS ('
      + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS sales'
      + ' FROM order_items oi'
      + ' JOIN orders o ON o.id = oi.order_id'
      + ' JOIN products p ON p.id = oi.product_id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY p.category_id'
      + ')'
      + ' SELECT cs.category_id, c.name, cs.sales, ROUND(100.0 * cs.sales / SUM(cs.sales) OVER (), 1) AS share'
      + ' FROM category_sales cs JOIN categories c ON c.id = cs.category_id',
    explanation: 'SUM(sales) OVER () は全行が1つの範囲なので、どの行にも「全カテゴリの売上合計」が入ります。GROUP BY の結果に全体の値を並べたいときの定番の書き方です。'
      + '100 * sales / SUM(...) のように整数だけで計算すると、SQLite では小数点以下が切り捨てられた整数になります。'
      + '構成比をすべて足すと、丸めの誤差を除いておよそ 100 になります。',
    alternatives: [
      'WITH category_sales AS ('
        + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM order_items oi'
        + ' JOIN orders o ON o.id = oi.order_id'
        + ' JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id'
        + ')'
        + ' SELECT cs.category_id, c.name, cs.sales, ROUND(cs.sales * 100.0 / (SELECT SUM(sales) FROM category_sales), 1)'
        + ' FROM category_sales cs JOIN categories c ON c.id = cs.category_id',
    ],
    wrongAnswers: [
      // 整数の割り算で切り捨てになる
      'WITH category_sales AS ('
        + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM order_items oi'
        + ' JOIN orders o ON o.id = oi.order_id'
        + ' JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id'
        + ')'
        + ' SELECT cs.category_id, c.name, cs.sales, ROUND(100 * cs.sales / SUM(cs.sales) OVER (), 1) AS share'
        + ' FROM category_sales cs JOIN categories c ON c.id = cs.category_id',
      // 分母をキャンセル・返品も含めた合計にしてしまう
      'WITH category_sales AS ('
        + ' SELECT p.category_id, SUM(oi.quantity * oi.unit_price) AS sales'
        + ' FROM order_items oi'
        + ' JOIN orders o ON o.id = oi.order_id'
        + ' JOIN products p ON p.id = oi.product_id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY p.category_id'
        + ')'
        + ' SELECT cs.category_id, c.name, cs.sales, ROUND(100.0 * cs.sales / (SELECT SUM(quantity * unit_price) FROM order_items), 1) AS share'
        + ' FROM category_sales cs JOIN categories c ON c.id = cs.category_id',
    ],
  },
  {
    id: 'A11',
    level: 'advanced',
    category: '集計ウィンドウ関数',
    title: '会員ごとの購入額の累計（同じ日の注文に注意）',
    desc: '会員ID が 2 と 3 の会員について、注文ごとの金額と、その会員の購入額の累計を取り出してください。'
      + '対象は status が \'delivered\' または \'shipped\' の注文だけで、注文の金額は明細の quantity * unit_price の合計です（送料は含めません）。'
      + '累計は会員ごとに 0 から数え直し、注文日の古い順に足していきます。同じ日に複数の注文があるときは注文ID の小さい方を先に足し、1注文ずつ累計を増やします。'
      + '列は customer_id, 注文ID（orders.id）, ordered_on, 注文の金額, 累計 の順で、customer_id の小さい順、同じ会員の中では注文日の古い順、同じ日なら注文ID の小さい順に並べます。',
    hint: 'OVER (PARTITION BY 会員 ORDER BY 注文日, 注文ID) で、会員ごとに区切った累計になります。'
      + 'ORDER BY を注文日だけにすると、同じ日の注文は「同順位の仲間」として一度に足されるので、2つの注文に同じ累計が付いてしまいます。',
    answer: 'WITH order_totals AS ('
      + ' SELECT o.customer_id, o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id IN (2, 3)"
      + ' GROUP BY o.customer_id, o.id, o.ordered_on'
      + ')'
      + ' SELECT customer_id, id, ordered_on, total,'
      + ' SUM(total) OVER (PARTITION BY customer_id ORDER BY ordered_on, id) AS running_total'
      + ' FROM order_totals ORDER BY customer_id, ordered_on, id',
    ordered: true,
    explanation: 'ウィンドウに ORDER BY を書いたときの既定の範囲は「先頭から、今の行と ORDER BY の値が同じ行（ピア）まで」（RANGE）です。'
      + '会員3 は 2025-03-15 に2件（order 35 と 36）注文しているので、ORDER BY ordered_on だけだと2件とも「2件分を足した後の累計」になります。'
      + 'ORDER BY に注文ID を加えて行の順番を一意にするか、ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW で1行ずつ足すように指定します。',
    alternatives: [
      'WITH order_totals AS ('
        + ' SELECT o.customer_id, o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id IN (2, 3)"
        + ' GROUP BY o.customer_id, o.id, o.ordered_on'
        + ')'
        + ' SELECT customer_id, id, ordered_on, total,'
        + ' SUM(total) OVER (PARTITION BY customer_id ORDER BY ordered_on, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)'
        + ' FROM order_totals ORDER BY customer_id, ordered_on, id',
    ],
    wrongAnswers: [
      // 注文日だけで並べ、同じ日の2件に同じ累計が付く
      'WITH order_totals AS ('
        + ' SELECT o.customer_id, o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id IN (2, 3)"
        + ' GROUP BY o.customer_id, o.id, o.ordered_on'
        + ')'
        + ' SELECT customer_id, id, ordered_on, total,'
        + ' SUM(total) OVER (PARTITION BY customer_id ORDER BY ordered_on) AS running_total'
        + ' FROM order_totals ORDER BY customer_id, ordered_on, id',
      // PARTITION BY がなく、2人分を通して足してしまう
      'WITH order_totals AS ('
        + ' SELECT o.customer_id, o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id IN (2, 3)"
        + ' GROUP BY o.customer_id, o.id, o.ordered_on'
        + ')'
        + ' SELECT customer_id, id, ordered_on, total,'
        + ' SUM(total) OVER (ORDER BY customer_id, ordered_on, id) AS running_total'
        + ' FROM order_totals ORDER BY customer_id, ordered_on, id',
    ],
  },
  {
    id: 'A12',
    level: 'advanced',
    category: '集計ウィンドウ関数',
    title: '直近3回の注文金額の移動平均（フレーム指定）',
    desc: '会員ID が 1 の会員の注文について、注文の金額と、「その注文を含む直近3回の注文」の金額の平均（移動平均）を取り出してください。'
      + '対象は status が \'delivered\' または \'shipped\' の注文だけで、注文の金額は明細の quantity * unit_price の合計です（送料は含めません）。'
      + '直近3回は、注文日の古い順に並べたときの「今の注文と、その直前の2回」です。最初の注文は1回分、2回目の注文は2回分の平均になります。'
      + '移動平均は小数点以下を四捨五入して ROUND(値) で整数の桁にします。'
      + '列は 注文ID（orders.id）, ordered_on, 注文の金額, 移動平均 の順で、注文日の古い順に並べます（この会員に同じ日の注文はありません）。',
    hint: 'ウィンドウ関数では、OVER の中に ROWS BETWEEN 2 PRECEDING AND CURRENT ROW と書くと、集計の範囲を「2行前から今の行まで」に限定できます（フレーム指定）。',
    answer: 'WITH order_totals AS ('
      + ' SELECT o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id = 1"
      + ' GROUP BY o.id, o.ordered_on'
      + ')'
      + ' SELECT id, ordered_on, total,'
      + ' ROUND(AVG(total) OVER (ORDER BY ordered_on, id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS moving_avg'
      + ' FROM order_totals ORDER BY ordered_on, id',
    ordered: true,
    explanation: 'フレーム指定 ROWS BETWEEN 2 PRECEDING AND CURRENT ROW は「2行前・1行前・今の行」の3行だけを集計の範囲にします。先頭の2行は前の行が足りないので、ある行だけで平均します。'
      + 'フレームを書かないと範囲は「先頭から今の行まで」になり、移動平均ではなく累積の平均になります。'
      + '3 PRECEDING にすると4回分の平均になるので、「直近 n 回」は n - 1 PRECEDING と書く点に注意します。',
    wrongAnswers: [
      // フレームを指定せず、累積の平均になる
      'WITH order_totals AS ('
        + ' SELECT o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id = 1"
        + ' GROUP BY o.id, o.ordered_on'
        + ')'
        + ' SELECT id, ordered_on, total,'
        + ' ROUND(AVG(total) OVER (ORDER BY ordered_on, id)) AS moving_avg'
        + ' FROM order_totals ORDER BY ordered_on, id',
      // 3 PRECEDING で4回分の平均になる
      'WITH order_totals AS ('
        + ' SELECT o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id = 1"
        + ' GROUP BY o.id, o.ordered_on'
        + ')'
        + ' SELECT id, ordered_on, total,'
        + ' ROUND(AVG(total) OVER (ORDER BY ordered_on, id ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)) AS moving_avg'
        + ' FROM order_totals ORDER BY ordered_on, id',
      // 前後1回ずつ（今の注文を中心にした3回）にしてしまう
      'WITH order_totals AS ('
        + ' SELECT o.id, o.ordered_on, SUM(oi.quantity * oi.unit_price) AS total'
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped') AND o.customer_id = 1"
        + ' GROUP BY o.id, o.ordered_on'
        + ')'
        + ' SELECT id, ordered_on, total,'
        + ' ROUND(AVG(total) OVER (ORDER BY ordered_on, id ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)) AS moving_avg'
        + ' FROM order_totals ORDER BY ordered_on, id',
    ],
  },

  // ==================================================================
  // LAG / LEAD（3問）
  // ==================================================================
  {
    id: 'A13',
    level: 'advanced',
    category: 'LAG・LEAD',
    title: '前月との売上の差（売上0の月も含める）',
    desc: '2025年1月〜12月の各月について、売上金額・前月の売上金額・前月との差（その月 − 前月）を取り出してください。'
      + '売上は status が \'delivered\' または \'shipped\' の注文だけで、金額は quantity * unit_price の合計です（送料は含めません）。customers テーブルとは結合しません。'
      + '注文が1件もない月（8月）も売上 0 の行として必ず含め、12行にします。そのため 9月の「前月」は 8月（0円）です。'
      + '1月は前月のデータがないので、前月の売上金額と前月との差は NULL にします。'
      + '月は \'2025-01\' の形の文字列で表します。列は 月, 売上金額, 前月の売上金額, 前月との差 の順で、月の順に並べます。',
    hint: 'LAG(列) OVER (ORDER BY 列) で、1行前の値を取り出せます。'
      + '注文のない月は集計しても行が出てこないので、WITH months(ym) AS (VALUES (\'2025-01\'), (\'2025-02\'), …) のように12か月の一覧を作り、月別の売上を LEFT JOIN して COALESCE で 0 にします。',
    answer: 'WITH months(ym) AS ('
      + " VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04'), ('2025-05'), ('2025-06'),"
      + " ('2025-07'), ('2025-08'), ('2025-09'), ('2025-10'), ('2025-11'), ('2025-12')"
      + '), monthly AS ('
      + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
      + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
      + " WHERE o.status IN ('delivered', 'shipped')"
      + ' GROUP BY ym'
      + '), filled AS ('
      + ' SELECT m.ym, COALESCE(s.sales, 0) AS sales FROM months m LEFT JOIN monthly s ON s.ym = m.ym'
      + ')'
      + ' SELECT ym, sales, LAG(sales) OVER (ORDER BY ym) AS prev_sales,'
      + ' sales - LAG(sales) OVER (ORDER BY ym) AS diff'
      + ' FROM filled ORDER BY ym',
    ordered: true,
    explanation: 'LAG は「並び順で1つ前の行」の値を返すので、月が抜けているとその前の月が「前月」として扱われてしまいます。8月の行がないと、9月の比較相手が7月になります。'
      + '月の一覧を先に作って LEFT JOIN し、売上のない月を 0 で埋めてから LAG を使うのが確実です。'
      + 'LEAD を使うと「次の月」の値になり、比べる向きが逆になります。',
    wrongAnswers: [
      // 8月の行がなく、9月の前月が7月になる
      'WITH monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY ym'
        + ')'
        + ' SELECT ym, sales, LAG(sales) OVER (ORDER BY ym), sales - LAG(sales) OVER (ORDER BY ym)'
        + ' FROM monthly ORDER BY ym',
      // 8月を NULL のままにして、8月・9月の差が NULL になる
      'WITH months(ym) AS ('
        + " VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04'), ('2025-05'), ('2025-06'),"
        + " ('2025-07'), ('2025-08'), ('2025-09'), ('2025-10'), ('2025-11'), ('2025-12')"
        + '), monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY ym'
        + ')'
        + ' SELECT m.ym, s.sales, LAG(s.sales) OVER (ORDER BY m.ym), s.sales - LAG(s.sales) OVER (ORDER BY m.ym)'
        + ' FROM months m LEFT JOIN monthly s ON s.ym = m.ym ORDER BY m.ym',
      // LEAD を使って次の月と比べてしまう
      'WITH months(ym) AS ('
        + " VALUES ('2025-01'), ('2025-02'), ('2025-03'), ('2025-04'), ('2025-05'), ('2025-06'),"
        + " ('2025-07'), ('2025-08'), ('2025-09'), ('2025-10'), ('2025-11'), ('2025-12')"
        + '), monthly AS ('
        + " SELECT strftime('%Y-%m', o.ordered_on) AS ym, SUM(oi.quantity * oi.unit_price) AS sales"
        + ' FROM orders o JOIN order_items oi ON oi.order_id = o.id'
        + " WHERE o.status IN ('delivered', 'shipped')"
        + ' GROUP BY ym'
        + '), filled AS ('
        + ' SELECT m.ym, COALESCE(s.sales, 0) AS sales FROM months m LEFT JOIN monthly s ON s.ym = m.ym'
        + ')'
        + ' SELECT ym, sales, LEAD(sales) OVER (ORDER BY ym), sales - LEAD(sales) OVER (ORDER BY ym)'
        + ' FROM filled ORDER BY ym',
    ],
  },
  {
    id: 'A14',
    level: 'advanced',
    category: 'LAG・LEAD',
    title: '前回の注文からの日数',
    desc: '会員ID が 3 と 12 の会員の注文について、前回の注文日と、前回の注文から何日たったかを取り出してください。'
      + '対象は status が \'delivered\' または \'shipped\' の注文だけで、「前回」も同じ会員の、この条件の注文の中で数えます（キャンセル・返品の注文は前回に数えません）。'
      + '会員ごとに注文日の古い順に並べ、同じ日に2件あるときは注文ID の小さい方を先の注文とします（同じ日の2件目は 0 日になります）。'
      + '各会員の最初の注文は、前回の注文日と日数を NULL にします。日数は julianday の差を CAST(... AS INTEGER) で整数にします。'
      + '列は customer_id, 注文ID（orders.id）, ordered_on, 前回の注文日, 日数 の順で、customer_id の小さい順、同じ会員の中では注文日の古い順、同じ日なら注文ID の小さい順に並べます。',
    hint: 'LAG(ordered_on) OVER (PARTITION BY customer_id ORDER BY ordered_on, id) で、同じ会員の1つ前の注文日が取れます。'
      + '日付の差は julianday(後の日) - julianday(前の日) で日数になります。',
    answer: 'WITH valid AS ('
      + " SELECT id, customer_id, ordered_on FROM orders WHERE status IN ('delivered', 'shipped') AND customer_id IN (3, 12)"
      + '), with_prev AS ('
      + ' SELECT customer_id, id, ordered_on,'
      + ' LAG(ordered_on) OVER (PARTITION BY customer_id ORDER BY ordered_on, id) AS prev_on'
      + ' FROM valid'
      + ')'
      + ' SELECT customer_id, id, ordered_on, prev_on, CAST(julianday(ordered_on) - julianday(prev_on) AS INTEGER) AS days'
      + ' FROM with_prev ORDER BY customer_id, ordered_on, id',
    ordered: true,
    explanation: 'LAG に PARTITION BY customer_id を付けると、会員が変わったところで「前の行」がリセットされ、各会員の最初の注文は NULL になります。'
      + 'PARTITION BY を忘れると、会員12 の最初の注文に会員3 の最後の注文日が入ってしまいます。'
      + 'キャンセルの注文（会員3 の order 124、会員12 の order 60）を先に除いておかないと、「前回」がキャンセルした注文になります。',
    wrongAnswers: [
      // PARTITION BY がなく、別の会員の注文が「前回」になる
      'WITH valid AS ('
        + " SELECT id, customer_id, ordered_on FROM orders WHERE status IN ('delivered', 'shipped') AND customer_id IN (3, 12)"
        + '), with_prev AS ('
        + ' SELECT customer_id, id, ordered_on,'
        + ' LAG(ordered_on) OVER (ORDER BY customer_id, ordered_on, id) AS prev_on'
        + ' FROM valid'
        + ')'
        + ' SELECT customer_id, id, ordered_on, prev_on, CAST(julianday(ordered_on) - julianday(prev_on) AS INTEGER) AS days'
        + ' FROM with_prev ORDER BY customer_id, ordered_on, id',
      // キャンセル・返品も含めて「前回」を探してしまう
      'WITH with_prev AS ('
        + ' SELECT customer_id, id, ordered_on, status,'
        + ' LAG(ordered_on) OVER (PARTITION BY customer_id ORDER BY ordered_on, id) AS prev_on'
        + ' FROM orders WHERE customer_id IN (3, 12)'
        + ')'
        + ' SELECT customer_id, id, ordered_on, prev_on, CAST(julianday(ordered_on) - julianday(prev_on) AS INTEGER) AS days'
        + " FROM with_prev WHERE status IN ('delivered', 'shipped') ORDER BY customer_id, ordered_on, id",
    ],
  },
  {
    id: 'A15',
    level: 'advanced',
    category: 'LAG・LEAD',
    title: '値上げ前の最後の販売（LEAD）',
    desc: '商品の販売単価が変わる直前の販売を、次の行と比べて探します。'
      + 'order_items テーブル（注文明細）の販売単価（unit_price）の記録から、商品ごとに「次に売れたときの単価が今回と違う」明細を探し、価格が変わる直前の販売を取り出してください。'
      + 'status は問わず、すべての注文の明細を使います。同じ商品の明細を、注文日（orders.ordered_on）の古い順、同じ日なら注文ID の小さい順に並べたとき、次の明細の unit_price が今の明細と違う行が対象です。'
      + '商品の現在の定価（products.price）とは比べません。'
      + '列は 商品ID（product_id）, 商品名（products.name）, 注文ID（order_id）, ordered_on, unit_price, 次の明細の unit_price の順です。並び順は問いません。',
    hint: 'LEAD(列) OVER (PARTITION BY 商品 ORDER BY 注文日, 注文ID) で、同じ商品の「次の明細」の値が取れます。'
      + 'ウィンドウ関数の結果は WHERE で直接使えないので、CTE で LEAD の列を作ってから外側で「今の単価 <> 次の単価」に絞ります。',
    answer: 'WITH sales AS ('
      + ' SELECT oi.product_id, oi.order_id, o.ordered_on, oi.unit_price,'
      + ' LEAD(oi.unit_price) OVER (PARTITION BY oi.product_id ORDER BY o.ordered_on, o.id) AS next_price'
      + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
      + ')'
      + ' SELECT s.product_id, p.name, s.order_id, s.ordered_on, s.unit_price, s.next_price'
      + ' FROM sales s JOIN products p ON p.id = s.product_id'
      + ' WHERE s.next_price <> s.unit_price',
    explanation: 'LEAD は LAG の反対で、並び順で1つ後ろの行の値を返します。「次の単価と違う」行を探すと、価格が変わる直前の最後の販売が見つかります。'
      + '各商品の最後の明細は次の行がないので LEAD が NULL になり、NULL との <> は真にならないため自然に除かれます。'
      + '現在の定価 products.price と比べると、値下げ販売していた手帳（定価 2000、販売単価はいつも 1000）なども混ざり、「価格が変わった」ことの判定になりません。',
    wrongAnswers: [
      // LAG を使い、値上げ後の最初の販売を取り出してしまう
      'WITH sales AS ('
        + ' SELECT oi.product_id, oi.order_id, o.ordered_on, oi.unit_price,'
        + ' LAG(oi.unit_price) OVER (PARTITION BY oi.product_id ORDER BY o.ordered_on, o.id) AS next_price'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
        + ')'
        + ' SELECT s.product_id, p.name, s.order_id, s.ordered_on, s.unit_price, s.next_price'
        + ' FROM sales s JOIN products p ON p.id = s.product_id'
        + ' WHERE s.next_price <> s.unit_price',
      // PARTITION BY がなく、別の商品の明細と比べてしまう
      'WITH sales AS ('
        + ' SELECT oi.product_id, oi.order_id, o.ordered_on, oi.unit_price,'
        + ' LEAD(oi.unit_price) OVER (ORDER BY oi.product_id, o.ordered_on, o.id) AS next_price'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id'
        + ')'
        + ' SELECT s.product_id, p.name, s.order_id, s.ordered_on, s.unit_price, s.next_price'
        + ' FROM sales s JOIN products p ON p.id = s.product_id'
        + ' WHERE s.next_price <> s.unit_price',
      // 現在の定価と比べてしまう
      'SELECT oi.product_id, p.name, oi.order_id, o.ordered_on, oi.unit_price, p.price'
        + ' FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id'
        + ' WHERE oi.unit_price <> p.price',
    ],
  },
);
