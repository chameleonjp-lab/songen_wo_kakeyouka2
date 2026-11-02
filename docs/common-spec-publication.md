# 尊厳を賭けようか2: 検証付き公開の準備（共通仕様の部分対応）

確認日: 2026-10-31 UTC。これは全13項目の対応完了を表すPRではありません。

## 対象と現状の証拠

- 稼働Supabase `mlpnjgezrnhdxsxolyzj` の `public.games` に `game_slug=songen_wo_kakeyouka2`、`is_active=true` の現在登録を確認。
- 現在登録されている公開先: https://chameleonjp.codeberg.page/songen_wo_kakeyouka2/ （HTTP 200）。登録・公開フラグは変更しない。
- GitHub既存リポジトリ: https://github.com/chameleonjp-lab/songen_wo_kakeyouka2
- 参照コミット: `e2150a99fb73221d54751927a79510d77af2cfcf`。作業開始時に開いているPRは0件。
- 公開先候補のPages API結果: `未確定（Pages API 404 / has_pages=false。リポジトリ名から推測しない）`。
- 現在のPages方式: 未設定。
- 公開ブランチとしてこのPRが対象にする既存default branch: `main`。mainへ直接pushしない。
- 実験場詳細: https://chameleonjp-lab.github.io/chameleonjp_lab/ranking.html?game=songen_wo_kakeyouka2
- Codebergで取得したHTML SHA-256: `b6c501f4b9db29e701143482682544fcb30f4cdbd84b3a8712039e13ca63da32`。
- GitHub版に既存の実験場リンク変更等がある。共有GAME.urlは未公開のGitHub URLを指していたため、確認済みの現行Codeberg URLへ修正し、移行前のリンク切れを防ぐ。ゲーム名と識別値は一致するが、機能同等性の実プレイ確認は未完了。
- 公開ブラウザ確認はプロキシ証明書エラーで未完了。HTTP到達・コード比較だけでゲーム全体の正常動作とは扱わない。iPhone Safari実機も未確認。

## 今回実装

ホームと結果の共有を黒地・白文字の「Xでシェア」に統一し、利用者が投稿確定するXのintentを開く。ポップアップが拒否された場合は本文/URLのコピー用ダイアログを表示し、クリップボード失敗時は手動コピーできる。投稿したとは表示しない。結果は今回の確定値を使用し、名前・推定順位・参加人数を含めない。日本語のみの対応で、15言語化は未完了。

両画面に「ランキング」リンクを追加した。実験場の現在コードが生成する `ranking.html?game=<slug>` を確認して使用し、トップページには移動しない。長文は折り返し、44px以上の操作領域を確保する。既存のget_best_score_rankingにp_limit=30を渡し、プレイ履歴ではなくサーバー集計済み行を最大30件表示する。現行基盤のname-key集計という制約は残る。尊厳2では既存のrank_noを優先し、同点へ新しい順位を付けない。

`.github/workflows/pages.yml` はPR作成/更新時に検証だけを実行する。公開ブランチpushでは同じコミットを検証し、成功時だけ同一runの成果物をPagesへ配信する。

`python scripts/prepare-pages.py` はインラインJavaScriptの構文、importmap/JSON、明示した必須ファイル、HTMLから参照されるローカル素材を確認後、許可した実行用ファイルだけを `_site` へコピーする。リポジトリ全体、説明書、ZIP、開発設定、秘密ファイルを公開しない。依存パッケージを追加せず、ゲーム実行時の構成を維持する。

公開権限はdeploy jobだけ（pages:write / id-token:write）。PRから本番公開しない。concurrencyで旧runを取消し、配信直前にも公開ブランチ最新SHAとPages sourceを照合する。保護ルール・環境承認は解除しない。

成果物の `build-info.json` にコミットと各配信ファイルのSHA-256を残し、公開後に実際の更新を確認できるようにした。生成物はgit管理しない。



## 必須の設定と適用順

1. このPRを確認する。マージ前に Settings → Pages → Build and deployment → Source を **GitHub Actions** にする。既存legacy公開との二重配信を防ぐため、先に切り替える。権限がない場合は管理者が設定する。このPRは設定を変更しない。
2. Settings → Environments → github-pages で `main` からの公開が許可されていることを確認する。既存承認ルールは保持する。
3. PRの検証成功を確認後、利用者が `main` へマージする。初回に限らず、その後の同ブランチへのマージも同じ流れで検証・配信される。
4. Actionsのdeploy成功後に返された**実際の** page_url を確認する。`build-info.json` のcommitがマージコミットと一致すること、ホーム/開始/結果、CSV・演出素材、ランキング読取、共有先を確認する。テストスコアを本番へ大量送信しない。
5. GitHubページでゲームの正常動作を確認した後に、正式URL定義・OG/canonical/共有文を更新する関連PRと、実験場DB `games.game_url/share_text` の更新を適用する。URLの推測、確認前の強制リダイレクト、登録変更はしない。今回はこの切替を実施していない。
6. DB変更時は対象行の旧URL/share_textを控え、対象slugと旧値を条件に更新して競合を防ぎ、selectで読み戻す。元の値へ同じ条件付き更新で戻せるようにする。実験場内の固定予備データだけ変更して完了としない。

## 記録の維持と移行制約

DB、スコア、参加者、game_slug、モード、ランキング規則、localStorageキーを変更しない。既存記録は削除・再作成しない。
CodebergとGitHubは別originなのでlocalStorage（名前・自己ベスト・設定）は自動で移動しない。旧originの保存を残し、必要なキーだけJSONとして本人が書き出し、GitHub側で型・サイズを検証して取り込む移行UIを別途用意する案がある。未実装のため引継ぎ完了とは報告しない。
共通DBは表示名由来のnormalized_nameで参加者を識別しており、同名の別人を分離できない。名前変更で別参加者になる既存制約は未解決。独立ID導入・旧記録の所有確認を伴う共通契約変更が必要で、名前だけで既存記録を自動移管しない。

## 共通仕様対応表

| 項目 | 状態 | 今回の範囲・残件 |
|---|---|---|
| 1 対象 | 既存で対応済み/確認済み | 現在有効な登録とCodeberg HTTP 200。全操作の動作確認とは区別 |
| 2 既存記録・ルール | 既存を維持 | PRは採点・時間・保存キーを変更しない |
| 3 GitHub正式化 | 未完了 | 公開準備。動作確認後の正式URL/DB切替と端末保存移行が残る |
| 4 15言語 | 未確認・未完了 | 本PRでは翻訳・出題同等性を実装しない |
| 5 任意のホーム名前 | 未完了 | 名前による参加者識別と旧送信の冪等性を含む契約見直しが必要 |
| 6 上位30名・詳細リンク | 一部今回実装 | ホーム/結果の詳細リンクと既存参加者集計RPCから最大30件の取得・表示を実装。匿名プレイ・通信状態の全面統一は未完了 |
| 7 X共有統一 | 日本語を今回実装 | ホーム紹介/今回結果、黒白ボタン、intent、コピー代替。15言語化・正式GitHub URL移行は未完了 |
| 8 効果音 | 未確認 | 既存イベント・実音の監査を今後行う。対象外ではない |
| 9 初回オン・保存音量 | 未確認・未完了 | 本PRでは設定を変更しない |
| 10 文言・画面 | 一部今回実装 | 共有/ランキング文言と44px操作領域。iPhone実機/長い翻訳/IME検証が残る |
| 11 自動公開 | 今回実装/設定待ち | ワークフロー・検証・成果物実装。Pages設定とマージ後配信は未確認 |
| 12 検証 | 部分実施 | 下記の公開境界テスト/構文/成果物。ゲーム全体の要件テストとは区別 |
| 13 PR/記録 | 今回実装 | 本書とPR。全共通仕様完成とはしない |

## 検証・復旧

実行: `python scripts/test-pages.py`（許可ファイルだけの公開、欠落素材、構文不正、importmap不正、秘密ファイル/キー検出の6件）、`python scripts/prepare-pages.py`、`git diff --check`。
加えて生成成果物をローカルHTTP配信し、Chromiumの402×874でホーム表示・JavaScript例外0件・横はみ出しなしを確認した。Supabaseへの全通信を遮断しており、本番への記録送信はない。ホーム確認のみで全プレイの動作保証ではない。追加で4ゲームのホーム共有、ポップアップ拒否時コピー表示、日本語/記号/改行のintent往復、詳細URLを確認。マロン飛行・尊厳2・うちかえるの結果ハンドラは固定した結果値によるブラウザ検証で、自己ベストではなく今回の123点が共有されることを確認。翻訳の自然さ、音の聞こえ方、iPhone Safari、配信成功は未確認。

iPhoneでの公開後確認: 縦/横でホームから開始→結果まで進み、下端が隠れないこと、キーボード変換確定で誤開始しないこと、名前なし操作、Xからの復帰、再読込した音設定を確認する。今回未実装の要件は合格扱いにしない。

公開後の問題は変更をrevertするPRを作成し、同じ検証を通した成果物で戻す。旧Actions runを手動再実行して最新公開を上書きしない。GitHub導線を切替済みなら先に記録しておいた旧Codeberg URLへ戻す。保存情報・スコアは消去しない。

追加検証: `node scripts/share.test.mjs` の4件が成功。ポップアップ拒否、コピー成功/失敗、意図したX URLと記号/改行の保持を検証。ローカルChromiumで35件の模擬集計済み行（同じ表示名も含む）を渡し、4ゲームとも30行を表示した。トレメシは模擬Supabaseクライアントでp_limit=30も確認した。本番へ送信していない。

## 2026-11-02 共通仕様の後続対応（PR #15）

この節が今回の変更範囲です。上の記録は当時の検証であり、現在の本番へ反映されたという意味ではありません。

### 対象と保全

- 対象は **尊厳を賭けようか2**。初代や3とは別ゲーム。2026-11-01 15:44 UTC の実験場の現行active登録・実カード・公開ホーム確認に基づく。
- 現行公開: https://chameleonjp.codeberg.page/songen_wo_kakeyouka2/
- 詳細ランキング: https://chameleonjp-lab.github.io/chameleonjp_lab/ranking.html?game=songen_wo_kakeyouka2
- 既存PR: https://github.com/chameleonjp-lab/songen_wo_kakeyouka2/pull/15
- 着手head: `8523cdb76021fecf0446dfa5bdce6b4f93c2782c`、main: `e2150a99fb73221d54751927a79510d77af2cfcf`。
- 5戦、180秒、CPU難度倍率、破壊部位持越し、勝利時の回復/耐久1復活/+1000報酬、採点式、game slug は維持。初代のルールをコピーしていない。
- サーバースコア・参加者を削除、初期化、改名による再作成、同名による所有者推測で移行していない。

### 13項目の対応表

|項目|今回の実装・既存対応|未完了/未確認|
|---|---|---|
|1 対象|現在の登録・公開ホーム確認済み、既存同名repo/5戦仕様を照合|公開版と新PRの全プレイ比較は未実施|
|2 既存ルール/記録|採点式・5戦・部位持越しを維持。名前/queue旧キー原本保持|他originの端末設定自動引継ぎなし|
|3 正式URL|既存Codeberg正式URLのまま。切替手順を保留|GitHub公開実URLと動作をユーザーのマージ後に確認する必要|
|4 15言語|15言語×232文、ルール/戦闘/報酬/詳細レポート/通信状態/X文、保存優先・browser fallback→英語|母語話者レビュー未実施。動作テストと翻訳の自然さは別|
|5 任意名|ホーム入力・注意、空白ゲスト、開始時名前/UUID固定、複数pending、同ID別payload拒否、結果保持|独立参加者識別方式とRPC本番適用が未完了。改名=同一人継続はname-key基盤では保証不能|
|6 上位30|ゲストも取得、詳細URL、loading/empty/error/retry、古い応答拒否、rank_noと0/負スコア保持、名前をHTMLとして扱わない|現在はサーバー保存名単位の30行。独立30人の契約は未実装、同名を本人扱いしない|
|7 X共有|ホーム/結果、黒白、今回結果・現在正式URL、コピー代替、投稿完了と表示しない|本番X投稿は行っていない|
|8 SE|下表の実在イベントにWeb Audio合成音。優先度/連打制限/voice上限/cleanup|聴感評価は未実施|
|9 音設定|初回on/0.3、保存off/0維持、操作unlock、interrupted/非表示cleanup、古い音を再生しない|iPhone Safari実機の音確認は未実施|
|10 UI|名前をホームへ、音/言語設定、長文折返し、IME229を開始扱いしない、詳細表現の翻訳|iPhone17Pro実機未確認|
|11 公開|PRは検証のみ。main同一SHAの検証・browser成功がdeploy前提。最新SHA/Actions source gate継続|Pages Source/環境を変更していない。実際の公開成功は未確認|
|12 検証|Node/HappyDOM、全文catalog token検査、構文/公開manifest、mock-only Chromium/WebKitテストを追加|CI結果はPRの正確なheadを確認。ローカルbrowser実行はエンジン未設置で未実行|
|13 成果|同PRbranch、対応表/SE/移行/確認/制約をこの文書に記載|全13項目完了ではない。Draft維持、マージは本人|

### 登録と旧記録の安全性

新規プレイのみ `crypto.randomUUID()` を開始時に発行。ゲストは公開登録しません。名前がある場合の確定結果を `songen_wo_kakeyouka2_receipts_v2` に複数保持し、同UUID・名前・点数・versionで再試行します。破損1件はそのまま残して正常な他件を扱い、不正なroot JSONや保存容量エラーでは原本を上書きせず画面内の結果を保持して永続化失敗を表示します。送信済み記録も残して再表示時の重複送信を防ぎます。

`submit_score_once_shared_v1(p_submission_id,p_display_name,p_game_slug,p_score,p_client_version)` の一行accepted応答を検査します。この応答は今回のUUID/score全文を返さないため、完全payload読み戻し検証済みとはしません。通常 `submit_score` への非冪等fallbackはありません。契約案は実験場PR43の `docs/chameleonjp-lab/sql/common-score-receipt-v1.sql`、参照commit `b06135ee60006b2ca2c9d177e2497077bcb5fb48`。本番適用は未実施です。未導入時は送信失敗表示とpending保持になり、ゲーム/結果/ランキング閲覧は妨げません。

旧 `songen_wo_kakeyouka2_pending_scores_v1` は登録済みか判別不能な時刻乱数IDなので、新UUIDへ付け替えて再送しません。削除も上書きもしません。再開には旧記録とサーバー実記録の対応確認と個別の安全な扱いが必要であり、同名だけで既登録を推測してはいけません。

旧名前キー `songen_player_name` は初代と衝突しうるため読み取り保全し、初回だけゲーム専用 `songen_wo_kakeyouka2_player_name_v1` へコピーします。以降の変更・空欄を専用キーへ保存し、旧キーを変更しません。音と言語も尊厳2専用キーです。Codeberg→GitHubは別originなのでlocalStorageは自動移行しません。旧ページのデータを残し、移行後は名前・言語・音設定を確認してください。本人識別データ移行の設計が決まるまで「すべて引継ぎ済み」としません。

### 効果音一覧

|イベント|役割/条件|重複抑制・箇所|
|---|---|---|
|選択/確定|ナビゲーション操作|80ms間隔、低優先度、bindTapButton|
|連戦開始|プレイ開始|startRun、高優先度|
|攻撃|成立した攻撃だけ|doAttack、80ms・低優先度|
|防御成功|成立した防御|consumeGuardSuccess|
|命中/部位破壊|実ダメージ時|damagePart、破壊を優先|
|報酬|確定した回復/復活/加点|applyReward、既存rewardLocked|
|結果|戦闘が確定した時|finishBattle、最高優先度|
|残り時間|残り10秒以下の秒変化|renderHud、同秒は一度|

最大4voice、低優先音は直近の高優先音を割り込まない。終了/例外でoscillatorとgainを個別解放。非表示・interrupted時に古い音を破棄。音を消しても元の画面情報・判定は同じです。

### マージ後の確認と戻し方

1. 本人が Settings → Pages → Source=GitHub Actions と github-pages環境のmain許可を確認。既存保護/承認を解除しない。
2. RPC/参加者設計の未完了と、名前ありの送信が未導入時fail-closedになる制限を確認してマージを判断。独立参加者方式の「はい」を端末内方式への確定承認と読み替えない。
3. マージされたSHAのvalidate/browser/deployが成功したか確認。実際に返されたpage_urlとbuild-info.jsonのcommitを照合。
4. ゲストで開始・5戦進行/結果・ランキング・Xコピー・音/言語設定、名前ありの送信は本番テストスコアを使わない承認済み検証方法で確認。
5. 新ページの実動作確認後にだけ実験場DB/旧ページ案内の切替を別途行う。このPRは切替/DB操作を行わない。
6. 不具合時はこのPRのrevert PRでコードを戻す。旧CodebergURL・旧localStorage・サーバー記録は消していない。新queueは消さず保全し、非冪等旧送信へそのまま流さない。

iPhoneの短い確認: 縦/横・キーボード表示で名前/開始へ到達、変換確定Enterで開始しない、空欄で開始→リタイア→結果/ランキング、Xをキャンセルして結果保持、音off/0と選択言語が再読込後も維持、共有/ロックから復帰して古い音が鳴らない。これは確認依頼手順であり実機確認済みではありません。


## 2026-11-02 09:40 JST receipt acknowledgement follow-up

Baseline PR15 `453d53b92d0e8b0d9947bb2023158eb0d5a20a6d`. Real application submission tests reproduced a different owner's acknowledgement marking the durable queue as sent. Normal receipt validation now binds both names to the frozen submission and validates PostgreSQL int4 response bounds plus descending best >= submitted score. Existing signed historical/retirement scores and first score zero remain valid; no participant identity, game rule, database or production changes.

Wrong owner / int4 / best-direction regression failed before the fix and now retains pending until a valid acknowledgement for the identical UUID/payload. Local full suite 33/33 and Pages validation/staging pass. Browser wrong-owner queue retry case was added; new-head Chromium/WebKit CI remains pending, separate from iPhone device acceptance. Prior migration and participant aggregation limitations remain open.
