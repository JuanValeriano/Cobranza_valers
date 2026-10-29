import { store } from '../../state/store.js';
import { ROLES, ROLE_BADGE } from '../../config/constants.js';
import { money, fmtDate } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export function getPeriodData(group) {
  const records = group.closures
    .flatMap(c => store.getRecordsForClosure(c.id))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0)));

  const payments = group.closures.flatMap(c => store.getPaymentsForClosure(c.id));

  const byWorker = {};
  records.forEach(r => {
    byWorker[r.workerId] = byWorker[r.workerId] || {
      worker: store.getWorkerById(r.workerId),
      bruto: 0,
      recordsCount: 0,
      records: []
    };
    byWorker[r.workerId].bruto += r.subtotal;
    byWorker[r.workerId].recordsCount += 1;
    byWorker[r.workerId].records.push(r);
  });

  const workerRows = Object.values(byWorker).map(item => {
    const w = item.worker || { id: 'unknown', nombre: 'Desconocido', dni: '—', rol: '—', metodo: 'EFECTIVO' };
    const p = payments.find(pay => pay.workerId === w.id);
    const descuentos = p ? p.descuentos : 0;
    const neto = Math.round((item.bruto - descuentos) * 100) / 100;
    const metodo = p ? p.metodo : w.metodo;
    let montoEfectivo = 0;
    let montoDigital = 0;
    if (metodo === 'EFECTIVO') {
      montoEfectivo = neto;
      montoDigital = 0;
    } else if (metodo === 'DIGITAL' || metodo === 'TRANSFERENCIA' || metodo === 'YAPE') {
      montoEfectivo = 0;
      montoDigital = neto;
    } else if (metodo === 'MIXTO') {
      if (p && typeof p.montoEfectivo === 'number' && typeof p.montoDigital === 'number' &&
        Math.abs((p.montoEfectivo + p.montoDigital) - neto) < 0.01 && neto > 0) {
        montoEfectivo = p.montoEfectivo;
        montoDigital = p.montoDigital;
      } else {
        montoEfectivo = 0;
        montoDigital = 0;
      }
    }

    return {
      worker: w,
      bruto: item.bruto,
      descuentos,
      neto,
      metodo,
      montoEfectivo,
      montoDigital,
      recordsCount: item.recordsCount,
      records: item.records
    };
  });

  const totalBruto = workerRows.reduce((a, r) => a + r.bruto, 0);
  const totalDescuentos = workerRows.reduce((a, r) => a + r.descuentos, 0);
  const totalNeto = workerRows.reduce((a, r) => a + r.neto, 0);
  const totalEfectivo = workerRows.reduce((a, r) => a + r.montoEfectivo, 0);
  const totalDigital = workerRows.reduce((a, r) => a + r.montoDigital, 0);

  return {
    records,
    workerRows,
    totalBruto,
    totalDescuentos,
    totalNeto,
    totalEfectivo,
    totalDigital,
    totalWorkers: workerRows.length,
    totalRecords: records.length
  };
}

export function exportPeriodToExcel(group, repFiltro) {
  const data = getPeriodData(group);
  const tipoLabel = repFiltro === 'semanal' ? 'Semanal' : (repFiltro === 'mensual' ? 'Mensual' : 'Anual');
  const sanitizedLabel = group.label.replace(/[\/\\]/g, '-').replace(/\s+/g, '_');
  const filename = `Reporte_${tipoLabel}_${sanitizedLabel}.xls`;

  const excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Reporte ${tipoLabel}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1E1A17; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 22px; }
    .header-table td { border: none; padding: 4px 0; }
    .title { font-size: 16pt; font-weight: bold; color: #2D241E; }
    .subtitle { font-size: 11pt; color: #5C4A3E; }
    .section-head { background-color: #8C5B32; color: #FFFFFF; font-size: 12pt; font-weight: bold; padding: 8px 12px; }
    th { background-color: #2D241E; color: #FFFFFF; font-weight: bold; border: 1px solid #786C5E; padding: 7px 10px; text-align: left; }
    th.num { text-align: right; }
    td { border: 1px solid #D8D0C5; padding: 6px 10px; vertical-align: middle; }
    td.num { text-align: right; mso-number-format: "\#\,\#\#0\.00"; }
    td.currency { text-align: right; mso-number-format: "\"S/ \"\#\,\#\#0\.00"; }
    td.center { text-align: center; }
    .kpi-table th { background-color: #4A3B32; font-size: 10.5pt; text-align: center; }
    .kpi-table td { font-size: 13pt; font-weight: bold; text-align: center; background-color: #FAF8F5; }
    .total-row td { background-color: #EFE8D8; font-weight: bold; border-top: 2px solid #2D241E; border-bottom: 2px solid #2D241E; }
    .alt-row td { background-color: #FBF9F6; }
    .badge { font-weight: bold; padding: 2px 6px; border-radius: 3px; font-size: 9.5pt; }
  </style>
</head>
<body>
  <!-- ENCABEZADO INSTITUCIONAL -->
  <table class="header-table">
    <tr>
      <td colspan="6" class="title">VALER E.I.R.L. &mdash; Sistema de Cobranza a Colaboradores</td>
    </tr>
    <tr>
      <td colspan="6" class="subtitle">Control de Producción a Destajo y Liquidación de Mano de Obra</td>
    </tr>
    <tr>
      <td colspan="3"><strong>Tipo de Reporte:</strong> Reporte ${tipoLabel}</td>
      <td colspan="3" align="right"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</td>
    </tr>
    <tr>
      <td colspan="3"><strong>Periodo:</strong> ${group.label}</td>
      <td colspan="3" align="right"><strong>Estado del Periodo:</strong> ${group.estado === 'CERRADO' ? 'CERRADO' : 'EN CURSO (ABIERTO)'}</td>
    </tr>
  </table>

  <!-- RESUMEN ECONÓMICO Y CAJA -->
  <table class="kpi-table">
    <tr>
      <th colspan="5" class="section-head">RESUMEN GENERAL DEL PERIODO</th>
    </tr>
    <tr>
      <th>Total Producido (Bruto)</th>
      <th>Efectivo (Caja Física)</th>
      <th>Digital (Yape / Banco)</th>
      <th>Colaboradores</th>
      <th>Total Labores</th>
    </tr>
    <tr>
      <td class="currency" style="color:#2D241E;">S/ ${data.totalBruto.toFixed(2)}</td>
      <td class="currency" style="color:#1B5E20;">S/ ${data.totalEfectivo.toFixed(2)}</td>
      <td class="currency" style="color:#0D47A1;">S/ ${data.totalDigital.toFixed(2)}</td>
      <td style="color:#4A3B32;">${data.totalWorkers}</td>
      <td style="color:#4A3B32;">${data.totalRecords}</td>
    </tr>
  </table>

  <!-- TABLA 1: DESGLOSE POR COLABORADOR -->
  <table>
    <tr>
      <th colspan="10" class="section-head">1. RESUMEN Y NÓMINA POR COLABORADOR</th>
    </tr>
    <tr>
      <th>Colaborador</th>
      <th>DNI</th>
      <th>Rol</th>
      <th class="num">N° Labores</th>
      <th class="num">Total Producido</th>
      <th class="num">Adelantos/Desc.</th>
      <th class="num">Neto a Pagar</th>
      <th>Método de Pago</th>
      <th class="num">Monto Efectivo</th>
      <th class="num">Monto Digital</th>
    </tr>
    ${data.workerRows.length > 0 ? data.workerRows.map((r, idx) => `
      <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
        <td><strong>${r.worker.nombre}</strong></td>
        <td>${r.worker.dni || '—'}</td>
        <td>${ROLES[r.worker.rol] || r.worker.rol}</td>
        <td class="num">${r.recordsCount}</td>
        <td class="currency">S/ ${r.bruto.toFixed(2)}</td>
        <td class="currency" style="color:#C62828;">${r.descuentos > 0 ? `S/ ${r.descuentos.toFixed(2)}` : 'S/ 0.00'}</td>
        <td class="currency" style="font-weight:bold;">S/ ${r.neto.toFixed(2)}</td>
        <td>${r.metodo}</td>
        <td class="currency" style="color:#1B5E20;">S/ ${r.montoEfectivo.toFixed(2)}</td>
        <td class="currency" style="color:#0D47A1;">S/ ${r.montoDigital.toFixed(2)}</td>
      </tr>
    `).join('') : `
      <tr><td colspan="10" class="center">No hay registros de colaboradores para este periodo.</td></tr>
    `}
    <tr class="total-row">
      <td colspan="3"><strong>TOTALES CONSOLIDADOS</strong></td>
      <td class="num"><strong>${data.totalRecords}</strong></td>
      <td class="currency"><strong>S/ ${data.totalBruto.toFixed(2)}</strong></td>
      <td class="currency" style="color:#C62828;"><strong>S/ ${data.totalDescuentos.toFixed(2)}</strong></td>
      <td class="currency"><strong>S/ ${data.totalNeto.toFixed(2)}</strong></td>
      <td>—</td>
      <td class="currency" style="color:#1B5E20;"><strong>S/ ${data.totalEfectivo.toFixed(2)}</strong></td>
      <td class="currency" style="color:#0D47A1;"><strong>S/ ${data.totalDigital.toFixed(2)}</strong></td>
    </tr>
  </table>

  <!-- TABLA 2: DETALLE COMPLETO DE LABORES -->
  <table>
    <tr>
      <th colspan="10" class="section-head">2. DETALLE INDIVIDUAL DE LABORES REALIZADAS (${data.totalRecords} registros)</th>
    </tr>
    <tr>
      <th style="width:40px;" class="center">#</th>
      <th>Fecha</th>
      <th>Colaborador</th>
      <th>Rol</th>
      <th>Labor / Concepto (Código)</th>
      <th class="center">Unidad</th>
      <th class="num">Cantidad</th>
      <th class="num">Precio Unit.</th>
      <th class="num">Subtotal</th>
      <th>Notas / Observaciones</th>
    </tr>
    ${data.records.length > 0 ? data.records.map((rec, idx) => {
    const w = store.getWorkerById(rec.workerId);
    const rt = store.getRateById(rec.rateId);
    return `
        <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
          <td class="center" style="color:#666;">${idx + 1}</td>
          <td>${fmtDate(rec.fecha)}</td>
          <td><strong>${w ? w.nombre : '—'}</strong></td>
          <td>${w ? (ROLES[w.rol] || w.rol) : '—'}</td>
          <td>${rt ? `${rt.concepto} (${rt.id})` : '—'}</td>
          <td class="center">${rec.unidad === 'PAR' ? 'Par' : 'Docena'}</td>
          <td class="num">${rec.cantidad}</td>
          <td class="currency">S/ ${rec.precio.toFixed(2)}</td>
          <td class="currency" style="font-weight:bold;">S/ ${rec.subtotal.toFixed(2)}</td>
          <td style="font-size:10pt; color:#555;">${rec.notas || ''}</td>
        </tr>
      `;
  }).join('') : `
      <tr><td colspan="10" class="center">No hay detalle de labores registradas en este periodo.</td></tr>
    `}
    <tr class="total-row">
      <td colspan="6"><strong>TOTAL DE LABORES DEL PERIODO</strong></td>
      <td class="num"><strong>${data.records.reduce((acc, r) => acc + r.cantidad, 0)}</strong></td>
      <td>—</td>
      <td class="currency"><strong>S/ ${data.totalBruto.toFixed(2)}</strong></td>
      <td>—</td>
    </tr>
  </table>
</body>
</html>
  `;
  const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Excel descargado: ${filename}`);
}

export function buildPdfDocumentHtml(group, repFiltro, options = {}) {
  const data = getPeriodData(group);
  const tipoLabel = repFiltro === 'semanal' ? 'Semanal' : (repFiltro === 'mensual' ? 'Mensual' : 'Anual');
  const orientation = options.orientation || 'landscape';
  const pageSize = options.pageSize || 'A4';
  const density = options.density || 'normal';

  const incResumen = options.incResumen !== false;
  const incNomina = options.incNomina !== false;
  const incDetalle = options.incDetalle !== false;
  const incFirmas = options.incFirmas !== false;

  const fontSize = density === 'compact' ? '9pt' : '10pt';
  const tableFontSize = density === 'compact' ? '8.5pt' : '9pt';
  const thPadding = density === 'compact' ? '4px 6px' : '6px 8px';
  const tdPadding = density === 'compact' ? '3px 6px' : '5px 8px';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte ${tipoLabel} — VALER E.I.R.L.</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 10mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #1A1A1A;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2D241E;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 16pt;
      font-weight: 700;
      color: #2D241E;
      letter-spacing: 0.3px;
    }
    .brand-sub {
      font-size: 8.5pt;
      color: #555555;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5pt;
      line-height: 1.4;
      color: #333333;
    }
    .meta-box strong {
      color: #000000;
    }
    .kpi-row {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      flex: 1;
      border: 1px solid #D0C8B8;
      border-radius: 4px;
      padding: 7px 10px;
      background: #FAF8F5;
    }
    .kpi-card-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 600;
      color: #666666;
      margin-bottom: 3px;
    }
    .kpi-card-val {
      font-size: 13pt;
      font-weight: 700;
      color: #2D241E;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #2D241E;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-left: 3px solid #8C5B32;
      padding-left: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: ${tableFontSize};
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    th {
      background-color: #2D241E !important;
      color: #FFFFFF !important;
      font-weight: 600;
      text-align: left;
      padding: ${thPadding};
      border: 1px solid #2D241E;
    }
    th.num, td.num {
      text-align: right;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    th.center, td.center {
      text-align: center;
    }
    td {
      padding: ${tdPadding};
      border: 1px solid #D8D0C5;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background-color: #FAF8F5;
    }
    .total-row td {
      background-color: #EFE8D8 !important;
      font-weight: 700;
      border-top: 1.5px solid #2D241E;
      border-bottom: 1.5px solid #2D241E;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 26px;
      page-break-inside: avoid;
    }
    .signature-block {
      text-align: center;
      width: 220px;
      font-size: 8.5pt;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-bottom: 4px;
    }
    .footer-doc {
      margin-top: 14px;
      border-top: 1px solid #E0D8CC;
      padding-top: 6px;
      font-size: 7.5pt;
      color: #777777;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ENCABEZADO -->
  <div class="header-box">
    <div>
      <div class="brand-title">VALER E.I.R.L.</div>
      <div class="brand-sub">Sistema de Cobranza a Colaboradores &middot; Producción y Liquidación de Mano de Obra</div>
    </div>
    <div class="meta-box">
      <div><strong>REPORTE ${tipoLabel.toUpperCase()}</strong></div>
      <div><strong>Periodo:</strong> ${group.label}</div>
      <div><strong>Estado:</strong> ${group.estado === 'CERRADO' ? 'CERRADO' : 'EN CURSO (ABIERTO)'}</div>
      <div><strong>Emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
    </div>
  </div>

  ${incResumen ? `
    <!-- RESUMEN EN KPIS -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-card-title">Gasto Total Producido</div>
        <div class="kpi-card-val">${money(data.totalBruto)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-title">Pago en Efectivo</div>
        <div class="kpi-card-val" style="color:#1B5E20;">${money(data.totalEfectivo)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-title">Pago Digital (Yape / Banco)</div>
        <div class="kpi-card-val" style="color:#0D47A1;">${money(data.totalDigital)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-title">Colaboradores / Labores</div>
        <div class="kpi-card-val">${data.totalWorkers} colab &middot; ${data.totalRecords} reg</div>
      </div>
    </div>
  ` : ''}

  ${incNomina ? `
    <!-- TABLA DE COLABORADORES -->
    <div class="section-title">1. Resumen y Nómina por Colaborador</div>
    <table>
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>DNI</th>
          <th>Rol</th>
          <th class="num">Labores</th>
          <th class="num">Total Bruto</th>
          <th class="num">Desc./Adel.</th>
          <th class="num">Neto a Pagar</th>
          <th>Método</th>
          <th class="num">Efectivo</th>
          <th class="num">Digital</th>
        </tr>
      </thead>
      <tbody>
        ${data.workerRows.length > 0 ? data.workerRows.map(r => `
          <tr>
            <td><strong>${r.worker.nombre}</strong></td>
            <td>${r.worker.dni || '—'}</td>
            <td>${ROLES[r.worker.rol] || r.worker.rol}</td>
            <td class="num">${r.recordsCount}</td>
            <td class="num">${money(r.bruto)}</td>
            <td class="num" style="color:#C62828;">${r.descuentos > 0 ? money(r.descuentos) : 'S/ 0.00'}</td>
            <td class="num"><strong>${money(r.neto)}</strong></td>
            <td>${r.metodo}</td>
            <td class="num" style="color:#1B5E20;">${money(r.montoEfectivo)}</td>
            <td class="num" style="color:#0D47A1;">${money(r.montoDigital)}</td>
          </tr>
        `).join('') : `
          <tr><td colspan="10" class="center">No hay registros para este periodo.</td></tr>
        `}
        <tr class="total-row">
          <td colspan="3"><strong>TOTALES NÓMINA</strong></td>
          <td class="num"><strong>${data.totalRecords}</strong></td>
          <td class="num"><strong>${money(data.totalBruto)}</strong></td>
          <td class="num" style="color:#C62828;"><strong>${money(data.totalDescuentos)}</strong></td>
          <td class="num"><strong>${money(data.totalNeto)}</strong></td>
          <td>—</td>
          <td class="num" style="color:#1B5E20;"><strong>${money(data.totalEfectivo)}</strong></td>
          <td class="num" style="color:#0D47A1;"><strong>${money(data.totalDigital)}</strong></td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  ${incDetalle ? `
    <!-- TABLA DE DETALLE DE LABORES -->
    <div class="section-title">2. Detalle Individual de Labores Realizadas (${data.totalRecords} registros)</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px;" class="center">#</th>
          <th>Fecha</th>
          <th>Colaborador</th>
          <th>Rol</th>
          <th>Labor / Código</th>
          <th class="center">Unidad</th>
          <th class="num">Cantidad</th>
          <th class="num">Precio</th>
          <th class="num">Subtotal</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
        ${data.records.length > 0 ? data.records.map((rec, idx) => {
    const w = store.getWorkerById(rec.workerId);
    const rt = store.getRateById(rec.rateId);
    return `
            <tr>
              <td class="center" style="color:#666;">${idx + 1}</td>
              <td>${fmtDate(rec.fecha)}</td>
              <td><strong>${w ? w.nombre : '—'}</strong></td>
              <td>${w ? (ROLES[w.rol] || w.rol) : '—'}</td>
              <td>${rt ? `${rt.concepto} (${rt.id})` : '—'}</td>
              <td class="center">${rec.unidad === 'PAR' ? 'Par' : 'Docena'}</td>
              <td class="num">${rec.cantidad}</td>
              <td class="num">${money(rec.precio)}</td>
              <td class="num"><strong>${money(rec.subtotal)}</strong></td>
              <td style="font-size:8pt; color:#444;">${rec.notas || ''}</td>
            </tr>
          `;
  }).join('') : `
          <tr><td colspan="10" class="center">No hay labores registradas en este periodo.</td></tr>
        `}
        <tr class="total-row">
          <td colspan="6"><strong>TOTAL DE LABORES</strong></td>
          <td class="num"><strong>${data.records.reduce((acc, r) => acc + r.cantidad, 0)}</strong></td>
          <td>—</td>
          <td class="num"><strong>${money(data.totalBruto)}</strong></td>
          <td>—</td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  ${incFirmas ? `
    <!-- BLOQUE DE FIRMAS -->
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div><strong>Administración / Tesorería</strong></div>
        <div style="font-size:7.5pt; color:#666;">VALER E.I.R.L.</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div><strong>Control de Producción</strong></div>
        <div style="font-size:7.5pt; color:#666;">Revisado y Conforme</div>
      </div>
    </div>
  ` : ''}

  <div class="footer-doc">
    <div>Documento generado por el Sistema de Cobranza a Colaboradores &middot; VALER E.I.R.L.</div>
    <div>Página 1</div>
  </div>

</body>
</html>
  `;
}

export function openPdfExportModal(group, repFiltro) {
  const tipoLabel = repFiltro === 'semanal' ? 'Semanal' : (repFiltro === 'mensual' ? 'Mensual' : 'Anual');
  const data = getPeriodData(group);
  const sanitizedLabel = group.label.replace(/[\/\\]/g, '-').replace(/\s+/g, '_');
  const defaultFilename = `Reporte_${tipoLabel}_${sanitizedLabel}.pdf`;

  const existingModal = document.getElementById('modalPdfExport');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div class="modal-overlay" id="modalPdfExport">
      <div class="modal-card" style="max-width:580px; max-height:92vh; overflow-y:auto; padding:24px 28px;">
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:18px;">
          <div>
            <h3 style="font-size:17px; margin:0; color:var(--ink); font-family:var(--font-heading);">Exportar Reporte a PDF</h3>
            <div style="font-size:12px; color:var(--ink-soft); margin-top:3px;">
              Configura el formato del reporte para <strong>${tipoLabel} (${group.label})</strong>
            </div>
          </div>
          <button type="button" class="modal-close" id="btnCerrarPdfModal" title="Cerrar">&times;</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          
          <!-- RESUMEN DEL PERIODO A EXPORTAR -->
          <div style="background:var(--paper-panel); border:1px solid var(--line); border-radius:var(--radius); padding:10px 14px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--ink-soft);">Periodo:</span>
              <strong>${group.label}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--ink-soft);">Total producido:</span>
              <strong style="color:var(--leather);">${money(data.totalBruto)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:var(--ink-soft);">Efectivo / Digital:</span>
              <span><span style="color:var(--forest); font-weight:600;">${money(data.totalEfectivo)}</span> / <span style="color:var(--denim); font-weight:600;">${money(data.totalDigital)}</span></span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--ink-soft);">Detalle:</span>
              <span>${data.totalWorkers} colaboradores &middot; ${data.totalRecords} labores</span>
            </div>
          </div>

          <!-- OPCIÓN 1: ORIENTACIÓN -->
          <div>
            <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px; color:var(--ink);">
              Orientación de página:
            </label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <label style="display:flex; align-items:center; gap:8px; padding:9px 12px; border:1px solid var(--line); border-radius:var(--radius); cursor:pointer; background:var(--paper);">
                <input type="radio" name="pdfOrientation" value="landscape" checked>
                <div>
                  <div style="font-weight:600; font-size:12px;">Horizontal (Apaisado)</div>
                  <div style="font-size:10.5px; color:var(--ink-soft);">Ideal para detalle de labores</div>
                </div>
              </label>
              <label style="display:flex; align-items:center; gap:8px; padding:9px 12px; border:1px solid var(--line); border-radius:var(--radius); cursor:pointer; background:var(--paper);">
                <input type="radio" name="pdfOrientation" value="portrait">
                <div>
                  <div style="font-weight:600; font-size:12px;">Vertical (Retrato)</div>
                  <div style="font-size:10.5px; color:var(--ink-soft);">Para nómina y resúmenes</div>
                </div>
              </label>
            </div>
          </div>

          <!-- OPCIÓN 2: TAMAÑO Y DENSIDAD -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="display:block; font-weight:600; font-size:12px; margin-bottom:4px; color:var(--ink);">Tamaño de papel:</label>
              <select id="pdfPageSize" style="width:100%;">
                <option value="A4" selected>A4 (Estándar)</option>
                <option value="Letter">Carta (Letter)</option>
                <option value="Legal">Oficio (Legal)</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-weight:600; font-size:12px; margin-bottom:4px; color:var(--ink);">Densidad / Tipografía:</label>
              <select id="pdfDensity" style="width:100%;">
                <option value="normal" selected>Normal (Estándar)</option>
                <option value="compact">Compacto (Más filas por hoja)</option>
              </select>
            </div>
          </div>

          <!-- OPCIÓN 3: SECCIONES A INCLUIR -->
          <div>
            <label style="display:block; font-weight:600; font-size:12.5px; margin-bottom:6px; color:var(--ink);">
              Secciones a incluir en el reporte:
            </label>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:12px; background:var(--paper-panel); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--line);">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chkIncResumen" checked> Resumen ejecutivo (Totales y cajas)
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chkIncNomina" checked> Desglose de nómina por colaborador
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chkIncDetalle" checked> Detalle individual de labores diarias (${data.totalRecords} reg.)
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chkIncFirmas" checked> Recuadro para firmas de conformidad
              </label>
            </div>
          </div>

        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px solid var(--line); padding-top:14px;">
          <button type="button" class="btn" id="btnCancelPdf">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnDescargarPdf" style="display:flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Generar y Descargar PDF
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modalEl = document.getElementById('modalPdfExport');
  const btnClose = modalEl.querySelector('#btnCerrarPdfModal');
  const btnCancel = modalEl.querySelector('#btnCancelPdf');
  const btnDescargar = modalEl.querySelector('#btnDescargarPdf');

  function closeModal() {
    modalEl.remove();
  }

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });

  btnDescargar.addEventListener('click', async () => {
    const orientation = modalEl.querySelector('input[name="pdfOrientation"]:checked').value;
    const pageSize = modalEl.querySelector('#pdfPageSize').value;
    const density = modalEl.querySelector('#pdfDensity').value;
    const incResumen = modalEl.querySelector('#chkIncResumen').checked;
    const incNomina = modalEl.querySelector('#chkIncNomina').checked;
    const incDetalle = modalEl.querySelector('#chkIncDetalle').checked;
    const incFirmas = modalEl.querySelector('#chkIncFirmas').checked;

    btnDescargar.disabled = true;
    btnDescargar.textContent = 'Generando PDF...';

    const documentHtml = buildPdfDocumentHtml(group, repFiltro, {
      orientation,
      pageSize,
      density,
      incResumen,
      incNomina,
      incDetalle,
      incFirmas
    });

    try {
      if (window.electronAPI && typeof window.electronAPI.exportPdfNative === 'function') {
        const result = await window.electronAPI.exportPdfNative({
          html: documentHtml,
          defaultName: defaultFilename,
          landscape: orientation === 'landscape',
          pageSize
        });

        if (result && result.success) {
          showToast('Archivo PDF guardado con éxito');
          closeModal();
          return;
        } else if (result && result.canceled) {
          btnDescargar.disabled = false;
          btnDescargar.innerHTML = `Generar y Descargar PDF`;
          return;
        }
      }

      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      printIframe.style.width = '1000px';
      printIframe.style.height = '1400px';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(documentHtml);
      iframeDoc.close();

      setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => {
          printIframe.remove();
        }, 1500);
        closeModal();
      }, 500);

    } catch (err) {
      console.error('[PDF Export] Error:', err);
      showToast('Error al generar PDF: ' + err.message);
      btnDescargar.disabled = false;
      btnDescargar.textContent = 'Generar y Descargar PDF';
    }
  });
}
