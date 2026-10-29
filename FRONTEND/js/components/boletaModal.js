import { store } from '../state/store.js';
import { ROLES, METODOS } from '../config/constants.js';
import { money, fmtDate } from '../utils/formatters.js';

/**
 * Abre e imprime la boleta de pago de un trabajador para una semana determinada
 * @param {string} closureId 
 * @param {string} workerId 
 */
export function abrirBoleta(closureId, workerId) {
  const closure = store.getClosureById(closureId);
  const worker = store.getWorkerById(workerId);
  if (!closure || !worker) return;

  const recs = store.getRecordsForClosure(closureId).filter(r => r.workerId === workerId);
  const bruto = recs.reduce((sum, r) => sum + r.subtotal, 0);

  const payments = store.getPaymentsForClosure(closureId);
  const payment = payments.find(p => p.workerId === workerId);
  const desc = payment ? payment.descuentos : 0;
  const neto = bruto - desc;
  const metodo = payment ? payment.metodo : worker.metodo;

  const win = window.open('', '_blank', 'width=440,height=580');
  if (!win) {
    alert("Por favor permite las ventanas emergentes para ver e imprimir la boleta.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Boleta — ${worker.nombre}</title>
      <link href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@600&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; padding: 30px; color: #211D17; background: #FAF7EE; }
        h2 { font-family: 'Zilla Slab', Georgia, serif; margin: 0 0 4px; font-size: 22px; color: #7B2E22; }
        .sub { font-size: 13px; color: #4A4335; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13.5px; }
        td { padding: 9px 0; border-bottom: 1px solid #D8C39B; }
        .num { text-align: right; font-family: 'IBM Plex Mono', monospace; }
        .tot { font-weight: 700; font-size: 16px; border-top: 2px solid #211D17; padding-top: 12px; }
        .footer { margin-top: 30px; font-size: 11px; color: #8C7E60; text-align: center; }
        @media print {
          body { background: #fff; padding: 15px; }
        }
      </style>
    </head>
    <body>
      <h2>Boleta de liquidación y cobranza</h2>
      <div class="sub">VALER E.I.R.L · Sistema de Cobranza a Colaboradores · Semana ${fmtDate(closure.fechaInicio)} – ${fmtDate(closure.fechaFin)}</div>
      <table>
        <tr><td>Colaborador</td><td class="num">${worker.nombre}</td></tr>
        <tr><td>DNI</td><td class="num">${worker.dni}</td></tr>
        <tr><td>Rol de labor</td><td class="num">${ROLES[worker.rol] || worker.rol}</td></tr>
        <tr><td>Total producido</td><td class="num">${money(bruto)}</td></tr>
        <tr><td>Adelantos / descuentos</td><td class="num">-${money(desc)}</td></tr>
        <tr class="tot"><td>Neto a cobrar</td><td class="num">${money(neto)}</td></tr>
        <tr><td>Método de pago</td><td class="num">${METODOS[metodo] || metodo}</td></tr>
      </table>
      <div class="footer">Comprobante emitido por VALER E.I.R.L · Fecha de emisión: ${fmtDate(new Date().toISOString().slice(0, 10))}</div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
