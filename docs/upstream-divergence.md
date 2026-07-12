# Upstream Divergence Ledger

Tracks how ClankerMux (`origin/main`) relates to upstream `tombii/better-ccflare`
so we can reconcile ("glattziehen") later if needed. Upstream is fetch-only,
cherry-pick-only — never merged (see `.claude/rules/fork-workflow.md`).

**Snapshot: 2026-07-11**

| Ref | SHA |
|---|---|
| Merge-base (`refs/heads/main` ↔ `upstream/main`) | `e3bec5f0` |
| Our `main` | `c9d77999` |
| `upstream/main` | `8a61f0d5` (262 commits ahead of merge-base, 229 non-merge) |

To regenerate the raw lists:

```bash
git fetch upstream
git log --no-merges --oneline e3bec5f0..refs/heads/main   # our fork-only commits
git log --no-merges --oneline e3bec5f0..upstream/main     # upstream's new commits
```

## Headline findings (2026-07-11 review)

- **None of our fork fixes were made obsolete by upstream.** 22 of upstream's
  new commits are our own earlier upstream PRs (#213, #218, #219, #230, #231,
  #234–#237) — already in our tree.
- The big overlapping upstream blocks (limits[] parsing, usage history/prediction,
  worker memory leak, Codex SSE fixes) are **parallel independent implementations**
  of the same problems with different architecture. Cherry-picking them would
  conflict heavily with our files. Do not pick.

## Cherry-pick candidates (not yet taken)

Ordered by value/risk. Pick onto a branch off `origin/main`, drop any PG /
removed-provider hunks, verify, `--no-ff` merge (fork-workflow.md).

| Upstream SHA(s) | What | Value | Risk / notes |
|---|---|---|---|
| `71faf318` + `00ca5b2b` | Persist Cloudflare cookies for chatgpt.com → fewer Codex 403s (PR #291). Follow-up fixes cookie revocation (Max-Age=0). | **High** — hits our active Codex path; we don't have the file at all | Low — 3 files (`packages/proxy/src/chatgpt-cloudflare-cookies.ts` + hook in `request-handler.ts` + test). Take both together. |
| `f42a9325` + `40ec1095` + `07526559` | Optional `X-Anthropic-Agent-Id` header for explicit agent attribution (PR #260) | Medium-low — complements our session-affinity project attribution (`3428678e`) | Very low — 2-3 proxy files |
| `4f421859` | Anomaly-detection insights endpoint (PR #249) — creates the `insights.ts` base | Medium | Medium — 6 files. **Prerequisite for the two below.** |
| `d6025c7d` | Cache-efficiency insights + dashboard tab (PR #253) | Medium | Medium-high — 21 files; depends on `4f421859` |
| `673cbf2a` | Alerting threshold rules + SSE stream + dashboard badge (PR #250) | Medium | High — 23 files; depends on `4f421859`; touches `migrations-pg.ts` (drop that hunk; add columns via our `ADDITIVE_COLUMNS` pattern in `migrations.ts`) |
| `81c8461d` `eae8c28e` `805500e3` `36254ed6` `baa670ba` `579216de` | Persist analytics view controls in URL + localStorage (shareable analytics links) | Low (UX nicety) | Low — dashboard-web only, self-contained |
| `d6edfb7c` + follow-ups (`74bd5d4d` `286af6b1` `0e211c36` `0e3ede6c` `d5a2c11c` `742e5688` `869368bf`) | Usage-history **chart tab** (PR #294) | Low-medium — we already have the backend (usage_snapshots + prediction `ca12482c`); only the historical chart tab is missing | Medium-high — couples to its own `usage-history.repository.ts` + PG migration; collides with our `usage-snapshot.repository.ts` |
| `b09f6519` | New selectable LB strategy "session-affinity" (per-client sticky + least-used spread) | Only if we want an extra strategy | Conceptually different from our affinity model (`8ae7e315`) |

## Divergence worth reviewing (not a pick)

- **`out_of_credits` 429 handling (issue #261):** upstream `3152cf4f` treats it
  as model/beta-scoped (context-1m only) and does **not** bench the account —
  opus/haiku keep flowing. Our `50519345` applies a long account-wide cooldown.
  Our separate large-context handling (`734f78c0`/`4878abc2`) may partly cover
  this. **Open question: does our account-wide cooldown waste usable capacity?**
- **`usage_exhausted` as /health signal:** upstream `e8302f37` surfaces
  usage-window exhaustion in `/health` and account rateLimitStatus. Not
  pickable (sits inside the conflicting limits[] block), but the idea could be
  rebuilt manually on our architecture.

## Redundant pairs (upstream ↔ ours — same problem, both fixed)

Kept so a future sync doesn't mistake these for missing fixes.

| Topic | Upstream | Ours | Notes |
|---|---|---|---|
| limits[] parsing / per-model usage / weekly quota | `a1d1f8b4` `8cbbba8c` `05ed2e47` `889448da` `61710478` `0f0c52cb` `b8e67c94` `e8302f37` `ccb2bbd6` `7497ecb1` `d0c9f95f` `7987472b` | `9dd1c75b` `75d8452a` `f127367f` `063f294b` `a4a18e9d` `0ffb5a4e` | Parallel architectures. Upstream is richer at rendering (per-model incl. Fable) + `usage_exhausted` health state; ours is richer at proactive family-weekly routing gate + prediction + auto-pause. Touches the same files (`throttle-utils.ts`, `RateLimitProgress.tsx`, `usage-fetcher.ts`, `types/account.ts`, `handlers/accounts.ts`) → guaranteed conflicts. |
| Usage-exhaustion prediction | `d6edfb7c` | `ca12482c` | Ours has the regression-based forecast math (`usage-forecast.ts`); upstream has the chart tab |
| Worker memory leak | `315440fa` `78e4d5e8` `7c4f9e57` `41752084` | `3ad4b5bc` + `668d6fca` | We removed the worker entirely; upstream replaced it with a main-thread collector |
| 529 overloaded retry/cooldown | `256f0645` `4c6a5cef` `0df3295d` `422b4617` (our PR #236) | `d0c79f8b` + burst-retry block | Our origin |
| Adaptive rate-limit backoff | `ff09c5a0` (our PR #213) | `rate-limit-backoff.ts` | Our origin (we removed the `CCFLARE_*` env knobs: `98cd47fd`) |
| Auto-refresh recovers paused accounts | `f9cd11f8` + `9fb4c71b` `a2a1be75` `99066c3b` (our PR #237) | `3808dcb0` `d037d605` `9148a252` | |
| Codex SSE / count_tokens / tool-call fixes | `57499d3b` `bba21ae3` `4206b4bd` `e5a3d9cf` `d08b5c7c` `99ea1f86` `54219898` `f3e0ce24` | `012be259` `b5d0c1be` `24fc2879` `f4c52aa2` `f9a3e358` `d1924f25` `b7b3cc99` | Same fixes both sides |
| Codex CLI responses adapter | `e0805116` block (our PR #219) | `68a09d2a` (native Responses passthrough) | |
| Context-composition insights | `da24a7f8` | `f23f0f26` `72fab767` | Own implementation (`ContextCompositionPanel`) |
| Sonnet 5 default / Opus 4.8 / Fable 5 registration | `f0fb17ce` / `7e52a431` / `ba099285` | `b44a40a8` / `4b86e22a` / `99a6843b` | Upstream's model catalog (below) would replace manual registration |
| UTF-8 body decode | `71695291` | `ee4ac1e2` | |
| Strip content-encoding on model-not-found | `51094682` | `cfef05a2` | Identical |

## Not pickable / architectural

- **Model catalog (upstream PR #300: `6cf08447` `88c9901a` `252b34d4` `d5535da4`
  `6d288611` `48bcf605` `1c59f768` + more):** live Anthropic model catalog with
  daily refresh, passive `/v1/models` capture, dashboard dropdowns, agent-model
  provenance. Would replace our manual `model-mappings.ts` registration and
  collide with our GPT-5.6/Codex tier mappings (`d75362a8`). Adopt only as a
  deliberate architecture decision, never as a cherry-pick.

## Irrelevant upstream blocks (removed from our fork)

Version bumps (~23), acknowledgement chores (~28), CI/SignPath/release (~18),
PostgreSQL-only fixes (PG removed — SQLite only), xAI/Grok provider (~9,
removed), CLI-specific (~3, removed), docs/Greptile fixups for the above.
