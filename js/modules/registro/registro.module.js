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
        <h1>Registro diario</h1>
        <div class="subtitle">Captura rápida — reemplaza el cuaderno físico</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="section-head">
          <h2>Nueva labor</h2>
          <span class="hint">1 · Fecha 2 · Trabajador 3 · Concepto 4 · Unidad 5 · Cantidad</span>
        </div>
        <form id="formRegistro">
          <div class="field-row" style="grid-template-columns: 1fr 1fr;">
            <div class="field">
              <label for="rFecha">Fecha de labor</label>
              <input type="date" id="rFecha" value="${today}" required>
            </div>
            <div class="field">
              <label for="rTrabajador">Trabajador</label>
              <select id="rTrabajador" required>
                ${activeWorkers.map(w => `<option value="${w.id}">${w.nombre} — ${ROLES[w.rol]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="rConcepto">Concepto / código / tipo <span id="rRolBadge"></span></label>
            <select id="rConcepto" required></select>
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
              <input type="number" id="rCantidad" min="0" step="0.5" value="1" required>
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
            <th>Trabajador</th>
            <th>Rol</th>
            <th>Concepto</th>
            <th>Unidad</th>
            <th class="num">Cantidad</th>
            <th class="num">Precio aplicado</th>
            <th class="num">Subtotal</th>
            <th>Notas</th>
            <th></th>
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

  const form = container.querySelector('#formRegistro');
  const selTrabajador = container.querySelector('#rTrabajador');
  const selConcepto = container.querySelector('#rConcepto');
  const badgeSpan = container.querySelector('#rRolBadge');
  const inputCantidad = container.querySelector('#rCantidad');
  const inputSubtotal = container.querySelector('#rSubtotal');
  const radiosUnidad = container.querySelectorAll('input[name="unidad"]');

  function updateConceptos() {
    const worker = store.getWorkerById(selTrabajador.value);
    badgeSpan.innerHTML = worker ? `<span class="badge ${ROLE_BADGE[worker.rol]}">${ROLES[worker.rol]}</span>` : '';
    const rates = store.getRates().filter(r => r.activo && (!worker || r.rol === worker.rol));
    selConcepto.innerHTML = rates.map(r => `<option value="${r.id}">${r.concepto}</option>`).join('');
    updateSubtotal();
  }

  function updateSubtotal() {
    const rate = store.getRateById(selConcepto.value);
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
          <tr>
            <td>${fmtDate(r.fecha)}</td>
            <td>${w ? w.nombre : '—'}</td>
            <td><span class="badge ${w ? ROLE_BADGE[w.rol] : ''}">${w ? ROLES[w.rol] : '—'}</span></td>
            <td>${rt ? rt.concepto : '—'}</td>
            <td>${r.unidad === 'PAR' ? 'Par' : 'Docena'}</td>
            <td class="num mono">${r.cantidad}</td>
            <td class="num mono">${money(r.precio)}</td>
            <td class="num mono">${money(r.subtotal)}</td>
            <td>${r.notas || '—'}</td>
            <td class="actions">
              <button class="icon-btn btn-delete" data-id="${r.id}" title="Eliminar">
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

  selTrabajador.addEventListener('change', updateConceptos);
  selConcepto.addEventListener('change', updateSubtotal);
  inputCantidad.addEventListener('input', updateSubtotal);
  radiosUnidad.forEach(r => r.addEventListener('change', updateSubtotal));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unidad = container.querySelector('input[name="unidad"]:checked').value;
    store.addRecord({
      workerId: selTrabajador.value,
      rateId: selConcepto.value,
      fecha: container.querySelector('#rFecha').value,
      unidad,
      cantidad: inputCantidad.value,
      notas: container.querySelector('#rNotas').value
    });

    inputCantidad.value = 1;
    container.querySelector('#rNotas').value = '';
    updateSubtotal();
    renderTabla();
    showToast('Registro agregado exitosamente');
  });

  container.querySelector('#tbodyRegistros').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn && btn.dataset.id) {
      store.deleteRecord(btn.dataset.id);
      renderTabla();
      showToast('Registro eliminado');
    }
  });

  updateConceptos();
  renderTabla();
}
