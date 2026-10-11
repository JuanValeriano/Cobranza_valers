import { loadState, saveState } from './storage.js';
import { uid, addDays } from '../utils/formatters.js';
import { api } from '../services/api.js';

class Store {
  constructor() {
    this.state = loadState();
    this.listeners = new Set();
    this.syncWithBackend();
  }

  async syncWithBackend() {
    try {
      const serverState = await api.getState();
      if (serverState && serverState.workers) {
        this.state = serverState;
        this.notify();
      }
    } catch (e) {
      console.info("[Store] Modo offline o servidor local no disponible. Usando almacenamiento local.");
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    saveState(this.state);
    this.listeners.forEach(fn => fn(this.state));
  }

  getWorkers() {
    return this.state.workers || [];
  }

  getActiveWorkers() {
    return this.getWorkers().filter(w => w.activo);
  }

  getWorkerById(id) {
    return this.getWorkers().find(w => w.id === id);
  }

  async addWorker({ nombre, dni, telefono, rol, metodo, activo }) {
    const worker = {
      id: uid('w'),
      nombre,
      dni,
      telefono: telefono || '',
      rol,
      metodo: metodo || 'EFECTIVO',
      activo: activo ? 1 : 0
    };
    this.state.workers.push(worker);
    this.notify();

    try {
      const saved = await api.createWorker(worker);
      if (saved && saved.id) {
        worker.id = saved.id;
        this.notify();
      }
    } catch (e) { /* Fallback local */ }

    return worker;
  }

  async updateWorker(id, { nombre, dni, telefono, rol, metodo, activo }) {
    const w = this.getWorkerById(id);
    if (!w) return null;

    if (nombre !== undefined) w.nombre = nombre;
    if (dni !== undefined) w.dni = dni;
    if (telefono !== undefined) w.telefono = telefono;
    if (rol !== undefined) w.rol = rol;
    if (metodo !== undefined) w.metodo = metodo;
    if (activo !== undefined) w.activo = activo ? 1 : 0;

    this.notify();

    try {
      await api.updateWorker(id, {
        nombre: w.nombre,
        dni: w.dni,
        telefono: w.telefono,
        rol: w.rol,
        metodo: w.metodo,
        activo: w.activo
      });
    } catch (e) { /* Fallback local */ }

    return w;
  }

  async toggleWorkerStatus(id) {
    const w = this.getWorkerById(id);
    if (w) {
      w.activo = w.activo ? 0 : 1;
      this.notify();
      try {
        await api.toggleWorker(id);
      } catch (e) { /* Fallback local */ }
    }
  }

  getRates() {
    return this.state.rates || [];
  }

  getRatesByRole(role) {
    return this.getRates().filter(r => r.rol === role);
  }

  getRateById(id) {
    return this.getRates().find(r => r.id === id);
  }

  async addRate({ rol, concepto, precioPar, precioDocena }) {
    const rate = {
      id: uid('r'),
      rol,
      concepto,
      precioPar: parseFloat(precioPar) || 0,
      precioDocena: parseFloat(precioDocena) || 0,
      activo: 1
    };
    this.state.rates.push(rate);
    this.notify();

    try {
      const saved = await api.createRate(rate);
      if (saved && saved.id) {
        rate.id = saved.id;
        this.notify();
      }
    } catch (e) { /* Fallback local */ }

    return rate;
  }

  async updateRate(id, { rol, concepto, precioPar, precioDocena, activo }) {
    const r = this.getRateById(id);
    if (!r) return null;

    if (rol !== undefined) r.rol = rol;
    if (concepto !== undefined) r.concepto = concepto;
    if (precioPar !== undefined) r.precioPar = parseFloat(precioPar) || 0;
    if (precioDocena !== undefined) r.precioDocena = parseFloat(precioDocena) || 0;
    if (activo !== undefined) r.activo = activo ? 1 : 0;

    this.notify();

    try {
      await api.updateRate(id, {
        rol: r.rol,
        concepto: r.concepto,
        precioPar: r.precioPar,
        precioDocena: r.precioDocena,
        activo: r.activo
      });
    } catch (e) { /* Fallback local */ }

    return r;
  }

  async toggleRateStatus(id) {
    const r = this.getRateById(id);
    if (r) {
      r.activo = r.activo ? 0 : 1;
      this.notify();
      try {
        await api.toggleRate(id);
      } catch (e) { /* Fallback local */ }
    }
  }

  getClosures() {
    return this.state.closures || [];
  }

  getOpenClosure() {
    return this.getClosures().find(c => c.estado === 'ABIERTO') || this.getClosures()[0];
  }

  getClosureById(id) {
    return this.getClosures().find(c => c.id === id);
  }

  getRecords() {
    return this.state.records || [];
  }

  getRecordsForClosure(closureId) {
    return this.getRecords().filter(r => r.cierreId === closureId);
  }

  async addRecord({ workerId, rateId, fecha, unidad, cantidad, notas }) {
    const oc = this.getOpenClosure();
    if (!oc || oc.estado !== 'ABIERTO') {
      throw new Error("No hay una semana abierta activa.");
    }
    const rate = this.getRateById(rateId);
    if (!rate) throw new Error("Tarifa no encontrada.");

    const cant = parseFloat(cantidad) || 0;
    const precio = unidad === 'PAR' ? rate.precioPar : rate.precioDocena;
    const subtotal = Math.round(precio * cant * 100) / 100;

    const record = {
      id: uid('reg'),
      workerId,
      rateId,
      fecha,
      unidad,
      cantidad: cant,
      precio,
      subtotal,
      notas: notas || '',
      cierreId: oc.id
    };

    this.state.records.push(record);
    this.notify();

    try {
      const saved = await api.createRecord({
        workerId,
        rateId,
        fecha,
        unidad,
        cantidad: cant,
        notas
      });
      if (saved && saved.id) {
        record.id = saved.id;
        this.notify();
      }
    } catch (e) { /* Fallback local */ }

    return record;
  }

  async deleteRecord(id) {
    const oc = this.getOpenClosure();
    if (oc && oc.estado !== 'ABIERTO') return;
    this.state.records = this.state.records.filter(r => r.id !== id);
    this.notify();

    try {
      await api.deleteRecord(id);
    } catch (e) { /* Fallback local */ }
  }

  getPayments() {
    return this.state.payments || [];
  }

  getPaymentsForClosure(closureId) {
    return this.getPayments().filter(p => p.cierreId === closureId);
  }

  ensurePayment(closureId, workerId, bruto) {
    let p = this.state.payments.find(item => item.cierreId === closureId && item.workerId === workerId);
    if (!p) {
      const w = this.getWorkerById(workerId);
      p = {
        id: uid('pago'),
        cierreId: closureId,
        workerId,
        bruto,
        descuentos: 0,
        neto: bruto,
        metodo: w ? w.metodo : 'EFECTIVO',
        montoEfectivo: 0,
        montoDigital: 0
      };
      this.state.payments.push(p);
    }
    return p;
  }

  async updateDescuento(closureId, workerId, val, bruto) {
    const p = this.ensurePayment(closureId, workerId, bruto);
    p.descuentos = parseFloat(val) || 0;
    p.bruto = bruto;
    p.neto = Math.round((bruto - p.descuentos) * 100) / 100;
    this.notify();

    try {
      await api.updatePago(closureId, workerId, {
        descuentos: p.descuentos,
        bruto: p.bruto
      });
    } catch (e) { /* Fallback local */ }
  }

  async updateMetodo(closureId, workerId, val, bruto) {
    const p = this.ensurePayment(closureId, workerId, bruto);
    p.metodo = val;
    this.notify();

    try {
      await api.updatePago(closureId, workerId, {
        metodo: p.metodo,
        bruto: p.bruto
      });
    } catch (e) { /* Fallback local */ }
  }

  async closeWeek(closureId) {
    const closure = this.getClosureById(closureId);
    if (!closure || closure.estado === 'CERRADO') return;

    const recs = this.getRecordsForClosure(closureId);
    const byWorker = {};
    recs.forEach(r => {
      byWorker[r.workerId] = (byWorker[r.workerId] || 0) + r.subtotal;
    });

    Object.keys(byWorker).forEach(wid => {
      const bruto = byWorker[wid];
      const p = this.ensurePayment(closureId, wid, bruto);
      p.bruto = bruto;
      p.neto = Math.round((bruto - p.descuentos) * 100) / 100;
      p.montoEfectivo = p.metodo === 'EFECTIVO' ? p.neto : (p.metodo === 'MIXTO' ? p.neto / 2 : 0);
      p.montoDigital = p.metodo === 'EFECTIVO' ? 0 : (p.metodo === 'MIXTO' ? p.neto / 2 : p.neto);
    });

    closure.estado = 'CERRADO';
    closure.totalGastado = Object.values(byWorker).reduce((a, b) => a + b, 0);

    if (!this.state.closures.some(c => c.estado === 'ABIERTO')) {
      const nextStart = addDays(closure.fechaFin, 2);
      this.state.closures.push({
        id: uid('c'),
        fechaInicio: nextStart,
        fechaFin: addDays(nextStart, 5),
        estado: 'ABIERTO'
      });
    }

    this.notify();

    try {
      await api.closeWeek(closureId);
    } catch (e) { /* Fallback local */ }
  }

  getGastoPorRol(closureId) {
    const recs = this.getRecordsForClosure(closureId);
    const acc = { ARMADOR: 0, PERFILADOR: 0, CORTADOR: 0, ALISTADORA: 0 };
    recs.forEach(r => {
      const w = this.getWorkerById(r.workerId);
      if (w && acc[w.rol] !== undefined) acc[w.rol] += r.subtotal;
    });
    return acc;
  }
}

export const store = new Store();
