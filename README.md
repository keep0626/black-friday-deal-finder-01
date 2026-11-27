[![make.fun](https://make.fun/badge/black-friday-deal-finder-01.svg)](https://make.fun/c/black-friday-deal-finder-01)
[![rank](https://make.fun/badge/black-friday-deal-finder-01/keep0626/black-friday-deal-finder-01/rank.svg)](https://make.fun/c/black-friday-deal-finder-01)
[![reward](https://make.fun/badge/black-friday-deal-finder-01/keep0626/black-friday-deal-finder-01/reward.svg)](https://make.fun/c/black-friday-deal-finder-01)

# DealSleuth — Real Black Friday Deals, Checked Today

A Black Friday deal finder with 30 real deals, each checked on 27 Nov 2026
at Amazon, Best Buy, Walmart, Target or Costco. Every deal shows its
product, store, a link to the product at that store, sale price, usual
price, discount, dollars saved, when the price was checked, where it was
read — and an honest verdict: **New low**, **Strong deal**, **Good deal**,
**Routine**, **Modest**, or **Skip**.

## How it works

- Search by name, store or category; filter by category, store and minimum
  discount; sort by verdict, biggest % off, most dollars saved or price.
- “Today's best bets” surfaces the three strongest verified deals.
- Every price was read from the store's own Black Friday release or page,
  or from a deals source that names the store (Best Buy release 17 Nov,
  Costco and Nintendo Black Friday pages, 9to5Toys Amazon coverage
  20–23 Nov, Walmart and Target coverage 27 Nov). Amazon prices move
  daily, so ones reported 20–23 Nov are marked “not re-checked”.
- A deal whose store published no usual price is left out; a deal that is
  barely a discount (Apple TV 4K, $10 off) is listed with a **Skip**
  verdict so nobody buys it by mistake.

## The site

Static files under `app/` — no build step, no network requests, no
framework. Serve it with any static server:

```
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080.

- `app/index.html` — the page
- `app/style.css` — the design
- `app/main.js` — rendering, search, filters and sorting
- `app/data.js` — the 30 checked deals (sale price, usual price, store,
  source, check time, verdict)

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
kit's vendored `buildDossier`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of this site in headless
Chromium: the full finder on desktop, the TVs filter, a search for
“airpods”, and the phone layout.
