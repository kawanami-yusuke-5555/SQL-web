// 実践 P01〜P10（10問） level: 'practice'
// 到達目標: 業務的な依頼文から、必要な結果を自分で設計して出せる。自動判定はしない（自己確認）。
//
// テーマ案（docs/requirements.md 3.1。調整してよい）:
//   月次売上レポート / 休眠顧客の抽出 / リピート率 / 在庫の発注候補 / 商品のABC分析 /
//   カテゴリ別の売れ筋と不振 / レビュー評価と売上の関係 / 会員登録月ごとの継続（コホート） /
//   データ不整合のチェック（重複・存在しない参照など） / 部署別の人件費と人員構成
//
// 各問題は desc（依頼文）・hint・checkpoints（3〜6個）・examples（解答例 1〜3個、note つき）を持つ。
// 形式は docs/requirements.md 3.2 節。
// 書き方: PROBLEMS.push({ id: 'P01', level: 'practice', category: '...', title: '...', ... });
//
// 書き方の決まり（実践）:
//   - desc は上司や他部署からの依頼の口調。あえて細部（期間・キャンセルの扱い・定義など）を決めきらない。
//   - checkpoints は、desc の「決めきらない点」に1対1で対応させる（どう決めたか・理由を説明できるか）。
//   - examples は考え方の違う解答例を2〜3個。note に「どう解釈したか」と「長所・注意点」を書く。
//   - 解答例の SQL は改行を残したいのでテンプレート文字列で書く（中にドル記号+波かっこは書かない）。
//   - 結果の列名は、受け取った人が読める日本語の別名にする。記号や数字で始まる別名は "..." で囲む。

PROBLEMS.push(
  // ---------------------------------------------------------------------------
  {
    id: 'P01',
    level: 'practice',
    category: '売上分析',
    title: '月次売上レポート',
    desc: '（経営企画の課長より）来週の経営会議で、2025年の売上がどう推移したかを見せたいんだ。'
      + '月ごとの売上をまとめてもらえる？件数も分かるとうれしい。グラフにするつもりだから、そのまま使える形だと助かるよ。',
    hint: '「売上」にどの注文（status）を含めるか、送料を含めるかを先に決めましょう。'
      + '注文が1件もない月があると GROUP BY だけではその月の行が出ません。月の一覧を再帰CTEで作って LEFT JOIN する方法があります。',
    checkpoints: [
      'キャンセル（cancelled）と返品（returned）の注文を売上から除いたか。除く・別に出す、どちらにしても理由を説明できるか。',
      '発送済み・未着（shipped）の注文を売上に含めるか決めたか（12月末の注文が該当する）。',
      '売上金額に送料を含めるか決め、列名などで分かるようにしたか。',
      '注文が1件もない月（2025年8月）が結果から抜けていないか。グラフにするなら 0 の行があったほうがよいか考えたか。',
      '「件数」が注文の件数なのか明細の行数なのか、意図どおりに数えているか（JOIN 後に COUNT(*) すると明細の行数になる）。',
      '月の合計を足すと、年間の売上と一致するか。',
    ],
    examples: [
      {
        sql: `SELECT strftime('%Y-%m', o.ordered_on) AS 年月,
       COUNT(DISTINCT o.id) AS 注文件数,
       SUM(oi.quantity * oi.unit_price) AS 売上金額
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status IN ('delivered', 'shipped')
GROUP BY strftime('%Y-%m', o.ordered_on)
ORDER BY 年月`,
        note: '解釈: 売上は delivered と shipped の注文の商品代金（送料は含めない）。件数は注文の件数（COUNT(DISTINCT o.id)）。'
          + '長所: いちばん素直で、社内の「売上」の定義（キャンセル・返品を除く）に合う。'
          + '注意点: 注文のない8月の行が出ないので、そのままグラフにすると8月が飛ばされて推移を読み違える。',
      },
      {
        sql: `WITH RECURSIVE months(ym) AS (
  SELECT '2025-01'
  UNION ALL
  SELECT strftime('%Y-%m', ym || '-01', '+1 month') FROM months WHERE ym < '2025-12'
),
order_totals AS (
  SELECT o.id, strftime('%Y-%m', o.ordered_on) AS ym, o.status,
         SUM(oi.quantity * oi.unit_price) AS amount
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id, o.ordered_on, o.status
)
SELECT m.ym AS 年月,
       COUNT(CASE WHEN t.status IN ('delivered', 'shipped') THEN 1 END) AS 有効注文件数,
       COALESCE(SUM(CASE WHEN t.status IN ('delivered', 'shipped') THEN t.amount END), 0) AS 売上金額,
       COUNT(CASE WHEN t.status IN ('cancelled', 'returned') THEN 1 END) AS キャンセル返品件数,
       COALESCE(SUM(CASE WHEN t.status IN ('cancelled', 'returned') THEN t.amount END), 0) AS キャンセル返品金額
FROM months m
LEFT JOIN order_totals t ON t.ym = m.ym
GROUP BY m.ym
ORDER BY m.ym`,
        note: '解釈: 1月〜12月の全ての月を出し、8月は 0 とする。キャンセル・返品は売上から除いたうえで、別の列に件数と金額を出す。'
          + '長所: グラフにしても月が飛ばない。「キャンセルが多い月」も同時に見られ、会議で質問されても答えやすい。'
          + '注意点: 先に注文ごとの合計（order_totals）を作ってから月で集計している。明細を直接 JOIN して COUNT(*) すると件数が明細の行数になってしまう。',
      },
      {
        sql: `WITH RECURSIVE months(ym) AS (
  SELECT '2025-01'
  UNION ALL
  SELECT strftime('%Y-%m', ym || '-01', '+1 month') FROM months WHERE ym < '2025-12'
),
order_totals AS (
  SELECT o.id, strftime('%Y-%m', o.ordered_on) AS ym, o.shipping_fee,
         SUM(oi.quantity * oi.unit_price) AS amount
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status = 'delivered'
  GROUP BY o.id, o.ordered_on, o.shipping_fee
)
SELECT m.ym AS 年月,
       COUNT(t.id) AS 配達済み注文件数,
       COALESCE(SUM(t.amount), 0) AS 商品売上,
       COALESCE(SUM(t.shipping_fee), 0) AS 送料,
       COALESCE(SUM(t.amount + t.shipping_fee), 0) AS 送料込み売上,
       CAST(ROUND(AVG(t.amount)) AS INTEGER) AS 平均客単価
FROM months m
LEFT JOIN order_totals t ON t.ym = m.ym
GROUP BY m.ym
ORDER BY m.ym`,
        note: '解釈: 「確定した売上」だけを見たいと考え、配達済み（delivered）のみを対象にした。送料を含む・含まないの両方と、1注文あたりの平均（客単価）を出す。'
          + '長所: 経理の数字（入金ベース）と比べやすい。送料の影響も分かる。'
          + '注意点: 12月末の shipped（未着）を含めないので、解答例1・2より12月の売上が小さくなる。8月の平均客単価は注文がないため NULL（空欄）になる。どの定義を使ったかを資料に書き添える。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P02',
    level: 'practice',
    category: '顧客分析',
    title: '休眠顧客にクーポンを送りたい',
    desc: '（販促担当より）最近買ってくれていない、いわゆる休眠のお客さんに「おかえりクーポン」をメールで送りたいんです。'
      + '対象者のリストを作ってもらえますか？今日は 2026-01-01 です。',
    hint: '「休眠」の定義（最後の購入から何日たったら休眠か）を自分で決め、顧客ごとの最終注文日を MAX で求めます。'
      + '経過日数は julianday(\'2026-01-01\') - julianday(最終注文日) で計算できます。'
      + '一度も買っていない会員を含めるなら LEFT JOIN が必要です。',
    checkpoints: [
      '休眠の定義（最終購入から何日以上か）を決め、その基準日（2026-01-01）からの日数の境界が正しいか。',
      'キャンセル・返品だけの注文を「購入」と数えていないか（キャンセルの注文しかない顧客がいる）。',
      '一度も購入していない会員を対象に含めるか決めたか。含めるなら、登録したばかりの人まで「休眠」にしていないか。',
      'メールで送るのに、メールアドレスが NULL の顧客をどう扱ったか（除く／別に知らせる）。',
      '同じ人が二重に登録されている（佐藤 花子）ようなケースで、同じ人に2通送ったり、実は最近買っている人に送ったりしないか考えたか。',
    ],
    examples: [
      {
        sql: `SELECT c.id AS 顧客ID,
       c.name AS 氏名,
       c.email AS メールアドレス,
       MAX(o.ordered_on) AS 最終注文日,
       CAST(julianday('2026-01-01') - julianday(MAX(o.ordered_on)) AS INTEGER) AS 経過日数,
       COUNT(*) AS 有効注文件数
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status IN ('delivered', 'shipped')
  AND c.email IS NOT NULL
GROUP BY c.id, c.name, c.email
HAVING julianday('2026-01-01') - julianday(MAX(o.ordered_on)) >= 90
ORDER BY 最終注文日, c.id`,
        note: '解釈: 休眠 =「有効な注文（delivered・shipped）が過去にあり、最後の注文から 90 日以上たった顧客」。メールを送れない（email が NULL）人は除く。'
          + '長所: 「以前は買ってくれていた人」に絞るので、クーポンの効果が見込みやすい。経過日数の長い順（最終注文日の古い順）に並べている。'
          + '注意点: 一度も買っていない会員は INNER JOIN で落ちる。90 日という基準は仮のもので、依頼者と合意しておく。',
      },
      {
        sql: `WITH last_order AS (
  SELECT customer_id, MAX(ordered_on) AS last_on
  FROM orders
  WHERE status IN ('delivered', 'shipped')
  GROUP BY customer_id
)
SELECT c.id AS 顧客ID,
       c.name AS 氏名,
       COALESCE(c.email, '（メール未登録）') AS メールアドレス,
       c.registered_on AS 登録日,
       l.last_on AS 最終注文日,
       CASE WHEN l.last_on IS NULL THEN '未購入' ELSE '購入後に休眠' END AS 区分
FROM customers c
LEFT JOIN last_order l ON l.customer_id = c.id
WHERE COALESCE(l.last_on, c.registered_on) <= date('2026-01-01', '-180 days')
ORDER BY 区分, COALESCE(l.last_on, c.registered_on), c.id`,
        note: '解釈: 休眠 =「最後の有効な注文から 180 日以上」。一度も買っていない会員も、登録から 180 日以上たっていれば対象にし、区分の列で分ける。メール未登録の人も残して、そのことが分かるようにする。'
          + '長所: 販促担当が「未購入者にも送るか」「メール以外で連絡するか」を結果を見て判断できる。'
          + '注意点: キャンセルしかない顧客は「未購入」扱いになる（last_order は有効な注文だけで作っているため）。'
          + '二重登録の顧客は、この SQL では別人として扱われる。名寄せ（同じ人をまとめる）が必要かは依頼者に確認する。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P03',
    level: 'practice',
    category: '顧客分析',
    title: 'リピート率を知りたい',
    desc: '（マーケティング部長より）うちのお店って、リピートしてくれるお客さんはどのくらいいるの？'
      + '2回以上買ってくれた人の割合をざっくり知りたい。2025年の数字でいいよ。',
    hint: '顧客ごとの購入回数を先に集計し（CTE かサブクエリ）、その結果を数えます。'
      + '割合は 100.0 * 分子 / 分母 のように小数にしてから割ります（整数どうしの割り算は切り捨て）。分母を何にするかで値が変わります。',
    checkpoints: [
      '割合の分母を「購入したことがある人」にしたか「会員全員」にしたかを決め、結果に明示したか。',
      'キャンセル・返品の注文を「購入1回」と数えていないか。',
      '同じ日に2回注文した人を「2回」と数えるか「1日=1回」と数えるか考えたか（同じ顧客が同じ日に2件注文しているデータがある）。',
      '会員テーブルにいない顧客ID（退会して削除された顧客）の注文を、数えるか除くか決めたか。',
      '整数の割り算で 0 や切り捨てになっていないか。割合の丸め方を決めたか。',
    ],
    examples: [
      {
        sql: `WITH per_customer AS (
  SELECT customer_id, COUNT(*) AS cnt
  FROM orders
  WHERE status IN ('delivered', 'shipped')
  GROUP BY customer_id
)
SELECT COUNT(*) AS 購入者数,
       SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS リピーター数,
       ROUND(100.0 * SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS "リピート率(%)"
FROM per_customer`,
        note: '解釈: 分母は「有効な注文が1件以上ある人」、リピーターは「有効な注文が2件以上ある人」。orders だけで数えるので、会員テーブルにいない顧客ID の注文も1人として数える。'
          + '長所: 1行で答えが出て、「買った人のうち何割がまた買ったか」という一般的なリピート率になる。'
          + '注意点: 同じ日の2件の注文も2回と数える。二重登録の人は2人として数えている。',
      },
      {
        sql: `WITH person AS (
  SELECT id AS customer_id,
         MIN(id) OVER (PARTITION BY name, birth_date, email) AS person_id
  FROM customers
),
visits AS (
  SELECT p.person_id, COUNT(DISTINCT o.ordered_on) AS days
  FROM person p
  JOIN orders o ON o.customer_id = p.customer_id
  WHERE o.status IN ('delivered', 'shipped')
  GROUP BY p.person_id
)
SELECT (SELECT COUNT(DISTINCT person_id) FROM person) AS 会員数_名寄せ後,
       COUNT(*) AS 購入者数,
       SUM(CASE WHEN days >= 2 THEN 1 ELSE 0 END) AS リピーター数,
       ROUND(100.0 * SUM(CASE WHEN days >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS "購入者に対するリピート率(%)",
       ROUND(100.0 * SUM(CASE WHEN days >= 2 THEN 1 ELSE 0 END)
             / (SELECT COUNT(DISTINCT person_id) FROM person), 1) AS "会員に対するリピート率(%)"
FROM visits`,
        note: '解釈: 氏名・生年月日・メールが同じ会員を同じ人とみなしてまとめ（名寄せ）、購入回数は「注文した日の数」で数える（同じ日の2件は1回）。分母は購入者と会員全員の両方を出す。'
          + '長所: 「実際の人」と「来店の回数」に近い数字になり、2つの分母を並べることで率の意味の違いを説明できる。'
          + '注意点: 会員テーブルにいない顧客ID の注文は JOIN で落ちる。名寄せの条件（何が同じなら同じ人か）は仮のもので、業務の担当者に確認が必要。',
      },
      {
        sql: `WITH per_customer AS (
  SELECT customer_id, COUNT(*) AS cnt
  FROM orders
  WHERE status IN ('delivered', 'shipped')
  GROUP BY customer_id
)
SELECT CASE WHEN cnt >= 5 THEN '5回以上' ELSE cnt || '回' END AS 購入回数,
       COUNT(*) AS 人数,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS "構成比(%)"
FROM per_customer
GROUP BY CASE WHEN cnt >= 5 THEN '5回以上' ELSE cnt || '回' END
ORDER BY MIN(cnt)`,
        note: '解釈: 割合を1つの数字にまとめず、購入回数ごとの人数の分布で見せる。'
          + '長所: 「2回で止まる人が多い」「ヘビーユーザーが一部にいる」など、施策のヒントまで読み取れる。1回の人の構成比を 100 から引けばリピート率になる。'
          + '注意点: 「ざっくり知りたい」という依頼に対しては情報が多いので、解答例1の数字と一緒に補足資料として出すのがよい。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P04',
    level: 'practice',
    category: '在庫管理',
    title: '発注したほうがいい商品',
    desc: '（物流部の部長より）年末年始で在庫が心配なんだ。そろそろ発注したほうがいい商品をリストアップしてくれる？'
      + '今日は 2026-01-01 だよ。',
    hint: 'まずは在庫数（stock）だけで考え、次に「どのくらいのペースで売れているか」と比べる方法を考えます。'
      + '販売数量は有効な注文の order_items.quantity を合計します。売れていない商品も見たいなら LEFT JOIN です。',
    checkpoints: [
      '「発注が必要」の基準を、在庫数の絶対値にしたか、売れるペース（何か月分の在庫があるか）にしたか。その理由を説明できるか。',
      '廃番の商品（is_discontinued = 1）を対象から外したか。',
      '売れるペースを見る期間（年間か、直近の数か月か）を決め、期間の境界は正しいか。',
      'キャンセル・返品の注文の数量を販売数に含めていないか。',
      '在庫が 0 の商品や、最近まったく売れていない商品が、意図せず結果から落ちていないか（または意図して外したか）。',
    ],
    examples: [
      {
        sql: `SELECT p.id AS 商品ID,
       p.name AS 商品名,
       p.stock AS 在庫数,
       COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped') THEN oi.quantity END), 0) AS 年間販売数
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
WHERE p.is_discontinued = 0
  AND p.stock <= 10
GROUP BY p.id, p.name, p.stock
ORDER BY p.stock, p.id`,
        note: '解釈: 販売中（廃番でない）で、在庫が 10 個以下の商品を候補とする。判断の材料として2025年の販売数も付ける。'
          + '長所: 基準が分かりやすく、すぐに出せる。在庫の少ない順に並ぶので上から確認していける。'
          + '注意点: 「10 個」は仮の基準。よく売れる安い商品（ボールペンなど）は在庫が多くても足りなくなることがあり、逆にほとんど売れない高額商品が候補に入る。',
      },
      {
        sql: `WITH recent AS (
  SELECT oi.product_id, SUM(oi.quantity) AS qty
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('delivered', 'shipped')
    AND o.ordered_on >= '2025-10-01' AND o.ordered_on < '2026-01-01'
  GROUP BY oi.product_id
)
SELECT p.id AS 商品ID,
       p.name AS 商品名,
       p.stock AS 在庫数,
       r.qty AS 直近3か月の販売数,
       ROUND(r.qty / 3.0, 1) AS 月平均販売数,
       ROUND(p.stock / (r.qty / 3.0), 1) AS 在庫月数,
       CAST(ceil(r.qty * 2 / 3.0) AS INTEGER) - p.stock AS 発注目安数
FROM products p
JOIN recent r ON r.product_id = p.id
WHERE p.is_discontinued = 0
  AND p.stock < r.qty * 2 / 3.0
ORDER BY 在庫月数, p.id`,
        note: '解釈: 直近3か月（2025-10-01〜2025-12-31）の販売ペースから「在庫が何か月分あるか」を求め、2か月分を下回る商品を候補とする。発注目安数は「2か月分にするために足りない数」。'
          + '長所: 売れ行きを考えた基準なので、在庫が多くてもよく売れる商品を拾える。発注の数まで提案できる。'
          + '注意点: 直近3か月に1つも売れていない商品は対象外になる。年末は需要が増える時期なので、ペースを多めに見積もっている可能性がある。「2か月分」も仮の基準で、仕入れにかかる日数を物流部に確認したい。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P05',
    level: 'practice',
    category: '商品分析',
    title: '商品のABC分析',
    desc: '（商品企画の課長より）商品数が増えてきたから、ABC分析をして、重点的に管理する商品を決めたいの。'
      + '2025年のデータで、商品ごとに A・B・C のどれになるか出してもらえる？',
    hint: 'ABC分析は、商品を売上の大きい順に並べ、累積の構成比（上から足していった割合）で A・B・C に分けます。'
      + '累積の合計は SUM(...) OVER (ORDER BY 売上 DESC, id) で求められます。'
      + '何の大きさで並べるか（売上金額・数量・粗利）と、区切り（70%・90% など）は自分で決めます。',
    checkpoints: [
      '何を基準にしたか（売上金額・販売数量・粗利）を決め、その理由を説明できるか。',
      'A・B・C の区切り（例: 累積 70%・90%、80%・95%）を決め、境界をまたぐ商品をどちらに入れるか決めたか。',
      'キャンセル・返品の注文を売上から除いたか。',
      '一度も売れていない商品を結果に含めたか（含めるなら C）。原価が NULL の商品のように計算できないものをどう扱ったか。',
      '売上が同じ商品があるとき、累積の計算の順番が毎回同じになるか（ORDER BY に商品IDを足したか）。',
      '構成比の合計が 100% になり、商品数が元データと矛盾しないか。',
    ],
    examples: [
      {
        sql: `WITH sales AS (
  SELECT p.id, p.name, SUM(oi.quantity * oi.unit_price) AS amount
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('delivered', 'shipped')
  GROUP BY p.id, p.name
),
ranked AS (
  SELECT id, name, amount,
         SUM(amount) OVER (ORDER BY amount DESC, id ROWS UNBOUNDED PRECEDING) AS cum,
         SUM(amount) OVER () AS total
  FROM sales
)
SELECT id AS 商品ID,
       name AS 商品名,
       amount AS 売上金額,
       ROUND(100.0 * amount / total, 1) AS "構成比(%)",
       ROUND(100.0 * cum / total, 1) AS "累積構成比(%)",
       CASE WHEN 100.0 * (cum - amount) / total < 70 THEN 'A'
            WHEN 100.0 * (cum - amount) / total < 90 THEN 'B'
            ELSE 'C' END AS ランク
FROM ranked
ORDER BY amount DESC, id`,
        note: '解釈: 売上金額（delivered・shipped、送料なし）で並べ、累積 70% までを A、90% までを B、残りを C とする。'
          + '「自分より上の商品までの累積（cum - amount）」が 70% 未満なら A にするので、70% をまたぐ商品は A に入る。'
          + '長所: いちばん一般的なABC分析で、説明しやすい。'
          + '注意点: 売れていない商品は JOIN で落ちて結果に出ない。境界の商品を A に入れるか B に入れるかで A の数が1つ変わるので、ルールを資料に書く。',
      },
      {
        sql: `WITH profit AS (
  SELECT p.id, p.name, p.cost,
         COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped')
                           THEN oi.quantity * (oi.unit_price - p.cost) END), 0) AS gross
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  GROUP BY p.id, p.name, p.cost
),
ranked AS (
  SELECT id, name, gross,
         SUM(gross) OVER (ORDER BY gross DESC, id ROWS UNBOUNDED PRECEDING) AS cum,
         SUM(gross) OVER () AS total
  FROM profit
  WHERE cost IS NOT NULL
)
SELECT id AS 商品ID,
       name AS 商品名,
       gross AS 粗利,
       ROUND(100.0 * cum / total, 1) AS "累積構成比(%)",
       CASE WHEN gross = 0 THEN 'C（販売なし）'
            WHEN 100.0 * (cum - gross) / total < 80 THEN 'A'
            WHEN 100.0 * (cum - gross) / total < 95 THEN 'B'
            ELSE 'C' END AS ランク
FROM ranked
UNION ALL
SELECT id, name, NULL, NULL, '要確認（原価未登録）'
FROM profit
WHERE cost IS NULL
ORDER BY 粗利 DESC NULLS LAST, 商品ID`,
        note: '解釈: 「もうけへの貢献」で管理したいと考え、粗利（(販売単価 - 原価) × 数量）で並べる。区切りは 80%・95%。全40商品を出し、売れていない商品は C、原価が未登録の商品は計算せず「要確認」とする。'
          + '長所: 安くて大量に売れる商品より、利益を生む商品が A に来る。全商品が載るので「どの商品が抜けたか」を気にしなくてよい。'
          + '注意点: 原価は現在の値で計算しているので、原価が年の途中で変わっていたら正確ではない。原価未登録の商品はランク付けできないため、商品企画に原価の登録を依頼する必要がある。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P06',
    level: 'practice',
    category: '商品分析',
    title: 'カテゴリ別の売れ筋と不振',
    desc: '（商品企画の部長より）来月の商品会議で、カテゴリごとに「よく売れている商品」と「売れていない商品」を確認したい。'
      + '2025年の実績でまとめてもらえるかな。入れ替えを検討する材料にしたいんだ。',
    hint: 'カテゴリは3階層（例: キッチン ＞ 食器 ＞ 和食器）なので、どの階層でまとめるかを決めます。'
      + 'カテゴリ内の順位は ROW_NUMBER() OVER (PARTITION BY カテゴリ ORDER BY ...) で付けられます。'
      + '売れていない商品も出すには products から LEFT JOIN します。',
    checkpoints: [
      'カテゴリをどの階層（商品の直属のカテゴリ／最上位のカテゴリ）でまとめたか決めたか。',
      '「売れ筋」「不振」を何で測るか（売上金額・販売数量）と、不振の定義（最下位・販売0・一定以下）を決めたか。',
      '一度も売れていない商品が結果から落ちていないか（LEFT JOIN と COALESCE）。キャンセル・返品は除いたか。',
      '2025年の途中で発売された商品を、年間の販売数だけで「不振」と判断していないか。',
      '廃番の商品を入れ替えの検討対象に含めるか決めたか。',
      '売上が同じ商品や、商品が1つしかないカテゴリで、同じ商品が売れ筋と不振の両方に出たり順番が不定になったりしないか。',
    ],
    examples: [
      {
        sql: `WITH sales AS (
  SELECT p.id, p.name, p.category_id,
         COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped')
                           THEN oi.quantity * oi.unit_price END), 0) AS amount
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  GROUP BY p.id, p.name, p.category_id
),
ranked AS (
  SELECT id, name, category_id, amount,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY amount DESC, id) AS rn_top,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY amount, id) AS rn_bottom,
         COUNT(*) OVER (PARTITION BY category_id) AS n
  FROM sales
)
SELECT c.name AS カテゴリ,
       r.n AS 商品数,
       CASE WHEN r.rn_top = 1 THEN '売れ筋' ELSE '不振' END AS 区分,
       r.name AS 商品名,
       r.amount AS 売上金額
FROM ranked r
JOIN categories c ON c.id = r.category_id
WHERE r.rn_top = 1 OR (r.rn_bottom = 1 AND r.n >= 2)
ORDER BY c.id, r.rn_top`,
        note: '解釈: 商品の直属のカテゴリごとに、売上金額の1位を「売れ筋」、最下位を「不振」として1つずつ出す。売れていない商品は売上 0 として含める。'
          + '長所: 結果が短く、会議でカテゴリごとに一目で比べられる。商品が1つしかないカテゴリは売れ筋だけを出すので、同じ商品が両方に出ない。'
          + '注意点: 最下位が同額（例: 0 円が2商品）のときは商品IDの小さい方だけが出る。「最下位」は売上が十分ある商品のこともあり、本当に不振かは別の基準が必要。',
      },
      {
        sql: `WITH top_cat AS (
  SELECT c.id,
         COALESCE(g.id, pc.id, c.id) AS top_id,
         COALESCE(g.name, pc.name, c.name) AS top_name
  FROM categories c
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN categories g ON g.id = pc.parent_id
),
sales AS (
  SELECT p.id, p.name, p.category_id, p.is_discontinued,
         CASE WHEN p.released_on < '2025-01-01' THEN 12
              ELSE 13 - CAST(strftime('%m', p.released_on) AS INTEGER) END AS months,
         COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped') THEN oi.quantity END), 0) AS qty,
         COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'shipped')
                           THEN oi.quantity * oi.unit_price END), 0) AS amount
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  GROUP BY p.id, p.name, p.category_id, p.is_discontinued, p.released_on
)
SELECT t.top_name AS 大カテゴリ,
       s.name AS 商品名,
       CASE WHEN s.is_discontinued = 1 THEN '廃番' ELSE '販売中' END AS 状態,
       s.months AS 販売月数,
       s.qty AS 販売数量,
       s.amount AS 売上金額,
       ROUND(1.0 * s.qty / s.months, 1) AS 月平均販売数,
       ROUND(100.0 * s.amount / SUM(s.amount) OVER (PARTITION BY t.top_id), 1) AS "カテゴリ内シェア(%)",
       CASE WHEN s.qty = 0 THEN '不振（販売なし）'
            WHEN 1.0 * s.qty / s.months < 0.5 THEN '不振（月0.5個未満）'
            ELSE '' END AS 判定
FROM sales s
JOIN top_cat t ON t.id = s.category_id
ORDER BY t.top_id, 1.0 * s.amount / s.months DESC, s.id`,
        note: '解釈: 最上位のカテゴリ（キッチン・インテリア・文房具）でまとめ、全商品を出す。2025年に発売された商品もあるので、販売できた月数で割った「月平均販売数」で不振を判定する。廃番かどうかも列で示す。'
          + '長所: 発売が遅かった商品を不当に「不振」にしない。カテゴリ内シェアで売れ筋の偏りも分かる。'
          + '注意点: 行数が多く、会議資料としては絞り込みが必要。販売月数は発売月を1か月と数える簡易な計算で、8月の休止も考えていない。「月0.5個未満」は仮の基準。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P07',
    level: 'practice',
    category: '商品分析',
    title: 'レビュー評価と売上の関係',
    desc: '（カスタマーサポートのリーダーより）レビューの評価が高い商品って、ちゃんと売れているんでしょうか？'
      + 'レビューに力を入れるべきか判断したいので、評価と売上の関係が分かるものを出してもらえますか？',
    hint: 'レビューの平均評価と売上は、それぞれ商品ごとに集計してから商品で結合します（2つを先に JOIN してから集計すると、行が掛け算で増えて合計が狂います）。'
      + 'レビューのデータに、同じ人の重複や、購入していない人の投稿がないかも確かめましょう。',
    checkpoints: [
      'レビューと明細をそのまま JOIN して集計し、件数や売上が水増しされていないか（商品ごとに集計してから結合したか）。',
      '同じ顧客が同じ商品に複数回レビューしているデータを、そのまま数えるか、最新の1件にするか決めたか。',
      '注文が1件もない顧客のレビュー（購入していない人の評価）を含めるか決めたか。',
      'レビューのない商品や売れていない商品を結果に含めたか、除いたか。その理由を説明できるか。',
      '「売上」を金額で見るか数量で見るか、キャンセル・返品を除いたかを決めたか。',
      'レビュー件数が少ない商品の平均評価を、他と同じ重みで比べてよいか考えたか。',
    ],
    examples: [
      {
        sql: `WITH rv AS (
  SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS n
  FROM reviews
  GROUP BY product_id
),
sales AS (
  SELECT oi.product_id, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price) AS amount
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('delivered', 'shipped')
  GROUP BY oi.product_id
)
SELECT p.id AS 商品ID,
       p.name AS 商品名,
       ROUND(rv.avg_rating, 2) AS 平均評価,
       rv.n AS レビュー件数,
       COALESCE(s.qty, 0) AS 販売数量,
       COALESCE(s.amount, 0) AS 売上金額
FROM products p
JOIN rv ON rv.product_id = p.id
LEFT JOIN sales s ON s.product_id = p.id
ORDER BY rv.avg_rating DESC, p.id`,
        note: '解釈: レビューのある商品について、全レビューの平均評価と件数、2025年の販売数量・売上金額（delivered・shipped）を並べる。'
          + '長所: 商品ごとの具体的な数字が見られ、「評価は高いのに売れていない商品」などを個別に拾える。'
          + '注意点: 重複レビューや購入していない人のレビューもそのまま数えている。レビューのない商品は出ないので、「レビューがあるから売れる」のか比べることはできない。',
      },
      {
        sql: `WITH cleaned AS (
  SELECT r.product_id, r.rating,
         ROW_NUMBER() OVER (PARTITION BY r.customer_id, r.product_id
                            ORDER BY r.posted_on DESC, r.id DESC) AS rn
  FROM reviews r
  WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = r.customer_id)
),
rv AS (
  SELECT product_id, AVG(rating) AS avg_rating
  FROM cleaned
  WHERE rn = 1
  GROUP BY product_id
),
sales AS (
  SELECT oi.product_id, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price) AS amount
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('delivered', 'shipped')
  GROUP BY oi.product_id
),
banded AS (
  SELECT p.id,
         CASE WHEN rv.product_id IS NULL THEN 5
              WHEN rv.avg_rating >= 4.5 THEN 1
              WHEN rv.avg_rating >= 4.0 THEN 2
              WHEN rv.avg_rating >= 3.0 THEN 3
              ELSE 4 END AS band_no,
         COALESCE(s.qty, 0) AS qty,
         COALESCE(s.amount, 0) AS amount
  FROM products p
  LEFT JOIN rv ON rv.product_id = p.id
  LEFT JOIN sales s ON s.product_id = p.id
)
SELECT CASE band_no WHEN 1 THEN '4.5以上' WHEN 2 THEN '4.0以上4.5未満'
                    WHEN 3 THEN '3.0以上4.0未満' WHEN 4 THEN '3.0未満'
                    ELSE 'レビューなし' END AS 平均評価の帯,
       COUNT(*) AS 商品数,
       SUM(qty) AS 販売数量の合計,
       CAST(ROUND(AVG(amount)) AS INTEGER) AS 一商品あたりの平均売上
FROM banded
GROUP BY band_no
ORDER BY band_no`,
        note: '解釈: レビューを整えてから（同じ人の同じ商品へのレビューは最新の1件だけ、注文が1件もない人のレビューは除く）、商品を平均評価の帯に分け、帯ごとに1商品あたりの平均売上を比べる。レビューのない商品も1つの帯にする。'
          + '長所: 「評価が高い帯ほど売れているか」という依頼の問いに直接答えられる。データの不整合が平均評価をゆがめるのを防げる。'
          + '注意点: 帯ごとの商品数が少ないと、1商品の売上で平均が大きく動く。「売れているから評価が集まる」逆の因果もありうるので、結論は慎重に伝える。購入者かどうかを「その商品を買ったか」まで厳しく見るかは依頼者と相談する。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P08',
    level: 'practice',
    category: 'コホート分析',
    title: '登録した時期ごとの継続（コホート）',
    desc: '（マーケティング部長より）会員登録した時期によって、その後も買い続けてくれているかに違いがあるのか知りたいんだ。'
      + '登録した月ごとに比べられるような表を作ってくれる？',
    hint: '会員を「登録月」でグループに分け（コホート）、グループごとに「その後も買ったか」を数えます。'
      + '「その後も買った」の定義（登録の翌月以降に買った、初回購入の1か月後・2か月後に買った など）を決めましょう。'
      + '月の差は「年 × 12 + 月」の差で求められます。',
    checkpoints: [
      '「継続」の定義（何か月後に買ったか、2回目の購入があったか など）を決め、説明できるか。',
      'グループ分けの基準を「会員登録月」にしたか「初回購入月」にしたか。データが2025年分しかないのに、2024年以前の登録者をどう扱ったか。',
      '登録したばかりの月（11月・12月など）のグループは、継続を判定できる期間が短いことを考えたか。',
      '注文がなかった月（2025年8月）が、継続の数字に影響することを考えたか。',
      'キャンセル・返品の注文を「購入」に含めていないか。登録しただけで一度も買っていない人を分母に含めたか。',
    ],
    examples: [
      {
        sql: `WITH valid AS (
  SELECT customer_id, ordered_on
  FROM orders
  WHERE status IN ('delivered', 'shipped')
),
cust AS (
  SELECT c.id,
         strftime('%Y-%m', c.registered_on) AS reg_month,
         EXISTS (SELECT 1 FROM valid v WHERE v.customer_id = c.id) AS bought,
         EXISTS (SELECT 1 FROM valid v
                 WHERE v.customer_id = c.id
                   AND strftime('%Y-%m', v.ordered_on) > strftime('%Y-%m', c.registered_on)) AS bought_later
  FROM customers c
  WHERE c.registered_on >= '2025-01-01'
)
SELECT reg_month AS 登録月,
       COUNT(*) AS 登録者数,
       SUM(bought) AS 購入した人数,
       SUM(bought_later) AS 登録翌月以降に購入した人数,
       ROUND(100.0 * SUM(bought_later) / COUNT(*), 1) AS "継続率(%)"
FROM cust
GROUP BY reg_month
ORDER BY reg_month`,
        note: '解釈: データのある2025年に登録した会員だけを登録月で分け、「登録した月の翌月以降にも有効な注文がある人」を継続とする。分母は登録者全員（買っていない人も含む）。'
          + '長所: 依頼どおり「登録した月ごと」で、表が12行と見やすい。登録しただけの人も分母に入るので、獲得した会員の質を比べられる。'
          + '注意点: 登録が遅い月ほど翌月以降の期間が短く、継続率が低く出るのは当然（12月の登録者はほぼ判定できない）。2024年以前の登録者は対象外にしている。',
      },
      {
        sql: `WITH valid AS (
  SELECT customer_id, ordered_on,
         CAST(strftime('%Y', ordered_on) AS INTEGER) * 12
           + CAST(strftime('%m', ordered_on) AS INTEGER) AS mi
  FROM orders
  WHERE status IN ('delivered', 'shipped')
),
first_buy AS (
  SELECT customer_id, MIN(mi) AS first_mi, MIN(ordered_on) AS first_on
  FROM valid
  GROUP BY customer_id
),
act AS (
  SELECT DISTINCT v.customer_id, v.mi - f.first_mi AS k
  FROM valid v
  JOIN first_buy f ON f.customer_id = v.customer_id
)
SELECT strftime('%Y-%m', f.first_on) AS 初回購入月,
       COUNT(DISTINCT f.customer_id) AS 人数,
       COUNT(DISTINCT CASE WHEN a.k = 1 THEN a.customer_id END) AS "1か月後に購入",
       COUNT(DISTINCT CASE WHEN a.k = 2 THEN a.customer_id END) AS "2か月後に購入",
       COUNT(DISTINCT CASE WHEN a.k = 3 THEN a.customer_id END) AS "3か月後に購入",
       COUNT(DISTINCT CASE WHEN a.k BETWEEN 1 AND 3 THEN a.customer_id END) AS "3か月以内に再購入"
FROM first_buy f
JOIN act a ON a.customer_id = f.customer_id
GROUP BY strftime('%Y-%m', f.first_on)
ORDER BY 初回購入月`,
        note: '解釈: 「初回購入月」でグループに分け、初回の1か月後・2か月後・3か月後に購入した人数を出す（コホート分析の典型的な表）。'
          + '長所: 何か月後に離れていくかという「継続の形」が見える。全ての購入者が対象になる。'
          + '注意点: データが2025年からなので、2024年以前からの会員は「2025年最初の購入」を初回とみなしてしまう（本当の初回ではない）。'
          + '依頼は「登録月ごと」なので、初回購入月に変えた理由を説明する必要がある。8月は注文がないため、7月の「1か月後」、6月の「2か月後」、5月の「3か月後」は必ず 0 になる。会員テーブルにいない顧客IDの注文も数えている。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P09',
    level: 'practice',
    category: 'データ品質',
    title: 'データにおかしなところがないか',
    desc: '（システム部の課長より）来期から新しい分析ツールにデータを移すんだけど、その前に今のデータにおかしなところがないか、一通り洗い出しておいてくれる？'
      + '見つかったものは、あとで担当部署に直してもらうつもり。',
    hint: '「おかしい」の種類を先に書き出しましょう。例: 存在しないIDを指している（NOT EXISTS）、重複している（GROUP BY ... HAVING COUNT(*) >= 2）、'
      + '業務のルールと合わない（送料）、NULL と空文字が混ざっている など。'
      + '種類ごとの SELECT を UNION ALL でつなげば1つの表にできます。',
    checkpoints: [
      'どんな観点（存在しない参照・重複・ルール違反・NULL と空文字の混在 など）で調べたかを一覧にでき、漏れがないか。',
      '存在しない顧客IDの注文のように、INNER JOIN すると見えなくなる不整合を見つけられたか。',
      '同じ人の二重登録を、何が同じなら同じ人とみなすか（氏名だけ／氏名と生年月日／メール）決めたか。同姓の別人を誤って重複にしていないか。',
      'NULL と空文字（\'\'）を区別して調べたか。',
      '直す担当者が使えるように、どのテーブルのどのIDかが分かる形にしたか。問題がなかった観点も「0件」と報告できるか。',
    ],
    examples: [
      {
        sql: `SELECT * FROM (
  SELECT '存在しない顧客の注文' AS 種類, 'orders' AS テーブル, o.id AS ID,
         'customer_id = ' || o.customer_id || ' が customers にない' AS 内容
  FROM orders o
  WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)
  UNION ALL
  SELECT '注文のない顧客のレビュー', 'reviews', r.id,
         'customer_id = ' || r.customer_id || ' には注文が1件もない'
  FROM reviews r
  WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = r.customer_id)
  UNION ALL
  SELECT '同じ顧客・同じ商品の重複レビュー', 'reviews', r.id,
         'customer_id = ' || r.customer_id || ', product_id = ' || r.product_id || ' に複数のレビュー'
  FROM reviews r
  WHERE (SELECT COUNT(*) FROM reviews r2
         WHERE r2.customer_id = r.customer_id AND r2.product_id = r.product_id) >= 2
  UNION ALL
  SELECT '二重登録の疑い', 'customers', c.id,
         '氏名・生年月日・メールが同じ顧客: id ' ||
         (SELECT group_concat(c2.id) FROM customers c2
          WHERE c2.id <> c.id AND c2.name = c.name
            AND c2.birth_date = c.birth_date AND c2.email = c.email)
  FROM customers c
  WHERE EXISTS (SELECT 1 FROM customers c2
                WHERE c2.id <> c.id AND c2.name = c.name
                  AND c2.birth_date = c.birth_date AND c2.email = c.email)
  UNION ALL
  SELECT 'クーポンコードが空文字', 'orders', o.id,
         'coupon_code が NULL ではなく空文字'
  FROM orders o
  WHERE o.coupon_code = ''
)
ORDER BY 種類, ID`,
        note: '解釈: 見つかった不整合を1行ずつ「種類・テーブル・ID・内容」で並べる。二重登録は「氏名・生年月日・メールがすべて同じ」場合とする（同姓の別人を拾わないため）。'
          + '長所: そのまま担当部署への修正依頼リストになる。どのIDを直せばよいかが分かる。'
          + '注意点: 見つからなかった観点は行が出ないので、「調べたが0件だった」ことが伝わらない（解答例2で補う）。二重登録の片方（あとから登録した方）で新規会員クーポンが使われているかなど、業務上の影響は別に確認する。',
      },
      {
        sql: `SELECT 1 AS No, '存在しない顧客の注文' AS チェック項目,
       (SELECT COUNT(*) FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)) AS 件数
UNION ALL
SELECT 2, '存在しない注文・商品を指す明細',
       (SELECT COUNT(*) FROM order_items oi
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.order_id)
           OR NOT EXISTS (SELECT 1 FROM products p WHERE p.id = oi.product_id))
UNION ALL
SELECT 3, '明細が1行もない注文',
       (SELECT COUNT(*) FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id))
UNION ALL
SELECT 4, '送料のルール（明細合計5000円以上で0円、未満で500円）と合わない注文',
       (SELECT COUNT(*) FROM (
          SELECT o.id, o.shipping_fee, SUM(oi.quantity * oi.unit_price) AS total
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          GROUP BY o.id, o.shipping_fee) t
        WHERE t.shipping_fee <> CASE WHEN t.total >= 5000 THEN 0 ELSE 500 END)
UNION ALL
SELECT 5, '存在しない商品・顧客を指すレビュー',
       (SELECT COUNT(*) FROM reviews r
        WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = r.product_id)
           OR NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = r.customer_id))
UNION ALL
SELECT 6, '注文が1件もない顧客のレビュー',
       (SELECT COUNT(*) FROM reviews r
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = r.customer_id))
UNION ALL
SELECT 7, '同じ顧客・同じ商品への重複レビュー（組の数）',
       (SELECT COUNT(*) FROM (
          SELECT customer_id, product_id FROM reviews
          GROUP BY customer_id, product_id HAVING COUNT(*) >= 2))
UNION ALL
SELECT 8, '氏名と生年月日が同じ顧客（組の数）',
       (SELECT COUNT(*) FROM customers a
        JOIN customers b ON a.id < b.id AND a.name = b.name AND a.birth_date = b.birth_date)
UNION ALL
SELECT 9, 'クーポンコードが空文字の注文',
       (SELECT COUNT(*) FROM orders WHERE coupon_code = '')
UNION ALL
SELECT 10, '注文日が2025年の外にある注文',
       (SELECT COUNT(*) FROM orders
        WHERE ordered_on < '2025-01-01' OR ordered_on > '2025-12-31')
UNION ALL
SELECT 11, '（参考）メールアドレスが未登録の顧客',
       (SELECT COUNT(*) FROM customers WHERE email IS NULL)
ORDER BY No`,
        note: '解釈: 調べた観点ごとに件数だけを出す「点検表」にする。問題のなかった観点も 0 件として載せる。'
          + '長所: 何を調べたかが一目で分かり、「漏れなく点検した」ことを報告できる。来期以降も同じ SQL で定期的に点検できる。'
          + '注意点: 件数しか出ないので、直すには解答例1のような明細が別に必要。メール未登録は入力が任意なら不整合ではないので「参考」とした。何を不整合とみなすかは、業務の担当者と合意する。',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'P10',
    level: 'practice',
    category: '人事分析',
    title: '部署別の人件費と人員構成',
    desc: '（総務部長より）来年度の予算を組むので、部署ごとの人件費と、どんな人がいるか（人員の構成）をまとめてもらえますか？'
      + '今日は 2026-01-01 です。',
    hint: '「今いる人」で見るか「2025年の実績」で見るかを決めます。在籍中は left_on IS NULL です。'
      + '部署のない社員や社員のいない部署も行として出すには、部署の一覧を基準に LEFT JOIN します（NULL どうしを結びつけるには IS が使えます）。',
    checkpoints: [
      '退職者を含めるか決めたか（来年度の予算なら在籍者、2025年の実績なら退職者の在籍期間分も入る）。',
      '部署に所属していない社員（社長・配属前の新入社員）を、どこにも数えずに落としていないか。',
      '社員のいない部署を 0 として出したか、出さないと決めたか。',
      'salary を月給とみなすか年額とみなすか、前提を依頼者に確認すべき点として挙げられるか。',
      '「人員の構成」を何で表したか（人数・管理職の数・勤続年数・年齢 など）。',
      '部署ごとの人数の合計が、社員テーブルの人数と矛盾しないか。',
    ],
    examples: [
      {
        sql: `WITH dept AS (
  SELECT id, name FROM departments
  UNION ALL
  SELECT NULL, '（部署なし）'
),
active AS (
  SELECT e.*,
         EXISTS (SELECT 1 FROM employees s
                 WHERE s.manager_id = e.id AND s.left_on IS NULL) AS is_manager
  FROM employees e
  WHERE e.left_on IS NULL
)
SELECT d.name AS 部署,
       COUNT(a.id) AS 在籍人数,
       COALESCE(SUM(a.is_manager), 0) AS 部下のいる人数,
       COALESCE(SUM(a.salary), 0) AS 月額人件費,
       CAST(ROUND(AVG(a.salary)) AS INTEGER) AS 平均月給,
       ROUND(AVG((julianday('2026-01-01') - julianday(a.hired_on)) / 365.25), 1) AS 平均勤続年数
FROM dept d
LEFT JOIN active a ON a.department_id IS d.id
GROUP BY d.id, d.name
ORDER BY d.id IS NULL, d.id`,
        note: '解釈: 予算のための資料なので、今日（2026-01-01）在籍している社員だけを数える。salary は月給とみなし、月額の合計を出す。全部署（社員のいない部署は 0）と「部署なし」の行を出す。構成は部下のいる人数（管理職）と平均勤続年数で表す。'
          + '長所: 来年度の人件費の見込み（月額 × 12）にそのまま使える。部署なしの社員も漏れない。'
          + '注意点: salary が月給かどうかは確認が必要。配属前の新入社員は配属先が決まると数字が動く。社員のいない部署は平均が NULL（空欄）になる。',
      },
      {
        sql: `WITH RECURSIVE months(m) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM months WHERE m < '2025-12-01'
),
dept AS (
  SELECT id, name FROM departments
  UNION ALL
  SELECT NULL, '（部署なし）'
),
emp_month AS (
  SELECT e.id, e.department_id, e.salary, mo.m
  FROM employees e
  JOIN months mo
    ON e.hired_on <= date(mo.m, '+1 month', '-1 day')
   AND (e.left_on IS NULL OR e.left_on >= date(mo.m, '+1 month', '-1 day'))
)
SELECT d.name AS 部署,
       COUNT(DISTINCT em.id) AS 年間の在籍者数,
       COUNT(em.id) AS 延べ人月,
       COALESCE(SUM(em.salary), 0) AS 人件費_2025年実績,
       (SELECT COUNT(*) FROM employees e
        WHERE e.department_id IS d.id AND e.left_on IS NULL) AS 期末の在籍人数,
       (SELECT COALESCE(SUM(e.salary), 0) * 12 FROM employees e
        WHERE e.department_id IS d.id AND e.left_on IS NULL) AS 来年度見込み_月給x12
FROM dept d
LEFT JOIN emp_month em ON em.department_id IS d.id
GROUP BY d.id, d.name
ORDER BY d.id IS NULL, d.id`,
        note: '解釈: 2025年の実績として、月末に在籍していた月ごとに月給を計上する（途中入社・途中退職の人は在籍した月の分だけ）。比較のため、期末の在籍者で計算した来年度の見込み（月給 × 12）も並べる。'
          + '長所: 退職や入社で今年と来年の人件費がどう変わるかを説明できる。'
          + '注意点: 社員の部署は現在の値なので、年の途中で異動した人がいても分からない。月の途中の入退社は「月末に在籍していればその月は満額」とする簡易な計算。賞与や社会保険料は含まない。',
      },
      {
        sql: `WITH dept AS (
  SELECT id, name FROM departments
  UNION ALL
  SELECT NULL, '（部署なし）'
),
active AS (
  SELECT id, department_id,
         (julianday('2026-01-01') - julianday(hired_on)) / 365.25 AS years
  FROM employees
  WHERE left_on IS NULL
)
SELECT d.name AS 部署,
       COUNT(a.id) AS 在籍人数,
       SUM(CASE WHEN a.years < 3 THEN 1 ELSE 0 END) AS 勤続3年未満,
       SUM(CASE WHEN a.years >= 3 AND a.years < 10 THEN 1 ELSE 0 END) AS 勤続3年以上10年未満,
       SUM(CASE WHEN a.years >= 10 THEN 1 ELSE 0 END) AS 勤続10年以上
FROM dept d
LEFT JOIN active a ON a.department_id IS d.id
GROUP BY d.id, d.name
ORDER BY d.id IS NULL, d.id`,
        note: '解釈: 「人員の構成」を勤続年数の分布として表す（在籍者のみ）。人件費は解答例1・2で出し、この表は構成の補足資料とする。'
          + '長所: 若手が多い部署・ベテランに偏っている部署が分かり、採用や育成の予算を考える材料になる。'
          + '注意点: 勤続年数は 365.25 日を1年とした概算。年齢（生年月日）は社員テーブルにないので、年齢構成は出せないことを依頼者に伝える。',
      },
    ],
  }
);
