import { store } from '../../state/store.js';
import { ROLES, ROLE_COLOR } from '../../config/constants.js';
import { money, fmtDate } from '../../utils/formatters.js';
import { renderBarListChart, renderDonutChart } from '../../components/charts.js';
import { showToast } from '../../components/toast.js';

export function renderReportesView(container) {
  let repFiltro = "semanal";

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Reportes consolidados</h1>
        <div class="subtitle">Gasto en mano de obra — histórico y desglose</div>
      </div>
      <div class="topbar-actions">
        <div class="segmented" id="repFiltroContainer">
          <button class="active" data-f="semanal">Semanal</button>
          <button data-f="mensual">Mensual</button>
          <button data-f="anual">Anual</button>
        </div>
      </div>
    </div>

    <div class="kpi-grid" id="repKpis"></div>

    <div class="two-col">
      <div class="card">
        <div class="section-head"><h2>Gasto por rol</h2></div>
        <div id="chartRolReporte"></div>
      </div>
      <div class="card">
        <div class="section-head"><h2>Método de pago</h2></div>
        <div id="chartMetodoReporte"></div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-head">
      <h2>Histórico</h2>
      <div class="topbar-actions">
        <button class="btn" id="btnExportCSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/>
          </svg>
          Exportar Excel (CSV)
        </button>
        <button class="btn" id="btnExportPDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M6 9V3h12v6M6 18h12v3H6zM4 9h16v7H4z"/>
          </svg>
          Exportar PDF
        </button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:50px; text-align:center;">Detalle</th>
            <th>Periodo</th>
            <th class="num">Gasto total</th>
            <th class="num">Efectivo</th>
            <th class="num">Digital</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="tbodyHistorico"></tbody>
      </table>
    </div>
  `;

  const filterContainer = container.querySelector('#repFiltroContainer');
  const kpisContainer = container.querySelector('#repKpis');
  const chartRolContainer = container.querySelector('#chartRolReporte');
  const chartMetodoContainer = container.querySelector('#chartMetodoReporte');
  const tbodyHistorico = container.querySelector('#tbodyHistorico');
  const btnCSV = container.querySelector('#btnExportCSV');
  const btnPDF = container.querySelector('#btnExportPDF');

  let currentGroups = [];

  function periodGasto(closure) {
    const recs = store.getRecordsForClosure(closure.id);
    const bruto = recs.reduce((a, r) => a + r.subtotal, 0);
    let cash = 0, digital = 0;
    const pays = store.getPaymentsForClosure(closure.id);

    if (pays.length) {
      cash = pays.reduce((a, p) => a + p.montoEfectivo, 0);
      digital = pays.reduce((a, p) => a + p.montoDigital, 0);
    } else {
      recs.forEach(r => {
        const w = store.getWorkerById(r.workerId);
        if (!w) return;
        if (w.metodo === "EFECTIVO") cash += r.subtotal;
        else digital += r.subtotal;
      });
    }
    return { bruto, cash, digital };
  }

  function renderReportData() {
    const closures = store.getClosures();
    const sorted = [...closures].sort((a, b) => (a.fechaInicio < b.fechaInicio ? -1 : 1));
    let groups = [];

    if (repFiltro === "semanal") {
      groups = sorted.map(c => ({
        label: `${fmtDate(c.fechaInicio)} – ${fmtDate(c.fechaFin)}`,
        closures: [c],
        estado: c.estado
      }));
    } else if (repFiltro === "mensual") {
      const byMonth = {};
      sorted.forEach(c => {
        const key = c.fechaInicio.slice(0, 7);
        (byMonth[key] = byMonth[key] || []).push(c);
      });
      groups = Object.keys(byMonth).sort().map(k => {
        const [y, m] = k.split('-');
        const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return {
          label: `${nombres[parseInt(m) - 1]} ${y}`,
          closures: byMonth[k],
          estado: byMonth[k].every(c => c.estado === "CERRADO") ? "CERRADO" : "ABIERTO"
        };
      });
    } else {
      const byYear = {};
      sorted.forEach(c => {
        const y = c.fechaInicio.slice(0, 4);
        (byYear[y] = byYear[y] || []).push(c);
      });
      groups = Object.keys(byYear).sort().map(y => ({
        label: y,
        closures: byYear[y],
        estado: byYear[y].every(c => c.estado === "CERRADO") ? "CERRADO" : "ABIERTO"
      }));
    }

    groups.reverse();
    currentGroups = groups;

    const totalAll = groups.reduce((sum, g) =>
      sum + g.closures.reduce((s, c) => s + periodGasto(c).bruto, 0), 0);

    const currentGroup = groups[0];
    const currentTotals = currentGroup ? currentGroup.closures.reduce((acc, c) => {
      const g = periodGasto(c);
      acc.bruto += g.bruto;
      acc.cash += g.cash;
      acc.digital += g.digital;
      return acc;
    }, { bruto: 0, cash: 0, digital: 0 }) : { bruto: 0, cash: 0, digital: 0 };

    kpisContainer.innerHTML = `
      <div class="kpi">
        <div class="kpi-label">Gasto del periodo más reciente</div>
        <div class="kpi-value">${money(currentTotals.bruto)}</div>
        <div class="kpi-sub">${currentGroup ? currentGroup.label : '—'}</div>
      </div>
      <div class="kpi forest">
        <div class="kpi-label">Efectivo</div>
        <div class="kpi-value">${money(currentTotals.cash)}</div>
        <div class="kpi-sub">físico en caja</div>
      </div>
      <div class="kpi denim">
        <div class="kpi-label">Digital</div>
        <div class="kpi-value">${money(currentTotals.digital)}</div>
        <div class="kpi-sub">Yape / banco</div>
      </div>
      <div class="kpi leather">
        <div class="kpi-label">Acumulado histórico</div>
        <div class="kpi-value">${money(totalAll)}</div>
        <div class="kpi-sub">${groups.length} periodo${groups.length === 1 ? '' : 's'}</div>
      </div>
    `;

    const rolAcc = { ARMADOR: 0, PERFILADOR: 0, CORTADOR: 0, ALISTADORA: 0 };
    (currentGroup ? currentGroup.closures : []).forEach(c => {
      const g = store.getGastoPorRol(c.id);
      Object.keys(g).forEach(k => { rolAcc[k] += g[k]; });
    });

    renderBarListChart(chartRolContainer, Object.keys(rolAcc).map(k => ({
      label: ROLES[k] || k,
      value: rolAcc[k],
      color: ROLE_COLOR[k] || '#888'
    })));

    renderDonutChart(chartMetodoContainer, [
      { label: "Físico (efectivo)", value: currentTotals.cash, color: "var(--forest)" },
      { label: "Digital (Yape/banco)", value: currentTotals.digital, color: "var(--denim)" }
    ]);

    tbodyHistorico.innerHTML = groups.map((g, gIdx) => {
      const t = g.closures.reduce((acc, c) => {
        const p = periodGasto(c);
        acc.bruto += p.bruto;
        acc.cash += p.cash;
        acc.digital += p.digital;
        return acc;
      }, { bruto: 0, cash: 0, digital: 0 });

      // Filas de detalle con Concepto / Código, Unidad, Cantidad y Subtotal
      const recsInGroup = g.closures.flatMap(c => store.getRecordsForClosure(c.id));

      const detailContent = `
        <tr class="hist-detail-row hist-detail-${gIdx}" style="display:none; background:var(--paper-panel);">
          <td colspan="6" style="padding: 12px 18px 16px 28px;">
            <div style="font-weight: 600; font-size: 11.5px; margin-bottom: 8px; color: var(--leather); text-transform: uppercase; letter-spacing: 0.5px;">
              Detalle de labores del periodo (${g.label}) &mdash; ${recsInGroup.length} registro(s)
            </div>
            ${recsInGroup.length > 0 ? `
              <div class="table-wrap" style="box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                <table style="width: 100%; font-size: 12.5px; background: var(--paper-raised); margin: 0;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--line);">
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Concepto / Código</th>
                      <th>Unidad</th>
                      <th class="num">Cantidad</th>
                      <th class="num">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recsInGroup.map(rec => {
                      const w = store.getWorkerById(rec.workerId);
                      const rt = store.getRateById(rec.rateId);
                      return `
                        <tr>
                          <td>${fmtDate(rec.fecha)}</td>
                          <td><strong>${w ? w.nombre : '&mdash;'}</strong></td>
                          <td>${rt ? `${rt.concepto} <span class="mono" style="font-size:11px; color:var(--ink-soft);">(${rt.id})</span>` : '&mdash;'}</td>
                          <td><span class="badge badge-rol" style="font-size:10.5px; padding:2px 6px;">${rec.unidad === 'PAR' ? 'Par' : 'Docena'}</span></td>
                          <td class="num mono"><strong>${rec.cantidad}</strong></td>
                          <td class="num mono">${money(rec.subtotal)}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div style="padding: 12px; background: var(--paper-raised); border: 1px dashed var(--line); border-radius: var(--radius); text-align: center; color: var(--ink-soft); font-size: 12px;">
                No hay labores registradas para este periodo.
              </div>
            `}
          </td>
        </tr>
      `;

      return `
        <tr class="hist-group-row" data-group="${gIdx}" style="cursor:pointer;" title="Clic para ver desglose de labores">
          <td style="text-align:center; width:40px; padding:6px;">
            <button type="button" class="btn btn-quiet hist-toggle" data-group="${gIdx}"
              style="padding:3px 7px; font-size:11px; font-weight:bold; color:var(--leather); border:1px solid var(--line); border-radius:4px; background:var(--paper-raised);"
              title="Expandir / Contraer labores">
              &#9654;
            </button>
          </td>
          <td><strong>${g.label}</strong></td>
          <td class="num mono">${money(t.bruto)}</td>
          <td class="num mono">${money(t.cash)}</td>
          <td class="num mono">${money(t.digital)}</td>
          <td><span class="badge ${g.estado === 'CERRADO' ? 'badge-cerrado' : 'badge-abierto'}">${g.estado === 'CERRADO' ? 'Cerrado' : 'En curso'}</span></td>
        </tr>
        ${detailContent}
      `;
    }).join('') || `<tr><td colspan="6" class="empty">Sin datos históricos aún.</td></tr>`;

    // Toggle para expandir detalle
    tbodyHistorico.querySelectorAll('.hist-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const gIdx = btn.dataset.group;
        const details = tbodyHistorico.querySelectorAll(`.hist-detail-${gIdx}`);
        const isVisible = details.length && details[0].style.display !== 'none';
        details.forEach(row => row.style.display = isVisible ? 'none' : 'table-row');
        btn.innerHTML = isVisible ? '&#9654;' : '&#9660;';
      });
    });
    tbodyHistorico.querySelectorAll('.hist-group-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const btn = row.querySelector('.hist-toggle');
        if (btn) btn.click();
      });
    });
  }

  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.f) return;
    repFiltro = btn.dataset.f;
    filterContainer.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    renderReportData();
  });

  btnCSV.addEventListener('click', () => {
    let csv = "Periodo,Gasto total,Efectivo,Digital,Estado\n";
    currentGroups.forEach(g => {
      const t = g.closures.reduce((acc, c) => {
        const p = periodGasto(c);
        acc.bruto += p.bruto;
        acc.cash += p.cash;
        acc.digital += p.digital;
        return acc;
      }, { bruto: 0, cash: 0, digital: 0 });
      csv += `"${g.label}",${t.bruto.toFixed(2)},${t.cash.toFixed(2)},${t.digital.toFixed(2)},${g.estado}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_destajo_${repFiltro}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Archivo CSV descargado');
  });

  btnPDF.addEventListener('click', () => window.print());

  renderReportData();
}
