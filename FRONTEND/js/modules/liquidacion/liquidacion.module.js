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
        <div class="subtitle" id="liqSubtitle">Lunes a domingo — cierre automático los domingos a las 11:59 PM</div>
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
        <strong style="color: var(--ink);">Cierre semanal (Automático y Manual):</strong> La semana se cierra automáticamente a las 11:59 PM de los días domingos y la nueva semana inicia el lunes a las 00:00 h. También puedes cerrarla de forma manual en cualquier momento con el botón "Cerrar semana".
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: flex-start; flex-wrap: wrap;">
        <button class="btn" id="btnImprimirResumen">Imprimir resumen</button>
        <button class="btn" id="btnReabrirSemana" style="display: none;">Reabrir semana</button>
        <button class="btn btn-primary" id="btnCerrarSemana">Cerrar semana</button>
        <button class="btn btn-primary" id="btnNuevaSemana" style="display: none;">+ Abrir nueva semana</button>
      </div>
    </div>
  `;

  const selSemana = container.querySelector('#selectSemana');
  const bannerContainer = container.querySelector('#liqLockBanner');
  const btnCerrar = container.querySelector('#btnCerrarSemana');
  const btnReabrir = container.querySelector('#btnReabrirSemana');
  const btnNuevaSemana = container.querySelector('#btnNuevaSemana');
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
    btnReabrir.style.display = isClosed ? 'inline-flex' : 'none';
    btnNuevaSemana.style.display = isClosed ? 'inline-flex' : 'none';

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
      const neto = Math.round((bruto - descuento) * 100) / 100;
      const metodo = pago ? pago.metodo : worker.metodo;

      // Para MIXTO: montos personalizados
      const montoEfectivo = pago ? (pago.montoEfectivo ?? Math.round(neto / 2 * 100) / 100) : Math.round(neto / 2 * 100) / 100;
      const montoDigital  = pago ? (pago.montoDigital  ?? Math.round((neto - montoEfectivo) * 100) / 100) : Math.round((neto - montoEfectivo) * 100) / 100;

      const mixtoBlock = !isClosed && metodo === 'MIXTO' ? `
        <div class="mixto-split">
          <div style="display:flex; gap:10px; align-items:center;">
            <div style="flex:1">
              <label>Efectivo (S/)</label>
              <input type="number" min="0" step="0.01" value="${montoEfectivo}"
                class="mono input-monto-efectivo"
                data-worker="${worker.id}" data-bruto="${bruto}" data-neto="${neto}">
            </div>
            <div style="flex:1">
              <label>Digital / Yape (S/)</label>
              <input type="number" min="0" step="0.01" value="${montoDigital}"
                class="mono input-monto-digital"
                data-worker="${worker.id}" data-bruto="${bruto}" data-neto="${neto}">
            </div>
          </div>
          <div class="mixto-total-check" id="mixto-check-${worker.id}"
            style="display: ${Math.abs(montoEfectivo + montoDigital - neto) < 0.01 ? 'none' : 'block'}">
            &#9888; La suma de ambos montos debe ser igual al neto: ${money(neto)}
          </div>
        </div>` : '';

      return `
        <tr>
          <td>${worker.nombre}</td>
          <td><span class="badge ${ROLE_BADGE[worker.rol]}">${ROLES[worker.rol] || worker.rol}</span></td>
          <td class="num mono">${money(bruto)}</td>
          <td class="num mono">
            ${isClosed
              ? money(descuento)
              : `<input type="number" min="0" step="0.01" value="${descuento}"
                  style="width: 90px; text-align: right;" class="mono input-descuento"
                  data-worker="${worker.id}" data-bruto="${bruto}">`
            }
          </td>
          <td class="num mono">${money(neto)}</td>
          <td>
            ${isClosed
              ? `${METODOS[metodo] || metodo}${metodo === 'MIXTO' ? ` <span class="mono" style="font-size:11px;color:var(--ink-soft);">(ef:${money(montoEfectivo)} / dig:${money(montoDigital)})</span>` : ''}`
              : `<div>
                  <select style="width: auto;" class="select-metodo" data-worker="${worker.id}" data-bruto="${bruto}">
                    ${Object.keys(METODOS).map(m => `<option value="${m}" ${m === metodo ? 'selected' : ''}>${METODOS[m]}</option>`).join('')}
                  </select>
                  ${mixtoBlock}
                </div>`
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

  tbody.addEventListener('change', async (e) => {
    if (e.target.classList.contains('input-descuento')) {
      const wid = e.target.dataset.worker;
      const bruto = parseFloat(e.target.dataset.bruto) || 0;
      await store.updateDescuento(selectedClosureId, wid, e.target.value, bruto);
      renderTableData();
    } else if (e.target.classList.contains('select-metodo')) {
      const wid = e.target.dataset.worker;
      const bruto = parseFloat(e.target.dataset.bruto) || 0;
      await store.updateMetodo(selectedClosureId, wid, e.target.value, bruto);
      renderTableData();
    } else if (e.target.classList.contains('input-monto-efectivo') || e.target.classList.contains('input-monto-digital')) {
      const wid = e.target.dataset.worker;
      const bruto = parseFloat(e.target.dataset.bruto) || 0;
      const neto  = parseFloat(e.target.dataset.neto)  || 0;
      const row   = e.target.closest('tr');
      const efectivo = parseFloat(row.querySelector('.input-monto-efectivo')?.value) || 0;
      const digital  = parseFloat(row.querySelector('.input-monto-digital')?.value)  || 0;

      const checkEl = container.querySelector(`#mixto-check-${wid}`);
      const isOk = Math.abs(efectivo + digital - neto) < 0.01;
      if (checkEl) {
        checkEl.style.display = isOk ? 'none' : 'block';
        checkEl.className = `mixto-total-check ${isOk ? 'ok' : 'err'}`;
        checkEl.textContent = isOk
          ? '\u2713 Suma correcta'
          : `⚠ La suma (${money(efectivo + digital)}) debe ser igual al neto: ${money(neto)}`;
      }
      if (isOk) {
        await store.updateMontosMixtos(selectedClosureId, wid, efectivo, digital, bruto);
      }
    }
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-boleta');
    if (btn && btn.dataset.worker) {
      abrirBoleta(selectedClosureId, btn.dataset.worker);
    }
  });

  btnImprimir.addEventListener('click', () => window.print());

  function updateSelector() {
    const updatedClosures = [...store.getClosures()].sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1));
    selSemana.innerHTML = updatedClosures.map(c => `
      <option value="${c.id}" ${c.id === selectedClosureId ? 'selected' : ''}>
        ${fmtDate(c.fechaInicio)} – ${fmtDate(c.fechaFin)} ${c.estado === 'ABIERTO' ? '(en curso)' : '(cerrada)'}
      </option>
    `).join('');
  }

  btnCerrar.addEventListener('click', async () => {
    if (confirm("¿Estás seguro de cerrar la semana? Esta acción bloqueará los registros para auditoría.")) {
      await store.closeWeek(selectedClosureId);
      showToast('Semana cerrada y boletas generadas');
      updateSelector();
      renderTableData();
    }
  });

  btnReabrir.addEventListener('click', async () => {
    if (confirm("¿Deseas reabrir esta semana? Podrás registrar nuevas labores y modificar montos.")) {
      await store.reopenWeek(selectedClosureId);
      showToast('Semana reabierta con éxito');
      updateSelector();
      renderTableData();
    }
  });

  btnNuevaSemana.addEventListener('click', async () => {
    const nueva = await store.createNewWeek();
    showToast('Nueva semana abierta con éxito');
    selectedClosureId = nueva.id;
    updateSelector();
    renderTableData();
  });

  renderTableData();
}
