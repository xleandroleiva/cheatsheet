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
const diaMesInput = form.querySelector("[name='diaMes']");
const mesInput = form.querySelector("[name='mes']");
const pesosInput = form.querySelector("[name='pesos']");
const entregaInput = form.querySelector("[name='entrega']");
const saldoInput = form.querySelector("[name='saldo']");
const pagadoInput = form.querySelector("[name='pagado']");
const bancoInput = form.querySelector("[name='banco']");
const anioInput = document.querySelector("#anio");
const bankForm = document.querySelector("#bank-form");
const bankList = document.querySelector("#bank-list");

const STORAGE_KEY = "gastos-cobros-entries";
const BANKS_KEY = "gastos-cobros-banks";
const YEAR_KEY = "gastos-cobros-year";

const currencyFormat = (value, currency) => {
  if (!value) {
    return currency === "ARS" ? "$ 0" : "U$S 0";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
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
let banks = [];

const resetForm = () => {
  form.reset();
  editingId = null;
  form.querySelector("button[type='submit']").textContent = "Guardar movimiento";
  updateBankAndEntregaState();
};

const getYearValue = () => {
  const raw = Number(anioInput.value);
  if (!raw) {
    return new Date().getFullYear();
  }
  return raw;
};

const buildFecha = () => {
  const diaMes = Number(diaMesInput.value);
  const mes = Number(mesInput.value);
  const anio = getYearValue();
  if (!diaMesInput.value || mesInput.value === "") {
    return "";
  }
  const fecha = new Date(anio, mes, diaMes);
  if (Number.isNaN(fecha.getTime())) {
    return "";
  }
  const day = String(diaMes).padStart(2, "0");
  const month = String(mes + 1).padStart(2, "0");
  return `${day}/${month}/${anio}`;
};

const updateDiaFromFecha = () => {
  if (!diaMesInput.value || mesInput.value === "") {
    diaInput.value = "";
    return;
  }

  const date = new Date(getYearValue(), Number(mesInput.value), Number(diaMesInput.value));
  if (Number.isNaN(date.getTime())) {
    diaInput.value = "";
    return;
  }

  diaInput.value = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
  }).format(date);
};

const updateSaldo = () => {
  const pesos = Math.round(Number(pesosInput.value) || 0);
  const entrega = Math.round(Number(entregaInput.value) || 0);
  const saldo = Math.max(pesos - entrega, 0);
  saldoInput.value = saldo;
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
    saldoInput.value = Math.round(Number(pesosInput.value) || 0);
  }
};

const handlePagadoToggle = () => {
  if (pagadoInput.checked) {
    entregaInput.value = Math.round(Number(pesosInput.value || 0));
  } else {
    entregaInput.value = "";
  }
  updateSaldo();
};

const loadBanks = () => {
  const raw = localStorage.getItem(BANKS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      banks = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("No se pudo leer bancos", error);
      banks = [];
    }
  }

  if (banks.length === 0) {
    banks = ["Macro", "Nación", "Santander", "Galicia"];
  }
};

const saveBanks = () => {
  localStorage.setItem(BANKS_KEY, JSON.stringify(banks));
};

const renderBanks = () => {
  bancoInput.innerHTML = "<option value=\"\">Seleccionar</option>";
  banks.forEach((bank) => {
    const option = document.createElement("option");
    option.value = bank;
    option.textContent = bank;
    bancoInput.appendChild(option);
  });

  bankList.innerHTML = "";
  banks.forEach((bank) => {
    const chip = document.createElement("div");
    chip.className = "bank-chip";
    chip.innerHTML = `
      <span>${bank}</span>
      <button type="button" data-bank="${bank}" aria-label="Eliminar banco">✕</button>
    `;
    bankList.appendChild(chip);
  });
};

const loadYear = () => {
  const stored = localStorage.getItem(YEAR_KEY);
  anioInput.value = stored || new Date().getFullYear();
};

const saveYear = () => {
  localStorage.setItem(YEAR_KEY, anioInput.value);
  updateDiaFromFecha();
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
  const saldo = Math.round(Number(saldoInput.value) || 0);
  const fecha = buildFecha();

  const entry = {
    id: editingId ?? crypto.randomUUID(),
    concepto: data.get("concepto").trim(),
    tipo: data.get("tipo"),
    dia: data.get("dia").trim(),
    fecha,
    pesos: Math.round(Number(data.get("pesos")) || 0),
    usd: Math.round(Number(data.get("usd")) || 0),
    banco: data.get("banco").trim(),
    entrega: Math.round(Number(data.get("entrega")) || 0),
    saldo,
    pagoMinimo: Math.round(Number(data.get("pagoMinimo")) || 0),
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
    if (entry.fecha) {
      const [day, month] = entry.fecha.split("/");
      diaMesInput.value = Number(day);
      mesInput.value = String(Number(month) - 1);
    }
    form.pesos.value = entry.pesos;
    form.usd.value = entry.usd;
    pagadoInput.checked = entry.entrega > 0;
    if (entry.banco && !banks.includes(entry.banco)) {
      banks.push(entry.banco);
      saveBanks();
      renderBanks();
    }
    form.banco.value = entry.banco;
    form.entrega.value = entry.entrega;
    form.saldo.value = entry.saldo;
    form.pagoMinimo.value = entry.pagoMinimo;
    form.notas.value = entry.notas;
    updateDiaFromFecha();
    updateBankAndEntregaState();
    return;
  }
});

searchInput.addEventListener("input", render);
filterType.addEventListener("change", render);
clearForm.addEventListener("click", resetForm);
diaMesInput.addEventListener("input", updateDiaFromFecha);
mesInput.addEventListener("change", updateDiaFromFecha);
pesosInput.addEventListener("input", updateSaldo);
entregaInput.addEventListener("input", updateSaldo);
pagadoInput.addEventListener("change", handlePagadoToggle);
anioInput.addEventListener("change", saveYear);

bankForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(bankForm);
  const bankName = data.get("bankName").trim();
  if (!bankName) {
    return;
  }
  if (!banks.includes(bankName)) {
    banks.push(bankName);
    banks.sort((a, b) => a.localeCompare(b, "es"));
    saveBanks();
    renderBanks();
  }
  bankForm.reset();
});

bankList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const bankName = target.dataset.bank;
  if (!bankName) {
    return;
  }
  banks = banks.filter((bank) => bank !== bankName);
  saveBanks();
  renderBanks();
});

loadYear();
loadBanks();
renderBanks();
render();
updateSaldo();
updateDiaFromFecha();
