// 初級 B01〜B10（10問） level: 'beginner'
// 到達目標: 1テーブルからデータを抽出できる（WHERE句程度）。集計・JOIN は含めない。
//
// カテゴリ内訳（各1問、この順で易→難）:
//   B01 列の指定と別名 / B02 比較演算子 / B03 AND・OR / B04 IN / B05 BETWEEN
//   B06 LIKE / B07 IS NULL / B08 ORDER BY（複数キー） / B09 LIMIT / B10 DISTINCT
//
// 形式は docs/requirements.md 3.2 節、作成ルールは 6 節。データの特徴は problems/setup.js の先頭コメント。
// 書き方: PROBLEMS.push({ id: 'B01', level: 'beginner', category: '...', title: '...', ... });
//
// 書き方の決まり（中級以降も同じ）:
//   - desc は「〜テーブルから、〜を取り出してください。」+「列は A, B の順です。」+ 並び順の指定（または「並び順は問いません。」）。
//   - 列は desc に実際の列名（英語）で書く。別名を付けてほしい場合だけ、その別名も書く（判定は列名を見ない）。
//   - 境界の値（以上/より大きい、両端を含む など）は desc ではっきり書き、wrongAnswers で取り違えを確かめる。
//   - SQL に ' を含むときは JS の文字列を " で囲む。

PROBLEMS.push(
  {
    id: 'B01',
    level: 'beginner',
    category: '列の指定と別名',
    title: '列を選んで名前を付ける',
    desc: 'SELECT で必要な列だけを選び、見出し（別名）を付ける練習です。'
      + 'categories テーブル（商品カテゴリ）の全ての行について、カテゴリ名（name）と親カテゴリのID（parent_id）を取り出してください。'
      + '列は name, parent_id の順で、それぞれ「カテゴリ名」「親カテゴリID」という別名を付けます。並び順は問いません。',
    hint: '列は SELECT のあとにカンマ区切りで、出したい順に書きます。別名は「列名 AS 別名」です。',
    answer: 'SELECT name AS カテゴリ名, parent_id AS 親カテゴリID FROM categories',
    explanation: 'SELECT に書いた順番で列が並び、AS で結果の列に見出し（別名）を付けられます。'
      + '答え合わせでは列名は比べませんが、列の数と順番は比べます。parent_id が NULL の行は親のない最上位のカテゴリです。',
    wrongAnswers: [
      'SELECT parent_id AS 親カテゴリID, name AS カテゴリ名 FROM categories',
      'SELECT * FROM categories',
    ],
  },
  {
    id: 'B02',
    level: 'beginner',
    category: '比較演算子',
    title: '在庫が少ない商品',
    desc: '在庫が少なくなった商品を、比較演算子で探します。'
      + 'products テーブル（商品）から、在庫数（stock）が 10 個以下の商品を取り出してください。'
      + 'ちょうど 10 個の商品も含めます。列は id, name, stock の順です。並び順は問いません。',
    hint: '「以下」は <= 、「より小さい（未満）」は < です。',
    answer: 'SELECT id, name, stock FROM products WHERE stock <= 10',
    explanation: 'WHERE に条件を書くと、条件に合う行だけが残ります。'
      + '「10 以下」は 10 を含むので <= を使います。< 10 にすると、在庫がちょうど 10 個の「竹の弁当箱」が漏れます。',
    wrongAnswers: [
      'SELECT id, name, stock FROM products WHERE stock < 10',
    ],
  },
  {
    id: 'B03',
    level: 'beginner',
    category: 'AND・OR',
    title: '安い文房具（500円以下）',
    desc: '500 円以下の安い文房具を、AND と OR を組み合わせて探します。'
      + 'products テーブルから、カテゴリID（category_id）が 8（筆記具）または 9（ノート・手帳）で、'
      + 'しかも価格（price）が 500 円以下の商品を取り出してください。列は id, name, category_id, price の順です。並び順は問いません。',
    hint: 'AND は OR より先に計算されます。「8 または 9」の部分をかっこ ( ) でまとめましょう。',
    answer: 'SELECT id, name, category_id, price FROM products WHERE (category_id = 8 OR category_id = 9) AND price <= 500',
    explanation: 'AND は OR より優先されるため、かっこがないと「カテゴリ 8 の全商品」または「カテゴリ 9 で 500 円以下の商品」という意味になり、'
      + '12000 円の万年筆なども混ざります。OR と AND を一緒に使うときは、かっこで意図をはっきりさせます。',
    wrongAnswers: [
      'SELECT id, name, category_id, price FROM products WHERE category_id = 8 OR category_id = 9 AND price <= 500',
      'SELECT id, name, category_id, price FROM products WHERE (category_id = 8 OR category_id = 9) AND price < 500',
    ],
  },
  {
    id: 'B04',
    level: 'beginner',
    category: 'IN',
    title: '関西の会員',
    desc: '関西（大阪府・京都府・兵庫県）に住む会員を一覧にします。'
      + 'customers テーブル（会員）から、都道府県（prefecture）が 大阪府・京都府・兵庫県 のいずれかである会員を取り出してください。'
      + '列は id, name, prefecture の順です。並び順は問いません。',
    hint: '「列 IN (値1, 値2, 値3)」で、いずれかに一致する行を選べます。都道府県名は「府」「県」まで含めた文字列で入っています。',
    answer: "SELECT id, name, prefecture FROM customers WHERE prefecture IN ('大阪府', '京都府', '兵庫県')",
    explanation: 'IN は「= を OR でつないだもの」の短い書き方です。候補が増えても読みやすく書けます。'
      + '文字列は完全に一致する必要があるので、\'大阪\' では \'大阪府\' に一致しません。',
    alternatives: [
      "SELECT id, name, prefecture FROM customers WHERE prefecture = '大阪府' OR prefecture = '京都府' OR prefecture = '兵庫県'",
    ],
    wrongAnswers: [
      "SELECT id, name, prefecture FROM customers WHERE prefecture IN ('大阪府', '京都府')",
      "SELECT id, name, prefecture FROM customers WHERE prefecture IN ('大阪', '京都', '兵庫')",
    ],
  },
  {
    id: 'B05',
    level: 'beginner',
    category: 'BETWEEN',
    title: '期間を指定した注文（6月上旬）',
    desc: '6月上旬に入った注文を、期間を指定して取り出します。'
      + 'orders テーブル（注文）から、注文日（ordered_on）が 2025-06-01 から 2025-06-10 までの注文を取り出してください。'
      + '6月1日と6月10日の注文も含め、status（キャンセルなど）は問いません。列は id, customer_id, ordered_on, status の順です。並び順は問いません。'
      + 'ordered_on は \'2025-06-01\' のような文字列で入っています。',
    hint: '「列 BETWEEN 下限 AND 上限」は、下限と上限の両方を含みます。',
    answer: "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on BETWEEN '2025-06-01' AND '2025-06-10'",
    explanation: 'BETWEEN a AND b は「a 以上 かつ b 以下」と同じで、両端を含みます。'
      + '日付が \'YYYY-MM-DD\' 形式の文字列なら、文字列の大小と日付の前後が一致するので BETWEEN で期間を指定できます。6月10日には注文が2件あります。',
    alternatives: [
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on >= '2025-06-01' AND ordered_on <= '2025-06-10'",
    ],
    wrongAnswers: [
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on > '2025-06-01' AND ordered_on < '2025-06-10'",
      "SELECT id, customer_id, ordered_on, status FROM orders WHERE ordered_on BETWEEN '2025-06-10' AND '2025-06-01'",
    ],
  },
  {
    id: 'B06',
    level: 'beginner',
    category: 'LIKE',
    title: '「ペン」を含む商品名',
    desc: '商品名に「ペン」を含む商品を、部分一致で検索します。'
      + 'products テーブルから、商品名（name）のどこかに「ペン」という文字の並びを含む商品を、すべて取り出してください。'
      + '先頭・途中・末尾のどこに含まれていてもかまいません。列は id, name の順です。並び順は問いません。',
    hint: 'LIKE では % が「0文字以上の任意の文字列」を表します。「どこかに含む」は前後の両方に % を付けます。',
    answer: "SELECT id, name FROM products WHERE name LIKE '%ペン%'",
    explanation: '\'%ペン%\' は前後に何があっても（何もなくても）「ペン」を含めば一致します。'
      + 'LIKE は文字の並びだけを見るので、ペンではない「ペンダントライト」も一致する点に注意しましょう。\'ペン%\' だと先頭一致、\'%ペン\' だと末尾一致になります。',
    wrongAnswers: [
      "SELECT id, name FROM products WHERE name LIKE 'ペン%'",
      "SELECT id, name FROM products WHERE name LIKE '%ペン'",
      "SELECT id, name FROM products WHERE name = 'ペン'",
    ],
  },
  {
    id: 'B07',
    level: 'beginner',
    category: 'IS NULL',
    title: 'メールアドレス未登録の会員',
    desc: 'メールアドレスが未登録の会員を探します。'
      + 'customers テーブルから、メールアドレス（email）が登録されていない（NULL の）会員を取り出してください。'
      + '列は id, name の順です。並び順は問いません。',
    hint: 'NULL は「値がない」ことを表す特別な印で、= では比べられません。',
    answer: 'SELECT id, name FROM customers WHERE email IS NULL',
    explanation: 'NULL かどうかは IS NULL（NULL でないことは IS NOT NULL）で調べます。'
      + 'email = NULL と書くと、比較の結果が「不明（NULL）」になって どの行も選ばれず、0 行になります。',
    wrongAnswers: [
      'SELECT id, name FROM customers WHERE email = NULL',
      "SELECT id, name FROM customers WHERE email = ''",
    ],
  },
  {
    id: 'B08',
    level: 'beginner',
    category: 'ORDER BY（複数キー）',
    title: '部署ごとに給与の高い順',
    desc: '在籍中の社員の一覧を、部署ごと・給与の高い順に並べます。'
      + 'employees テーブル（社員）から、在籍中の社員（退職日 left_on が NULL の社員）を取り出してください。'
      + '列は id, name, department_id, salary の順です。'
      + '部署ID（department_id）の小さい順に並べ、同じ部署の中では給与（salary）の高い順に並べます。'
      + '部署のない社員（department_id が NULL）は先頭に来ます（SQLite の小さい順では NULL が最初に並びます）。',
    hint: 'ORDER BY には並べ替えのキーをカンマ区切りで複数書けます。1つ目が同じ値のときに2つ目で並べます。向き（ASC / DESC）はキーごとに付けます。',
    answer: 'SELECT id, name, department_id, salary FROM employees WHERE left_on IS NULL ORDER BY department_id ASC, salary DESC',
    ordered: true,
    explanation: 'ORDER BY department_id, salary DESC は「まず部署IDの小さい順、部署IDが同じなら給与の高い順」です。'
      + 'DESC は直前のキーだけにかかるので、department_id は ASC（省略可）のまま、salary にだけ DESC を付けます。',
    alternatives: [
      'SELECT id, name, department_id, salary FROM employees WHERE left_on IS NULL ORDER BY department_id, salary DESC',
    ],
    wrongAnswers: [
      'SELECT id, name, department_id, salary FROM employees WHERE left_on IS NULL ORDER BY department_id, salary',
      'SELECT id, name, department_id, salary FROM employees WHERE left_on IS NULL ORDER BY salary DESC, department_id',
      'SELECT id, name, department_id, salary FROM employees WHERE left_on IS NULL ORDER BY department_id DESC, salary DESC',
    ],
  },
  {
    id: 'B09',
    level: 'beginner',
    category: 'LIMIT',
    title: '在庫のある高額商品 上位5件',
    desc: '在庫のある商品の中から、価格の高い上位 5 件を出します。'
      + 'products テーブルから、在庫がある（stock が 0 より大きい）商品のうち、価格（price）の高い順に上位 5 件を取り出してください。'
      + '列は id, name, price の順で、価格の高い順に並べます（上位 5 件の中に同じ価格の商品はありません）。',
    hint: 'WHERE で絞り込み、ORDER BY で並べてから、LIMIT 件数 で先頭から何件を出すかを指定します。',
    answer: 'SELECT id, name, price FROM products WHERE stock > 0 ORDER BY price DESC LIMIT 5',
    ordered: true,
    explanation: 'LIMIT は並べ替えたあとの結果の先頭から指定した件数だけを返します。'
      + 'SQL は WHERE → ORDER BY → LIMIT の順に処理されるので、在庫0の「ペンダントライト」（11800円）は先に除かれ、6番目の商品が繰り上がります。',
    wrongAnswers: [
      'SELECT id, name, price FROM products ORDER BY price DESC LIMIT 5',
      'SELECT id, name, price FROM products WHERE stock > 0 LIMIT 5',
      'SELECT id, name, price FROM products WHERE stock > 0 ORDER BY price LIMIT 5',
    ],
  },
  {
    id: 'B10',
    level: 'beginner',
    category: 'DISTINCT',
    title: 'クーポンコードの種類',
    desc: '注文で使われたクーポンコードを、重複なしで一覧にします。'
      + 'orders テーブルの coupon_code（注文で使ったクーポン）に入っている値を、重複なしで1つずつ取り出してください。'
      + '列は coupon_code の1列です。クーポン未使用（NULL）も1つの値として1行に含めます。'
      + 'また、空の文字列 \'\' が入っている注文もあり、これも NULL とは別の値として1行になります。並び順は問いません。',
    hint: 'SELECT DISTINCT 列名 で、同じ値の行を1つにまとめられます。WHERE で行を除く必要はありません。',
    answer: 'SELECT DISTINCT coupon_code FROM orders',
    explanation: 'DISTINCT は結果から重複した行を取り除きます。NULL 同士も同じものとして1行にまとまります。'
      + '空文字 \'\' は「値がない」NULL とは別の値なので、別の行になります（データの入力ミスを見つけるときにも役立ちます）。',
    wrongAnswers: [
      'SELECT coupon_code FROM orders',
      'SELECT DISTINCT coupon_code FROM orders WHERE coupon_code IS NOT NULL',
      "SELECT DISTINCT coupon_code FROM orders WHERE coupon_code <> ''",
    ],
  },
);
