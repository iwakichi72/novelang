# Novelang 技術的負債・優先度付き改善案
- 更新日: 2026-02-04
- 目的: 既知の技術的負債を「優先度」「影響」「実行順」で分離し、実装計画に落とす

## 優先度定義
- `P0`: セキュリティ/課金事故/重大データ不整合のリスクがある。先行対応必須
- `P1`: 体験劣化や運用負荷が大きい。短期で対応推奨
- `P2`: 中長期で効く改善。P0/P1 後に計画的に対応

## 改善バックログ
| ID | 優先度 | 負債 | 根拠コード | 改善案 | 期待効果 | 目安 |
|---|---|---|---|---|---|---|
| TD-01 | P0 | `stats/daily` が `x-user-id` ヘッダ依存でなりすまし可能 | `src/app/api/stats/daily/route.ts:23`, `src/app/api/stats/daily/route.ts:73` | ヘッダ受け取りを廃止し、セッション/JWT から user を解決。RLS前提のクライアントに寄せる | 不正更新防止、認可モデルの一貫化 | 1-2日 |
| TD-02 | P0 | OAuth callback の `next` が未検証で open redirect の余地 | `src/app/auth/callback/route.ts:7`, `src/app/auth/callback/route.ts:14` | `next` を内部パスのみ許可（`/` 始まり限定、`//` や外部 URL を拒否） | フィッシング経路の遮断 | 0.5日 |
| TD-03 | P0 | 辞書 API が未認証で叩け、外部 API コストを消費可能 | `src/app/api/dictionary/lookup/route.ts:12`, `src/app/api/dictionary/ai/route.ts:13` | ログイン必須化 or 厳格レート制限（IP + user）。異常時は 429 | 課金事故・濫用耐性の確保 | 1-2日 |
| TD-04 | P1 | 日付境界が UTC 固定で streak 判定ずれの可能性 | `src/app/api/stats/daily/route.ts:10`, `src/app/api/stats/daily/route.ts:15` | ユーザーTZで日付計算（プロフィールTZ or リクエスト由来）。少なくとも JST/ローカル基準を選択可能化 | streak の期待値一致 | 1日 |
| TD-05 | P1 | 英語表示率 `english_ratio` が永続化されず常に `50` 保存 | `src/hooks/use-reading-progress.ts:67`, `src/hooks/use-reading-progress.ts:82`, `src/app/read/[bookId]/[chapterId]/reader-view.tsx:33` | `saveProgress` に ratio を渡し、DB保存/復元を連動。画面初期値をDB値で復元 | UX一貫性、再開時の違和感解消 | 1日 |
| TD-06 | P1 | スクロール走査が二重実装で性能劣化しやすい | `src/app/read/[bookId]/[chapterId]/reader-view.tsx:64`, `src/app/read/[bookId]/[chapterId]/reader-view.tsx:176` | スクロール購読を1本化し、`requestAnimationFrame` or `IntersectionObserver` へ置換 | 大量文でも滑らかな読書体験 | 1-2日 |
| TD-07 | P1 | `daily_stats` 送信が one-shot で取りこぼしやすい | `src/hooks/use-reading-progress.ts:95`, `src/hooks/use-reading-progress.ts:97`, `src/hooks/use-reading-progress.ts:118` | `navigator.sendBeacon` 併用、失敗時リトライ、セッション中の増分flush設計 | 読書実績の欠損低減 | 1日 |
| TD-08 | P1 | AI辞書キャッシュのキー正規化が不足（重複キャッシュ） | `src/app/api/dictionary/ai/route.ts:28`, `src/app/api/dictionary/ai/route.ts:74` | `lookup` と同じ正規化ルールを適用し、保存キー統一 | キャッシュ効率改善、コスト低減 | 0.5日 |
| TD-09 | P2 | クライアント画面で複数クエリ結合し通信回数が多い | `src/components/continue-reading.tsx:35`, `src/app/vocab/page.tsx:35` | Supabase view/RPC でサーバー側結合し1回で取得 | 表示速度改善、コード簡素化 | 1-2日 |
| TD-10 | P2 | API で環境変数の非null断定に依存 | `src/app/api/dictionary/lookup/route.ts:4`, `src/app/api/dictionary/ai/route.ts:4` | 起動時 env バリデーション（zod など）と明示エラー化 | 障害原因の早期発見 | 0.5日 |

## 実行順（推奨）
1. フェーズ1（即時）: `TD-01` `TD-02` `TD-03`
2. フェーズ2（短期）: `TD-04` `TD-05` `TD-06` `TD-07` `TD-08`
3. フェーズ3（中期）: `TD-09` `TD-10`

## 受け入れ基準（P0/P1）
### TD-01
- `x-user-id` ヘッダを受けてもユーザー識別に使われない
- 別ユーザーID偽装で `daily_stats` を更新できない
- APIテストで認証なし `401`、認証あり `200`

### TD-02
- `next=https://example.com` など外部 URL 指定時に内部URLへフォールバック
- `next=/read/...` の内部遷移は維持

### TD-03
- 未認証アクセスは拒否、またはしきい値超過で `429`
- 想定外トラフィック時に外部 API 呼び出し数が抑制される

### TD-05
- 画面で選んだ `english_ratio` がDBに保存される
- 再訪時に同じ比率で初期表示される

### TD-06
- スクロール購読は1経路のみ
- 同等データ量でスクロール時の main thread 負荷が下がる
