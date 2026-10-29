const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let pythonProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_HOST = '127.0.0.1';
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

// Liberar puerto en Windows de forma síncrona
function freePort(port) {
  if (process.platform === 'win32') {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore', timeout: 3000 }
      );
    } catch (e) {}
  }
}

// Verificar si el backend ya responde en el puerto 8000
function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Esperar a que el backend esté listo
async function waitForBackend(maxRetries = 35) {
  for (let i = 0; i < maxRetries; i++) {
    const ok = await checkBackendHealth();
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// Iniciar servidor Python FastAPI
async function startPythonBackend() {
  const isAlreadyRunning = await checkBackendHealth();
  if (isAlreadyRunning) {
    console.log('[Electron] El backend FastAPI ya está activo en el puerto', BACKEND_PORT);
    return;
  }

  // Asegurar que el puerto esté libre antes de iniciar
  freePort(BACKEND_PORT);

  const backendDir = path.join(__dirname, 'BACKEND');
  console.log('[Electron] Levantando backend FastAPI desde:', backendDir);

  pythonProcess = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', BACKEND_HOST, '--port', String(BACKEND_PORT)], {
    cwd: backendDir,
    shell: true,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Err]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Electron] Proceso de Python finalizó con código: ${code}`);
  });
}

// Matar proceso de Python de forma limpia y síncrona al salir
function killPythonBackend() {
  console.log('[Electron] Cerrando backend FastAPI...');
  if (process.platform === 'win32') {
    if (pythonProcess && pythonProcess.pid) {
      try {
        execSync(`taskkill /pid ${pythonProcess.pid} /t /f`, { stdio: 'ignore' });
      } catch (e) {}
    }
    freePort(BACKEND_PORT);
  } else if (pythonProcess) {
    try {
      pythonProcess.kill('SIGINT');
    } catch (e) {}
  }
  pythonProcess = null;
}

// Crear la ventana principal de escritorio
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'Sistema de Cobranza a Colaboradores — VALER E.I.R.L',
    backgroundColor: '#EBE5D8',
    autoHideMenuBar: true,
    show: false, // Esperar a ready-to-show para evitar parpadeos blancos
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: false
    }
  });

  // Manejador para exportar PDF de forma nativa sin pasar por diálogo de impresión ni capturas de pantalla
  ipcMain.handle('export-pdf-native', async (event, { html, defaultName, landscape = false, pageSize = 'A4' }) => {
    let pdfWindow = null;
    try {
      pdfWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        landscape: !!landscape,
        pageSize: pageSize || 'A4',
        printBackground: true,
        margins: {
          marginType: 'custom',
          top: 0.35,
          bottom: 0.35,
          left: 0.35,
          right: 0.35
        }
      });

      pdfWindow.close();
      pdfWindow = null;

      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Reporte en PDF — VALER E.I.R.L',
        defaultPath: defaultName || 'reporte.pdf',
        filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, filePath };
    } catch (err) {
      if (pdfWindow) {
        try { pdfWindow.close(); } catch (e) {}
      }
      console.error('[Electron] Error al generar PDF:', err);
      return { success: false, error: err.message };
    }
  });

  mainWindow.loadURL(BACKEND_URL);

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      // Abre las herramientas de desarrollador (DevTools) en una ventana secundaria independiente
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Permitir alternar DevTools en cualquier momento con F12 o Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Abrir links externos en el navegador predeterminado
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes(`127.0.0.1:${BACKEND_PORT}`) && !url.includes(`localhost:${BACKEND_PORT}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ciclo de vida de Electron
app.whenReady().then(async () => {
  await startPythonBackend();
  const ready = await waitForBackend();

  if (!ready) {
    dialog.showErrorBox(
      'Error al iniciar el Servidor',
      'No se pudo conectar con el backend de Python en http://127.0.0.1:8000.\nPor favor verifica que Python y sus dependencias estén instaladas.'
    );
  }

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  killPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  killPythonBackend();
});
