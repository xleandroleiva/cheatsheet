const STORAGE_KEY = "sales-control-data";

const form = document.querySelector("#sale-form");
const tableBody = document.querySelector("#sales-table");
const clearButton = document.querySelector("#clear-sales");
const filterChannel = document.querySelector("#filter-channel");
const filterText = document.querySelector("#filter-text");

const totalSalesEl = document.querySelector("#total-sales");
const totalUnitsEl = document.querySelector("#total-units");
const avgTicketEl = document.querySelector("#avg-ticket");

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const today = new Date().toISOString().split("T")[0];
form.date.value = today;

const state = {
  sales: [],
};

const loadSales = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn("No se pudo leer el almacenamiento", error);
    return [];
  }
};

const saveSales = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sales));
};

const calculateTotals = () => {
  const totals = state.sales.reduce(
    (acc, sale) => {
      acc.total += sale.price * sale.quantity;
      acc.units += sale.quantity;
      return acc;
    },
    { total: 0, units: 0 }
  );

  const avg = totals.units ? totals.total / totals.units : 0;

  totalSalesEl.textContent = currency.format(totals.total);
  totalUnitsEl.textContent = totals.units.toString();
  avgTicketEl.textContent = currency.format(avg);
};

const buildRow = (sale, index) => {
  const row = document.createElement("tr");
  const margin = sale.price - sale.cost;
  row.innerHTML = `
    <td>${sale.date}</td>
    <td>${sale.product}</td>
    <td><span class="tag">${sale.channel}</span></td>
    <td>${sale.quantity}</td>
    <td>${currency.format(sale.price)}</td>
    <td>${currency.format(margin)}</td>
    <td><button class="ghost" type="button" data-index="${index}">Eliminar</button></td>
  `;
  return row;
};

const renderEmptyState = () => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td colspan="7" class="empty-state">No hay ventas registradas aún.</td>
  `;
  return row;
};

const applyFilters = () => {
  const channel = filterChannel.value;
  const search = filterText.value.toLowerCase();

  return state.sales.filter((sale) => {
    const matchesChannel = channel ? sale.channel === channel : true;
    const matchesSearch = `${sale.product} ${sale.channel}`.toLowerCase().includes(search);
    return matchesChannel && matchesSearch;
  });
};

const renderSales = () => {
  const filtered = applyFilters();
  tableBody.innerHTML = "";

  if (!filtered.length) {
    tableBody.appendChild(renderEmptyState());
    return;
  }

  filtered.forEach((sale, index) => {
    tableBody.appendChild(buildRow(sale, index));
  });
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);

  const sale = {
    date: data.get("date"),
    product: data.get("product").trim(),
    channel: data.get("channel"),
    quantity: Number(data.get("quantity")),
    price: Number(data.get("price")),
    cost: Number(data.get("cost")) || 0,
  };

  state.sales.unshift(sale);
  saveSales();
  form.reset();
  form.date.value = today;
  form.quantity.value = 1;
  calculateTotals();
  renderSales();
});

clearButton.addEventListener("click", () => {
  if (!state.sales.length) {
    return;
  }
  const confirmed = window.confirm("¿Seguro que deseas eliminar todas las ventas?");
  if (!confirmed) {
    return;
  }
  state.sales = [];
  saveSales();
  calculateTotals();
  renderSales();
});

tableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const index = Number(target.dataset.index);
  if (Number.isNaN(index)) {
    return;
  }
  state.sales.splice(index, 1);
  saveSales();
  calculateTotals();
  renderSales();
});

filterChannel.addEventListener("change", renderSales);
filterText.addEventListener("input", renderSales);

state.sales = loadSales();
calculateTotals();
renderSales();
