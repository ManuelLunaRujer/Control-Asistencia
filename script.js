const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlje0qgvWbZ7RyHHRADmPSNeLzfW4AU1HgR6w8ymhjl31J8fzsQjNH0SQPasLSFUPJ/exec';
const ADMIN_PERMISSION_CODE = 'UsuarioAMVD';

const userSelect = document.querySelector('#user-select');
const saveUserButton = document.querySelector('#save-user');
const welcomePanel = document.querySelector('#welcome-panel');
const userPanel = document.querySelector('#user-panel');
const userName = document.querySelector('#user-name');
const registerButton = document.querySelector('#register-attendance');
const changeUserButton = document.querySelector('#change-user');
const feedback = document.querySelector('#feedback');
const historyFeedback = document.querySelector('#history-feedback');
const historyBody = document.querySelector('#history-body');
const emptyHistory = document.querySelector('#empty-history');
const refreshHistoryButton = document.querySelector('#refresh-history');
const tabs = document.querySelectorAll('.tab');
const views = {
  checkIn: document.querySelector('#check-in-view'),
  history: document.querySelector('#history-view')
};

function getSavedUser() {
  return localStorage.getItem('band_user');
}

function renderUserState() {
  const savedUser = getSavedUser();
  const hasUser = Boolean(savedUser);

  welcomePanel.hidden = hasUser;
  userPanel.hidden = !hasUser;

  if (hasUser) {
    userName.textContent = savedUser;
    userSelect.value = savedUser;
  } else {
    userSelect.value = '';
  }
}

function showFeedback(element, message, type) {
  element.textContent = message;
  element.className = `feedback ${type}`;
}

function clearFeedback(element) {
  element.textContent = '';
  element.className = 'feedback';
}

function saveUser() {
  const selectedUser = userSelect.value;
  if (!selectedUser) {
    showFeedback(feedback, 'Selecciona tu usuario para continuar.', 'error');
    return;
  }

  localStorage.setItem('band_user', selectedUser);
  clearFeedback(feedback);
  renderUserState();
}

async function registerAttendance() {
  const savedUser = localStorage.getItem('band_user');
  if (!savedUser) {
    renderUserState();
    return;
  }

  registerButton.disabled = true;
  registerButton.setAttribute('aria-busy', 'true');
  clearFeedback(feedback);

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: savedUser })
    });
    showFeedback(feedback, '¡Asistencia registrada con éxito!', 'success');
    window.setTimeout(() => clearFeedback(feedback), 4000);
  } catch (error) {
    showFeedback(feedback, 'No se pudo registrar la asistencia. Inténtalo de nuevo.', 'error');
  } finally {
    registerButton.disabled = false;
    registerButton.removeAttribute('aria-busy');
  }
}

function normaliseRecord(record) {
  return {
    fecha: record.Fecha ?? record.fecha ?? record.date ?? '',
    nombre: record.Nombre ?? record.nombre ?? record.name ?? '',
    hora: record.Hora ?? record.hora ?? record.time ?? ''
  };
}

function renderHistory(records) {
  const rows = records.map(normaliseRecord).sort((first, second) => {
    const firstDate = new Date(`${first.fecha} ${first.hora}`).getTime();
    const secondDate = new Date(`${second.fecha} ${second.hora}`).getTime();
    return Number.isNaN(secondDate - firstDate) ? 0 : secondDate - firstDate;
  });

  historyBody.replaceChildren();
  emptyHistory.hidden = rows.length > 0;

  rows.forEach((record) => {
    const row = document.createElement('tr');
    [record.fecha, record.nombre, record.hora].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    historyBody.appendChild(row);
  });
}

async function loadHistory() {
  historyBody.replaceChildren();
  emptyHistory.hidden = true;
  showFeedback(historyFeedback, 'Cargando historial...', '');

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'GET' });
    if (!response.ok) throw new Error('La respuesta no fue válida.');
    const data = await response.json();
    const records = Array.isArray(data) ? data : (Array.isArray(data.registros) ? data.registros : []);
    renderHistory(records);
    clearFeedback(historyFeedback);
  } catch (error) {
    showFeedback(historyFeedback, 'No se pudo cargar el historial. Revisa la URL del webhook.', 'error');
    emptyHistory.hidden = false;
    emptyHistory.textContent = 'No hay datos disponibles en este momento.';
  }
}

function switchView(viewName) {
  const isHistory = viewName === 'history';
  views.checkIn.hidden = isHistory;
  views.history.hidden = !isHistory;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.view === (isHistory ? 'history' : 'check-in');
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  if (isHistory) loadHistory();
}

saveUserButton.addEventListener('click', saveUser);
registerButton.addEventListener('click', registerAttendance);
refreshHistoryButton.addEventListener('click', loadHistory);
changeUserButton.addEventListener('click', () => {
  const permissionCode = window.prompt('Introduce el código de administrador para cambiar de usuario:');
  if (permissionCode !== ADMIN_PERMISSION_CODE) {
    showFeedback(feedback, 'Cambio de usuario no autorizado.', 'error');
    return;
  }

  localStorage.removeItem('band_user');
  clearFeedback(feedback);
  renderUserState();
  userSelect.focus();
});
tabs.forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));

renderUserState();
