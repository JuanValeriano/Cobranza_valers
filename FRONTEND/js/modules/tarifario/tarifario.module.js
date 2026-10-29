import { store } from '../../state/store.js';
import { ROLES } from '../../config/constants.js';
import { money } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export function renderTarifarioView(container) {
  let activeRol = "ARMADOR";

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Tarifario de labores</h1>
        <div class="subtitle">Precio por par y por docena, según rol y labor — VALER E.I.R.L</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btnToggleNuevaTarifa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo concepto
        </button>
      </div>
    </div>

    <div class="tabs" id="tarifaTabs">
      <button class="active" data-rol="ARMADOR">Armadores</button>
      <button data-rol="PERFILADOR">Perfiladores</button>
      <button data-rol="CORTADOR">Cortadores</button>
      <button data-rol="ALISTADORA">Alistadora</button>
    </div>

    <!-- FORMULARIO CREAR TARIFA -->
    <form class="inline-form" id="formNuevaTarifa">
      <h3 style="margin-bottom: 14px; font-size: 15px;">
        Nuevo concepto de tarifa — <span id="tarifaFormRol" class="mono">${ROLES[activeRol]}</span>
      </h3>
      <div class="field-row" style="grid-template-columns: 1.4fr 1fr 1fr;">
        <div class="field">
          <label>Concepto o código</label>
          <input type="text" id="fConcepto" placeholder='Ej. "Eva", "932", "Cuero"' required>
        </div>
        <div class="field">
          <label>Precio por par (S/)</label>
          <input type="number" id="fPrecioPar" step="0.01" min="0" required>
        </div>
        <div class="field">
          <label>Precio por docena (S/)</label>
          <input type="number" id="fPrecioDocena" step="0.01" min="0" required>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" type="submit">Guardar concepto</button>
        <button class="btn btn-quiet" type="button" id="btnCancelTarifa">Cancelar</button>
      </div>
    </form>

    <!-- FORMULARIO EDITAR TARIFA -->
    <form class="inline-form" id="formEditarTarifa" style="border-left: 3px solid var(--leather);">
      <h3 style="margin-bottom: 14px; font-size: 15px; color: var(--leather);">
        Editar concepto de tarifa: <span id="lblEditTarifaConcepto" class="mono" style="color: var(--ink);"></span>
      </h3>
      <input type="hidden" id="editRId">
      <div class="field-row" style="grid-template-columns: 1.4fr 1fr 1fr;">
        <div class="field">
          <label>Concepto o código</label>
          <input type="text" id="editFConcepto" required>
        </div>
        <div class="field">
          <label>Precio por par (S/)</label>
          <input type="number" id="editFPrecioPar" step="0.01" min="0" required>
        </div>
        <div class="field">
          <label>Precio por docena (S/)</label>
          <input type="number" id="editFPrecioDocena" step="0.01" min="0" required>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" type="submit">Actualizar concepto</button>
        <button class="btn btn-quiet" type="button" id="btnCancelEditTarifa">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Concepto / código</th>
            <th class="num">Precio par</th>
            <th class="num">Precio docena</th>
            <th>Estado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody id="tbodyTarifas"></tbody>
      </table>
    </div>
  `;

  const tabsContainer = container.querySelector('#tarifaTabs');
  const formNuevo = container.querySelector('#formNuevaTarifa');
  const formEditar = container.querySelector('#formEditarTarifa');
  const btnToggle = container.querySelector('#btnToggleNuevaTarifa');
  const btnCancelNuevo = container.querySelector('#btnCancelTarifa');
  const btnCancelEdit = container.querySelector('#btnCancelEditTarifa');
  const tbody = container.querySelector('#tbodyTarifas');
  const rolSpan = container.querySelector('#tarifaFormRol');

  function renderTable() {
    rolSpan.textContent = ROLES[activeRol] || activeRol;
    const rates = store.getRatesByRole(activeRol);

    if (!rates.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin conceptos registrados para este rol todavía.</td></tr>`;
      return;
    }

    tbody.innerHTML = rates.map(r => `
      <tr>
        <td><strong>${r.concepto}</strong></td>
        <td class="num mono">${money(r.precioPar)}</td>
        <td class="num mono">${money(r.precioDocena)}</td>
        <td><span class="badge ${r.activo ? 'badge-on' : 'badge-off'}">${r.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions" style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="btn btn-quiet btn-edit-tarifa" style="padding: 4px 9px; font-size: 12px;" data-id="${r.id}" title="Editar tarifa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Editar
          </button>
          <button class="btn btn-quiet btn-toggle-tarifa" style="padding: 4px 9px; font-size: 12px;" data-id="${r.id}">
            ${r.activo ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  tabsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.rol) return;
    activeRol = btn.dataset.rol;
    tabsContainer.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    formEditar.classList.remove('open');
    renderTable();
    store.syncWithBackend();
  });

  btnToggle.addEventListener('click', () => {
    formEditar.classList.remove('open');
    formNuevo.classList.toggle('open');
  });

  btnCancelNuevo.addEventListener('click', () => formNuevo.classList.remove('open'));
  btnCancelEdit.addEventListener('click', () => formEditar.classList.remove('open'));

  formNuevo.addEventListener('submit', async (e) => {
    e.preventDefault();
    await store.addRate({
      rol: activeRol,
      concepto: container.querySelector('#fConcepto').value,
      precioPar: container.querySelector('#fPrecioPar').value,
      precioDocena: container.querySelector('#fPrecioDocena').value
    });

    formNuevo.reset();
    formNuevo.classList.remove('open');
    renderTable();
    showToast('Concepto registrado en base de datos');
  });

  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = container.querySelector('#editRId').value;
    await store.updateRate(id, {
      concepto: container.querySelector('#editFConcepto').value,
      precioPar: container.querySelector('#editFPrecioPar').value,
      precioDocena: container.querySelector('#editFPrecioDocena').value
    });

    formEditar.classList.remove('open');
    renderTable();
    showToast('Tarifa actualizada con éxito');
  });

  tbody.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-tarifa');
    if (btnEdit && btnEdit.dataset.id) {
      const rate = store.getRateById(btnEdit.dataset.id);
      if (rate) {
        formNuevo.classList.remove('open');
        container.querySelector('#editRId').value = rate.id;
        container.querySelector('#lblEditTarifaConcepto').textContent = rate.concepto;
        container.querySelector('#editFConcepto').value = rate.concepto;
        container.querySelector('#editFPrecioPar').value = rate.precioPar;
        container.querySelector('#editFPrecioDocena').value = rate.precioDocena;

        formEditar.classList.add('open');
        formEditar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    const btnToggleEstado = e.target.closest('.btn-toggle-tarifa');
    if (btnToggleEstado && btnToggleEstado.dataset.id) {
      store.toggleRateStatus(btnToggleEstado.dataset.id);
      renderTable();
      showToast('Estado de tarifa actualizado');
    }
  });

  renderTable();
}
