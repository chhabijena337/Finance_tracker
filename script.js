
"use strict";

const GOAL = 50000;
const STORAGE_KEY = "finora-transactions";

const categories = [
  "Food", "Transport", "Shopping", "Bills", "Education",
  "Health", "Salary", "Freelance", "Other"
];

const sampleTransactions = [
  { id: "1", title: "Monthly salary", amount: 35000, type: "income", category: "Salary", date: "2026-10-01" },
  { id: "2", title: "Grocery shopping", amount: 1250, type: "expense", category: "Food", date: "2026-10-03" },
  { id: "3", title: "Course fees", amount: 3000, type: "expense", category: "Education", date: "2026-10-05" },
  { id: "4", title: "Internet bill", amount: 799, type: "expense", category: "Bills", date: "2026-10-07" },
  { id: "5", title: "Freelance project", amount: 5000, type: "income", category: "Freelance", date: "2026-10-09" }
];

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const data = JSON.parse(saved);

      if (
        Array.isArray(data) &&
        data.every(item =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.amount === "number" &&
          ["income", "expense"].includes(item.type) &&
          typeof item.category === "string" &&
          typeof item.date === "string"
        )
      ) {
        return data;
      }
    }
  } catch (error) {
    console.error("Could not load transactions:", error);
  }

  return sampleTransactions.map(item => ({ ...item }));
}

let transactions = loadTransactions();
let selectedType = "expense";

const $ = id => document.getElementById(id);

const modal = $("transactionModal");
const form = $("transactionForm");
const titleInput = $("titleInput");
const amountInput = $("amountInput");
const categoryInput = $("categoryInput");
const dateInput = $("dateInput");
const searchInput = $("searchInput");
const filterSelect = $("filterSelect");

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Unable to save transactions:", error);
    alert("Your browser could not save the transactions.");
  }
}

function getTotals() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    savingsRate: income > 0
      ? Math.round(((income - expenses) / income) * 100)
      : 0
  };
}

function updateDashboard() {
  const totals = getTotals();

  $("balance").textContent = money(totals.balance);
  $("income").textContent = money(totals.income);
  $("expenses").textContent = money(totals.expenses);
  $("savingsRate").textContent = `${totals.savingsRate}%`;
  $("goalBalance").textContent = money(totals.balance);

  // Limit visual progress to 0-100%.
  const progress = Math.min(
    100,
    Math.max(0, (totals.balance / GOAL) * 100)
  );

  $("goalPercent").textContent = `${Math.round(progress)}%`;
  $("circleProgress").style.background =
    `conic-gradient(#84cc16 ${progress}%, var(--border) 0%)`;

  $("sidebarProgress").style.width = `${progress}%`;
  $("sidebarPercent").textContent =
    `${Math.round(progress)}% of target`;

  $("goalMessage").textContent =
    totals.balance >= GOAL
      ? "Your savings goal is reached!"
      : "Keep recording your income and expenses to track your progress.";

  drawChart();
}

function getVisibleTransactions() {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;

  return transactions
    .filter(item =>
      item.title.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search)
    )
    .filter(item => filter === "All" || item.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderTransactions() {
  const tbody = $("transactionList");
  const visible = getVisibleTransactions();

  tbody.replaceChildren();

  visible.forEach(item => {
    const row = document.createElement("tr");

    const transactionCell = document.createElement("td");
    const icon = document.createElement("span");
    icon.className = `transaction-icon ${item.type}`;
    icon.textContent = item.type === "income" ? "↙" : "↗";

    const name = document.createElement("span");
    name.className = "transaction-name";
    name.textContent = item.title;

    transactionCell.append(icon, name);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = item.category;

    const dateCell = document.createElement("td");
    dateCell.textContent = item.date;

    const amountCell = document.createElement("td");
    amountCell.className =
      item.type === "income"
        ? "align-right amount-income"
        : "align-right amount-expense";

    amountCell.textContent =
      `${item.type === "income" ? "+" : "−"}${money(item.amount)}`;

    const actionCell = document.createElement("td");
    actionCell.className = "align-right";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete ${item.title}`);

    deleteButton.addEventListener("click", () => {
      if (confirm(`Delete "${item.title}"?`)) {
        transactions = transactions.filter(
          transaction => transaction.id !== item.id
        );

        saveTransactions();
        renderAll();
      }
    });

    actionCell.appendChild(deleteButton);
    row.append(
      transactionCell,
      categoryCell,
      dateCell,
      amountCell,
      actionCell
    );

    tbody.appendChild(row);
  });

  $("emptyMessage").hidden = visible.length !== 0;
  $("transactionCount").textContent =
    `${visible.length} transaction(s) shown · Saved in this browser`;
}

function renderAll() {
  updateDashboard();
  renderTransactions();
}

function updateCategories() {
  const allowed = selectedType === "income"
    ? ["Salary", "Freelance", "Other"]
    : categories.filter(category =>
        !["Salary", "Freelance"].includes(category)
      );

  categoryInput.replaceChildren();

  allowed.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  categoryInput.value = selectedType === "income" ? "Salary" : "Food";
}

function openModal() {
  form.reset();
  selectedType = "expense";
  dateInput.value = todayString();

  document.querySelectorAll(".type-button").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.type === selectedType
    );
  });

  updateCategories();
  modal.hidden = false;
  titleInput.focus();
}

function closeModal() {
  modal.hidden = true;
}

document.querySelectorAll("#addButton, #addButton2").forEach(button => {
  button.addEventListener("click", openModal);
});

$("closeModal").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.hidden) {
    closeModal();
  }
});

document.querySelectorAll(".type-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedType = button.dataset.type;

    document.querySelectorAll(".type-button").forEach(item => {
      item.classList.toggle("selected", item === button);
    });

    updateCategories();
  });
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Please enter a valid description, amount, and date.");
    return;
  }

  transactions.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    title,
    amount,
    type: selectedType,
    category: categoryInput.value,
    date
  });

  saveTransactions();
  closeModal();
  renderAll();
});

searchInput.addEventListener("input", renderTransactions);
filterSelect.addEventListener("change", renderTransactions);

$("themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  $("themeButton").textContent = isDark ? "☀" : "☾";
  $("themeButton").title = isDark ? "Switch to light mode" : "Switch to dark mode";

  drawChart();
});

function getChartData() {
  const months = [];

  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);

    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;

    const monthTransactions = transactions.filter(
      item => item.date.startsWith(key)
    );

    months.push({
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      income: monthTransactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0),
      expenses: monthTransactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0)
    });
  }

  return months;
}

function drawChart() {
  const canvas = $("cashFlowChart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const dark = document.body.classList.contains("dark");
  const textColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#334155" : "#e2e8f0";

  ctx.clearRect(0, 0, width, height);

  const data = getChartData();
  const maxValue = Math.max(
    1000,
    ...data.flatMap(item => [item.income, item.expenses])
  );

  const left = 58;
  const right = 12;
  const top = 15;
  const bottom = 35;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i++) {
    const y = top + (chartHeight * i) / 4;
    const value = maxValue * (1 - i / 4);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillText(
      value >= 1000
        ? `₹${Math.round(value / 1000)}k`
        : `₹${Math.round(value)}`,
      left - 8,
      y
    );
  }

  const xAt = index =>
    left + chartWidth * (index + 0.5) / data.length;

  const yAt = value =>
    top + chartHeight * (1 - value / maxValue);

  function drawLine(key, color) {
    ctx.beginPath();

    data.forEach((item, index) => {
      const x = xAt(index);
      const y = yAt(item[key]);

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    data.forEach((item, index) => {
      ctx.beginPath();
      ctx.arc(xAt(index), yAt(item[key]), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  drawLine("income", "#65a30d");
  drawLine("expenses", "#f97316");

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  data.forEach((item, index) => {
    ctx.fillText(item.label, xAt(index), height - bottom + 12);
  });
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

window.addEventListener("resize", drawChart);

dateInput.value = todayString();
renderAll();
