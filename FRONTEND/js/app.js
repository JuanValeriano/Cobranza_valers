import { store } from './state/store.js?v=6';
import { initSidebar, setActiveNavItem } from './components/sidebar.js?v=6';
import { renderResumenView } from './modules/resumen/resumen.module.js?v=6';
import { renderRegistroView } from './modules/registro/registro.module.js?v=6';
import { renderTrabajadoresView } from './modules/trabajadores/trabajadores.module.js?v=6';
import { renderTarifarioView } from './modules/tarifario/tarifario.module.js?v=6';
import { renderLiquidacionView } from './modules/liquidacion/liquidacion.module.js?v=6';
import { renderReportesView } from './modules/reportes/reportes.module.js?v=6';
import { showToast } from './components/toast.js?v=6';

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
    this.isSyncingDb = false;
    this.router = {
      navigateTo: (viewName) => this.navigateTo(viewName)
    };
  }

  init() {
    initSidebar({
      onNavigate: (viewName) => this.navigateTo(viewName)
    });

    const pillEl = document.getElementById('dbStatusPill');
    if (pillEl) {
      pillEl.addEventListener('click', () => {
        showToast('Consultando base de datos Neon...');
        this.syncDatabase();
      });
    }

    window.addEventListener('focus', () => {
      this.syncDatabase();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncDatabase();
      }
    });

    this.navigateTo('resumen');

    store.subscribe(() => {
      this.renderCurrentView();
      if (!this.isSyncingDb) {
        this.updateDbStatus();
      }
    });
  }

  renderCurrentView() {
    const viewConfig = VIEWS[this.currentView];
    if (viewConfig) {
      const container = document.getElementById(viewConfig.containerId);
      if (container && container.classList.contains('active')) {
        const activeEl = document.activeElement;
        const isEditing = activeEl && container.contains(activeEl) &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (isEditing) {
          activeEl.addEventListener('blur', () => {
            viewConfig.render(container, this.router);
          }, { once: true });
          return;
        }

        viewConfig.render(container, this.router);
      }
    }
  }

  setSyncingStatus(isSyncing) {
    this.isSyncingDb = isSyncing;
    const statusEl = document.getElementById('dbStatusText');
    const pillEl = document.getElementById('dbStatusPill');
    if (!statusEl || !pillEl) return;

    if (isSyncing) {
      pillEl.className = 'db-status-pill syncing';
      statusEl.textContent = 'Consultando Neon DB...';
      pillEl.title = 'Obteniendo los últimos cambios de la base de datos...';
    } else {
      this.updateDbStatus();
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
      pillEl.title = `Conectado a Neon PostgreSQL (${workers.length} colaboradores, ${rates.length} tarifas en BD). Clic para sincronizar.`;
    } else {
      pillEl.className = 'db-status-pill offline';
      statusEl.textContent = `Modo local (${workers.length} colab)`;
      pillEl.title = 'Modo local o reconectando a Neon DB... Clic para reintentar.';
    }
  }

  async syncDatabase() {
    this.setSyncingStatus(true);
    try {
      await store.syncWithBackend();
    } catch (e) {
      console.warn('[App] Error al consultar la BD:', e);
    } finally {
      this.setSyncingStatus(false);
    }
  }

  async navigateTo(viewName) {
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

    await this.syncDatabase();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  app.init();
  await store.ready;
  app.renderCurrentView();
  app.updateDbStatus();
});

