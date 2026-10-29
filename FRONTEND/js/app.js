import { store } from './state/store.js?v=3';
import { initSidebar, setActiveNavItem } from './components/sidebar.js?v=3';
import { renderResumenView } from './modules/resumen/resumen.module.js?v=3';
import { renderRegistroView } from './modules/registro/registro.module.js?v=3';
import { renderTrabajadoresView } from './modules/trabajadores/trabajadores.module.js?v=3';
import { renderTarifarioView } from './modules/tarifario/tarifario.module.js?v=3';
import { renderLiquidacionView } from './modules/liquidacion/liquidacion.module.js?v=3';
import { renderReportesView } from './modules/reportes/reportes.module.js?v=3';

const VIEWS = {
  resumen: {
    containerId: 'view-resumen',
    render: (el, router) => renderResumenView(el, router)
  },
  registro: {
    containerId: 'view-registro',
    render: (el, router) => renderRegistroView(el, router)
  },
  trabajadores: {
    containerId: 'view-trabajadores',
    render: (el, router) => renderTrabajadoresView(el, router)
  },
  tarifario: {
    containerId: 'view-tarifario',
    render: (el, router) => renderTarifarioView(el, router)
  },
  liquidacion: {
    containerId: 'view-liquidacion',
    render: (el, router) => renderLiquidacionView(el, router)
  },
  reportes: {
    containerId: 'view-reportes',
    render: (el, router) => renderReportesView(el, router)
  }
};

class App {
  constructor() {
    this.currentView = 'resumen';
    this.router = {
      navigateTo: (viewName) => this.navigateTo(viewName)
    };
  }

  init() {
    initSidebar({
      onNavigate: (viewName) => this.navigateTo(viewName)
    });

    this.navigateTo('resumen');

    // Suscripción reactiva: cualquier actualización del store o sincronización con Neon refresca la vista
    store.subscribe(() => {
      this.renderCurrentView();
      this.updateDbStatus();
    });
  }

  renderCurrentView() {
    const viewConfig = VIEWS[this.currentView];
    if (viewConfig) {
      const container = document.getElementById(viewConfig.containerId);
      if (container && container.classList.contains('active')) {
        viewConfig.render(container, this.router);
      }
    }
  }

  updateDbStatus() {
    const statusEl = document.getElementById('dbStatusText');
    const pillEl = document.getElementById('dbStatusPill');
    if (!statusEl || !pillEl) return;

    const workers = store.getWorkers();
    const rates = store.getRates();

    if (store.backendConnected) {
      pillEl.className = 'db-status-pill online';
      statusEl.textContent = `Neon DB: ${workers.length} colab · ${rates.length} tarifas`;
      pillEl.title = `Conectado a Neon PostgreSQL (${workers.length} colaboradores, ${rates.length} tarifas en BD)`;
    } else {
      pillEl.className = 'db-status-pill offline';
      statusEl.textContent = `Modo local (${workers.length} colab)`;
      pillEl.title = 'Modo local o sincronizando con Neon DB...';
    }
  }

  navigateTo(viewName) {
    const viewConfig = VIEWS[viewName];
    if (!viewConfig) {
      console.warn(`Vista desconocida: "${viewName}"`);
      return;
    }

    this.currentView = viewName;
    setActiveNavItem(viewName);

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const container = document.getElementById(viewConfig.containerId);
    if (container) {
      container.classList.add('active');
      viewConfig.render(container, this.router);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  app.init();
  await store.ready;
  app.renderCurrentView();
  app.updateDbStatus();
});

