// 中級 前半 I01〜I25（25問） level: 'intermediate'
// 到達目標: JOIN・集計などを使って、欲しい形で結果を出せる。
//
// カテゴリ内訳（カテゴリごとに易→難）:
//   集計（GROUP BY・HAVING・COUNT DISTINCT）                 8問  I01〜I08
//   JOIN（INNER / LEFT / 3テーブル以上 / 自己結合）           9問  I09〜I17
//   NULL処理（COALESCE・IFNULL、LEFT JOIN後の NULL）          3問  I18〜I20
//   CASE式（分類、条件付き集計）                              5問  I21〜I25
//
// 形式は docs/requirements.md 3.2 節、作成ルールは 6 節。データの特徴は problems/setup.js の先頭コメント。
// 書き方の決まりは docs/problem-guide.md（problems/beginner.js の先頭コメントも同じ）。
// 各問題の wrongAnswers は「その概念を使わないと正解できない」ことを示す典型的な誤答。

PROBLEMS.push(
  // ==================================================================
  // 集計（8問）
  // ==================================================================
  {
    id: 'I01',
    level: 'intermediate',
    category: '集計',
    title: 'COUNT(*) と COUNT(列) の違い',
    desc: '会員の数と、メールアドレス・生年月日が登録されている会員の数を一度に数えます。'
      + 'customers テーブル（会員）について、次の3つの数を1行で取り出してください。'
      + '列は「全会員の数」「メールアドレス（email）が登録されている会員の数」「生年月日（birth_date）が登録されている会員の数」の順です。'
      + '登録されていない値は NULL になっています。',
    hint: 'COUNT(*) は行の数を、COUNT(列名) はその列が NULL でない行の数を数えます。',
    answer: 'SELECT COUNT(*), COUNT(email), COUNT(birth_date) FROM customers',
    explanation: 'COUNT(*) は NULL かどうかに関係なく行を数え、COUNT(列名) は NULL の行を数えません。'
      + 'そのため、WHERE を書かなくても「値が入っている行の数」を一度に出せます。3つとも COUNT(*) にすると全部同じ数になってしまいます。',
    alternatives: [
      'SELECT COUNT(id), COUNT(email), COUNT(birth_date) FROM customers',
    ],
    wrongAnswers: [
      'SELECT COUNT(*), COUNT(*), COUNT(*) FROM customers',
      'SELECT COUNT(*), COUNT(birth_date), COUNT(email) FROM customers',
    ],
  },
  {
    id: 'I02',
    level: 'intermediate',
    category: '集計',
    title: 'カテゴリごとの商品数',
    desc: 'カテゴリごとに商品がいくつあるかを数えます。'
      + 'products テーブル（商品）から、カテゴリID（category_id）ごとの商品の数を取り出してください。'
      + '廃番の商品も、原価（cost）が未登録の商品も、すべて1商品として数えます。'
      + '列は category_id, 商品の数 の順です。商品が1つもないカテゴリは出しません。並び順は問いません。',
    hint: 'GROUP BY 列名 で、その列の値が同じ行を1つのグループにまとめ、グループごとに COUNT(*) を計算できます。',
    answer: 'SELECT category_id, COUNT(*) FROM products GROUP BY category_id',
    explanation: 'GROUP BY category_id で同じカテゴリの商品が1グループになり、COUNT(*) はグループごとの行数を返します。'
      + 'GROUP BY を書かないと全体で1行になります。COUNT(cost) にすると、原価が NULL の商品が数えられず一部のカテゴリで数が減ります。',
    wrongAnswers: [
      'SELECT category_id, COUNT(cost) FROM products GROUP BY category_id',
      'SELECT category_id, COUNT(*) FROM products',
      'SELECT category_id, COUNT(*) FROM products WHERE is_discontinued = 0 GROUP BY category_id',
    ],
  },
  {
    id: 'I03',
    level: 'intermediate',
    category: '集計',
    title: '部署ごとの在籍人数と給与の合計',
    desc: '部署ごとに、在籍中の社員の人数と給与の合計を集計します。'
      + 'employees テーブル（社員）から、在籍中の社員（退職日 left_on が NULL）だけを対象に、部署ID（department_id）ごとの人数と給与（salary）の合計を取り出してください。'
      + '列は department_id, 人数, 給与の合計 の順です。'
      + '部署のない社員（department_id が NULL）も、NULL の1つのグループとして1行に含めます。並び順は問いません。',
    hint: 'WHERE は GROUP BY より先に処理されます。WHERE で在籍中の社員に絞ってから、GROUP BY でまとめましょう。',
    answer: 'SELECT department_id, COUNT(*), SUM(salary) FROM employees WHERE left_on IS NULL GROUP BY department_id',
    explanation: 'SQL は FROM → WHERE → GROUP BY → SELECT の順に処理されるので、WHERE で除いた退職者は集計に入りません。'
      + 'GROUP BY では NULL 同士が1つのグループにまとまるため、部署なしの社長と新入社員が1行になります。WHERE を忘れると退職者の給与まで合計されます。',
    wrongAnswers: [
      'SELECT department_id, COUNT(*), SUM(salary) FROM employees GROUP BY department_id',
      'SELECT department_id, COUNT(*), SUM(salary) FROM employees WHERE left_on IS NULL AND department_id IS NOT NULL GROUP BY department_id',
      'SELECT department_id, COUNT(*), SUM(salary) FROM employees WHERE left_on IS NOT NULL GROUP BY department_id',
    ],
  },
  {
    id: 'I04',
    level: 'intermediate',
    category: '集計',
    title: '会員の多い都道府県順',
    desc: '都道府県ごとの会員数を数え、多い順に並べます。'
      + 'customers テーブルから、都道府県（prefecture）ごとの会員の数を取り出してください。'
      + '列は prefecture, 会員の数 の順です。'
      + '会員の数の多い順に並べ、同じ数のときは prefecture の昇順（ORDER BY prefecture で並ぶ順）にします。'
      + '同じ人が二重に登録されている会員も、別の会員として数えます。',
    hint: 'ORDER BY には COUNT(*) のような集計の式（または SELECT で付けた別名）を書けます。2つ目のキーで同数の並び方を決めます。',
    answer: 'SELECT prefecture, COUNT(*) AS cnt FROM customers GROUP BY prefecture ORDER BY cnt DESC, prefecture',
    ordered: true,
    explanation: 'ORDER BY は GROUP BY と集計のあとに処理されるので、集計した値で並べ替えられます。'
      + '会員の数が同じ都道府県が多いため、2つ目のキー prefecture がないと並び順が決まりません。DESC を付け忘れると少ない順になります。',
    alternatives: [
      'SELECT prefecture, COUNT(*) FROM customers GROUP BY prefecture ORDER BY COUNT(*) DESC, prefecture ASC',
    ],
    wrongAnswers: [
      'SELECT prefecture, COUNT(*) AS cnt FROM customers GROUP BY prefecture ORDER BY cnt, prefecture',
      'SELECT prefecture, COUNT(*) AS cnt FROM customers GROUP BY prefecture ORDER BY prefecture',
      'SELECT prefecture, COUNT(*) AS cnt FROM customers GROUP BY prefecture ORDER BY cnt DESC, prefecture DESC',
    ],
  },
  {
    id: 'I05',
    level: 'intermediate',
    category: '集計',
    title: 'レビューが4件以上ある商品',
    desc: 'レビューの多い商品について、件数と平均評価を求めます。'
      + 'reviews テーブル（商品レビュー）から、レビューが 4 件以上ある商品について、商品ID（product_id）、レビューの件数、評価（rating）の平均を取り出してください。'
      + 'ちょうど 4 件の商品も含めます。平均は ROUND(..., 2) で小数第2位に丸めます。'
      + '同じ会員が同じ商品に2回レビューしている場合も、2件として数えます。列は product_id, 件数, 平均 の順です。並び順は問いません。',
    hint: 'グループをまとめたあとの条件（集計した値での絞り込み）は、WHERE ではなく HAVING に書きます。',
    answer: 'SELECT product_id, COUNT(*), ROUND(AVG(rating), 2) FROM reviews GROUP BY product_id HAVING COUNT(*) >= 4',
    explanation: 'WHERE はグループにまとめる前の1行ずつの条件なので、COUNT(*) のような集計の結果は使えません。'
      + 'グループに対する条件は GROUP BY のあとの HAVING に書きます。「4 件以上」は 4 を含むので >= です。> 4 にすると、ちょうど 4 件の商品が漏れます。',
    wrongAnswers: [
      'SELECT product_id, COUNT(*), ROUND(AVG(rating), 2) FROM reviews GROUP BY product_id HAVING COUNT(*) > 4',
      'SELECT product_id, COUNT(*), ROUND(AVG(rating), 2) FROM reviews GROUP BY product_id',
      'SELECT product_id, COUNT(DISTINCT customer_id), ROUND(AVG(rating), 2) FROM reviews GROUP BY product_id HAVING COUNT(DISTINCT customer_id) >= 4',
    ],
  },
  {
    id: 'I06',
    level: 'intermediate',
    category: '集計',
    title: '有効な注文が7件以上の会員',
    desc: 'よく買ってくれる会員を、有効な注文の件数で探します。'
      + 'orders テーブル（注文）から、status が \'delivered\'（配達済み）または \'shipped\'（発送済み）の注文だけを数えて、その件数が 7 件以上の会員を取り出してください。'
      + 'キャンセル（\'cancelled\'）と返品（\'returned\'）の注文は数えません。ちょうど 7 件の会員も含めます。'
      + '列は customer_id, 有効な注文の件数 の順です。並び順は問いません。',
    hint: '1行ずつの条件（status）は WHERE に、グループの条件（件数）は HAVING に書きます。',
    answer: "SELECT customer_id, COUNT(*) FROM orders WHERE status IN ('delivered', 'shipped') GROUP BY customer_id HAVING COUNT(*) >= 7",
    explanation: 'WHERE で先にキャンセル・返品の注文を除き、残った注文を会員ごとにまとめてから、HAVING で件数を絞り込みます。'
      + 'WHERE を書かないとキャンセルや返品の注文まで数えられ、件数が増えたり、7 件に届かない会員が入ったりします。',
    alternatives: [
      "SELECT customer_id, COUNT(*) FROM orders WHERE status NOT IN ('cancelled', 'returned') GROUP BY customer_id HAVING COUNT(*) >= 7",
    ],
    wrongAnswers: [
      'SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id HAVING COUNT(*) >= 7',
      "SELECT customer_id, COUNT(*) FROM orders WHERE status IN ('delivered', 'shipped') GROUP BY customer_id HAVING COUNT(*) > 7",
      "SELECT customer_id, COUNT(*) FROM orders WHERE status = 'delivered' GROUP BY customer_id HAVING COUNT(*) >= 7",
    ],
  },
  {
    id: 'I07',
    level: 'intermediate',
    category: '集計',
    title: 'レビューを書いた会員は何人？',
    desc: 'レビューの件数と、レビューを書いた会員の人数、レビューされた商品の数を数えます。'
      + 'reviews テーブルについて、次の3つの数を1行で取り出してください。'
      + '列は「レビューの総件数」「レビューを書いた会員の人数（同じ会員は1人と数える）」「レビューされた商品の種類の数（同じ商品は1つと数える）」の順です。',
    hint: 'COUNT(DISTINCT 列名) は、その列の値の重複を除いてから数えます。',
    answer: 'SELECT COUNT(*), COUNT(DISTINCT customer_id), COUNT(DISTINCT product_id) FROM reviews',
    explanation: '1人の会員が何件もレビューを書いているので、COUNT(customer_id) では「人数」ではなく「件数」になってしまいます。'
      + 'COUNT(DISTINCT 列名) を使うと、異なる値がいくつあるかを数えられます。',
    wrongAnswers: [
      'SELECT COUNT(*), COUNT(customer_id), COUNT(product_id) FROM reviews',
      'SELECT COUNT(*), COUNT(DISTINCT product_id), COUNT(DISTINCT customer_id) FROM reviews',
    ],
  },
  {
    id: 'I08',
    level: 'intermediate',
    category: '集計',
    title: '同じ商品に2回以上レビューした会員',
    desc: '同じ商品に何度もレビューしている会員を探します。'
      + 'reviews テーブルから、同じ会員が同じ商品に 2 件以上レビューを書いている組み合わせを探してください。'
      + '列は customer_id, product_id, その組み合わせのレビュー件数 の順です。並び順は問いません。',
    hint: 'GROUP BY には列を複数書けます。「会員と商品の組み合わせ」ごとにまとめてから、HAVING で件数を絞り込みます。',
    answer: 'SELECT customer_id, product_id, COUNT(*) FROM reviews GROUP BY customer_id, product_id HAVING COUNT(*) >= 2',
    explanation: 'GROUP BY customer_id, product_id は「両方の値が同じ行」を1グループにします。重複登録を探すときによく使う形です。'
      + 'GROUP BY customer_id だけだと「2件以上レビューした会員」になり、別々の商品へのレビューも数えてしまいます。',
    wrongAnswers: [
      'SELECT customer_id, product_id, COUNT(*) FROM reviews GROUP BY customer_id HAVING COUNT(*) >= 2',
      'SELECT customer_id, product_id, COUNT(*) FROM reviews GROUP BY product_id HAVING COUNT(*) >= 2',
    ],
  },

  // ==================================================================
  // JOIN（9問）
  // ==================================================================
  {
    id: 'I09',
    level: 'intermediate',
    category: 'JOIN',
    title: '高額商品とカテゴリ名',
    desc: '高額商品の一覧に、テーブルを結合してカテゴリ名を付けます。'
      + 'products テーブル（商品）と categories テーブル（カテゴリ）を結合して、価格（price）が 10000 円以上の商品の、商品ID・商品名・カテゴリ名を取り出してください。'
      + '商品の category_id が、カテゴリの id を指しています。列は products.id, products.name, categories.name の順です。並び順は問いません。',
    hint: 'FROM products AS p JOIN categories AS c ON 結合の条件 で2つのテーブルをつなぎます。同じ名前の列（id, name）は「p.name」のようにテーブル名（別名）を付けて区別します。',
    answer: 'SELECT p.id, p.name, c.name FROM products AS p INNER JOIN categories AS c ON c.id = p.category_id WHERE p.price >= 10000',
    explanation: 'JOIN の ON には「どの列とどの列が対応するか」を書きます。ここでは商品の category_id とカテゴリの id です。'
      + 'ON c.id = p.id のように対応しない列同士をつなぐと、まったく関係のない行が組み合わされます（今回は0行になります）。',
    alternatives: [
      'SELECT p.id, p.name, c.name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.price >= 10000',
    ],
    wrongAnswers: [
      'SELECT p.id, p.name, c.name FROM products AS p INNER JOIN categories AS c ON c.id = p.id WHERE p.price >= 10000',
      'SELECT p.id, p.name, p.category_id FROM products AS p WHERE p.price >= 10000',
    ],
  },
  {
    id: 'I10',
    level: 'intermediate',
    category: 'JOIN',
    title: '部署名ごとの在籍人数',
    desc: '部署名ごとに、在籍中の社員の人数を数えます。'
      + 'employees テーブル（社員）と departments テーブル（部署）を結合して、部署名ごとの在籍中の社員（left_on が NULL）の人数を取り出してください。'
      + '部署のない社員は含めず、社員が1人もいない部署も出しません（両方のテーブルで対応が取れる行だけを使います）。'
      + '列は departments.name, 人数 の順です。並び順は問いません。',
    hint: 'INNER JOIN は、ON の条件で相手が見つかった行だけを残します。結合してから WHERE と GROUP BY を書きます。',
    answer: 'SELECT d.name, COUNT(*) FROM employees AS e INNER JOIN departments AS d ON d.id = e.department_id WHERE e.left_on IS NULL GROUP BY d.id, d.name',
    explanation: 'INNER JOIN では、department_id が NULL の社員は対応する部署がないので結果から消え、社員のいない部署も現れません。'
      + '結合した結果に対して、ふつうのテーブルと同じように WHERE と GROUP BY を使えます。WHERE を忘れると退職者も数えられます。',
    alternatives: [
      'SELECT d.name, COUNT(*) FROM departments d JOIN employees e ON e.department_id = d.id WHERE e.left_on IS NULL GROUP BY d.name',
    ],
    wrongAnswers: [
      'SELECT d.name, COUNT(*) FROM employees AS e INNER JOIN departments AS d ON d.id = e.department_id GROUP BY d.id, d.name',
      'SELECT d.name, COUNT(*) FROM departments AS d LEFT JOIN employees AS e ON e.department_id = d.id WHERE e.left_on IS NULL GROUP BY d.id, d.name',
    ],
  },
  {
    id: 'I11',
    level: 'intermediate',
    category: 'JOIN',
    title: '一度も注文していない会員',
    desc: 'まだ一度も注文していない会員を探します。'
      + 'customers テーブル（会員）と orders テーブル（注文）を使って、注文が1件もない会員を取り出してください。'
      + 'status は問わず、キャンセルした注文が1件でもある会員は「注文がある」とみなして含めません。'
      + '列は id, name の順です。並び順は問いません。',
    hint: 'LEFT JOIN は、相手が見つからない行も残し、相手側の列を NULL にします。「相手側の id が NULL の行」が、相手のいない行です。',
    answer: 'SELECT c.id, c.name FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id WHERE o.id IS NULL',
    explanation: 'LEFT JOIN では左のテーブル（customers）の行がすべて残り、注文のない会員は o の列がすべて NULL になります。そこを WHERE o.id IS NULL で選びます。'
      + 'INNER JOIN だと注文のない会員は最初から消えるので 0 行になります。ON に status の条件を足すと、キャンセルしかない会員まで「注文なし」に入ってしまいます。',
    wrongAnswers: [
      'SELECT c.id, c.name FROM customers AS c INNER JOIN orders AS o ON o.customer_id = c.id WHERE o.id IS NULL',
      "SELECT c.id, c.name FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status IN ('delivered', 'shipped') WHERE o.id IS NULL",
    ],
  },
  {
    id: 'I12',
    level: 'intermediate',
    category: 'JOIN',
    title: '全部署の所属人数（0人の部署も）',
    desc: 'すべての部署の所属人数を、社員のいない部署も含めて数えます。'
      + 'departments テーブル（部署）の全ての部署について、所属している社員の人数を取り出してください。'
      + '退職者も含めて、employees テーブルの department_id がその部署を指している社員を数えます。'
      + '社員が1人もいない部署も、人数 0 として1行に含めます。列は departments.id, departments.name, 人数 の順です。並び順は問いません。',
    hint: '部署を全部残したいので、departments を左にして LEFT JOIN します。COUNT(*) と COUNT(列名) のどちらで数えるべきか考えましょう。',
    answer: 'SELECT d.id, d.name, COUNT(e.id) FROM departments AS d LEFT JOIN employees AS e ON e.department_id = d.id GROUP BY d.id, d.name',
    explanation: 'LEFT JOIN で社員のいない部署も1行残りますが、その行の e.id は NULL です。COUNT(e.id) は NULL を数えないので 0 になります。'
      + 'COUNT(*) は行そのものを数えるため、社員のいない部署も 1 人と数えてしまいます。INNER JOIN では社員のいない部署が消えます。',
    wrongAnswers: [
      'SELECT d.id, d.name, COUNT(*) FROM departments AS d LEFT JOIN employees AS e ON e.department_id = d.id GROUP BY d.id, d.name',
      'SELECT d.id, d.name, COUNT(e.id) FROM departments AS d INNER JOIN employees AS e ON e.department_id = d.id GROUP BY d.id, d.name',
    ],
  },
  {
    id: 'I13',
    level: 'intermediate',
    category: 'JOIN',
    title: '新しい会員の有効な注文件数（ON に条件を書く）',
    desc: '新しく登録した会員ごとに、有効な注文の件数を数えます（0 件の会員も含めます）。'
      + '2025-09-01 以降に登録した会員（customers.registered_on が \'2025-09-01\' 以上）の全員について、有効な注文（status が \'delivered\' または \'shipped\'）の件数を取り出してください。'
      + '有効な注文が1件もない会員（注文がない会員、キャンセルした注文しかない会員）も、件数 0 として1行に含めます。'
      + '列は customers.id, customers.name, 有効な注文の件数 の順です。並び順は問いません。',
    hint: 'LEFT JOIN の相手側（orders）の条件を WHERE に書くと、相手のいない行（NULL の行）まで消えてしまいます。相手側の条件は ON に書きましょう。',
    answer: "SELECT c.id, c.name, COUNT(o.id) FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status IN ('delivered', 'shipped') WHERE c.registered_on >= '2025-09-01' GROUP BY c.id, c.name",
    explanation: 'ON に書いた条件は「どの注文を結合するか」を決めるだけなので、条件に合う注文がない会員も NULL の行として残り、COUNT(o.id) が 0 になります。'
      + 'status の条件を WHERE に書くと、o.status が NULL の行が除かれ、件数 0 の会員が消えます。条件を書かないと、キャンセルした注文も数えられます。',
    wrongAnswers: [
      "SELECT c.id, c.name, COUNT(o.id) FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id WHERE c.registered_on >= '2025-09-01' AND o.status IN ('delivered', 'shipped') GROUP BY c.id, c.name",
      "SELECT c.id, c.name, COUNT(o.id) FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id WHERE c.registered_on >= '2025-09-01' GROUP BY c.id, c.name",
      "SELECT c.id, c.name, COUNT(*) FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status IN ('delivered', 'shipped') WHERE c.registered_on >= '2025-09-01' GROUP BY c.id, c.name",
    ],
  },
  {
    id: 'I14',
    level: 'intermediate',
    category: 'JOIN',
    title: '注文明細に商品名を付ける（3テーブル）',
    desc: '注文明細に商品名を付けて、いつ何がいくつ売れたかを一覧にします。'
      + 'orders（注文）、order_items（注文明細）、products（商品）の3つのテーブルを結合して、注文日（ordered_on）が 2025-12-19 から 2025-12-21 まで（両端を含む）の注文の明細を取り出してください。'
      + 'status は問いません。明細1行が結果の1行になります。'
      + '列は orders.id, orders.ordered_on, products.name, order_items.quantity の順です。並び順は問いません。',
    hint: 'JOIN は続けて何回でも書けます。orders と order_items を order_id でつなぎ、さらに order_items と products を product_id でつなぎます。',
    answer: "SELECT o.id, o.ordered_on, p.name, oi.quantity FROM orders AS o INNER JOIN order_items AS oi ON oi.order_id = o.id INNER JOIN products AS p ON p.id = oi.product_id WHERE o.ordered_on BETWEEN '2025-12-19' AND '2025-12-21'",
    explanation: '注文と商品は直接つながっておらず、間にある order_items（どの注文でどの商品をいくつ買ったか）を通して結合します。'
      + 'ON の列を取り違えて p.id = oi.order_id のようにすると、注文IDと同じ番号の商品を探してしまい、正しい商品名になりません。',
    wrongAnswers: [
      "SELECT o.id, o.ordered_on, p.name, oi.quantity FROM orders AS o INNER JOIN order_items AS oi ON oi.order_id = o.id INNER JOIN products AS p ON p.id = oi.order_id WHERE o.ordered_on BETWEEN '2025-12-19' AND '2025-12-21'",
      "SELECT o.id, o.ordered_on, p.name, oi.quantity FROM orders AS o INNER JOIN order_items AS oi ON oi.order_id = o.id INNER JOIN products AS p ON p.id = oi.product_id WHERE o.ordered_on > '2025-12-19' AND o.ordered_on < '2025-12-21'",
    ],
  },
  {
    id: 'I15',
    level: 'intermediate',
    category: 'JOIN',
    title: 'カテゴリ別の売上金額（4テーブル）',
    desc: 'カテゴリごとの売上金額を取り出してください。売上は status が \'delivered\' または \'shipped\' の注文の明細だけを対象にし、金額は明細ごとの quantity * unit_price（注文時点の販売単価）の合計です。送料は含めません。'
      + 'カテゴリは商品に直接設定されたもの（products.category_id）で、親カテゴリへの合算はしません。'
      + '列は categories.name, 売上金額 の順です。売上のないカテゴリは出しません。並び順は問いません。',
    hint: 'order_items → orders（status を見る）、order_items → products → categories（カテゴリ名を見る）の4テーブルを結合してから GROUP BY します。',
    answer: "SELECT c.name, SUM(oi.quantity * oi.unit_price) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id INNER JOIN categories AS c ON c.id = p.category_id WHERE o.status IN ('delivered', 'shipped') GROUP BY c.id, c.name",
    explanation: '必要な情報（status・単価・カテゴリ名）が別々のテーブルにあるので、明細を中心に4つのテーブルをつないでから集計します。'
      + 'products.price は「現在の定価」なので、値上げ・値下げのあった商品で金額がずれます。status の条件を忘れると、キャンセル・返品の明細まで売上に入ります。',
    wrongAnswers: [
      "SELECT c.name, SUM(oi.quantity * p.price) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id INNER JOIN categories AS c ON c.id = p.category_id WHERE o.status IN ('delivered', 'shipped') GROUP BY c.id, c.name",
      'SELECT c.name, SUM(oi.quantity * oi.unit_price) FROM order_items AS oi INNER JOIN products AS p ON p.id = oi.product_id INNER JOIN categories AS c ON c.id = p.category_id GROUP BY c.id, c.name',
    ],
  },
  {
    id: 'I16',
    level: 'intermediate',
    category: 'JOIN',
    title: '社員と上司の名前（自己結合）',
    desc: '社員の名前と、その上司の名前を並べて出します。'
      + 'employees テーブル（社員）から、在籍中（left_on が NULL）で上司のいる社員について、社員ID・社員の名前・上司の名前を取り出してください。'
      + 'manager_id は上司の社員ID（同じ employees テーブルの id）です。上司のいない社員（manager_id が NULL）は含めません。'
      + '列は 社員の id, 社員の name, 上司の name の順です。並び順は問いません。',
    hint: '同じテーブルを2回、別々の別名（例: e と m）を付けて FROM に書くと、「社員の行」と「上司の行」を結合できます。',
    answer: 'SELECT e.id, e.name, m.name FROM employees AS e INNER JOIN employees AS m ON m.id = e.manager_id WHERE e.left_on IS NULL',
    explanation: '自己結合では、同じテーブルを「社員として見る e」と「上司として見る m」に分け、e.manager_id = m.id でつなぎます。'
      + 'ON e.id = m.manager_id と逆に書くと「部下」を探すことになり、結果が変わります。上司のいない社長は INNER JOIN で自然に除かれます。',
    wrongAnswers: [
      'SELECT e.id, e.name, m.name FROM employees AS e INNER JOIN employees AS m ON e.id = m.manager_id WHERE e.left_on IS NULL',
      'SELECT e.id, e.name, m.name FROM employees AS e LEFT JOIN employees AS m ON m.id = e.manager_id WHERE e.left_on IS NULL',
      'SELECT e.id, e.name, m.name FROM employees AS e INNER JOIN employees AS m ON m.id = e.manager_id',
    ],
  },
  {
    id: 'I17',
    level: 'intermediate',
    category: 'JOIN',
    title: '同姓同名の会員の組（自己結合）',
    desc: '二重登録の疑いがある、同姓同名の会員の組を探します。'
      + 'customers テーブルから、名前（name）がまったく同じ会員の組を探してください。'
      + '1つの組は1行だけ出し、id の小さい方を左に置きます。'
      + '列は 小さい方の id, 大きい方の id, name の順です。並び順は問いません。',
    hint: 'customers を2回使って name が等しい行同士を結合します。同じ行同士の組や、左右を入れ替えた組が出ないように、id の大小の条件も ON に加えます。',
    answer: 'SELECT a.id, b.id, a.name FROM customers AS a INNER JOIN customers AS b ON a.name = b.name AND a.id < b.id',
    explanation: '自己結合の ON には、id の一致以外の条件（ここでは name の一致）も書けます。'
      + 'a.name = b.name だけでは自分自身との組も出てしまい、a.id <> b.id にすると (1, 49) と (49, 1) のように同じ組が2回出ます。a.id < b.id にすると1組1行になります。',
    wrongAnswers: [
      'SELECT a.id, b.id, a.name FROM customers AS a INNER JOIN customers AS b ON a.name = b.name AND a.id <> b.id',
      'SELECT a.id, b.id, a.name FROM customers AS a INNER JOIN customers AS b ON a.name = b.name AND a.id > b.id',
    ],
  },

  // ==================================================================
  // NULL処理（3問）
  // ==================================================================
  {
    id: 'I18',
    level: 'intermediate',
    category: 'NULL処理',
    title: '未登録のメールアドレスを「未登録」と表示',
    desc: '会員の一覧で、未登録（NULL）のメールアドレスを「未登録」と表示します。'
      + 'customers テーブルから、都道府県（prefecture）が大阪府の会員を取り出してください。'
      + '列は id, name, メールアドレス の順です。メールアドレスは email を出しますが、NULL のときは代わりに文字列 \'未登録\' を出します。並び順は問いません。',
    hint: 'COALESCE(値1, 値2) は、値1 が NULL でなければ値1を、NULL なら値2を返します。IFNULL(値1, 値2) も同じ働きです。',
    answer: "SELECT id, name, COALESCE(email, '未登録') FROM customers WHERE prefecture = '大阪府'",
    explanation: 'COALESCE は引数を左から見て、最初の NULL でない値を返します。画面や帳票で NULL を分かりやすい文字に置き換えるときに使います。'
      + 'email をそのまま出すと NULL のまま表示されます。',
    alternatives: [
      "SELECT id, name, IFNULL(email, '未登録') FROM customers WHERE prefecture = '大阪府'",
      "SELECT id, name, CASE WHEN email IS NULL THEN '未登録' ELSE email END FROM customers WHERE prefecture = '大阪府'",
    ],
    wrongAnswers: [
      "SELECT id, name, email FROM customers WHERE prefecture = '大阪府'",
      "SELECT id, name, COALESCE(email, '') FROM customers WHERE prefecture = '大阪府'",
      "SELECT id, name, COALESCE(email, '未登録') FROM customers WHERE prefecture = '大阪府' AND email IS NOT NULL",
    ],
  },
  {
    id: 'I19',
    level: 'intermediate',
    category: 'NULL処理',
    title: '社員の部署名（未配属は「未配属」）',
    desc: '社員ごとの部署名を出し、部署のない社員は「未配属」と表示します。'
      + 'employees テーブル（社員）の在籍中の社員（left_on が NULL）全員について、社員ID・名前・部署名を取り出してください。'
      + '部署名は departments テーブルの name です。部署のない社員（department_id が NULL）も含め、その部署名は文字列 \'未配属\' にします。'
      + '列は employees.id, employees.name, 部署名 の順です。並び順は問いません。',
    hint: '部署のない社員も残すには LEFT JOIN を使います。相手が見つからなかった行の d.name は NULL になるので、それを置き換えます。',
    answer: "SELECT e.id, e.name, COALESCE(d.name, '未配属') FROM employees AS e LEFT JOIN departments AS d ON d.id = e.department_id WHERE e.left_on IS NULL",
    explanation: 'LEFT JOIN で相手が見つからなかった行は、相手側の列がすべて NULL になります。COALESCE でその NULL を \'未配属\' に置き換えます。'
      + 'INNER JOIN では部署のない社員が消え、COALESCE を付けないと部署名が NULL のまま出ます。',
    alternatives: [
      "SELECT e.id, e.name, IFNULL(d.name, '未配属') FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.left_on IS NULL",
    ],
    wrongAnswers: [
      "SELECT e.id, e.name, COALESCE(d.name, '未配属') FROM employees AS e INNER JOIN departments AS d ON d.id = e.department_id WHERE e.left_on IS NULL",
      'SELECT e.id, e.name, d.name FROM employees AS e LEFT JOIN departments AS d ON d.id = e.department_id WHERE e.left_on IS NULL',
    ],
  },
  {
    id: 'I20',
    level: 'intermediate',
    category: 'NULL処理',
    title: '家具の注文数量（一度も注文されていない商品は 0）',
    desc: '家具の商品ごとの注文数量を、注文のない商品は 0 として求めます。'
      + '家具カテゴリ（products.category_id が 6）の全ての商品について、注文された数量（order_items.quantity）の合計を取り出してください。'
      + 'status は問わず、キャンセル・返品も含めたすべての注文明細を数えます。'
      + '一度も注文されていない商品も含め、その合計は NULL ではなく 0 にします。'
      + '列は products.id, products.name, 数量の合計 の順です。並び順は問いません。',
    hint: '商品を全部残すには products を左にした LEFT JOIN です。明細のない商品は SUM の結果が NULL になるので、COALESCE で 0 に置き換えます。',
    answer: 'SELECT p.id, p.name, COALESCE(SUM(oi.quantity), 0) FROM products AS p LEFT JOIN order_items AS oi ON oi.product_id = p.id WHERE p.category_id = 6 GROUP BY p.id, p.name',
    explanation: 'SUM は合計する値がすべて NULL（または0行）のとき、0 ではなく NULL を返します。LEFT JOIN で明細のない商品はまさにこの状態なので、COALESCE(SUM(...), 0) で 0 にします。'
      + 'INNER JOIN では注文されていない商品が消え、COUNT(*) にすると数量ではなく明細の行数になります（明細のない商品も 1 になります）。',
    alternatives: [
      'SELECT p.id, p.name, IFNULL(SUM(oi.quantity), 0) FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id WHERE p.category_id = 6 GROUP BY p.id',
    ],
    wrongAnswers: [
      'SELECT p.id, p.name, SUM(oi.quantity) FROM products AS p LEFT JOIN order_items AS oi ON oi.product_id = p.id WHERE p.category_id = 6 GROUP BY p.id, p.name',
      'SELECT p.id, p.name, COALESCE(SUM(oi.quantity), 0) FROM products AS p INNER JOIN order_items AS oi ON oi.product_id = p.id WHERE p.category_id = 6 GROUP BY p.id, p.name',
      'SELECT p.id, p.name, COUNT(*) FROM products AS p LEFT JOIN order_items AS oi ON oi.product_id = p.id WHERE p.category_id = 6 GROUP BY p.id, p.name',
    ],
  },

  // ==================================================================
  // CASE式（5問）
  // ==================================================================
  {
    id: 'I21',
    level: 'intermediate',
    category: 'CASE式',
    title: '注文の状態を日本語で表示',
    desc: '注文の状態（status）の英語の値を、日本語の表示に置き換えます。'
      + 'orders テーブルから、注文日（ordered_on）が 2025-12-12 以降（12月12日を含む）の注文を取り出してください。'
      + '列は id, ordered_on, 状態 の順です。状態は status を次のように日本語に置き換えます: '
      + '\'delivered\' → \'配達済み\'、\'shipped\' → \'発送済み\'、\'cancelled\' → \'キャンセル\'、\'returned\' → \'返品\'。並び順は問いません。',
    hint: 'CASE 列名 WHEN 値1 THEN 結果1 WHEN 値2 THEN 結果2 ... END で、列の値ごとに別の値を返せます。',
    answer: "SELECT id, ordered_on, CASE status WHEN 'delivered' THEN '配達済み' WHEN 'shipped' THEN '発送済み' WHEN 'cancelled' THEN 'キャンセル' WHEN 'returned' THEN '返品' END FROM orders WHERE ordered_on >= '2025-12-12'",
    explanation: 'CASE 式は、条件に合った最初の WHEN の THEN の値を返す「式」なので、SELECT の列として使えます。'
      + 'どの WHEN にも当てはまらず ELSE もないときは NULL になります。WHEN を1つ書き忘れると、その状態の注文の列が NULL になります。',
    alternatives: [
      "SELECT id, ordered_on, CASE WHEN status = 'delivered' THEN '配達済み' WHEN status = 'shipped' THEN '発送済み' WHEN status = 'cancelled' THEN 'キャンセル' ELSE '返品' END FROM orders WHERE ordered_on >= '2025-12-12'",
    ],
    wrongAnswers: [
      "SELECT id, ordered_on, CASE status WHEN 'delivered' THEN '配達済み' WHEN 'shipped' THEN '発送済み' WHEN 'returned' THEN '返品' END FROM orders WHERE ordered_on >= '2025-12-12'",
      "SELECT id, ordered_on, status FROM orders WHERE ordered_on >= '2025-12-12'",
      "SELECT id, ordered_on, CASE status WHEN 'delivered' THEN '配達済み' WHEN 'shipped' THEN '発送済み' WHEN 'cancelled' THEN 'キャンセル' WHEN 'returned' THEN '返品' END FROM orders WHERE ordered_on > '2025-12-12'",
    ],
  },
  {
    id: 'I22',
    level: 'intermediate',
    category: 'CASE式',
    title: '食器の価格帯を分類する',
    desc: '食器のカテゴリ（products.category_id が 10 または 11）の商品を取り出し、価格（price）で次の3つに分類してください。'
      + '1800 円以下は \'お手頃\'、1800 円より高く 3000 円以下は \'標準\'、3000 円より高いものは \'高め\' です。ちょうど 1800 円は \'お手頃\'、ちょうど 3000 円は \'標準\' です。'
      + '列は id, name, price, 価格帯 の順です。並び順は問いません。',
    hint: 'CASE WHEN 条件1 THEN 結果1 WHEN 条件2 THEN 結果2 ELSE 結果3 END。WHEN は上から順に調べられ、最初に当てはまったものが使われます。',
    answer: "SELECT id, name, price, CASE WHEN price <= 1800 THEN 'お手頃' WHEN price <= 3000 THEN '標準' ELSE '高め' END FROM products WHERE category_id IN (10, 11)",
    explanation: 'CASE は上の WHEN から順に調べ、当てはまった時点で決まります。そのため2つ目は price <= 3000 と書くだけで「1800 より高く 3000 以下」の意味になります。'
      + 'WHEN price <= 3000 を先に書くと、1800 円以下の商品もすべて \'標準\' になります。< 1800 にすると、ちょうど 1800 円の商品が \'標準\' に入ります。',
    alternatives: [
      "SELECT id, name, price, CASE WHEN price > 3000 THEN '高め' WHEN price > 1800 THEN '標準' ELSE 'お手頃' END FROM products WHERE category_id IN (10, 11)",
    ],
    wrongAnswers: [
      "SELECT id, name, price, CASE WHEN price <= 3000 THEN '標準' WHEN price <= 1800 THEN 'お手頃' ELSE '高め' END FROM products WHERE category_id IN (10, 11)",
      "SELECT id, name, price, CASE WHEN price < 1800 THEN 'お手頃' WHEN price < 3000 THEN '標準' ELSE '高め' END FROM products WHERE category_id IN (10, 11)",
    ],
  },
  {
    id: 'I23',
    level: 'intermediate',
    category: 'CASE式',
    title: '価格帯ごとの商品数',
    desc: '商品を3つの価格帯に分け、価格帯ごとの商品数を数えます。'
      + 'products テーブルの全商品（廃番も含む）を、価格（price）で次の3つの価格帯に分け、価格帯ごとの商品の数を取り出してください。'
      + '1000 円未満は \'1000円未満\'、1000 円以上 5000 円未満は \'1000〜4999円\'、5000 円以上は \'5000円以上\' です。'
      + '列は 価格帯, 商品の数 の順です。並び順は問いません。',
    hint: 'CASE 式で作った値でも GROUP BY できます。SELECT に書いた CASE 式に別名を付け、GROUP BY にその別名（または同じ CASE 式）を書きます。',
    answer: "SELECT CASE WHEN price < 1000 THEN '1000円未満' WHEN price < 5000 THEN '1000〜4999円' ELSE '5000円以上' END AS price_band, COUNT(*) FROM products GROUP BY price_band",
    explanation: 'CASE 式で「行ごとに分類したラベル」を作り、そのラベルで GROUP BY すると、元の列にない区分で集計できます。'
      + 'GROUP BY price のように元の列でまとめると、価格の種類ごとにばらばらの行になってしまいます。',
    alternatives: [
      "SELECT CASE WHEN price < 1000 THEN '1000円未満' WHEN price < 5000 THEN '1000〜4999円' ELSE '5000円以上' END, COUNT(*) FROM products GROUP BY CASE WHEN price < 1000 THEN '1000円未満' WHEN price < 5000 THEN '1000〜4999円' ELSE '5000円以上' END",
    ],
    wrongAnswers: [
      "SELECT CASE WHEN price < 1000 THEN '1000円未満' WHEN price < 5000 THEN '1000〜4999円' ELSE '5000円以上' END AS price_band, COUNT(*) FROM products GROUP BY price",
      "SELECT CASE WHEN price < 1000 THEN '1000円未満' WHEN price < 5000 THEN '1000〜4999円' ELSE '5000円以上' END AS price_band, COUNT(*) FROM products WHERE is_discontinued = 0 GROUP BY price_band",
    ],
  },
  {
    id: 'I24',
    level: 'intermediate',
    category: 'CASE式',
    title: '部署ごとの在籍者数と退職者数（条件付き集計）',
    desc: '部署ごとの在籍者数と退職者数を、1行に横に並べて集計します。'
      + 'employees テーブル（社員）から、部署ID（department_id）ごとに、在籍中の社員（left_on が NULL）の人数と、退職した社員（left_on が NULL でない）の人数を、横に並べて取り出してください。'
      + '部署のない社員は department_id が NULL の1つのグループとして1行にします。該当者がいない場合は 0 を出します。'
      + '列は department_id, 在籍中の人数, 退職者の人数 の順です。並び順は問いません。',
    hint: 'SUM(CASE WHEN 条件 THEN 1 ELSE 0 END) と書くと、条件に合う行の数を数えられます。1つの SELECT に、条件の違う集計をいくつも並べられます。',
    answer: 'SELECT department_id, SUM(CASE WHEN left_on IS NULL THEN 1 ELSE 0 END), SUM(CASE WHEN left_on IS NOT NULL THEN 1 ELSE 0 END) FROM employees GROUP BY department_id',
    explanation: 'CASE で「条件に合う行は 1、合わない行は 0」にしてから SUM すると、グループの中で条件に合う行の数になります（条件付き集計）。'
      + 'COUNT(CASE ... ELSE 0 END) は 0 も「NULL でない値」として数えるので、全員の人数になってしまいます。ELSE 0 を省くと、該当者がいない部署で SUM が NULL になります。',
    alternatives: [
      'SELECT department_id, COUNT(CASE WHEN left_on IS NULL THEN 1 END), COUNT(CASE WHEN left_on IS NOT NULL THEN 1 END) FROM employees GROUP BY department_id',
      'SELECT department_id, SUM(left_on IS NULL), SUM(left_on IS NOT NULL) FROM employees GROUP BY department_id',
      'SELECT department_id, COUNT(*) - COUNT(left_on), COUNT(left_on) FROM employees GROUP BY department_id',
    ],
    wrongAnswers: [
      'SELECT department_id, COUNT(CASE WHEN left_on IS NULL THEN 1 ELSE 0 END), COUNT(CASE WHEN left_on IS NOT NULL THEN 1 ELSE 0 END) FROM employees GROUP BY department_id',
      'SELECT department_id, SUM(CASE WHEN left_on IS NULL THEN 1 END), SUM(CASE WHEN left_on IS NOT NULL THEN 1 END) FROM employees GROUP BY department_id',
    ],
  },
  {
    id: 'I25',
    level: 'intermediate',
    category: 'CASE式',
    title: '調理器具の上半期・下半期の販売数量',
    desc: '調理器具の商品ごとに、上半期と下半期の販売数量を横に並べて比べます。'
      + '調理器具のカテゴリ（products.category_id が 5）の各商品について、2025年の上半期（ordered_on が 2025-01-01〜2025-06-30）と下半期（2025-07-01〜2025-12-31）の販売数量（order_items.quantity の合計）を、横に並べて取り出してください。'
      + '対象は status が \'delivered\' または \'shipped\' の注文だけです。販売のない期間は 0 を出します'
      + '（この条件で販売が1件もない調理器具はないので、INNER JOIN でかまいません）。'
      + '列は products.id, products.name, 上半期の数量, 下半期の数量 の順です。並び順は問いません。',
    hint: 'orders・order_items・products を結合し、商品ごとに GROUP BY します。期間ごとの数量は SUM(CASE WHEN 期間の条件 THEN oi.quantity ELSE 0 END) で分けて合計します。',
    answer: "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on < '2025-07-01' THEN oi.quantity ELSE 0 END), SUM(CASE WHEN o.ordered_on >= '2025-07-01' THEN oi.quantity ELSE 0 END) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE p.category_id = 5 AND o.status IN ('delivered', 'shipped') GROUP BY p.id, p.name",
    explanation: 'THEN に 1 ではなく oi.quantity を書くと、条件に合う行の数量だけを合計できます。ELSE 0 があるので、その期間に販売がない商品も 0 になります。'
      + '期間の境目（6月30日と7月1日）を <= \'2025-07-01\' などと取り違えると、7月1日の注文が上半期に入ります。status の条件を忘れるとキャンセル・返品の数量も入ります。',
    alternatives: [
      "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on BETWEEN '2025-01-01' AND '2025-06-30' THEN oi.quantity ELSE 0 END), SUM(CASE WHEN o.ordered_on BETWEEN '2025-07-01' AND '2025-12-31' THEN oi.quantity ELSE 0 END) FROM products p JOIN order_items oi ON oi.product_id = p.id JOIN orders o ON o.id = oi.order_id WHERE p.category_id = 5 AND o.status IN ('delivered', 'shipped') GROUP BY p.id",
    ],
    wrongAnswers: [
      "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on <= '2025-07-01' THEN oi.quantity ELSE 0 END), SUM(CASE WHEN o.ordered_on > '2025-07-01' THEN oi.quantity ELSE 0 END) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE p.category_id = 5 AND o.status IN ('delivered', 'shipped') GROUP BY p.id, p.name",
      "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on < '2025-07-01' THEN oi.quantity END), SUM(CASE WHEN o.ordered_on >= '2025-07-01' THEN oi.quantity END) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE p.category_id = 5 AND o.status IN ('delivered', 'shipped') GROUP BY p.id, p.name",
      "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on < '2025-07-01' THEN oi.quantity ELSE 0 END), SUM(CASE WHEN o.ordered_on >= '2025-07-01' THEN oi.quantity ELSE 0 END) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE p.category_id = 5 GROUP BY p.id, p.name",
      "SELECT p.id, p.name, SUM(CASE WHEN o.ordered_on < '2025-07-01' THEN 1 ELSE 0 END), SUM(CASE WHEN o.ordered_on >= '2025-07-01' THEN 1 ELSE 0 END) FROM order_items AS oi INNER JOIN orders AS o ON o.id = oi.order_id INNER JOIN products AS p ON p.id = oi.product_id WHERE p.category_id = 5 AND o.status IN ('delivered', 'shipped') GROUP BY p.id, p.name",
    ],
  },
);
