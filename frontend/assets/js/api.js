const API_BASE_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('tt_session'));
  } catch (e) {
    return null;
  }
}

function setStoredSession(session) {
  if (!session) {
    localStorage.removeItem('tt_session');
    return;
  }
  localStorage.setItem('tt_session', JSON.stringify(session));
}

function getAuthToken() {
  const session = getStoredSession();
  if (!session) return null;
  if (session.expiry && new Date(session.expiry).getTime() < Date.now()) {
    setStoredSession(null);
    return null;
  }
  return session.token;
}

async function apiRequest(action, data = {}, method = 'POST') {
  const payload = Object.assign({}, data, { action });
  const token = getAuthToken();
  if (token && !payload.token) {
    payload.token = token;
  }
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (method === 'GET') {
    const query = new URLSearchParams(payload);
    const response = await fetch(`${API_BASE_URL}?${query.toString()}`);
    return response.json();
  }
  options.body = JSON.stringify(payload);
  const response = await fetch(API_BASE_URL, options);
  return response.json();
}

function requireAuth(allowedRoles = []) {
  const session = getStoredSession();
  const isAdminRoute = window.location.pathname.includes('/admin/');
  if (!session || (allowedRoles.length && !allowedRoles.includes(session.role))) {
    window.location.href = isAdminRoute ? '../admin/login.html' : 'login.html';
  }
  return session;
}

function logout() {
  setStoredSession(null);
  const isAdminRoute = window.location.pathname.includes('/admin/');
  window.location.href = isAdminRoute ? '../index.html' : 'index.html';
}

function updateAuthUI() {
  const session = getStoredSession();
  const authLinks = document.querySelectorAll('[data-auth-link]');
  authLinks.forEach((el) => {
    if (session) {
      if (el.dataset.authLink === 'logout') {
        el.classList.remove('d-none');
        el.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
        });
      } else if (el.dataset.authLink === 'dashboard') {
        if (session.role === 'admin') {
          el.classList.remove('d-none');
        } else {
          el.classList.add('d-none');
        }
      } else {
        el.classList.add('d-none');
      }
    } else {
      if (el.dataset.authLink === 'logout' || el.dataset.authLink === 'dashboard') {
        el.classList.add('d-none');
      } else {
        el.classList.remove('d-none');
      }
    }
  });
  const userName = document.querySelector('[data-user-name]');
  if (userName) {
    if (session) {
      userName.textContent = session.name ? `Welcome, ${session.name}` : 'Welcome back';
      userName.classList.remove('d-none');
    } else {
      userName.classList.add('d-none');
    }
  }

  const currentYear = new Date().getFullYear();
  document.querySelectorAll('.current-year').forEach((el) => {
    el.textContent = currentYear;
  });
}

document.addEventListener('DOMContentLoaded', updateAuthUI);
