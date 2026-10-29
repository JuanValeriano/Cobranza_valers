import { uid, mondayOf, addDays } from '../utils/formatters.js';

export function getInitialSeedData() {
  const monday = mondayOf(new Date());
  const mondayISO = monday.toISOString().slice(0, 10);
  const saturdayISO = addDays(mondayISO, 5);

  const workers = [
    { id: "w1", nombre: "Jorge Ramírez", dni: "41022310", telefono: "987 112 004", rol: "ARMADOR", metodo: "EFECTIVO", activo: 1 },
    { id: "w2", nombre: "Luis Huamán", dni: "45871209", telefono: "988 340 771", rol: "ARMADOR", metodo: "YAPE", activo: 1 },
    { id: "w3", nombre: "Pedro Salazar", dni: "42219087", telefono: "989 004 552", rol: "PERFILADOR", metodo: "EFECTIVO", activo: 1 },
    { id: "w4", nombre: "Marco Ttito", dni: "47765310", telefono: "981 220 093", rol: "PERFILADOR", metodo: "TRANSFERENCIA", activo: 1 },
    { id: "w5", nombre: "Ana Quispe", dni: "44012987", telefono: "986 771 220", rol: "CORTADOR", metodo: "EFECTIVO", activo: 1 },
    { id: "w6", nombre: "Rosa Mamani", dni: "48120093", telefono: "987 665 110", rol: "CORTADOR", metodo: "YAPE", activo: 1 },
    { id: "w7", nombre: "Elena Vargas", dni: "43209871", telefono: "984 552 671", rol: "ALISTADORA", metodo: "EFECTIVO", activo: 1 },
    { id: "w8", nombre: "Carlos Ñahui", dni: "46612093", telefono: "983 110 224", rol: "ARMADOR", metodo: "EFECTIVO", activo: 0 },
  ];

  const rates = [
    { id: "r1", rol: "ARMADOR", concepto: "Falsas", precioPar: 8.50, precioDocena: 96.00, activo: 1 },
    { id: "r2", rol: "ARMADOR", concepto: "Eva", precioPar: 7.00, precioDocena: 80.00, activo: 1 },
    { id: "r3", rol: "ARMADOR", concepto: "Falsas forradas", precioPar: 9.20, precioDocena: 104.00, activo: 1 },
    { id: "r4", rol: "ARMADOR", concepto: "Azaleia", precioPar: 8.80, precioDocena: 100.00, activo: 1 },
    { id: "r5", rol: "ARMADOR", concepto: "Espanso", precioPar: 7.50, precioDocena: 85.00, activo: 1 },
    { id: "r6", rol: "ARMADOR", concepto: "PU", precioPar: 8.00, precioDocena: 90.00, activo: 1 },
    { id: "r7", rol: "PERFILADOR", concepto: "Código 932", precioPar: 12.00, precioDocena: 138.00, activo: 1 },
    { id: "r8", rol: "PERFILADOR", concepto: "Código 944", precioPar: 14.50, precioDocena: 166.00, activo: 1 },
    { id: "r9", rol: "PERFILADOR", concepto: "Código 810", precioPar: 10.80, precioDocena: 124.00, activo: 1 },
    { id: "r10", rol: "CORTADOR", concepto: "Cuero", precioPar: 6.00, precioDocena: 68.00, activo: 1 },
    { id: "r11", rol: "CORTADOR", concepto: "Badana", precioPar: 4.50, precioDocena: 51.00, activo: 1 },
    { id: "r12", rol: "CORTADOR", concepto: "Forro", precioPar: 3.80, precioDocena: 43.00, activo: 1 },
    { id: "r13", rol: "ALISTADORA", concepto: "Cajas armadas", precioPar: 1.20, precioDocena: 13.50, activo: 1 },
    { id: "r14", rol: "ALISTADORA", concepto: "Piedras / adornos", precioPar: 2.50, precioDocena: 28.00, activo: 1 },
    { id: "r15", rol: "ALISTADORA", concepto: "Pegado", precioPar: 1.80, precioDocena: 20.50, activo: 1 },
  ];

  const closures = [
    { id: "c_open", fechaInicio: mondayISO, fechaFin: saturdayISO, estado: "ABIERTO" },
    { id: "c_prev1", fechaInicio: addDays(mondayISO, -7), fechaFin: addDays(saturdayISO, -7), estado: "CERRADO" },
    { id: "c_prev2", fechaInicio: addDays(mondayISO, -14), fechaFin: addDays(saturdayISO, -14), estado: "CERRADO" },
    { id: "c_prev3", fechaInicio: addDays(mondayISO, -21), fechaFin: addDays(saturdayISO, -21), estado: "CERRADO" },
  ];

  function calcRate(rate, unidad, cant) {
    const precio = unidad === "PAR" ? rate.precioPar : rate.precioDocena;
    return { precio, subtotal: precio * cant };
  }

  const records = [];
  function addRec(workerId, rateId, diaOffset, unidad, cantidad, cierreId, notas) {
    const rate = rates.find(r => r.id === rateId);
    if (!rate) return;
    const { precio, subtotal } = calcRate(rate, unidad, cantidad);
    const closure = closures.find(c => c.id === cierreId);
    if (!closure) return;
    records.push({
      id: uid("reg"),
      workerId,
      rateId,
      fecha: addDays(closure.fechaInicio, diaOffset),
      unidad,
      cantidad,
      precio,
      subtotal,
      notas: notas || "",
      cierreId
    });
  }

  const dayIndex = new Date().getDay();
  const todOff = Math.min(dayIndex === 0 ? 6 : dayIndex - 1, 5);

  addRec("w1", "r1", 0, "DOCENA", 3, "c_open", "");
  addRec("w1", "r2", 1, "PAR", 18, "c_open", "");
  addRec("w2", "r4", 0, "DOCENA", 2.5, "c_open", "");
  addRec("w2", "r6", Math.min(2, todOff), "PAR", 22, "c_open", "Lote con retoque");
  addRec("w3", "r7", 0, "DOCENA", 4, "c_open", "");
  addRec("w3", "r8", 1, "PAR", 16, "c_open", "");
  addRec("w4", "r9", Math.min(2, todOff), "DOCENA", 3.5, "c_open", "");
  addRec("w5", "r10", 0, "DOCENA", 5, "c_open", "");
  addRec("w6", "r11", 1, "PAR", 30, "c_open", "");
  addRec("w5", "r12", Math.min(todOff, 3), "PAR", 24, "c_open", "");
  addRec("w7", "r13", 0, "DOCENA", 6, "c_open", "");
  addRec("w7", "r14", 1, "PAR", 20, "c_open", "Pedido especial con pedrería");
  addRec("w7", "r15", Math.min(todOff, 4), "DOCENA", 2, "c_open", "");

  ["c_prev1", "c_prev2", "c_prev3"].forEach((cid, idx) => {
    const mult = 1 - idx * 0.08;
    addRec("w1", "r1", 0, "DOCENA", 8 * mult, cid, "");
    addRec("w2", "r3", 1, "DOCENA", 6 * mult, cid, "");
    addRec("w3", "r7", 2, "DOCENA", 9 * mult, cid, "");
    addRec("w4", "r8", 2, "DOCENA", 7 * mult, cid, "");
    addRec("w5", "r10", 3, "DOCENA", 10 * mult, cid, "");
    addRec("w6", "r11", 3, "DOCENA", 7 * mult, cid, "");
    addRec("w7", "r13", 4, "DOCENA", 12 * mult, cid, "");
    addRec("w7", "r14", 4, "DOCENA", 5 * mult, cid, "");
  });

  const payments = [];
  ["c_prev1", "c_prev2", "c_prev3"].forEach(cid => {
    workers.forEach(w => {
      const recs = records.filter(r => r.cierreId === cid && r.workerId === w.id);
      if (!recs.length) return;
      const bruto = recs.reduce((a, r) => a + r.subtotal, 0);
      const desc = Math.round(bruto * 0.03 * 100) / 100;
      const neto = bruto - desc;
      const metodo = w.metodo;
      payments.push({
        id: uid("pago"),
        cierreId: cid,
        workerId: w.id,
        bruto,
        descuentos: desc,
        neto,
        metodo,
        montoEfectivo: metodo === "EFECTIVO" ? neto : 0,
        montoDigital: metodo !== "EFECTIVO" ? neto : 0
      });
    });
  });

  return { workers, rates, records, closures, payments };
}
