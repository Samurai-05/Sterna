# Sterna — Security, Correctness & Coherence Audit

**Date:** 2026-08-31
**Commit:** `83ef2ca`
**Scope:** `api/`, `frontend/`, `infra/`, deployment configuration
**Status:** Findings only — no code changes were made.

---

## Summary

This audit covers the app as deployed at `https://labo-iot1.iict-heig-vd.ch`.

The codebase is, on the whole, careful. Authorization is deny-by-default via a
global guard with `@Public()` on exactly three routes; the argon2id parameters
are current OWASP; the JWT `verifyOptions` pin both `algorithms` and `issuer`
(the classic mistake, avoided and documented in a comment that is right); the
404-not-403 group policy is implemented consistently; every SQL statement in
the repo is parameterised; and the photo upload path genuinely strips EXIF
rather than merely claiming to. Several findings below exist *because* the
surrounding code is careful — S5, for instance, matters mainly because login
defends against the exact thing register gives away.

Every finding cites file:line and was confirmed by reading the source.

**Severity counts:** 2 critical · 6 high · 14 medium · remainder low.

The four items worth acting on first:

| | Finding | Why |
|---|---|---|
| 1 | **S1** — cross-tenant photo deletion | A user can permanently delete another user's photo. |
| 2 | **B1** — group-sharing data loss | Ordinary use silently makes a discovery disappear. |
| 3 | **S2** — no rate limiting | Login is an unlimited credential-stuffing and DoS surface. |
| 4 | **B3 / B4** — stock-photo fallback, 401 handling | What a grader hits within minutes of an expired token. |

---

# Security

## S1 — Cross-tenant photo deletion — **critical**

A user can permanently delete another user's photo from object storage. All
four links verified:

1. `api/src/discoveries/create-discovery.dto.ts:49-51` — `imageObjectKey` is
   `@IsString() @Length(1)`. No format check, no ownership check, no existence
   check.
2. `PhotosService.exists()` (`api/src/photos/photos.service.ts:115`) was
   written for exactly this. Its docstring reads *"NFR-32: POST
   /api/discoveries must refuse to create a discovery whose photo does not
   exist."* It is called from nowhere but its own spec.
3. `imageObjectKey` is returned in full to every member of a shared group map
   (`DISCOVERY_PROJECTION`, `api/src/discoveries/discoveries.service.ts:104`),
   so co-members can read each other's keys.
4. `AuthService.deleteAccount` (`api/src/auth/auth.service.ts:217-219`)
   harvests keys with `SELECT image_object_key FROM discoveries WHERE user_id
   = $1` — ownership of the *discovery row*, never of the photo — and `:247`
   feeds them to `photos.remove()`, which passes them straight to
   `removeObject` with no prefix check (`photos.service.ts:133-135`).

**Attack:** read a co-member's `imageObjectKey` off a shared group map → POST a
discovery of your own citing that key → delete your own account → their photo
is gone from MinIO.

**Direction:** call the existing `exists()` on create, and store the uploading
user alongside the key so ownership can be checked on both create and delete.

## S2 — No rate limiting anywhere — **critical**

`@nestjs/throttler` is not a dependency (`grep -c throttler
api/package-lock.json` → 0), `configureApp` registers no throttle guard
(`api/src/app-setup.ts:20-39`), and there is no `limit_req` zone in
`frontend/nginx/default.conf.template`.

`POST /api/auth/login` is `@Public()` and performs an argon2id verify at 19 MiB
/ t=2 per request — simultaneously an unlimited credential-stuffing surface and
a memory-amplification DoS from unauthenticated callers. `POST /api/photos`
(10 MB buffered in memory, then decoded *twice* by sharp —
`photos.service.ts:185` and `:192`) is unbounded on the same terms.

## S3 — Photo download is authenticated but not authorized — **high**

`api/src/photos/photos.controller.ts:115-121` states it outright: *"any
signed-in user can read any key they know."* The TODO is conditioned on the
discoveries table existing — it now does, and the check was never added.

Mitigation is `randomUUID()` key entropy, i.e. obscurity rather than
authorization. Because keys are handed to every group co-member (S1 step 3),
leaving a group does not revoke access to the photos seen while in it.

## S4 — No security headers, with a 7-day JWT in `localStorage` — **high**

The token is stored in `window.localStorage` (`frontend/src/lib/session.ts:17`)
and lives 7 days with no refresh and no revocation
(`api/src/auth/jwt.options.ts:20`). Against that:

- `frontend/nginx/default.conf.template` sets no CSP, HSTS,
  `X-Content-Type-Options`, `X-Frame-Options` or `Referrer-Policy`.
- `helmet` is not a dependency and is never applied.
- `changePassword` (`api/src/auth/auth.service.ts:183-199`) rewrites the hash
  but does not invalidate outstanding tokens — "I think I was compromised, let
  me change my password" accomplishes nothing for up to a week. A
  `password_changed_at` claim compared in the guard closes this without adding
  server-side session state.

## S5 — Register leaks account existence — **medium**

`api/src/auth/auth.service.ts:99` and `:120` answer `An account already exists
for "<email>"` on a `@Public()` route.

What makes this worth fixing is that login is meticulous about the same
question — `:140-146` runs a throwaway argon2 hash so the not-found and
wrong-password paths take the same time, with a comment citing NFR-18. The two
endpoints disagree, and an attacker will simply use the weaker one.

## S6 — Swagger UI is public in production — **medium**

`api/src/swagger.ts:45-47` registers `/api/docs` and `/api/docs-json`
unconditionally, via a raw `httpAdapter.get()` that bypasses the global guard.
The file's own comment names the fix (gate on `NODE_ENV`). Combined with S2,
this hands an attacker a machine-readable map of every endpoint and constraint
plus unlimited attempts against it.

## S7 — Lower-severity security items

- **MinIO root credentials.** The API authenticates as `MINIO_ROOT_USER`
  (`api/src/photos/minio.client.ts`), so any RCE/SSRF in the API means full
  control of object storage, not just the photo bucket. Already acknowledged as
  a hardening item at `api/src/config/env.validation.ts:89-90`.
- **`.env` on disk** holds a real 64-char `JWT_SECRET`, but
  `POSTGRES_PASSWORD` and `MINIO_ROOT_PASSWORD` are still `changeme`. Nothing
  secret is committed (`git log --all -- .env` is empty; only `.env.example`
  and `.env.android` are tracked) — but if that file was ever copied to the VM,
  the database and object store are protected by `changeme`. **Worth checking
  on the VM directly.**
- **Permanent, unrotatable invite codes**, handed to every member rather than
  just the owner (`api/src/groups/groups.service.ts:439`). There is also no
  remove-member route at all, so an ex-member who wrote the code down can
  rejoin at will.
- **`JWT_EXPIRES_IN_SECONDS` has `@Min(60)` and no `@Max`**
  (`api/src/config/env.validation.ts:115-118`) — a typo mints near-immortal
  tokens.
- **Public health endpoint** returns dependency error strings verbatim
  (`api/src/health/health.controller.ts`), e.g. `connect ECONNREFUSED
  minio:9000`.

---

# Correctness

## B1 — Silent data loss: two sources of truth for group sharing — **critical**

The most serious non-security finding. Root cause: the `discovery_groups`
junction table was added (migration `1787734650000-AddDiscoveryGroupSharing`)
but the leave/delete paths were never migrated off the legacy
`discoveries.group_id` column, and `update()` was never taught to maintain it.

Verified state of each path:

| Path | Writes `group_id` | Writes `discovery_groups` |
|---|---|---|
| `create()` (`discoveries.service.ts:225-290`) | yes | yes |
| `update()` (`:329-374`) | **no** | yes |
| `leave()` (`groups.service.ts:242-256`) | yes (repair) | yes (delete) |
| `remove()` (`groups.service.ts:218-227`) | yes (repair) | via CASCADE |

Meanwhile **reads use the junction exclusively** — `findAllByGroup`
(`discoveries.service.ts:180-190`) filters on `discovery_groups`, and the
`group_ids` field in `DISCOVERY_PROJECTION` (`:88-97`) is built from it.
`d.group_id` is selected but never filtered on.

**Reachable by ordinary use, no attacker required:**

1. Add a discovery to group A → `group_id = A`, junction `{A}`,
   `is_personal = false`.
2. Edit it (EditDiscoveryPage) to be shared with group B instead → junction
   `{B}`, **`group_id` still A**.
3. Leave group B → the `is_personal = TRUE` rescue keys on `group_id = B` and
   matches nothing; the junction row for B is deleted.
4. Result: `is_personal = false`, zero junction rows. The discovery is now
   invisible on the personal map (`findAllByUser` requires `AND d.is_personal`,
   `:145`) and on every group map. It survives only in
   `GET /api/discoveries/authored`.

The contract at `groups.controller.ts:177-178` ("the caller's own discoveries
in the group move to their personal map rather than being deleted") is not met.
Group deletion (`groups.service.ts:218-227`) has the identical defect, made
worse by `ON DELETE CASCADE` on the junction FK silently removing the rows.

Secondary consequence of the same split: after step 2 the discovery still
carries `group_id = A`, a group it was explicitly un-shared from — a stale
pointer waiting for the next feature that reads that column.

**Direction:** make the junction the single source of truth. Repair with
`SET is_personal = TRUE WHERE ... AND NOT EXISTS (remaining discovery_groups
rows)`, and either maintain or drop `discoveries.group_id`.

## B2 — Photos are never freed — **high**

Two unbounded leaks:

- `frontend/src/pages/AddDiscoveryPage.tsx:187-195` uploads on photo
  *selection*, not on submit. Abandoning the form — or picking a second photo —
  orphans the object permanently.
- `DiscoveriesService.remove()` (`discoveries.service.ts:427-443`) deletes the
  row and returns; no `photos.remove()`. Only account deletion frees anything.

Given S3, every orphan also stays readable forever by anyone who noted the key.

## B3 — Every discovery card paints the same stock photo — **high**

`frontend/src/components/DiscoveryPhoto.tsx:49` initialises state to
`fallback`, and `:61-63` catches *any* error and returns to it. The fallback is
`imageUrl(discovery.imageId)`, and `frontend/src/lib/api.ts:367` hardcodes
`imageId: 'photo-1500530855697-b586d89ba3ee'` for **every** API-sourced
discovery.

So the stock Unsplash mountain-lake photo is not just the error path — it is
the *initial* paint of every card, under an `alt` attribute claiming it is the
user's own discovery. On an expired session the entire Collection renders as
that one image, presented as the user's photos. It also masks exactly the
regression the comment at `photos.controller.ts:41-44` warns about, and makes
an outbound request to `images.unsplash.com` per card.

The same applies to POIs (`api.ts:424`, an Eiffel Tower stock shot) and to the
map popup, whose initial `src` is the same constant (`MapCanvas.tsx:81`).

## B4 — 401 is handled on exactly one screen — **high**

`frontend/src/pages/ProfilePage.tsx:123-131` clears the session and redirects.
Nowhere else does.

With a 7-day token, no refresh, and `RequireAuthentication` (`App.tsx:112`)
trusting only the presence of a `localStorage` entry, an expired token leaves
the user inside the authenticated shell with every screen silently empty — the
`?? []` fallbacks (`MapPage.tsx:133`, `CollectionPage.tsx:73`,
`ProfilePage.tsx:57`) turn the failure into "you have no discoveries". There is
no route back to login except opening Profile.

Compounding it: `main.tsx:9` constructs `new QueryClient()` with no
`defaultOptions`, so TanStack Query's default `retry: 3` fires **four**
requests per failing query.

## B5 — Unvalidated group route params return 500, not 404 — **medium**

`api/src/groups/groups.controller.ts:123,146,166,188` and
`group-discoveries.controller.ts:44` take a bare `@Param('id') id: string`. The
value reaches a parameterised query against a `BIGINT` column, so
`GET /api/groups/abc` raises Postgres `22P02` → unhandled → 500.

That breaks the NFR-19 contract the module is built around: a malformed id
answers differently from a valid one, which is itself a weak oracle, and there
is no global exception filter to catch it. The correct pattern already exists
one module over — `DiscoveryParamsDto`
(`api/src/discoveries/discovery-params.dto.ts`) with `@Matches(/^\d+$/)`, used
at `discoveries.controller.ts:96,132,146`.

## B6 — Wrong landmark shown instead of "not found" — **medium**

`frontend/src/pages/LandmarkDetailPage.tsx:24` —
`sourceLandmarks.find(...) ?? sourceLandmarks[0]`. An unknown or stale POI id
silently renders the *first* POI as though it were the requested one. When the
list is empty, `:25` returns `null`, producing a blank screen with no header
and no back button.

`DiscoveryDetailPage.tsx:96-105` and `GroupDetailPage.tsx:102-108` both handle
this correctly, so the right pattern is already in the repo.

## B7 — "Discovered" means two different things — **medium**

`PoisService.findAll` (`api/src/pois/pois.service.ts:35-88`) scopes discovery
to the **active map**. `findAllAuthoredByUser` (`:90-125`) counts every
discovery the user authored, ignoring both `is_personal` and the active map.

Profile calls the second (`ProfilePage.tsx:52`); Map, Collection, Search and
LandmarkDetail call the first. The same POI can read "Discovered" on Profile
and "Undiscovered" in the Collection, and the Profile progress bar counts
against a different denominator than the Collection shows.

## B8 — Geocoding queue is global and unthrottled — **medium**

`api/src/geocoding/geocoding.service.ts:57-72` serialises all Nominatim calls
to 1/sec — correct for Nominatim's usage policy, but the queue is
**process-wide and shared across all users**. With no rate limiting (S2), any
authenticated client can enqueue unbounded work and stall every other user's
place search behind a single promise chain. The 8s `AbortSignal.timeout`
(`:90`) covers the fetch only and starts after the wait, so callers hang rather
than fail.

Cache eviction at `:47-49` is FIFO-by-insertion rather than LRU, and
`this.cache.keys().next().value as string` is an unchecked cast.

## B9 — Lower-severity bugs

- **No catch-all route.** `frontend/src/App.tsx:73-101` — the inner `<Routes>`
  has no `*` case.
- **TOCTOU on group membership.** `discoveries.service.ts:213-219` calls
  `requireMembership` outside the transaction that writes at `:221`; same at
  `:315` vs `:330`. The legacy `group_id` path is saved by
  `fk_discoveries_group_membership`; the junction table has **no membership
  FK** (`1787734650000-AddDiscoveryGroupSharing.ts:21-29`), so nothing but
  application code prevents a non-member's discovery from sitting on a group
  map.
- **Unbounded inputs.** `description` has no `@MaxLength` into a `TEXT` column;
  `groupIds` has no `@ArrayMaxSize` and drives one sequential
  `requireMembership` query per element.
- **`Promise.all` on post-commit MinIO cleanup** (`auth.service.ts:247`)
  rejects on first failure — the client gets a 500 for an account already
  irreversibly deleted, and remaining keys are never attempted.
  `allSettled` + logging is the minimum.
- **`category` cannot be cleared** — `COALESCE($6, d.category)`
  (`discoveries.service.ts:347`) makes `null` indistinguishable from omitted,
  while `description` gets a correct `hasOwnProperty` sentinel at `:348`.
- **`Number(discovery.id)`** (`frontend/src/lib/api.ts:358`) narrows a BIGINT
  string the API deliberately returns as a string; lossy above 2^53. Consumers
  convert back with `String(item.id)` (`DiscoveryDetailPage.tsx:62`).
- **JWT used as a React Query cache key** — `ProfilePage.tsx:41`
  (`['current-user', session?.accessToken]`); every other query keys on
  `session?.user.id`.
- **N+1 photo fetches.** `getPhoto` is called inside a bare `useEffect`
  (`DiscoveryPhoto.tsx:55`), not through `useQuery`, so there is no dedup or
  cache — a 40-card grid issues 40 authenticated requests and refetches on
  every remount.

---

# Coherence & UI/UX

## C1 — Dead controls and dead ends — **high**

- **"Take a photo" does nothing.** `AddDiscoveryPage.tsx:370-373` — a `Button`
  with a camera icon and no `onClick`. The native capture plugin exists
  (`lib/photo-capture.ts:18-20`) and is wired only into the bottom-nav "+".
  On the screen whose entire purpose is adding a photo, the camera CTA is inert.
- **"Forgot password?" does nothing.** `LoginPage.tsx:87-92` — no `onClick`, no
  handler, no reset route anywhere in the router.
- **No catch-all route.** Any unknown authenticated URL renders a blank white
  screen — `MapPage` is present but `invisible pointer-events-none inert`
  (`MapPage.tsx:169-171`) — with no header, no nav, and no way back but the
  browser button.
- **QR scanning is Android-only but advertised unconditionally.**
  `GroupDetailPage.tsx:183-185` tells every user to "scan the QR code from the
  app" and renders one at `:210-215`, but `JoinGroupPage.tsx:104` hides the
  scan button behind `isQrScanAvailable()` = `platform === 'android'`
  (`lib/qr-scan.ts:10-14`). On the web/PWA build the QR code cannot be read by
  anything in the app.
- **Grid view renders two layouts at once.** `CollectionPage.tsx:222-253` —
  both discovery branches are gated on `view`, but `filteredPois.map` at
  `:250-252` is not. Grid mode shows the 3-column photo grid *and* a 2-column
  POI card list stacked beneath it.
- **`/collection` has no empty state.** With both lists empty the user gets
  `"0 discoveries · 0 POIs"` and blank space on the primary Gallery tab.
- **Users cannot change their password or display name.** `PATCH /api/auth/me`
  (`auth.controller.ts:100`) and `PATCH /api/auth/password` (`:120`) are
  implemented, documented and reachable — with no client function and no UI.

## C2 — Drift from the approved design system — **medium**

`docs/design-system.md` is v1.0, **Status: Approved**, scoped to the app UI —
so these are deviations from an internal spec, not stylistic opinion. (It is
also absent from `CLAUDE.md`'s documentation map.)

- **The wrong green, in 11 places.** The spec's `green-50` (`#F0F7F3`) *is*
  defined as `--accent` (`index.css:28`) — and `bg-accent` is used nowhere.
  Every active/selected surface instead uses Tailwind's stock `green-50`
  (`#F0FDF4`, a cooler mint): `GroupsPage.tsx:70,120`,
  `GroupDetailPage.tsx:220`, `MapPage.tsx:405`, `CollectionPage.tsx:293`,
  `AddDiscoveryPage.tsx:341,403`, `EditDiscoveryPage.tsx:234`,
  `ProfilePage.tsx:502`, `DiscoveryGroupSelector.tsx:50,73`,
  `GalleryGroupFilter.tsx:88`. `MapPage.tsx:431` adds a third green
  (`bg-emerald-100`) for the same meaning.
- **Category colours contradict §7.** `lib/category-appearance.ts:10-54`
  assigns saturated colours (`#2563EB`, `#BE123C`, `#EA580C`, …) matching none
  of the spec's muted analytics palette, and applies them to exactly the
  surfaces §7 forbids: filters, map markers, cards, detail pages. POIs are
  yellow (`:56-61`) where §6 specifies terracotta `#C4622D`.
- **Terracotta is hardcoded, never tokenised** — `#fbf1ec`/`#b8572b` at
  `DiscoveryDetailPage.tsx:130`, `GroupDetailPage.tsx:241`, `GroupsPage.tsx:129`;
  `#C4622D` at `ProfilePage.tsx:207,503`. No `--accent-*` variable exists,
  contradicting §22.
- **Only `--destructive` is defined.** Success, warning and info tokens don't
  exist, so success feedback borrows `text-primary`
  (`GroupDetailPage.tsx:205`) and destructive UI reaches for raw
  `red-50/100/200/300/600/700` (`ProfilePage.tsx:523,533,541,543,570`).
- **The type scale is defined and unused.** `.sterna-heading`,
  `.sterna-body-large`, `.sterna-body`, `.sterna-label`, `.sterna-caption`
  (`index.css:141-181`) are referenced nowhere; `text-[22px]` and `text-[30px]`
  are re-inlined 9× instead. Off-scale sizes: `text-[8px]` (`MapPage.tsx:335`),
  `text-[9px]` ×4 (`ProfilePage.tsx:364,371,397,405`), `text-[10px]`,
  `text-[15px]`, `text-[26px]`.
- **Fraunces on functional chrome**, which §8.2 forbids: `PageHeader.tsx:47`
  applies `font-display` to every page-header title across 12 screens.
- **Radius and spacing drift** — inputs are `rounded-md` (12px) in the auth
  half (`AuthTextInput.tsx:6`) and `rounded-xl` (20px) in the app half
  (`CreateGroupPage.tsx:11` +5 more); the sheet is `rounded-t-[28px]` against a
  spec of 24. Off-4px-grid values (`mt-0.5`, `gap-1.5`, `px-2.5`) appear ~20×.
- **Explored-area shading is inverted and off-palette.**
  `MapCanvas.tsx:216-222` paints *unexplored* countries `#38404a`; §6 specifies
  `rgba(45,90,61,0.22)` for *explored*. The basemap is the stock vendor style
  (`tiles.openfreemap.org/styles/bright`), hardcoded twice
  (`MapCanvas.tsx:21`, `LocationPickerMap.tsx:14`).

## C3 — Pattern inconsistency — **medium**

- **Six different loading treatments** — full-page replacement
  (`GroupDetailPage.tsx:97`, `EditGroupPage.tsx:26`,
  `EditDiscoveryPage.tsx:54`), inline text (`DiscoveryDetailPage.tsx:91`), a
  swapped count line (`CollectionPage.tsx:209`), a centred message
  (`MapPage.tsx:186`), a grey paragraph (`GroupsPage.tsx:50`). Ellipses split
  roughly 50/50 between ASCII `...` and Unicode `…`, sometimes for the same
  word (`'Deleting…'` at `ProfilePage.tsx:572` vs `'Deleting...'` at
  `DiscoveryDetailPage.tsx:169`).
- **ProfilePage and MapPage have no loading state at all.**
  `ProfilePage.tsx:40-55` destructures only `data`/`error`, so an in-flight
  `currentUser` renders an empty `<h2>` and `"Explorer · Since "` with a null
  year.
- **Errors render in two different colours.** Most use `text-destructive`, but
  `CollectionPage.tsx:218`, `LoginPage.tsx:104`, `RegisterPage.tsx:137` and
  `AddDiscoveryPage.tsx:516` render failures in `text-muted-foreground` — grey,
  reading as a hint. So "Invalid credentials" is grey while the field-level
  error two lines above is red (`AuthTextInput.tsx:34`). No page uses
  `role="alert"`; all 15 use polite `role="status"`.
- **Three destructive-button treatments**: tinted `variant="destructive"`
  (`DiscoveryDetailPage.tsx:159`), outline + `text-destructive`
  (`GroupDetailPage.tsx:273,292`), solid `bg-red-600` (`ProfilePage.tsx:570`).
  §12 specifies one.
- **Three primary-CTA heights** (`h-14` auth, `h-12` app, `h-11` detail), and
  the `Button` default is `h-8` — so every call site overrides it, meaning the
  variant system isn't carrying its weight. `ProfilePage` and `CollectionPage`
  don't use `Button` at all, hand-rolling 7 buttons between them.
- **The active-map switcher exists in three forms**: a full dropdown
  (`MapPage.tsx:266-383`), an "Activate" button for the personal map only on
  `GroupsPage.tsx:96-109` (group rows are links, so you cannot activate a group
  from the list of groups), and a header button on `GroupDetailPage.tsx:143`.
  Its failure message has three different strings.
- **Two skins for one chip.** `MapPage.tsx:438-466` and
  `CollectionPage.tsx:272-299` are near-duplicates diverging on active colour,
  background and gap.
- **Three confirmation mechanisms, no toast system**: native `window.confirm()`
  (`DiscoveryDetailPage.tsx:163`, `GroupDetailPage.tsx:279,298`), a bespoke
  in-sheet form (`ProfilePage.tsx:539-575`), and transient inline text
  (`GroupDetailPage.tsx:204-208`) — the only success feedback in the app.
- **`/collection` and `/profile` have no `PageHeader` and no `<h1>`** — two of
  the four bottom-nav destinations have no page title, and `ProfilePage.tsx:193`
  starts the document at `<h2>`.

## C4 — Accessibility — **medium**

- **`frontend/index.html:2` is `<html lang="fr">`** with a 100% English UI —
  screen readers will apply French pronunciation to the entire app. One-line
  fix, disproportionate impact.
- **`--muted-foreground: #78716c` on `--background: #f7f5f0` is 4.40:1**
  (verified by computation), below the 4.5:1 AA threshold — and it is the app's
  default secondary text colour, used on the background across ~12 screens.
- **No focus styling on the primary navigation** (`BottomNavigation.tsx:38-54,
  82-93`) or on ~14 other raw `<button>` groups: map and gallery filter chips,
  every search result row, category pickers, and `QrScanner.tsx:42-49` — the
  only way to cancel a scan. `CollectionPage` alone has three focus conventions.
- **`BottomNavigation.tsx:89`** sets `size-5` on the wrapping `<span>` rather
  than the SVG, so the 24px lucide icons overflow their box on all five items
  *and* the intended non-colour active cue (`stroke-[2.5px]`) has no effect —
  making active nav state colour-only.
- **Sub-12px informational text**, against the spec's own §9 floor:
  `text-[8px]` for the "Active map" label (`MapPage.tsx:335`), `text-[9px]`
  chart axis labels (`ProfilePage.tsx:364,371,397,405`).
- **Touch targets below 44px**: `GroupsPage.tsx:98` "Activate" is `h-7` (28px);
  `SearchPage.tsx:217-227` "Clear" is `text-xs` with no padding (~16px).
- Minor: `PoiCard.tsx:22` uses `alt={poi.name}` directly above an `<h2>` with
  the same text (duplicate announcement) while `DiscoveryCard.tsx:33` correctly
  uses `alt=""` for the identical layout.

*On the positive side:* every text input in the app is properly labelled, and
there are no non-button clickable `<div>`s anywhere.

## C5 — Smaller coherence items

- **Real discoveries display raw coordinates where the design expects place
  names.** `api.ts:366` sets `location` to `"48.8586, 2.3622"`; the mock
  fixtures it replaced used `"Le Marais, Paris, France"` (`mock-data.ts:59`).
  Shown at `DiscoveryCard.tsx:49` and `DiscoveryDetailPage.tsx:137`. Same for
  POIs — `api.ts:421-422` sets `city: ''`/`country: ''`, so
  `LandmarkDetailPage.tsx:56-58` always falls through to coordinates.
- **Relative dates collapse.** `formatRelativeDate` (`api.ts:432-441`) emits
  only `today` / `1d ago` / `Nd ago`, so everything in the last 24h reads
  "today" where the design showed `2h ago`.
- **Join-by-code is discoverable from one place only** —
  `GroupsPage.tsx:158-163`, below the entire group list.
- **Arbitrary primary group.** `AddDiscoveryPage.tsx:205-212` picks
  `selectedGroupIds[0]` as `groupId`, which decides where the user lands after
  saving. Selection order changes the destination.
- **Dead code**: `BottomNavigation`'s `onAddDiscovery` prop is never passed;
  its `pathname.startsWith(to)` branch is unreachable (the nav renders only on
  the four exact `mainRoutes` paths, `App.tsx:29`); `exploredCountryCodes`
  (`mock-data.ts:138`) and `activeMapName` (`hooks/useActiveMap.ts:40`) are
  exported and unused; the mock `discoveries`/`landmarks` fallbacks in
  `MapPage`, `CollectionPage`, `ProfilePage` and `LandmarkDetailPage` sit
  behind `session ? [] : mock` and can never fire behind
  `RequireAuthentication`; `assets/mock/profile-emma.jpg` and
  `assets/auth-welcome-background.jpg` are referenced nowhere.
- **`UploadPhotoResponse.url`** (`api.ts:125`) is returned and ignored —
  correctly, since it can no longer be used in an `<img src>`, but it is a trap
  left for the next reader.
- **`CLAUDE.md` is untracked and stale.** It states the group screens are on
  mock data and that there is no join-by-code screen — `JoinGroupPage`,
  `EditGroupPage`, `QrScanner` and the geocoding module all exist. It omits
  `docs/design-system.md` from its documentation map and predates the `android`
  CI job (`.github/workflows/ci.yml:86`).

---

# Audited and found correct

Recorded so this report distinguishes "checked and fine" from "not looked at":

- **No SQL injection.** Every raw query uses `$n` placeholders; the only
  interpolation is of two module-level constants unreachable from a request
  (`discoveries.service.ts:86`, `:146`). No QueryBuilder is used anywhere, so
  there is no template-literal `.where()` risk either.
- **No path traversal on photos.** Keys are server-generated `randomUUID()`,
  never client-influenced, and the read path re-validates against
  `FILENAME_PATTERN` (`photos.service.ts:20,81`) before prefixing.
- **EXIF really is stripped**, not merely claimed — via a sharp re-encode
  (`photos.service.ts:179-218`), behind a genuine header-sniff allowlist that
  backs up the declared-MIME check.
- **No `password_hash` leakage.** `select: false` at the column
  (`user.entity.ts:59`), with a hand-written `toUserDto` whitelist. Group
  member DTOs deliberately omit email, with the reasoning in a comment.
- **Deny-by-default authorization** via `APP_GUARD`, with `@Public()` on
  exactly three routes. Every id-taking route verifies ownership or membership.
- **JWT `verifyOptions` pins `algorithms` and `issuer`**
  (`jwt.options.ts:40`) — the classic JWT mistake, avoided and documented.
- **Argon2id at current OWASP parameters** (`password.ts:26`), with cost read
  from the stored PHC string on verify.
- **Login is not a user-enumeration oracle** — see S5 for why this matters.
- **The dev auth bypass is correctly disabled in production**
  (`frontend/Dockerfile:14`; `VITE_ENABLE_AUTH_SKIP` unset in CI, deploy and
  compose).
- **TanStack query keys are consistently user-scoped**, so there is no
  cross-user cache leak (the one exception is noted in B9).
- **No geocoding SSRF** — the Nominatim URL is fixed and the query is a bound
  search param (`geocoding.service.ts:77-81`).
- **Docker exposure matches ADR-007** — no published port for `api`,
  `postgres` or `minio`; the production image is multi-stage and runs as
  `USER node`.
- **The frontend/API contract holds.** All 24 endpoints the client calls exist
  with matching paths, methods and shapes; no `<img src="/api/photos/…">`
  survives anywhere (verified across every render site).

---

# Suggested order

**Fix before the deadline**

1. **S1** — cross-tenant photo deletion. Wire up the already-written
   `PhotosService.exists()` and record the owner alongside the key.
2. **B1** — the `group_id` / `discovery_groups` split. Silent user data loss on
   an ordinary path.
3. **S2** — add `@nestjs/throttler`.
4. **B3 / B4** — the stock-photo fallback and central 401 handling.
5. **C1** — the two inert buttons, the catch-all route, the `LandmarkDetail`
   blank screen, and the `/collection` grid leak. Cheap, and all four are
   things a grader hits by clicking around.
6. **C4** — `lang="fr"` → `lang="en"` and `--muted-foreground` past 4.5:1. Two
   one-line changes.

**Fix if time allows**

7. **S3** authorize photo download; **S4 / S6** security headers, `helmet`,
   gate Swagger on `NODE_ENV`.
8. **B5** `@Matches(/^\d+$/)` on group params, copying `DiscoveryParamsDto`.
9. **B2** photo cleanup; **B6 / B7** the wrong-landmark fallback and the split
   "discovered" semantics.
10. **C2** point the eleven `bg-green-50` sites at the `bg-accent` token that
    already exists — the highest ratio of visible coherence to effort in the
    list.

**Backlog**

11. The rest of C2/C3 (type scale adoption, chip unification, one confirmation
    pattern, one destructive treatment), the remaining C4 focus states, C5, and
    the lower-severity items in S7 and B9.
