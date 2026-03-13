# Service Markup Management — Admin API

## Base Path
`/api/v1/unified-admin/markup`

**Auth:** JWT Bearer token (admin role required)

---

## READ THIS FIRST — How Service Markup Works (Plain English)

### What is service markup?

Markup is the **margin** we add on top of provider (e.g. VTpass) prices for data, airtime, cable TV, electricity, and other utility services. It is **not a reward** — it is our **revenue** on each transaction. The user pays (provider price + markup); we keep the markup.

**Example:** VTpass sells a data plan for ₦1,000. If markup for data is set to 7.5%, we show the user ₦1,075 and charge that. We pay VTpass ₦1,000 and keep ₦75. That ₦75 is markup revenue.

- **When markup is ON:** Users see and pay (provider price + markup). We earn the markup amount. Revenue from markup appears in dashboard and transaction reports.
- **When markup is OFF:** Users see and pay the provider price only (no margin). We make no markup on that service.

You can turn markup **on or off globally** and set **per-service** percentages. You can also set a **minimum amount** (e.g. ₦300) below which no markup is applied, so small transactions stay at provider price. Optionally, **“friendly” users** (e.g. partners, test accounts) can have a lower markup % per service.

### The two parts of the system

**Part 1: Global Config** — The master settings for the whole markup program.

| Setting | What it means | Real example |
|--------|----------------|--------------|
| **Markup Active (ON/OFF)** | Master switch. If OFF, no markup is applied on any service — users pay provider price only. | Turn ON when you want to earn margin. Turn OFF to run at cost (e.g. promo or troubleshooting). |
| **Default Markup %** | Fallback percentage when a service has no rule or its rule is inactive. Set to 0 if you only want specific services to have markup. | 7.5% — every service without its own rule (or with rule OFF) uses 7.5%. |
| **Default % (Friendlies)** | Optional lower % for “friendly” users (e.g. partners). Leave empty to use the same as default. | 5% — friendly users get 5% when the service has no rule. |
| **Min Amount to Apply Markup** | Transactions below this amount (NGN) get no markup. Leave 0 or empty for no minimum. | ₦300 — plans below ₦300 show provider price only; ₦300 and above get markup. |

**Part 2: Per-Service Rules** — Different markup percentages (and optional friendly %) per service.

| Service | Display name | Example % | Why different? |
|---------|--------------|-----------|----------------|
| `airtime` | Airtime | 5% | High volume; moderate margin |
| `data` | Data | 7.5% | Very common; can support higher margin |
| `cable` | Cable TV | 6% | Recurring subscriptions |
| `electricity` | Electricity | 4% | Large amounts; lower % still good revenue |
| `education` | Education | 0% (OFF) | Not enabled yet |
| `betting` | Betting | 0% (OFF) | Policy or not used |
| `international_airtime` | Intl Airtime | 0% (OFF) | Not enabled yet |

Each rule can override:
- **Percentage** and **Percentage (Friendlies)** — leave friendlies empty to use the same as regular.
- **Min Amount to Apply Markup** — leave empty to use the global config value.

### What are “friendly” users?

Friendly users are accounts (e.g. partners, internal testers) that you want to charge a lower markup. The backend identifies them (e.g. via user flags). When a rule has `percentage_friendlies` set, those users get that lower %; otherwise they get the same % as everyone else.

### What does “Seed All Rules” mean?

When you first open the markup settings page, there may be **no rules** yet — the system doesn’t have a row per service. **“Seed All Rules”** is a one-click button that creates a rule for every service type (airtime, data, cable, electricity, education, betting, international_airtime). All start at **0% and OFF**. After seeding, you set the percentages you want and turn each service ON. You only need to click it once; then you just edit the existing rules.

### Step-by-step: How to set up markup for the first time

1. Open the **Markup** page in admin (under Settings or Pricing).
2. Click **“Seed All Rules”** — this creates a row for every service (all 0%, OFF).
3. Set **Global Config**:
   - Turn markup **ON**.
   - Set default % (e.g. 7.5%) and optional default % for friendlies (e.g. 5%).
   - Set min amount to apply markup (e.g. ₦300), or 0 for no minimum.
   - Save.
4. Go through each service in the table:
   - Data: e.g. 7.5%, friendlies 5%, min amount ₦300, toggle ON.
   - Airtime: e.g. 5%, toggle ON.
   - Cable, electricity: set % and toggle ON as needed.
   - Leave education, betting, international_airtime OFF if you don’t want markup.
   - Save each row (or use bulk save if the UI supports it).
5. Done — data (and any other service you turned on) will use these settings. Revenue from markup appears in your dashboard and transaction reports.

### What happens when a user buys something (the flow)

Example: user buys a data plan. VTpass price = ₦1,000, data rule = 7.5%, min amount = ₦300.

1. System checks: is markup program ON? Yes.
2. System checks: does data have a rule and is it active? Yes, 7.5%.
3. System checks: is ₦1,000 ≥ min amount (₦300)? Yes.
4. Markup = ₦1,000 × 7.5% = ₦75. User is charged ₦1,075. We pay VTpass ₦1,000 and keep ₦75.
5. Transaction is stored with `markup_percent`, `markup_value`; revenue shows in dashboard.

If the same user buys a ₦200 plan (below ₦300), they are charged ₦200 (no markup).

**Markup is admin-only.** All services (data, airtime, cable, etc.) use only the config and rules you set here. There is no env fallback. If no config exists or markup is turned off, no markup is applied — users pay provider price only.

### What to watch out for / common questions

**Q: If I turn off markup, do existing transactions change?**  
A: No. Turning it off only affects **new** transactions. Past transactions keep their recorded markup.

**Q: If I change the percentage, does it affect past transactions?**  
A: No. Changes apply only to **future** purchases. Existing records are unchanged.

**Q: What if a service rule is OFF but default % is 7.5%?**  
A: That service gets **0%** markup. When a rule exists but is OFF, we respect that — it means you don’t want markup on that service. The default % only applies when there is **no rule** for the service.

**Q: Can I delete a rule?**  
A: Yes. Deleting the rule for a service makes that service use the **global default** % (and global min amount). If you want 0% for a service, it’s better to keep the rule and set 0% or turn it OFF.

**Q: Where do I see revenue from markup?**  
A: In the main admin **Dashboard** (revenue breakdown) and in **Transactions** (per-transaction `markup_value` and revenue totals). Markup is not a separate “markup history” — it’s part of normal transaction and revenue reporting.

---

## What Admin Can Do (Quick List)

1. **Toggle markup ON / OFF** — master switch for all services.
2. **Set global defaults** — default %, default % for friendlies, min amount to apply markup.
3. **Manage per-service rules** — set markup % (and optional friendlies %, min amount) for airtime, data, cable, electricity, education, betting, international_airtime.
4. **Seed all rules at once** — one-click first-time setup so every service has a row to edit.
5. **Turn individual services on/off** — use the Active toggle per service without changing others.

---

## API Endpoints

### 1. Get Config + Rules (everything in one call)

**GET** `/api/v1/unified-admin/markup/config`

Returns the master config and all service rules. Call this on page load.

#### Response

```json
{
  "success": true,
  "message": "Markup config fetched",
  "data": {
    "config": {
      "id": "markup_config",
      "is_active": true,
      "default_percentage": 7.5,
      "default_percentage_friendlies": 5,
      "min_amount_to_apply_markup": 300,
      "updated_by": "admin-uuid",
      "createdAt": "2026-03-13T00:00:00.000Z",
      "updatedAt": "2026-03-13T12:00:00.000Z"
    },
    "rules": [
      {
        "id": "uuid",
        "service_type": "data",
        "is_active": true,
        "percentage": 7.5,
        "percentage_friendlies": 5,
        "min_amount_to_apply_markup": 300,
        "updated_by": "admin-uuid",
        "createdAt": "2026-03-13T00:00:00.000Z",
        "updatedAt": "2026-03-13T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "service_type": "airtime",
        "is_active": true,
        "percentage": 5,
        "percentage_friendlies": null,
        "min_amount_to_apply_markup": null,
        "updated_by": "admin-uuid",
        "createdAt": "2026-03-13T00:00:00.000Z",
        "updatedAt": "2026-03-13T12:00:00.000Z"
      }
    ]
  }
}
```

**Config fields:**

| Field | Type | Meaning |
|-------|------|--------|
| `is_active` | boolean | Master switch. OFF = no markup on any service. |
| `default_percentage` | number | Fallback % when a service has no rule or rule is inactive. |
| `default_percentage_friendlies` | number \| null | Fallback % for friendly users. null = use `default_percentage`. |
| `min_amount_to_apply_markup` | number \| null | Minimum transaction amount (NGN) to apply markup. Below this, no markup. null/0 = no minimum. |

**Rule fields:**

| Field | Type | Meaning |
|-------|------|--------|
| `service_type` | string | One of: `airtime`, `data`, `cable`, `electricity`, `education`, `betting`, `international_airtime` |
| `is_active` | boolean | When false, this service uses global default (or no markup if global off). |
| `percentage` | number | Markup % for regular users. |
| `percentage_friendlies` | number \| null | Markup % for friendly users. null = use `percentage`. |
| `min_amount_to_apply_markup` | number \| null | Override global minimum for this service. null = use config value. |

**Note:** `percentage_friendlies: null` and `min_amount_to_apply_markup: null` on a rule mean “use the global config value”. In the UI, show these as empty/placeholder and display the global value as hint.

---

### 2. Update Global Config

**PUT** `/api/v1/unified-admin/markup/config`

All fields optional — send only what you want to change.

#### Full payload reference

| Field | Type | Default | What it controls |
|-------|------|--------|------------------|
| `is_active` | boolean | `false` | **Master switch** — ON = markup applied per rules; OFF = no markup on any service. |
| `default_percentage` | number | `0` | Fallback % when a service has no rule or rule is inactive. |
| `default_percentage_friendlies` | number | — | Fallback % for friendly users. Omit or null = use `default_percentage`. |
| `min_amount_to_apply_markup` | number | `0` | Min transaction amount (NGN) to apply markup. 0 = no minimum. |

#### Example: Turn on markup with 7.5% default

```json
{
  "is_active": true,
  "default_percentage": 7.5,
  "default_percentage_friendlies": 5,
  "min_amount_to_apply_markup": 300
}
```

#### Example: Turn off markup

```json
{
  "is_active": false
}
```

#### Response

Returns the same shape as GET config (updated `config` + full `rules`).

---

### 3. List Rules

**GET** `/api/v1/unified-admin/markup/rules`

Returns all markup rules (one per service that has a rule).

#### Response

```json
{
  "success": true,
  "message": "Markup rules fetched",
  "data": [
    {
      "id": "uuid",
      "service_type": "airtime",
      "is_active": true,
      "percentage": 5,
      "percentage_friendlies": null,
      "min_amount_to_apply_markup": null,
      "updated_by": "admin-uuid",
      "createdAt": "2026-03-13T00:00:00.000Z",
      "updatedAt": "2026-03-13T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Create Rule

**POST** `/api/v1/unified-admin/markup/rules`

One rule per `service_type`. If a rule for that service already exists, the API returns 400 — use update instead.

#### Request body

```json
{
  "service_type": "data",
  "percentage": 7.5,
  "is_active": true,
  "percentage_friendlies": 5,
  "min_amount_to_apply_markup": 300
}
```

| Field | Type | Required | Meaning |
|-------|------|----------|--------|
| `service_type` | string | **Yes** | One of: `airtime`, `data`, `cable`, `electricity`, `education`, `betting`, `international_airtime` |
| `percentage` | number | **Yes** | Markup % for regular users. |
| `is_active` | boolean | No | Default: `true`. |
| `percentage_friendlies` | number | No | Markup % for friendly users. Omit or null = use `percentage`. |
| `min_amount_to_apply_markup` | number | No | Min amount (NGN) for this service. Omit or null = use global config. |

---

### 5. Seed All Rules (first-time setup)

**POST** `/api/v1/unified-admin/markup/rules/seed`

No request body. Creates a rule for every service type that doesn’t already have one. All new rules start at **0% and OFF**.

#### Response

```json
{
  "success": true,
  "message": "Created 7 markup rules",
  "data": [
    { "id": "uuid", "service_type": "airtime", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "data", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "cable", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "electricity", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "education", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "betting", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null },
    { "id": "uuid", "service_type": "international_airtime", "percentage": 0, "is_active": false, "percentage_friendlies": null, "min_amount_to_apply_markup": null }
  ]
}
```

**When to show the Seed button:** Only when the `rules` array from `GET /config` is empty (or has fewer than 7 items and you want to fill gaps). Once all services have rules, hide or disable the button. Calling seed again is safe — it only creates missing rules.

---

### 6. Update Rule

**PUT** `/api/v1/unified-admin/markup/rules/:id`

Send only the fields you want to change.

#### Example

```json
{
  "percentage": 8,
  "percentage_friendlies": 5,
  "is_active": true,
  "min_amount_to_apply_markup": 250
}
```

| Field | Type | Meaning |
|-------|------|--------|
| `percentage` | number | Markup % for regular users. |
| `percentage_friendlies` | number | Markup % for friendly users. Omit or null = use `percentage`. |
| `is_active` | boolean | Turn this service’s markup on or off. |
| `min_amount_to_apply_markup` | number | Override min amount for this service. Omit or null = use global. |

---

### 7. Delete Rule

**DELETE** `/api/v1/unified-admin/markup/rules/:id`

Removes the rule. That service then uses the **global default** % and global min amount.

**Recommendation:** Prefer setting the rule to 0% or turning it OFF instead of deleting, so the service doesn’t unexpectedly use the global default.

---

## Settings Page UI Suggestion

Build a **dedicated Markup** page (e.g. under Settings or Pricing) with one main view: **Settings**.

```
+----------------------------------------------------------+
|  Service Markup Settings                                  |
|                                                           |
|  Program Status                                            |
|  +---------------------------------------------+          |
|  |  Markup Active                 [Toggle: ON] |          |
|  +---------------------------------------------+          |
|  When ON: users pay provider price + markup. We earn      |
|  the markup. When OFF: users pay provider price only.     |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Global Defaults (apply unless a service rule overrides)   |
|                                                           |
|  +------------------------+------------------------+      |
|  |  Default Markup %      |  Default % (Friendlies)|      |
|  |  [ 7.5 ] %             |  [ 5 ] % (optional)   |      |
|  +------------------------+------------------------+      |
|  |  Min Amount to Apply Markup (NGN)                      |      |
|  |  [ 300 ]  (0 = no minimum)                            |      |
|  +------------------------+------------------------+      |
|                                                           |
|                    [ Save Global Config ]                  |
|                                                           |
|  -------------------------------------------------------  |
|                                                           |
|  Per-Service Rules                    [ Seed All Rules ]  |
|  (set markup % per service; optional friendlies & min)    |
|                                                           |
|  +----------------+--------+-------+-----------+--------+  |
|  | Service        | Active |  %    | % (Friendly)| Min N |  |
|  +----------------+--------+-------+-----------+--------+  |
|  | Airtime        | [ON ]  | [ 5 ] | [ 3   ]   | [   ] |  |
|  | Data           | [ON ]  | [7.5] | [ 5   ]   | [300] |  |
|  | Cable TV       | [ON ]  | [ 6 ] | [    ]    | [   ] |  |
|  | Electricity    | [ON ]  | [ 4 ] | [    ]    | [   ] |  |
|  | Education      | [OFF]  | [ 0 ] | [    ]    | [   ] |  |
|  | Betting        | [OFF]  | [ 0 ] | [    ]    | [   ] |  |
|  | Intl Airtime   | [OFF]  | [ 0 ] | [    ]    | [   ] |  |
|  +----------------+--------+-------+-----------+--------+  |
|                                                           |
|  Empty % (Friendly) = same as regular %.                   |
|  Empty Min N = use global min amount above.                |
|                                                           |
|  Last updated by Admin on 13 Mar 2026                     |
|                                                           |
|                    [ Save All Rules ]                      |
+----------------------------------------------------------+
```

**On page load:**

1. Call `GET /unified-admin/markup/config` — fill global section and rules table.
2. If `rules` is empty (or you want to ensure all 7 services), show **“Seed All Rules”**. After seeding, the table shows all 7 services at 0% / OFF.

**On save global config:** Call `PUT /unified-admin/markup/config` with only the fields that changed.

**On save rules:** For each changed row, call `PUT /unified-admin/markup/rules/:id` with the new values.

**Show confirmation dialogs before:**

- Toggling markup ON/OFF (affects all users immediately).
- Changing percentages (affects all future purchases for that service).

**Short note on page:** “Markup is our revenue margin on provider prices, not a user reward. Revenue appears in Dashboard and Transactions.”
