    ---

# FINAL PRD — v2.3

## 0) Snapshot (what this version includes)

* **Recurrence:** Simple **recurring patterns** for Events & Pujas (Daily, Weekly, Monthly, Yearly) with basic exceptions.
* **Communities:** each has its own **calendar, task list, finance report, timeline, and simple Kanban**.
* **Donations:** **Stripe** (web\_gateway) via **secure webhooks**; **Hundi** & **In-temple** manual entries; reports by **source** and **provider**.
* **Messaging:** **Push (Expo)** + **WhatsApp (provider-ready)** only.
* **Budgets:** **single-stage** approval by **Finance**.
* **Attendance:** per-shift **present** boolean (no hour math).
* **Backend:** **Supabase** (primary) or **Convex** (alternative); no CMS.

---

## 1) Goals & Success Metrics

**Goals**

* Unify temple ops: communities, events, tasks, volunteers, pujas, budgets, finances, communications.
* Give each community autonomy with guardrails and shared infra.
* Modern, mobile-first UX for staff/volunteers/devotees.

**Success (first 3 months)**

* 50% faster to publish/update puja/events.
* +30% volunteer shift fulfillment.
* Finance dashboards reconcile web (Stripe) + hundi + in-temple within 24h.
* Public site Core Web Vitals "Good" (LCP < 2.5s).

---

## 2) Surfaces

* **Public Website (Next.js):** Home, Communities, Events (calendar), Pujas & Timings, Volunteer, About/Contact, Media, Downloads (brochures), **Donate (Stripe)**.
* **Admin Portal (Next.js):** Communities (members, calendar, tasks, **Kanban**, reports, timeline), Events/Tasks, Budgets (single-stage), Finance (donations/expenses/reconciliation), Pujas (simple recurring + exceptions), Volunteers/Shifts (presence), Communications (brochures), Broadcasts, Audit/Settings.
* **Temple App (Expo/React Native):** Home/Feed, Pujas, Events, My Tasks/Shifts, Communities (public-safe), Volunteer (opt-in), Messages (Push/WhatsApp), presence toggle.

---

## 3) Roles & Access (RBAC + RLS)

* **Super Admin:** all.
* **Chairman/Board:** read finance dashboards/reports.
* **Finance:** donations/expenses write; approve budgets; finance dashboards.
* **Community Owner:** manage members/events/tasks/budgets for their community.
* **Community Member (Lead/Member):** see community; update assigned tasks.
* **Volunteer Coordinator:** volunteer pool, shifts, presence, broadcasts to volunteers.
* **Priest:** puja series & exceptions.
* **Volunteer:** opt-in; accept shifts; mark present.
* **Public/Devotee:** view public content and volunteer opt-in.

---

## 4) Key Features (by module)

### 4.1 Communities (Admin Portal)

* CRUD communities; assign **Owner** and members (lead/member).
* **Calendar:** per-community; shows **expanded recurring** instances (events).
* **Tasks:** simple list (title, assignee, **todo/done**).
* **Kanban (lightweight):**

  * **Events lane:** Draft → Published → Cancelled (moves `events.status`).
  * **Tasks lane:** Todo → Done (toggles `event_tasks.status`).
  * **Shifts lane:** Upcoming → Active → Done (time-based, read-only).
* **Reports:** per-community inflow (web\_gateway/Stripe, hundi, in\_temple), outflow (expenses), net; CSV.
* **Timeline:** activity feed (event/task changes, budgets, donations/expenses, brochures).

### 4.2 Events & Tasks

* Event create/edit: title, desc, location, start/end, **recurring pattern** (None, Daily, Weekly, Monthly, Yearly), **repeat frequency** (every N days/weeks/months), **end condition** (date or count), timezone, visibility, status.
* Tasks per event: title, assignee (community member), status **todo/done**, note, attachments.
* Community & org calendars query **expanded** instances for date ranges.

### 4.3 Budgets (single stage)

* Owner submits: amount, purpose, line items/attachments, optional event link.
* **Finance** approves or rejects with note; Owner notified; appears in community reports/timeline.

### 4.4 Finance

* **Donations:** sources = `web_gateway`(Stripe), `hundi`, `in_temple`.

  * Stripe webhook upserts `donations` (provider refs, fees, net).
  * Manual entries for hundi/in\_temple.
* **Expenses:** vendor, amount, category, community/event link, receipt.
* **Dashboards/Reports:** inflow by **source/provider**, outflow by community/category; CSV.
* **Reconciliation:** view exceptions; resolve/refund handling.

### 4.5 Pujas

* **Series with simple recurring patterns** (timezone) + **exceptions** (cancel/reschedule specific date).
* Recurring options: None, Daily, Weekly (with day selection), Monthly (same date or same weekday), Yearly.
* Day-of status (On-time/Delayed/Cancelled) by Priest; subscribers notified; public site updates.

### 4.6 Volunteers & Shifts

* Volunteer opt-in (skills/languages/availability) → coordinator approves.
* Shifts (community/event linked): role, location, start/end, capacity; assign or leave open.
* **Attendance = present boolean** (volunteer "I'm here" or coordinator toggles).

### 4.7 Communications & Broadcasts

* **Brochures:** template (fixed header/footer) → generate **PPTX + PDF** → publish to Downloads → share link (WhatsApp-ready).
* **Broadcasts:** channel = **Push** or **WhatsApp**; audience segments (All, community members, volunteers by tag, priests, finance, custom). Delivery logs, retries.

---

## 5) Payments & Messaging

### Stripe (web donations)

* Donate page uses Stripe Checkout/Payment Element.
* **Edge Function webhook** (signature-verified, idempotent) handles: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, etc.
* `donations` rows store **gross, fee, net, provider ids, status, received\_at, source=web\_gateway**.

### Messaging

* **Push (Expo)** and **WhatsApp (provider-ready)** only.
* Central `messages` table; per-channel workers; rate limiting; delivery logs.

---

## 6) Data Model (Supabase-first, essentials)

* **users, roles, user\_roles**
* **communities**(id, name, description, owner\_id, is\_active)
* **community\_members**(community\_id, user\_id, role: lead|member, status)
* **events**(id, community\_id, title, desc, location, starts\_at, ends\_at, **recurring\_pattern**: none|daily|weekly|monthly|yearly, **recurring\_frequency**: int, **recurring\_end\_date**: date?, **recurring\_count**: int?, **recurring\_days\_of\_week**: int[]?, **timezone**, visibility, status)
* **event\_instances**(id, event\_id, starts\_at, ends\_at, status: active|cancelled|rescheduled, is\_exception: bool)
* **event\_tasks**(id, event\_id, title, assignee\_id, status: todo|done, note, attachments\[])
* **budgets**(id, community\_id, event\_id?, requested\_by, amount, purpose, attachments\[], status: pending|approved|rejected, finance\_note?, decided\_at)
* **donations**(id, source: web\_gateway|hundi|in\_temple, provider: 'stripe'|null, provider\_payment\_id, provider\_customer\_id, provider\_session\_id, amount, provider\_fee\_amount, net\_amount, status, received\_at, community\_id?, event\_id?, metadata, reconciled)
* **expenses**(id, community\_id?, event\_id?, vendor, amount, category, paid\_on, receipt\_url, note)
* **volunteers**(user\_id PK, skills\[], languages\[], verified bool, availability\_json)
* **shifts**(id, community\_id?, event\_id?, role, location, starts\_at, ends\_at, capacity)
* **shift\_attendance**(id, shift\_id, user\_id, present bool, marked\_by, marked\_at)
* **puja\_series**(id, title, location, priest\_id, **recurring\_pattern**: none|daily|weekly|monthly|yearly, **recurring\_frequency**: int, **recurring\_end\_date**: date?, **recurring\_days\_of\_week**: int[]?, **timezone**, visibility, active bool)
* **puja\_instances**(id, series\_id, starts\_at, ends\_at, status: active|cancelled|rescheduled|delayed, is\_exception: bool)
* **puja\_exceptions**(id, series\_id, original\_date, action: cancel|reschedule, new\_start\_time?, new\_end\_time?, note)
* **announcements**(id, audience, title, body, publish\_at, expires\_at, pinned)
* **brochure\_templates, brochures, messages, audit\_logs, payment\_events** (as needed)

**RLS (sketch):**

* Public read for public fields; community-scoped read/write for Owner/Leads; task write for assignee; finance tables write by Finance; Chairman/Board read finance reports; broadcast write by authorized roles.

---

## 7) APIs (Edge Functions / RPC – minimal set)

* **Communities:** `POST/GET/PATCH /communities`, `POST/DELETE /communities/:id/members`
* **Events:** `POST/GET/PATCH /events` (accepts recurring fields), `POST /events/:id/tasks`, `PATCH /tasks/:id`
* **Recurring expansion:** `POST /utils/expand-recurring` → return instances for given `from/to` based on simple patterns
* **Community views:**

  * `/communities/:id/calendar?from=&to=&expand=1`
  * `/communities/:id/tasks?status=`
  * `/communities/:id/reports?from=&to=`
  * `/communities/:id/timeline?cursor=`
* **Budgets:** `POST /budgets`, `PATCH /budgets/:id` (finance approve/reject)
* **Donations:** `POST /webhooks/stripe` (web\_gateway only), `POST /donations` (hundi/in\_temple)
* **Expenses:** `POST /expenses`
* **Volunteers/Shifts:** `POST /volunteers`, `PATCH /volunteers/:id` (approve), `POST /shifts`, `POST /shifts/:id/assign`, `POST /attendance` (present=true)
* **Pujas:** `POST /puja-series`, `POST /puja-series/:id/exceptions`, `GET /pujas?from=&to=&expand=1`
* **Comms:** `POST /brochures`, `POST /publish/brochure/:id`, `POST /broadcasts` (push|whatsapp)
* **Announcements:** `POST /announcements`

---

## 8) Non-Functional & Security

* **Perf:** API p95 < 300ms (cached), web LCP < 2.5s.
* **Security:** HTTPS; Stripe webhook signature verify; JWT auth; RLS on all tables; audit logs.
* **Reliability:** retries & idempotency for webhooks/broadcasts; daily backups.
* **Accessibility:** WCAG 2.1 AA for public web & core admin screens.
* **Observability:** Supabase logs, Sentry (web/app), Cloudflare.

---

## 9) Delivery Plan (45 days)

* **Days 1–4:** Foundations (data model, RLS, repos, CI/CD, design tokens).
* **Days 5–12:** Communities, Events/Tasks, Simple recurring expansion, Community Calendar/Tasks views.
* **Days 13–18:** Finance core (donations/expenses), **Stripe webhook**, Reconciliation UI, Reports.
* **Days 19–24:** Pujas (simple recurring + exceptions), Volunteers/Shifts (presence), Broadcasts.
* **Days 25–30:** Communications (Brochures + Downloads), Community **Kanban**, Timeline aggregation.
* **Days 31–37:** Public web pages, app screens (Home, Pujas, Events, Tasks/Shifts, Communities, Messages).
* **Days 38–42:** UAT (role-based), perf & security pass, content migration.
* **Days 43–45:** Launch web/admin, internal mobile distribution, training & handover.

---

## 10) Acceptance Criteria (high level)

* Create recurring event & puja with simple patterns; exceptions render; calendars show correct instances.
* Community **Calendar/Tasks/Kanban** work end-to-end with RLS enforced.
* Budget submitted → Finance approves/rejects; Owner notified; shows in community report & timeline.
* Stripe payment creates donation via webhook with **gross/fee/net**; reports by source/provider are correct; hundi/in\_temple manual entries included.
* Shifts created; volunteers marked **present**; presence visible in shift view.
* Brochure generated (PPTX+PDF), published to Downloads; WhatsApp share link works.
* Broadcasts deliver via Push/WhatsApp; logs show status.

---

## 11) Risks & Mitigations

* **Recurring complexity:** Use simple dropdown patterns (Daily/Weekly/Monthly/Yearly) with basic frequency; provide preview; server-side validation.
* **Webhook failures:** idempotency keys + retry + `payment_events` log + manual reconciliation.
* **RLS mistakes:** start conservative; admin bypass functions; unit tests for policies.
* **WhatsApp readiness:** ship provider-ready; device share fallback.

---

## 12) Client Inputs

* Community list (owners, members), finance categories, approval policy note, Stripe keys/webhook secret, brochure header/footer assets, WhatsApp Business onboarding details (when ready).

---

## 13) Simplified Recurring Pattern Details

### Event Recurring Options:
- **None:** One-time event
- **Daily:** Every N days
- **Weekly:** Every N weeks on selected days (Mon, Tue, Wed, etc.)
- **Monthly:** Every N months on same date (e.g., 15th) OR same weekday (e.g., 2nd Tuesday)
- **Yearly:** Every N years on same date

### End Conditions:
- **End Date:** Stop recurring after specific date
- **Count:** Stop after N occurrences
- **Never:** Continue indefinitely (with reasonable limit like 2 years ahead)

### Exception Handling:
- Cancel specific instance
- Reschedule specific instance to different time
- All future instances inherit changes to parent event

### Implementation Notes:
- Generate instances up to 1 year ahead for performance
- Background job regenerates instances as needed
- Simple SQL queries instead of RRULE parsing
- UI shows clear preview of next 5-10 occurrences

--- 
