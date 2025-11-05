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

function getDeviceId() {
  try {
    let deviceId = localStorage.getItem('tt_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : `tt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem('tt_device_id', deviceId);
    }
    return deviceId;
  } catch (error) {
    return 'anonymous';
  }
}

function createClientRateLimiter(key, limit, windowMs) {
  const storageKey = `tt_rl_${key}`;

  function readState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.attempts !== 'number' || typeof data.firstAttempt !== 'number') {
        return null;
      }
      return data;
    } catch (error) {
      return null;
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // Ignore storage errors (e.g., private browsing)
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore storage errors
    }
  }

  return {
    canAttempt() {
      const state = readState();
      if (!state) return true;
      const now = Date.now();
      if (now - state.firstAttempt > windowMs) {
        clearState();
        return true;
      }
      return state.attempts < limit;
    },
    recordFailure() {
      const now = Date.now();
      const state = readState();
      if (!state || now - state.firstAttempt > windowMs) {
        writeState({ attempts: 1, firstAttempt: now });
      } else {
        state.attempts += 1;
        writeState(state);
      }
    },
    recordSuccess() {
      clearState();
    },
    getRemainingMs() {
      const state = readState();
      if (!state) return 0;
      const remaining = windowMs - (Date.now() - state.firstAttempt);
      return remaining > 0 ? remaining : 0;
    }
  };
}

function formatRateLimitDuration(ms) {
  if (!ms || ms <= 0) {
    return 'a moment';
  }
  const seconds = Math.ceil(ms / 1000);
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

async function apiRequest(action, data = {}, method = 'POST') {
  const payload = Object.assign({}, data, { action });
  if (!payload.deviceId) {
    payload.deviceId = getDeviceId();
  }
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
