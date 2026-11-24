const STORAGE_KEY = "pocket-ledger-expenses-v1";

const icons = {
  Food: "🥑",
  Transport: "🚲",
  Home: "🏡",
  Shopping: "🛍️",
  Health: "🌿",
  Fun: "🎟️",
  Other: "✳️"
};

const $ = (selector) => document.querySelector(selector);

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.amount === "number" &&
      typeof item.date === "string"
    );
  } catch {
    return [];
  }
}

let expenses = loadExpenses();

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    $("#form-message").textContent = "";
  } catch {
    $("#form-message").textContent =
      "Could not save. Check your browser storage settings.";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderList() {
  const filter = $("#filter").value;

  const visibleExpenses = [...expenses]
    .filter(item => filter === "All" || item.category === filter)
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

  const list = $("#expense-list");

  if (!visibleExpenses.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">${expenses.length ? "🔎" : "🧾"}</div>
        ${expenses.length
          ? "No expenses in this category."
          : "Nothing here yet. Add your first expense to get started."}
      </div>`;
    return;
  }

  list.innerHTML = visibleExpenses.map(item => `
    <article class="expense">
      <div class="category-icon" aria-hidden="true">
        ${icons[item.category] || icons.Other}
      </div>

      <div>
        <div class="expense-title">${escapeHtml(item.description)}</div>
        <div class="expense-meta">
          ${escapeHtml(item.category)} ·
          ${new Date(`${item.date}T12:00:00`).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric", year: "numeric" }
          )}
        </div>
      </div>

      <div class="expense-amount">${money(item.amount)}</div>

      <button
        class="delete"
        type="button"
        data-delete="${escapeHtml(item.id)}"
        aria-label="Delete ${escapeHtml(item.description)}"
      >×</button>
    </article>
  `).join("");
}

function renderBreakdown(monthExpenses, total) {
  const totals = {};

  for (const item of monthExpenses) {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
  }

  const categories = Object.entries(totals)
    .sort((a, b) => b[1] - a[1]);

  if (!categories.length) {
    $("#breakdown").innerHTML =
      '<div class="hint">Your category totals will show here.</div>';
    return;
  }

  $("#breakdown").innerHTML = categories.map(([category, amount]) => `
    <div class="category-row">
      <div class="category-line">
        <span>${icons[category] || icons.Other} &nbsp;${escapeHtml(category)}</span>
        <span>${money(amount)}</span>
      </div>

      <div class="track">
        <div class="bar" style="width:${
          total ? Math.max(2, amount / total * 100) : 0
        }%"></div>
      </div>
    </div>
  `).join("");
}

function render() {
  const now = new Date();
  const currentMonth = localDate(now).slice(0, 7);
  const today = localDate(now);

  const monthExpenses = expenses.filter(
    item => item.date.slice(0, 7) === currentMonth
  );

  const todayExpenses = monthExpenses.filter(
    item => item.date === today
  );

  const monthTotal = monthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const todayTotal = todayExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  $("#month-label").textContent = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  }).toUpperCase();

  $("#month-total").textContent = money(monthTotal);
  $("#month-count").textContent =
    `${monthExpenses.length} expense${monthExpenses.length === 1 ? "" : "s"} recorded`;
  $("#today-total").textContent = money(todayTotal);
  $("#daily-average").textContent =
    money(monthTotal / Math.max(1, now.getDate()));

  renderList();
  renderBreakdown(monthExpenses, monthTotal);
}

$("#date").value = localDate();

$("#filter").addEventListener("change", renderList);

$("#expense-form").addEventListener("submit", event => {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const amount = Number(formData.get("amount"));

  if (!Number.isFinite(amount) || amount <= 0) return;

  expenses.push({
    id: globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random()}`,
    description: String(formData.get("description")).trim(),
    amount,
    category: String(formData.get("category")),
    date: String(formData.get("date"))
  });

  saveExpenses();
  event.currentTarget.reset();
  $("#date").value = localDate();
  render();
  $("#description").focus();
});

$("#expense-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");

  if (!button) return;

  expenses = expenses.filter(item => item.id !== button.dataset.delete);
  saveExpenses();
  render();
});

render();