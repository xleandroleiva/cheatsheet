const form = document.querySelector("#entry-form");
const entriesBody = document.querySelector("#entries");
const emptyState = document.querySelector("#empty-state");
const totalPesos = document.querySelector("#total-pesos");
const totalUsd = document.querySelector("#total-usd");
const totalPagado = document.querySelector("#total-pagado");
const clearForm = document.querySelector("#clear-form");
const searchInput = document.querySelector("#search");
const filterType = document.querySelector("#filter-type");
const diaInput = form.querySelector("[name='dia']");
const fechaInput = form.querySelector("[name='fecha']");
const pesosInput = form.querySelector("[name='pesos']");
const entregaInput = form.querySelector("[name='entrega']");
const saldoInput = form.querySelector("[name='saldo']");
const pagadoInput = form.querySelector("[name='pagado']");
const bancoInput = form.querySelector("[name='banco']");

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
let editingId = null;

const resetForm = () => {
  form.reset();
  editingId = null;
  form.querySelector("button[type='submit']").textContent = "Guardar movimiento";
  updateBankAndEntregaState();
};

const updateDiaFromFecha = () => {
  if (!fechaInput.value) {
    diaInput.value = "";
    return;
  }

  const date = new Date(`${fechaInput.value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    diaInput.value = "";
    return;
  }

  diaInput.value = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
  }).format(date);
};

const updateSaldo = () => {
  const pesos = Number(pesosInput.value) || 0;
  const entrega = Number(entregaInput.value) || 0;
  const saldo = Math.max(pesos - entrega, 0);
  saldoInput.value = saldo.toFixed(2);
  pagadoInput.checked = saldo === 0 && pesos > 0;
  updateBankAndEntregaState();
};

const updateBankAndEntregaState = () => {
  const enable = pagadoInput.checked;
  bancoInput.disabled = !enable;
  entregaInput.disabled = !enable;
  bancoInput.required = enable;
  entregaInput.required = enable;
  if (!enable) {
    bancoInput.value = "";
    entregaInput.value = "";
    saldoInput.value = (Number(pesosInput.value) || 0).toFixed(2);
  }
};

const handlePagadoToggle = () => {
  if (pagadoInput.checked) {
    entregaInput.value = Number(pesosInput.value || 0).toFixed(2);
  } else {
    entregaInput.value = "";
  }
  updateSaldo();
};

const buildRow = (entry) => {
  const row = document.createElement("tr");
  const isPagado = entry.saldo === 0 && entry.pesos > 0;
  const status = isPagado ? "Pagado" : "Pendiente";
  const statusClass = isPagado ? "status" : "status pending";

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
    <td>${entry.notas || "-"}</td>
    <td>
      ${
        isPagado
          ? ""
          : `<button type="button" class="ghost edit" data-id="${entry.id}">Modificar</button>`
      }
      <button type="button" class="ghost delete" data-id="${entry.id}">Eliminar</button>
    </td>
  `;

  return row;
};

const renderTotals = () => {
  const totalPesosValue = entries.reduce((sum, entry) => sum + entry.pesos, 0);
  const totalUsdValue = entries.reduce((sum, entry) => sum + entry.usd, 0);
  const totalPagadoValue = entries.filter(
    (entry) => entry.saldo === 0 && entry.pesos > 0
  ).length;

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
  const saldo = Number(saldoInput.value) || 0;

  const entry = {
    id: editingId ?? crypto.randomUUID(),
    concepto: data.get("concepto").trim(),
    tipo: data.get("tipo"),
    dia: data.get("dia").trim(),
    fecha: data.get("fecha"),
    pesos: Number(data.get("pesos")) || 0,
    usd: Number(data.get("usd")) || 0,
    banco: data.get("banco").trim(),
    entrega: Number(data.get("entrega")) || 0,
    saldo,
    pagoMinimo: Number(data.get("pagoMinimo")) || 0,
    notas: data.get("notas").trim(),
  };

  if (editingId) {
    entries = entries.map((item) => (item.id === editingId ? entry : item));
  } else {
    entries = [entry, ...entries];
  }
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

  if (target.classList.contains("delete")) {
    entries = entries.filter((entry) => entry.id !== id);
    saveStorage(entries);
    render();
    return;
  }

  if (target.classList.contains("edit")) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    editingId = id;
    form.querySelector("button[type='submit']").textContent = "Actualizar movimiento";
    form.concepto.value = entry.concepto;
    form.tipo.value = entry.tipo;
    form.dia.value = entry.dia;
    form.fecha.value = entry.fecha;
    form.pesos.value = entry.pesos;
    form.usd.value = entry.usd;
    pagadoInput.checked = entry.saldo === 0 && entry.pesos > 0;
    form.banco.value = entry.banco;
    form.entrega.value = entry.entrega;
    form.saldo.value = entry.saldo.toFixed(2);
    form.pagoMinimo.value = entry.pagoMinimo;
    form.notas.value = entry.notas;
    updateBankAndEntregaState();
    return;
  }
});

searchInput.addEventListener("input", render);
filterType.addEventListener("change", render);
clearForm.addEventListener("click", resetForm);
fechaInput.addEventListener("change", updateDiaFromFecha);
pesosInput.addEventListener("input", updateSaldo);
entregaInput.addEventListener("input", updateSaldo);
pagadoInput.addEventListener("change", handlePagadoToggle);

render();
updateSaldo();
updateDiaFromFecha();
