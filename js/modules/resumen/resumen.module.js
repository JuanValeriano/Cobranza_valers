import { store } from '../../state/store.js';
import { ROLES, ROLE_COLOR } from '../../config/constants.js';
import { money, fmtDate, todayISO } from '../../utils/formatters.js';
import { renderBarListChart } from '../../components/charts.js';

export function renderResumenView(container, { navigateTo }) {
  const oc = store.getOpenClosure();
  const recs = store.getRecordsForClosure(oc.id);
  const total = recs.reduce((a, r) => a + r.subtotal, 0);

  let cash = 0, digital = 0;
  recs.forEach(r => {
    const w = store.getWorkerById(r.workerId);
    if (!w) return;
    if (w.metodo === "EFECTIVO") cash += r.subtotal;
    else digital += r.subtotal;
  });

  const activeWorkersCount = store.getActiveWorkers().length;
  const todays = recs.filter(r => r.fecha === todayISO());
  const todayTotal = todays.reduce((a, r) => a + r.subtotal, 0);
  const pares = recs.reduce((a, r) => a + (r.unidad === "PAR" ? r.cantidad : r.cantidad * 12), 0);
  const rolData = store.getGastoPorRol(oc.id);

  const lastRecords = [...recs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 6);

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Resumen de la semana</h1>
        <div class="subtitle">Semana del ${fmtDate(oc.fechaInicio)} al ${fmtDate(oc.fechaFin)} · hoy ${fmtDate(todayISO())}</div>
      </div>
      <div class="topbar-actions">
        <button class="btn" id="btnGoReportes">Ver reportes</button>
        <button class="btn btn-primary" id="btnGoRegistro">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo registro
        </button>
      </div>
    </div>

    <div class="hero">
      <div class="hero-main">
        <div class="hero-eyebrow">Producido en la semana abierta</div>
        <div class="hero-figure mono">${money(total)}</div>
        <div class="hero-caption">Suma de todos los registros de labor desde el lunes hasta hoy, antes de adelantos y descuentos.</div>
      </div>
      <div class="hero-side">
        <div class="kpi forest">
          <div class="kpi-label">Efectivo estimado en caja</div>
          <div class="kpi-value">${money(cash)}</div>
          <div class="kpi-sub">Según método de pago habitual de cada operario</div>
        </div>
        <div class="kpi denim">
          <div class="kpi-label">Digital estimado (Yape / banco)</div>
          <div class="kpi-value">${money(digital)}</div>
          <div class="kpi-sub">Se confirma recién al liquidar la semana</div>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Trabajadores activos</div>
        <div class="kpi-value">${activeWorkersCount}</div>
        <div class="kpi-sub">de la planta</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Registros hoy</div>
        <div class="kpi-value">${todays.length}</div>
        <div class="kpi-sub">${todays.length ? money(todayTotal) + " hoy" : "aún sin registrar"}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pares producidos</div>
        <div class="kpi-value">${Math.round(pares).toLocaleString('es-PE')}</div>
        <div class="kpi-sub">equivalente esta semana</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Semana</div>
        <div class="kpi-value">${oc.estado === "ABIERTO" ? "Abierta" : "Cerrada"}</div>
        <div class="kpi-sub">cierra el ${fmtDate(oc.fechaFin)}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="section-head"><h2>Gasto por rol — semana actual</h2></div>
        <div id="chartRolResumen"></div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Últimos registros</h2></div>
        <div id="ultimosRegistrosContainer">
          ${lastRecords.length ? `
            <div class="table-wrap" style="border: none;">
              <table>
                <tbody>
                  ${lastRecords.map(r => {
    const w = store.getWorkerById(r.workerId);
    const rt = store.getRateById(r.rateId);
    return `
                      <tr>
                        <td>${fmtDate(r.fecha)}</td>
                        <td>${w ? w.nombre : '—'}</td>
                        <td>${rt ? rt.concepto : '—'}</td>
                        <td class="num mono">${money(r.subtotal)}</td>
                      </tr>
                    `;
  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty">Aún no hay registros esta semana</div>`}
        </div>
      </div>
    </div>
  `;

  const chartContainer = container.querySelector('#chartRolResumen');
  renderBarListChart(chartContainer, Object.keys(rolData).map(k => ({
    label: ROLES[k] || k,
    value: rolData[k],
    color: ROLE_COLOR[k] || '#888'
  })));

  container.querySelector('#btnGoReportes')?.addEventListener('click', () => navigateTo('reportes'));
  container.querySelector('#btnGoRegistro')?.addEventListener('click', () => navigateTo('registro'));
}
