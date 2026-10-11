import { store } from '../../state/store.js';
import { ROLES, ROLE_BADGE, METODOS } from '../../config/constants.js';
import { showToast } from '../../components/toast.js';

export function renderTrabajadoresView(container) {
  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Colaboradores / Trabajadores</h1>
        <div class="subtitle">Catálogo y administración del personal de planta — VALER E.I.R.L</div>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btnToggleNuevoTrabajador">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo colaborador
        </button>
      </div>
    </div>

    <!-- FORMULARIO DE CREACIÓN -->
    <form class="inline-form" id="formNuevoTrabajador">
      <h3 style="margin-bottom: 14px; font-size: 15px;">Registrar nuevo colaborador</h3>
      <div class="field-row" style="grid-template-columns: 1.4fr 1fr 1fr;">
        <div class="field"><label>Nombre completo</label><input type="text" id="tNombre" required></div>
        <div class="field"><label>DNI</label><input type="text" id="tDni" required maxlength="8"></div>
        <div class="field"><label>Teléfono</label><input type="tel" id="tTelefono"></div>
      </div>
      <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr;">
        <div class="field">
          <label>Rol de labor</label>
          <select id="tRol" required>
            <option value="ARMADOR">Armador</option>
            <option value="PERFILADOR">Perfilador</option>
            <option value="CORTADOR">Cortador</option>
            <option value="ALISTADORA">Alistadora</option>
          </select>
        </div>
        <div class="field">
          <label>Método de pago habitual</label>
          <select id="tMetodo">
            <option value="EFECTIVO">Efectivo</option>
            <option value="YAPE">Yape / Plin</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        <div class="field">
          <label>Estado</label>
          <select id="tEstado">
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" type="submit">Guardar colaborador</button>
        <button class="btn btn-quiet" type="button" id="btnCancelTrabajador">Cancelar</button>
      </div>
    </form>

    <!-- FORMULARIO DE EDICIÓN -->
    <form class="inline-form" id="formEditarTrabajador" style="border-left: 3px solid var(--leather);">
      <h3 style="margin-bottom: 14px; font-size: 15px; color: var(--leather);">
        Editar datos del colaborador: <span id="lblEditNombre" class="mono" style="color: var(--ink);"></span>
      </h3>
      <input type="hidden" id="editTId">
      <div class="field-row" style="grid-template-columns: 1.4fr 1fr 1fr;">
        <div class="field"><label>Nombre completo</label><input type="text" id="editTNombre" required></div>
        <div class="field"><label>DNI</label><input type="text" id="editTDni" required maxlength="8"></div>
        <div class="field"><label>Teléfono</label><input type="tel" id="editTTelefono"></div>
      </div>
      <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr;">
        <div class="field">
          <label>Rol de labor</label>
          <select id="editTRol" required>
            <option value="ARMADOR">Armador</option>
            <option value="PERFILADOR">Perfilador</option>
            <option value="CORTADOR">Cortador</option>
            <option value="ALISTADORA">Alistadora</option>
          </select>
        </div>
        <div class="field">
          <label>Método de pago habitual</label>
          <select id="editTMetodo">
            <option value="EFECTIVO">Efectivo</option>
            <option value="YAPE">Yape / Plin</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        <div class="field">
          <label>Estado</label>
          <select id="editTEstado">
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" type="submit">Actualizar colaborador</button>
        <button class="btn btn-quiet" type="button" id="btnCancelEditTrabajador">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Teléfono</th>
            <th>Rol</th>
            <th>Método habitual</th>
            <th>Estado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody id="tbodyTrabajadores"></tbody>
      </table>
    </div>
  `;

  const formNuevo = container.querySelector('#formNuevoTrabajador');
  const formEditar = container.querySelector('#formEditarTrabajador');
  const btnToggle = container.querySelector('#btnToggleNuevoTrabajador');
  const btnCancelNuevo = container.querySelector('#btnCancelTrabajador');
  const btnCancelEdit = container.querySelector('#btnCancelEditTrabajador');
  const tbody = container.querySelector('#tbodyTrabajadores');

  function renderTable() {
    const workers = store.getWorkers();
    tbody.innerHTML = workers.map(w => `
      <tr>
        <td><strong>${w.nombre}</strong></td>
        <td class="mono">${w.dni}</td>
        <td class="mono">${w.telefono || '—'}</td>
        <td><span class="badge ${ROLE_BADGE[w.rol]}">${ROLES[w.rol] || w.rol}</span></td>
        <td>${METODOS[w.metodo] || w.metodo}</td>
        <td><span class="badge ${w.activo ? 'badge-on' : 'badge-off'}">${w.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions" style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="btn btn-quiet btn-edit-trabajador" style="padding: 4px 9px; font-size: 12px;" data-id="${w.id}" title="Editar información">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Editar
          </button>
          <button class="btn btn-quiet btn-toggle-estado" style="padding: 4px 9px; font-size: 12px;" data-id="${w.id}">
            ${w.activo ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="7" class="empty">No hay colaboradores registrados.</td></tr>`;
  }

  btnToggle.addEventListener('click', () => {
    formEditar.classList.remove('open');
    formNuevo.classList.toggle('open');
  });

  btnCancelNuevo.addEventListener('click', () => formNuevo.classList.remove('open'));
  btnCancelEdit.addEventListener('click', () => formEditar.classList.remove('open'));

  formNuevo.addEventListener('submit', async (e) => {
    e.preventDefault();
    await store.addWorker({
      nombre: container.querySelector('#tNombre').value,
      dni: container.querySelector('#tDni').value,
      telefono: container.querySelector('#tTelefono').value,
      rol: container.querySelector('#tRol').value,
      metodo: container.querySelector('#tMetodo').value,
      activo: container.querySelector('#tEstado').value === "1"
    });

    formNuevo.reset();
    formNuevo.classList.remove('open');
    renderTable();
    showToast('Colaborador registrado en base de datos');
  });

  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = container.querySelector('#editTId').value;
    await store.updateWorker(id, {
      nombre: container.querySelector('#editTNombre').value,
      dni: container.querySelector('#editTDni').value,
      telefono: container.querySelector('#editTTelefono').value,
      rol: container.querySelector('#editTRol').value,
      metodo: container.querySelector('#editTMetodo').value,
      activo: container.querySelector('#editTEstado').value === "1"
    });

    formEditar.classList.remove('open');
    renderTable();
    showToast('Colaborador actualizado con éxito');
  });

  tbody.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-trabajador');
    if (btnEdit && btnEdit.dataset.id) {
      const worker = store.getWorkerById(btnEdit.dataset.id);
      if (worker) {
        formNuevo.classList.remove('open');
        container.querySelector('#editTId').value = worker.id;
        container.querySelector('#lblEditNombre').textContent = worker.nombre;
        container.querySelector('#editTNombre').value = worker.nombre;
        container.querySelector('#editTDni').value = worker.dni;
        container.querySelector('#editTTelefono').value = worker.telefono || '';
        container.querySelector('#editTRol').value = worker.rol;
        container.querySelector('#editTMetodo').value = worker.metodo;
        container.querySelector('#editTEstado').value = worker.activo ? "1" : "0";

        formEditar.classList.add('open');
        formEditar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    const btnToggleEstado = e.target.closest('.btn-toggle-estado');
    if (btnToggleEstado && btnToggleEstado.dataset.id) {
      store.toggleWorkerStatus(btnToggleEstado.dataset.id);
      renderTable();
      showToast('Estado actualizado');
    }
  });

  renderTable();
}
