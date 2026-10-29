export function initSidebar({ onNavigate }) {
  const mainnav = document.getElementById('mainnav');
  const themeToggle = document.getElementById('themeToggle');

  if (mainnav) {
    mainnav.addEventListener('click', (e) => {
      const btn = e.target.closest('.navitem');
      if (btn && btn.dataset.view) {
        onNavigate(btn.dataset.view);
      }
    });
  }

  initTheme(themeToggle);
}

export function setActiveNavItem(viewName) {
  const buttons = document.querySelectorAll('#mainnav .navitem');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
}

function initTheme(toggleBtn) {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('destajo_theme');
  } catch (e) { }

  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  updateThemeButton(toggleBtn);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = cur ? cur === 'dark' : prefersDark;
      const nextTheme = isDark ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', nextTheme);
      try {
        localStorage.setItem('destajo_theme', nextTheme);
      } catch (e) { }

      updateThemeButton(toggleBtn);
    });
  }
}

function updateThemeButton(toggleBtn) {
  if (!toggleBtn) return;
  const cur = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = cur ? cur === 'dark' : prefersDark;
  toggleBtn.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
}
