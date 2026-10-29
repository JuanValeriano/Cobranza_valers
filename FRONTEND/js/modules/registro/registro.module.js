/* =====================================================================
   MÓDULO: REGISTRO DIARIO — VALER E.I.R.L
   ===================================================================== */
import { store } from '../../state/store.js';
import { ROLES, ROLE_BADGE } from '../../config/constants.js';
import { money, fmtDate, todayISO } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export function renderRegistroView(container) {
  const activeWorkers = store.getActiveWorkers();
  const today = todayISO();

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Registro diario de labores</h1>
        <div class="subtitle">Captura rápida de producción — VALER E.I.R.L</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="section-head">
          <h2>Nueva labor</h2>
          <span class="hint">1 · Fecha 2 · Colaborador 3 · Código/Labor 4 · Unidad 5 · Cantidad</span>
        </div>
        <form id="formRegistro">
          <div class="field-row" style="grid-template-columns: 1fr 1fr;">
            <div class="field">
              <label for="rFecha">Fecha de labor</label>
              <input type="date" id="rFecha" value="${today}" required>
            </div>
            <div class="field">
              <label for="rTrabajador">Colaborador</label>
              <select id="rTrabajador" required>
                ${activeWorkers.map(w => `<option value="${w.id}">${w.nombre} — ${ROLES[w.rol]}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- CAMPO CON AUTO-BÚSQUEDA Y FILTRADO EN VIVO -->
          <div class="field">
            <label for="rConceptoSearch">Concepto / código / labor <span id="rRolBadge"></span></label>
            <div class="autocomplete-wrap">
              <input
                type="text"
                id="rConceptoSearch"
                placeholder="Escribe para buscar código o labor (ej. 932, Eva, Cuero)..."
                autocomplete="off"
                required
              >
              <input type="hidden" id="rConcepto" required>
              <button type="button" id="rConceptoClear" class="btn-clear-search" style="display:none;" title="Limpiar">&times;</button>
              <div id="rConceptoDropdown" class="autocomplete-dropdown" style="display: none;"></div>
            </div>
          </div>

          <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="field">
              <label>Unidad de medida</label>
              <div class="radiogroup">
                <label><input type="radio" name="unidad" value="PAR" checked> Par</label>
                <label><input type="radio" name="unidad" value="DOCENA"> Docena</label>
              </div>
            </div>
            <div class="field">
              <label for="rCantidad">Cantidad producida</label>
              <input type="number" id="rCantidad" min="0" step="0.01" value="1" required>
            </div>
            <div class="field">
              <label for="rSubtotal">Subtotal (instantáneo)</label>
              <input type="text" id="rSubtotal" class="mono" value="S/ 0.00" disabled>
            </div>
          </div>

          <div class="field">
            <label for="rNotas">Notas u observaciones</label>
            <input type="text" id="rNotas" placeholder="Opcional — ej. merma, revisión de calidad…">
          </div>
          <button class="btn btn-primary" type="submit" style="width: 100%; justify-content: center;">
            Agregar al cuaderno digital
          </button>
        </form>
      </div>

      <div class="card">
        <div class="section-head"><h2>Atajos del día</h2></div>
        <div class="note-box" style="margin-bottom: 12px;">
          El precio se congela al momento del registro (<span class="mono">precio_aplicado_unitario</span>). Si la tarifa cambia la próxima semana, estos registros no se alteran.
        </div>
        <div id="resumenDia"></div>
      </div>
    </div>

    <div class="divider"></div>
    <div class="section-head">
      <h2>Registros de la semana en curso</h2>
      <span class="hint" id="registroCount">—</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Colaborador</th>
            <th>Rol</th>
            <th>Concepto / Código</th>
            <th>Unidad</th>
            <th class="num">Cantidad</th>
            <th class="num">Precio aplicado</th>
            <th class="num">Subtotal</th>
            <th>Notas</th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody id="tbodyRegistros"></tbody>
        <tfoot>
          <tr>
            <td colspan="7"></td>
            <td class="num" id="totalRegistros">S/ 0.00</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  // Referencias a elementos
  const form = container.querySelector('#formRegistro');
  const selTrabajador = container.querySelector('#rTrabajador');
  const inputSearch = container.querySelector('#rConceptoSearch');
  const hiddenConcepto = container.querySelector('#rConcepto');
  const btnClearSearch = container.querySelector('#rConceptoClear');
  const dropdownSearch = container.querySelector('#rConceptoDropdown');
  const badgeSpan = container.querySelector('#rRolBadge');
  const inputCantidad = container.querySelector('#rCantidad');
  const inputSubtotal = container.querySelector('#rSubtotal');
  const radiosUnidad = container.querySelectorAll('input[name="unidad"]');

  let currentRoleRates = [];

  function updateConceptos() {
    const worker = store.getWorkerById(selTrabajador.value);
    badgeSpan.innerHTML = worker ? `<span class="badge ${ROLE_BADGE[worker.rol]}">${ROLES[worker.rol]}</span>` : '';
    currentRoleRates = store.getRates().filter(r => r.activo && (!worker || r.rol === worker.rol));

    if (currentRoleRates.length > 0) {
      // Pre-seleccionar la primera labor del rol
      selectConcept(currentRoleRates[0]);
    } else {
      clearConcept();
      inputSearch.placeholder = "Sin tarifas disponibles para este rol";
    }
  }

  function selectConcept(rate) {
    hiddenConcepto.value = rate.id;
    inputSearch.value = rate.concepto;
    btnClearSearch.style.display = 'flex';
    dropdownSearch.style.display = 'none';
    updateSubtotal();
  }

  function clearConcept() {
    hiddenConcepto.value = '';
    inputSearch.value = '';
    btnClearSearch.style.display = 'none';
    updateSubtotal();
  }

  function renderDropdown(filterText = '') {
    const q = (filterText || '').trim().toLowerCase();
    const matches = currentRoleRates.filter(r =>
      !q || r.concepto.toLowerCase().includes(q) || (r.id && r.id.toLowerCase().includes(q))
    );

    if (!matches.length) {
      dropdownSearch.innerHTML = `
        <div class="autocomplete-item empty" style="padding: 12px; color: var(--ink-soft); text-align: center;">
          No se encontraron labores con "${filterText}"
        </div>
      `;
    } else {
      dropdownSearch.innerHTML = matches.map((r, idx) => `
        <div class="autocomplete-item ${r.id === hiddenConcepto.value ? 'active' : ''}" data-id="${r.id}" data-idx="${idx}">
          <span class="item-title">${r.concepto}</span>
          <span class="item-meta">Par: ${money(r.precioPar)} · Doc: ${money(r.precioDocena)}</span>
        </div>
      `).join('');
    }

    dropdownSearch.style.display = 'block';
  }

  function updateSubtotal() {
    const rate = store.getRateById(hiddenConcepto.value);
    const checkedRadio = container.querySelector('input[name="unidad"]:checked');
    const unidad = checkedRadio ? checkedRadio.value : 'PAR';
    const cant = parseFloat(inputCantidad.value) || 0;

    if (!rate) {
      inputSubtotal.value = money(0);
      return;
    }
    const precio = unidad === 'PAR' ? rate.precioPar : rate.precioDocena;
    inputSubtotal.value = money(precio * cant);
  }

  function renderTabla() {
    const oc = store.getOpenClosure();
    if (!oc) {
      container.querySelector('#registroCount').textContent = 'Semana en preparación';
      container.querySelector('#tbodyRegistros').innerHTML = `<tr><td colspan="10" class="empty">Iniciando semana en curso...</td></tr>`;
      return;
    }
    const recs = [...store.getRecordsForClosure(oc.id)].sort((a, b) => (a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : 0)));

    container.querySelector('#registroCount').textContent =
      `${recs.length} registro${recs.length === 1 ? '' : 's'} · semana del ${fmtDate(oc.fechaInicio)} al ${fmtDate(oc.fechaFin)}`;

    const tbody = container.querySelector('#tbodyRegistros');
    if (!recs.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty">Aún no se han cargado labores esta semana. Usa el formulario de arriba.</td></tr>`;
    } else {
      tbody.innerHTML = recs.map(r => {
        const w = store.getWorkerById(r.workerId);
        const rt = store.getRateById(r.rateId);
        return `
          <tr data-record-id="${r.id}">
            <td>${fmtDate(r.fecha)}</td>
            <td><strong>${w ? w.nombre : '—'}</strong></td>
            <td><span class="badge ${w ? ROLE_BADGE[w.rol] : ''}">${w ? ROLES[w.rol] : '—'}</span></td>
            <td>${rt ? rt.concepto : '—'}</td>
            <td>${r.unidad === 'PAR' ? 'Par' : 'Docena'}</td>
            <td class="num mono">${r.cantidad}</td>
            <td class="num mono">${money(r.precio)}</td>
            <td class="num mono"><strong>${money(r.subtotal)}</strong></td>
            <td>${r.notas || '—'}</td>
            <td class="actions" style="white-space:nowrap">
              <button class="icon-btn btn-edit" data-id="${r.id}" title="Editar labor"
                style="margin-right:2px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="icon-btn btn-delete" data-id="${r.id}" title="Eliminar labor">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h10l1-13"/>
                </svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const totalWeek = recs.reduce((a, r) => a + r.subtotal, 0);
    container.querySelector('#totalRegistros').textContent = money(totalWeek);

    // Resumen día
    const todayRecs = recs.filter(r => r.fecha === todayISO());
    const todaySum = todayRecs.reduce((a, r) => a + r.subtotal, 0);

    container.querySelector('#resumenDia').innerHTML = `
      <div class="bar-row" style="grid-template-columns: 1fr auto;">
        <span>Registros de hoy</span><span class="mono">${todayRecs.length}</span>
      </div>
      <div class="bar-row" style="grid-template-columns: 1fr auto;">
        <span>Total producido hoy</span><span class="mono">${money(todaySum)}</span>
      </div>
      <div class="bar-row" style="grid-template-columns: 1fr auto;">
        <span>Total acumulado en la semana</span><span class="mono">${money(totalWeek)}</span>
      </div>
    `;
  }

  // --- EVENTOS DE AUTO-BÚSQUEDA ---
  inputSearch.addEventListener('focus', () => {
    renderDropdown(inputSearch.value);
  });

  inputSearch.addEventListener('input', () => {
    btnClearSearch.style.display = inputSearch.value ? 'flex' : 'none';
    renderDropdown(inputSearch.value);

    // Si coincide exactamente con alguna labor, vincularla
    const exact = currentRoleRates.find(r => r.concepto.toLowerCase() === inputSearch.value.trim().toLowerCase());
    if (exact) {
      hiddenConcepto.value = exact.id;
    } else {
      hiddenConcepto.value = '';
    }
    updateSubtotal();
  });

  inputSearch.addEventListener('keydown', (e) => {
    const items = dropdownSearch.querySelectorAll('.autocomplete-item:not(.empty)');
    const active = dropdownSearch.querySelector('.autocomplete-item.active');
    let currentIndex = Array.from(items).indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!items.length) return;
      dropdownSearch.style.display = 'block';
      if (currentIndex < items.length - 1) {
        if (active) active.classList.remove('active');
        items[currentIndex + 1].classList.add('active');
        items[currentIndex + 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      if (currentIndex > 0) {
        if (active) active.classList.remove('active');
        items[currentIndex - 1].classList.add('active');
        items[currentIndex - 1].scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      if (dropdownSearch.style.display === 'block') {
        e.preventDefault();
        const target = active || items[0];
        if (target && target.dataset.id) {
          const rate = store.getRateById(target.dataset.id);
          if (rate) selectConcept(rate);
        }
      }
    } else if (e.key === 'Escape') {
      dropdownSearch.style.display = 'none';
    }
  });

  dropdownSearch.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (item && item.dataset.id) {
      const rate = store.getRateById(item.dataset.id);
      if (rate) selectConcept(rate);
    }
  });

  btnClearSearch.addEventListener('click', () => {
    clearConcept();
    inputSearch.focus();
    renderDropdown('');
  });

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      dropdownSearch.style.display = 'none';
    }
  });

  // Otros eventos del formulario
  selTrabajador.addEventListener('change', updateConceptos);
  inputCantidad.addEventListener('input', updateSubtotal);
  radiosUnidad.forEach(r => r.addEventListener('change', updateSubtotal));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!hiddenConcepto.value) {
      showToast('Por favor selecciona una labor o código válido de la lista');
      inputSearch.focus();
      return;
    }

    const unidad = container.querySelector('input[name="unidad"]:checked').value;
    try {
      await store.addRecord({
        workerId: selTrabajador.value,
        rateId: hiddenConcepto.value,
        fecha: container.querySelector('#rFecha').value,
        unidad,
        cantidad: inputCantidad.value,
        notas: container.querySelector('#rNotas').value
      });

      inputCantidad.value = 1;
      container.querySelector('#rNotas').value = '';
      updateSubtotal();
      renderTabla();
      showToast('Registro de labor guardado con éxito');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al registrar labor');
    }
  });

  container.querySelector('#tbodyRegistros').addEventListener('click', async (e) => {
    const btnDelete = e.target.closest('.btn-delete');
    if (btnDelete && btnDelete.dataset.id) {
      if (!confirm('¿Eliminar este registro? La acción no se puede deshacer.')) return;
      await store.deleteRecord(btnDelete.dataset.id);
      renderTabla();
      showToast('Registro eliminado');
      return;
    }

    const btnEdit = e.target.closest('.btn-edit');
    if (btnEdit && btnEdit.dataset.id) {
      abrirModalEdicion(btnEdit.dataset.id);
    }
  });

  /* ───────────────────────────────
     MODAL DE EDICIÓN DE REGISTRO
  ─────────────────────────────── */
  function abrirModalEdicion(recordId) {
    const r = store.getRecords().find(x => x.id === recordId);
    if (!r) return;

    const workers = store.getActiveWorkers();
    const allRates = store.getRates();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>Editar registro de labor</h3>
          <button class="modal-close" type="button" title="Cerrar">&times;</button>
        </div>

        <div class="field-row" style="grid-template-columns: 1fr 1fr; margin-bottom: 14px;">
          <div class="field">
            <label for="meFecha">Fecha</label>
            <input type="date" id="meFecha" value="${r.fecha}" required>
          </div>
          <div class="field">
            <label for="meTrabajador">Colaborador</label>
            <select id="meTrabajador">
              ${workers.map(w => `<option value="${w.id}" ${w.id === r.workerId ? 'selected' : ''}>${w.nombre} — ${ROLES[w.rol]}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field" style="margin-bottom: 14px;">
          <label for="meConceptoSearch">Concepto / código <span id="meRolBadge"></span></label>
          <div class="autocomplete-wrap">
            <input type="text" id="meConceptoSearch" autocomplete="off" placeholder="Buscar código o labor...">
            <input type="hidden" id="meConcepto" value="${r.rateId}">
            <button type="button" id="meConceptoClear" class="btn-clear-search" style="display:none;" title="Limpiar">&times;</button>
            <div id="meConceptoDropdown" class="autocomplete-dropdown" style="display:none;"></div>
          </div>
        </div>

        <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr; margin-bottom: 14px;">
          <div class="field">
            <label>Unidad</label>
            <div class="radiogroup">
              <label><input type="radio" name="meUnidad" value="PAR" ${r.unidad === 'PAR' ? 'checked' : ''}> Par</label>
              <label><input type="radio" name="meUnidad" value="DOCENA" ${r.unidad === 'DOCENA' ? 'checked' : ''}> Docena</label>
            </div>
          </div>
          <div class="field">
            <label for="meCantidad">Cantidad</label>
            <input type="number" id="meCantidad" min="0" step="0.01" value="${r.cantidad}" required>
          </div>
          <div class="field">
            <label for="meSubtotal">Subtotal</label>
            <input type="text" id="meSubtotal" class="mono" disabled value="">
          </div>
        </div>

        <div class="field" style="margin-bottom: 4px;">
          <label for="meNotas">Notas</label>
          <input type="text" id="meNotas" value="${r.notas || ''}" placeholder="Opcional">
        </div>

        <div class="modal-footer">
          <button class="btn" id="meBtnCancelar">Cancelar</button>
          <button class="btn btn-primary" id="meBtnGuardar">Guardar cambios</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Referencias internas del modal
    const meWorker = overlay.querySelector('#meTrabajador');
    const meSearch = overlay.querySelector('#meConceptoSearch');
    const meHidden = overlay.querySelector('#meConcepto');
    const meClear  = overlay.querySelector('#meConceptoClear');
    const meDropdown = overlay.querySelector('#meConceptoDropdown');
    const meBadge  = overlay.querySelector('#meRolBadge');
    const meCantidad = overlay.querySelector('#meCantidad');
    const meSubtotal = overlay.querySelector('#meSubtotal');
    const meUnidades = overlay.querySelectorAll('input[name="meUnidad"]');

    let meRates = [];

    function meUpdateRates() {
      const w = store.getWorkerById(meWorker.value);
      meBadge.innerHTML = w ? `<span class="badge ${ROLE_BADGE[w.rol]}">${ROLES[w.rol]}</span>` : '';
      meRates = store.getRates().filter(rt => rt.activo && (!w || rt.rol === w.rol));
    }

    function meSelectRate(rt) {
      meHidden.value = rt.id;
      meSearch.value = rt.concepto;
      meClear.style.display = 'flex';
      meDropdown.style.display = 'none';
      meCalcSubtotal();
    }

    function meCalcSubtotal() {
      const rt = store.getRateById(meHidden.value);
      const cant = parseFloat(meCantidad.value) || 0;
      const unidad = overlay.querySelector('input[name="meUnidad"]:checked')?.value || 'PAR';
      if (!rt) { meSubtotal.value = money(0); return; }
      const precio = unidad === 'PAR' ? rt.precioPar : rt.precioDocena;
      meSubtotal.value = money(precio * cant);
    }

    function meRenderDropdown(q = '') {
      const term = q.toLowerCase();
      const hits = meRates.filter(rt =>
        !term || rt.concepto.toLowerCase().includes(term) || rt.id.toLowerCase().includes(term));
      if (!hits.length) {
        meDropdown.innerHTML = `<div style="padding:10px;text-align:center;color:var(--ink-soft)">Sin coincidencias para "${q}"</div>`;
      } else {
        meDropdown.innerHTML = hits.map(rt => `
          <div class="autocomplete-item" data-rate-id="${rt.id}">
            <div class="item-title">${rt.concepto}</div>
            <div class="item-meta">${rt.id} · ${money(rt.precioPar)}/par</div>
          </div>`).join('');
        meDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const rt = store.getRateById(item.dataset.rateId);
            if (rt) meSelectRate(rt);
          });
        });
      }
      meDropdown.style.display = 'block';
    }

    // Inicializar modal
    meUpdateRates();
    const initialRate = store.getRateById(r.rateId);
    if (initialRate) meSelectRate(initialRate);
    meCalcSubtotal();

    meWorker.addEventListener('change', () => {
      meUpdateRates();
      if (meRates.length) meSelectRate(meRates[0]);
    });

    meSearch.addEventListener('input', () => { meHidden.value = ''; meClear.style.display = 'none'; meRenderDropdown(meSearch.value); });
    meSearch.addEventListener('focus', () => meRenderDropdown(meSearch.value));
    meClear.addEventListener('click', () => { meHidden.value = ''; meSearch.value = ''; meClear.style.display = 'none'; meDropdown.style.display = 'none'; meCalcSubtotal(); meSearch.focus(); });
    meCantidad.addEventListener('input', meCalcSubtotal);
    meUnidades.forEach(rb => rb.addEventListener('change', meCalcSubtotal));

    // Cerrar al hacer clic fuera del dropdown
    document.addEventListener('click', function closeDropdown(evt) {
      if (!meSearch.contains(evt.target) && !meDropdown.contains(evt.target)) {
        meDropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
    });

    // Botones del modal
    const cerrar = () => document.body.removeChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', cerrar);
    overlay.querySelector('#meBtnCancelar').addEventListener('click', cerrar);
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

    overlay.querySelector('#meBtnGuardar').addEventListener('click', async () => {
      if (!meHidden.value) { showToast('Selecciona un concepto / código válido'); return; }
      const unidad = overlay.querySelector('input[name="meUnidad"]:checked').value;
      try {
        await store.updateRecord(recordId, {
          workerId: meWorker.value,
          rateId: meHidden.value,
          fecha: overlay.querySelector('#meFecha').value,
          unidad,
          cantidad: parseFloat(meCantidad.value),
          notas: overlay.querySelector('#meNotas').value
        });
        cerrar();
        renderTabla();
        showToast('Registro actualizado correctamente');
      } catch (err) {
        showToast(err.message || 'Error al guardar');
      }
    });

    // Foco inicial
    meSearch.focus();
  }

  updateConceptos();
  renderTabla();
}
