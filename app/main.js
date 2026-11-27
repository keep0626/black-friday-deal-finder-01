// DealSleuth rendering and filtering. No network calls: everything the page
// shows comes from data.js, which ships with the site.
import { DEALS, CHECKED_ON, CHECKED_NOTE } from "./data.js";

const VERDICT_LABELS = {
  "new-low": "New low",
  strong: "Strong deal",
  good: "Good deal",
  routine: "Routine",
  modest: "Modest",
  skip: "Skip"
};

// Lower is better: new lows first, skips last.
const VERDICT_RANK = {
  "new-low": 0,
  strong: 1,
  good: 2,
  routine: 3,
  modest: 4,
  skip: 5
};

const grid = document.getElementById("deals");
const emptyNote = document.getElementById("empty");
const resultCount = document.getElementById("result-count");
const searchBox = document.getElementById("search");
const storeSelect = document.getElementById("store-filter");
const discountSelect = document.getElementById("discount-filter");
const sortSelect = document.getElementById("sort");
const chipsBox = document.getElementById("category-chips");
const picksList = document.getElementById("top-picks");

function discountOf(deal) {
  return Math.round((1 - deal.sale / deal.was) * 100);
}

function savedOf(deal) {
  return deal.was - deal.sale;
}

function money(amount) {
  return "$" + amount.toFixed(2).replace(/\.00$/, "");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// --- Header stats -----------------------------------------------------------
function renderStats() {
  const stores = new Set(DEALS.map((d) => d.store)).size;
  const totalSaved = DEALS.reduce((sum, d) => sum + savedOf(d), 0);
  const avg = Math.round(
    DEALS.reduce((sum, d) => sum + discountOf(d), 0) / DEALS.length
  );
  document.getElementById("stat-deals").textContent = String(DEALS.length);
  document.getElementById("stat-stores").textContent = String(stores);
  document.getElementById("stat-avg").textContent = avg + "%";
  document.getElementById("stat-saved").textContent =
    "$" + Math.round(totalSaved).toLocaleString("en-US");
  document.getElementById("checked-line").textContent =
    "All prices checked " + CHECKED_ON + ". " + CHECKED_NOTE;
}

// --- Today's best bets ------------------------------------------------------
function renderPicks() {
  const best = [...DEALS]
    .filter((d) => d.verdict !== "skip")
    .sort((a, b) => {
      const rank = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
      return rank !== 0 ? rank : discountOf(b) - discountOf(a);
    })
    .slice(0, 3);
  picksList.innerHTML = best
    .map(
      (deal, i) => `
    <li>
      <span class="pick-rank">#${i + 1} best bet</span>
      <h3>${escapeHtml(deal.name)}</h3>
      <div><span class="pick-price">${money(deal.sale)}</span>
      <span class="pick-was"><s>${money(deal.was)}</s> at ${escapeHtml(deal.store)}</span></div>
      <p>${escapeHtml(deal.verdictNote)}</p>
    </li>`
    )
    .join("");
}

// --- Filters ----------------------------------------------------------------
const CATEGORIES = [...new Set(DEALS.map((d) => d.category))].sort();
const STORES = [...new Set(DEALS.map((d) => d.store))].sort();
let activeCategory = "";

function buildControls() {
  for (const store of STORES) {
    const option = document.createElement("option");
    option.value = store;
    option.textContent = store;
    storeSelect.appendChild(option);
  }
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "chip";
  allChip.textContent = "All categories";
  allChip.setAttribute("aria-pressed", "true");
  allChip.addEventListener("click", () => setCategory("", allChip));
  chipsBox.appendChild(allChip);
  for (const category of CATEGORIES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent =
      category + " (" + DEALS.filter((d) => d.category === category).length + ")";
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => setCategory(category, chip));
    chipsBox.appendChild(chip);
  }
}

function setCategory(category, chip) {
  activeCategory = category;
  for (const button of chipsBox.querySelectorAll(".chip")) {
    button.setAttribute("aria-pressed", button === chip ? "true" : "false");
  }
  renderDeals();
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("q")) searchBox.value = params.get("q");
  if (params.get("store") && STORES.includes(params.get("store"))) {
    storeSelect.value = params.get("store");
  }
  if (params.get("min")) discountSelect.value = params.get("min");
  if (params.get("sort")) sortSelect.value = params.get("sort");
  if (params.get("cat") && CATEGORIES.includes(params.get("cat"))) {
    activeCategory = params.get("cat");
    for (const button of chipsBox.querySelectorAll(".chip")) {
      const pressed = button.textContent.startsWith(activeCategory + " (");
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
    }
  }
}

// --- Deal cards ---------------------------------------------------------------
function dealCard(deal) {
  const off = discountOf(deal);
  return `
  <li class="deal">
    <div class="deal-top">
      <span class="store">${escapeHtml(deal.store)}</span>
      <span class="off-badge">−${off}%</span>
    </div>
    <h3>${escapeHtml(deal.name)}</h3>
    <p class="category">${escapeHtml(deal.category)}</p>
    <div class="price-row">
      <span class="sale-price">${money(deal.sale)}</span>
      <span class="was-price">was <s>${money(deal.was)}</s></span>
    </div>
    <p class="save-line">You save ${money(savedOf(deal))}</p>
    <span class="pill pill-${deal.verdict}">${VERDICT_LABELS[deal.verdict]}</span>
    <p class="verdict-note">${escapeHtml(deal.verdictNote)}</p>
    <p class="deal-meta">Checked: ${escapeHtml(deal.checked)}<br>
    Source: ${escapeHtml(deal.source)}
    <span class="deal-window">${escapeHtml(deal.note)}</span></p>
    <a class="shop-link" href="${escapeHtml(deal.url)}" target="_blank" rel="noopener">Shop at ${escapeHtml(deal.store)} ↗</a>
  </li>`;
}

function sortDeals(list) {
  const sorted = [...list];
  switch (sortSelect.value) {
    case "discount":
      sorted.sort((a, b) => discountOf(b) - discountOf(a));
      break;
    case "saved":
      sorted.sort((a, b) => savedOf(b) - savedOf(a));
      break;
    case "price-low":
      sorted.sort((a, b) => a.sale - b.sale);
      break;
    case "price-high":
      sorted.sort((a, b) => b.sale - a.sale);
      break;
    default:
      sorted.sort((a, b) => {
        const rank = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
        return rank !== 0 ? rank : discountOf(b) - discountOf(a);
      });
  }
  return sorted;
}

function renderDeals() {
  const query = searchBox.value.trim().toLowerCase();
  const store = storeSelect.value;
  const minOff = Number(discountSelect.value);
  const filtered = DEALS.filter((deal) => {
    if (activeCategory && deal.category !== activeCategory) return false;
    if (store && deal.store !== store) return false;
    if (discountOf(deal) < minOff) return false;
    if (query) {
      const haystack = (deal.name + " " + deal.store + " " + deal.category).toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  const ordered = sortDeals(filtered);
  grid.innerHTML = ordered.map(dealCard).join("");
  emptyNote.hidden = ordered.length > 0;
  resultCount.textContent =
    "Showing " + ordered.length + " of " + DEALS.length + " deals" +
    (query ? ' for “' + searchBox.value.trim() + '”' : "") +
    (activeCategory ? " in " + activeCategory : "") +
    (store ? " at " + store : "") +
    (minOff > 0 ? ", " + minOff + "% off or more" : "") + ".";
}

for (const control of [searchBox, storeSelect, discountSelect, sortSelect]) {
  control.addEventListener("input", renderDeals);
  control.addEventListener("change", renderDeals);
}

buildControls();
readStateFromUrl();
renderStats();
renderPicks();
renderDeals();
