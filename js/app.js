import { initSidebar, setActiveNavItem } from './components/sidebar.js';
import { renderResumenView } from './modules/resumen/resumen.module.js';
import { renderRegistroView } from './modules/registro/registro.module.js';
import { renderTrabajadoresView } from './modules/trabajadores/trabajadores.module.js';
import { renderTarifarioView } from './modules/tarifario/tarifario.module.js';
import { renderLiquidacionView } from './modules/liquidacion/liquidacion.module.js';
import { renderReportesView } from './modules/reportes/reportes.module.js';

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

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
