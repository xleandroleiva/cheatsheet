const form = document.querySelector("#entry-form");
const entriesBody = document.querySelector("#entries");
const emptyState = document.querySelector("#empty-state");
const totalPesos = document.querySelector("#total-pesos");
const totalUsd = document.querySelector("#total-usd");
const totalPagado = document.querySelector("#total-pagado");
const clearForm = document.querySelector("#clear-form");
const searchInput = document.querySelector("#search");
const filterType = document.querySelector("#filter-type");

const STORAGE_KEY = "gastos-cobros-entries";

const currencyFormat = (value, currency) => {
  if (!value) {
    return currency === "ARS" ? "$ 0" : "U$S 0";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const readStorage = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("No se pudo leer localStorage", error);
    return [];
  }
};

const saveStorage = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

let entries = readStorage();

const resetForm = () => {
  form.reset();
};

const buildRow = (entry) => {
  const row = document.createElement("tr");
  const status = entry.pagado ? "Pagado" : "Pendiente";
  const statusClass = entry.pagado ? "status" : "status pending";

  row.innerHTML = `
    <td>${entry.concepto}</td>
    <td><span class="tag">${entry.tipo}</span></td>
    <td>${entry.dia || "-"}</td>
    <td>${entry.fecha || "-"}</td>
    <td>${currencyFormat(entry.pesos, "ARS")}</td>
    <td>${currencyFormat(entry.usd, "USD")}</td>
    <td><span class="${statusClass}">${status}</span></td>
    <td>${currencyFormat(entry.entrega, "ARS")}</td>
    <td>${currencyFormat(entry.saldo, "ARS")}</td>
    <td>${entry.banco || "-"}</td>
    <td>${currencyFormat(entry.pagoMinimo, "ARS")}</td>
    <td>${currencyFormat(entry.faltaPagar, "ARS")}</td>
    <td>${entry.notas || "-"}</td>
    <td><button type="button" class="ghost" data-id="${entry.id}">Eliminar</button></td>
  `;

  return row;
};

const renderTotals = () => {
  const totalPesosValue = entries.reduce((sum, entry) => sum + entry.pesos, 0);
  const totalUsdValue = entries.reduce((sum, entry) => sum + entry.usd, 0);
  const totalPagadoValue = entries.filter((entry) => entry.pagado).length;

  totalPesos.textContent = currencyFormat(totalPesosValue, "ARS");
  totalUsd.textContent = currencyFormat(totalUsdValue, "USD");
  totalPagado.textContent = totalPagadoValue;
};

const applyFilters = () => {
  const term = searchInput.value.toLowerCase();
  const type = filterType.value;

  return entries.filter((entry) => {
    const matchesTerm =
      entry.concepto.toLowerCase().includes(term) ||
      entry.banco.toLowerCase().includes(term);
    const matchesType = !type || entry.tipo === type;
    return matchesTerm && matchesType;
  });
};

const render = () => {
  const filtered = applyFilters();
  entriesBody.innerHTML = "";

  filtered.forEach((entry) => {
    entriesBody.appendChild(buildRow(entry));
  });

  emptyState.style.display = filtered.length ? "none" : "block";
  renderTotals();
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);

  const entry = {
    id: crypto.randomUUID(),
    concepto: data.get("concepto").trim(),
    tipo: data.get("tipo"),
    dia: data.get("dia").trim(),
    fecha: data.get("fecha"),
    pesos: Number(data.get("pesos")) || 0,
    usd: Number(data.get("usd")) || 0,
    pagado: data.get("pagado") === "on",
    banco: data.get("banco").trim(),
    entrega: Number(data.get("entrega")) || 0,
    saldo: Number(data.get("saldo")) || 0,
    pagoMinimo: Number(data.get("pagoMinimo")) || 0,
    faltaPagar: Number(data.get("faltaPagar")) || 0,
    notas: data.get("notas").trim(),
  };

  entries = [entry, ...entries];
  saveStorage(entries);
  resetForm();
  render();
});

entriesBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const id = target.dataset.id;
  if (!id) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== id);
  saveStorage(entries);
  render();
});

searchInput.addEventListener("input", render);
filterType.addEventListener("change", render);
clearForm.addEventListener("click", resetForm);

render();
