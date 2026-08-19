# Jurnii — agent instructions

**Read [`CLAUDE.md`](CLAUDE.md) at the REPOSITORY ROOT — the same directory as this file. It is the
full guide and applies to every agent, not only Claude.** (You may be cwd'd into `booking/` or
`zoho-functions/`; the file is one or more levels up, at the root.)

The four things that matter most, so they cannot be missed even if you read nothing else:

1. **This is a monorepo** — marketing website (`src/`, `content/`), booking module (`booking/`), and
   Zoho CRM automation (`zoho-functions/`). Identify which one you are in first.

2. **The commercial model is `Account → Deal`, `Product → Quote`, with one Account holding zero or one
   persistent Deal, and opportunity authority on the Contact.** The Deluge code in `zoho-functions/v6/`
   still implements a superseded `Deal = Account × Product` model. Most code comments and documentation
   describe that superseded model — accurately, as current behaviour, but it is **not the target**.
   The authority is
   [`zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md).
   `zoho-functions/docs/v6/zoho_v6_refactor_spec_pack/` is **sealed — do not implement from it.**

3. **Never mutate Zoho.** Read-only by default. Never publish a Deluge function, never toggle a
   workflow rule, never delete a field, never write to a live record unless explicitly told to make
   that exact change.

4. **Do not invoke the `zoho-crm-deluge-refactoring` skill and do not run `/refactor-deluge`.**
   `zoho-functions/.agents/{rules,skills,workflows}/` is v3/v4-era and **sealed**. It carries an active
   refactoring mandate over five Deluge functions that no longer exist (`convert2lead`,
   `normalizeContactCommercialState`, `normalizeDealCommercialState`, `syncDealProductsAndValue`,
   `rollupAccountCommercialState`). Acting on it would rewrite live automation against a model that has
   been replaced twice.
