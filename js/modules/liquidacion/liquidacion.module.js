import { store } from '../../state/store.js';
import { ROLES, ROLE_BADGE, METODOS } from '../../config/constants.js';
import { money, fmtDate } from '../../utils/formatters.js';
import { abrirBoleta } from '../../components/boletaModal.js';
import { showToast } from '../../components/toast.js';

export function renderLiquidacionView(container) {
  const closures = [...store.getClosures()].sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
  const openClosure = store.getOpenClosure();
  let selectedClosureId = openClosure ? openClosure.id : (closures[0] ? closures[0].id : '');

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Liquidación semanal</h1>
        <div class="subtitle" id="liqSubtitle">Lunes a sábado — cierre de nómina</div>
      </div>
      <div class="topbar-actions">
        <select id="selectSemana" style="width: auto; min-width: 220px;">
          ${closures.map(c => `
            <option value="${c.id}" ${c.id === selectedClosureId ? 'selected' : ''}>
              ${fmtDate(c.fechaInicio)} – ${fmtDate(c.fechaFin)} ${c.estado === 'ABIERTO' ? '(en curso)' : '(cerrada)'}
            </option>
          `).join('')}
        </select>
      </div>
    </div>

    <div id="liqLockBanner"></div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Rol</th>
            <th class="num">Total producido</th>
            <th class="num">Adelantos / descuentos</th>
            <th class="num">Neto a pagar</th>
            <th>Método de pago</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="tbodyLiquidacion"></tbody>
        <tfoot>
          <tr>
            <td colspan="2">Totales</td>
            <td class="num" id="liqTotalBruto">—</td>
            <td class="num" id="liqTotalDescuentos">—</td>
            <td class="num" id="liqTotalNeto">—</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="two-col" style="margin-top: 18px;">
      <div class="note-box">
        <strong style="color: var(--ink);">Control de caja vs. banco.</strong> Al cerrar, el sistema calcula exactamente cuánto efectivo debe haber en caja física el día de pago y cuánto sale por Yape o transferencia.
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: flex-start;">
        <button class="btn" id="btnImprimirResumen">Imprimir resumen</button>
        <button class="btn btn-primary" id="btnCerrarSemana">Cerrar semana</button>
      </div>
    </div>
  `;

  const selSemana = container.querySelector('#selectSemana');
  const bannerContainer = container.querySelector('#liqLockBanner');
  const btnCerrar = container.querySelector('#btnCerrarSemana');
  const btnImprimir = container.querySelector('#btnImprimirResumen');
  const tbody = container.querySelector('#tbodyLiquidacion');

  function renderTableData() {
    selectedClosureId = selSemana.value;
    const closure = store.getClosureById(selectedClosureId);
    if (!closure) return;

    const isClosed = closure.estado === "CERRADO";

    container.querySelector('#liqSubtitle').textContent =
      `Semana del ${fmtDate(closure.fechaInicio)} al ${fmtDate(closure.fechaFin)}`;

    bannerContainer.innerHTML = isClosed ? `
      <div class="lock-banner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
        </svg>
        Semana cerrada — los montos quedan bloqueados para mantener la auditoría intacta.
      </div>
    ` : '';

    btnCerrar.style.display = isClosed ? 'none' : 'inline-flex';
    btnCerrar.disabled = isClosed;

    const recs = store.getRecordsForClosure(selectedClosureId);
    const byWorker = {};
    recs.forEach(r => {
      byWorker[r.workerId] = (byWorker[r.workerId] || 0) + r.subtotal;
    });

    const rows = Object.keys(byWorker)
      .map(wid => ({ worker: store.getWorkerById(wid), bruto: byWorker[wid] }))
      .filter(x => x.worker);

    const payments = store.getPaymentsForClosure(selectedClosureId);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">No hay labores registradas en esta semana.</td></tr>`;
      container.querySelector('#liqTotalBruto').textContent = money(0);
      container.querySelector('#liqTotalDescuentos').textContent = money(0);
      container.querySelector('#liqTotalNeto').textContent = money(0);
      return;
    }

    tbody.innerHTML = rows.map(({ worker, bruto }) => {
      const pago = payments.find(p => p.workerId === worker.id);
      const descuento = pago ? pago.descuentos : 0;
      const neto = bruto - descuento;
      const metodo = pago ? pago.metodo : worker.metodo;

      return `
        <tr>
          <td>${worker.nombre}</td>
          <td><span class="badge ${ROLE_BADGE[worker.rol]}">${ROLES[worker.rol] || worker.rol}</span></td>
          <td class="num mono">${money(bruto)}</td>
          <td class="num mono">
            ${isClosed
          ? money(descuento)
          : `<input type="number" min="0" step="0.5" value="${descuento}"
                  style="width: 90px; text-align: right;" class="mono input-descuento"
                  data-worker="${worker.id}" data-bruto="${bruto}">`
        }
          </td>
          <td class="num mono">${money(neto)}</td>
          <td>
            ${isClosed
          ? (METODOS[metodo] || metodo)
          : `<select style="width: auto;" class="select-metodo" data-worker="${worker.id}" data-bruto="${bruto}">
                  ${Object.keys(METODOS).map(m => `<option value="${m}" ${m === metodo ? 'selected' : ''}>${METODOS[m]}</option>`).join('')}
                </select>`
        }
          </td>
          <td class="actions">
            <button class="btn btn-quiet btn-boleta" style="padding: 5px 10px; font-size: 12px;" data-worker="${worker.id}">
              Boleta
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const totBruto = rows.reduce((a, r) => a + r.bruto, 0);
    const totDesc = rows.reduce((a, r) => {
      const p = payments.find(pay => pay.workerId === r.worker.id);
      return a + (p ? p.descuentos : 0);
    }, 0);

    container.querySelector('#liqTotalBruto').textContent = money(totBruto);
    container.querySelector('#liqTotalDescuentos').textContent = money(totDesc);
    container.querySelector('#liqTotalNeto').textContent = money(totBruto - totDesc);
  }

  selSemana.addEventListener('change', renderTableData);

  tbody.addEventListener('change', (e) => {
    if (e.target.classList.contains('input-descuento')) {
      const wid = e.target.dataset.worker;
      const bruto = parseFloat(e.target.dataset.bruto) || 0;
      store.updateDescuento(selectedClosureId, wid, e.target.value, bruto);
      renderTableData();
    } else if (e.target.classList.contains('select-metodo')) {
      const wid = e.target.dataset.worker;
      const bruto = parseFloat(e.target.dataset.bruto) || 0;
      store.updateMetodo(selectedClosureId, wid, e.target.value, bruto);
      renderTableData();
    }
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-boleta');
    if (btn && btn.dataset.worker) {
      abrirBoleta(selectedClosureId, btn.dataset.worker);
    }
  });

  btnImprimir.addEventListener('click', () => window.print());

  btnCerrar.addEventListener('click', () => {
    if (confirm("¿Estás seguro de cerrar la semana? Esta acción bloqueará los registros para auditoría.")) {
      store.closeWeek(selectedClosureId);
      showToast('Semana cerrada y boletas generadas');

      const updatedClosures = [...store.getClosures()].sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
      selSemana.innerHTML = updatedClosures.map(c => `
        <option value="${c.id}" ${c.id === selectedClosureId ? 'selected' : ''}>
          ${fmtDate(c.fechaInicio)} – ${fmtDate(c.fechaFin)} ${c.estado === 'ABIERTO' ? '(en curso)' : '(cerrada)'}
        </option>
      `).join('');
      renderTableData();
    }
  });

  renderTableData();
}
