const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwuUymijz8BmBB-8jhSOmlDdGWAu1rn-iraiQTCmFiDrtbbwT8ob5BROA9ThUMh2ii3/exec';

function parseDateTime(value) {
  if (!value) return null;
  const trimmed = value.toString().trim();
  const parts = trimmed.split(/[-\s:]/);
  if (parts.length >= 3 && parts[0].length <= 2 && parts[1].length <= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
    const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
    const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
    if ([day, month, year, hour, minute, second].some((num) => Number.isNaN(num))) {
      return null;
    }
    const parsed = new Date(year, month, day, hour, minute, second);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

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
  if (session.expiry) {
    const expiryDate = parseDateTime(session.expiry);
    if (expiryDate && expiryDate.getTime() < Date.now()) {
      setStoredSession(null);
      return null;
    }
    if (!expiryDate) {
      setStoredSession(null);
      return null;
    }
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
  if (!session) {
    const loginUrl = new URL(isAdminRoute ? '../admin/login.html' : 'login.html', window.location.href);
    if (!isAdminRoute) {
      const nextPath = window.location.pathname + window.location.search;
      if (nextPath) {
        loginUrl.searchParams.set('next', nextPath);
      }
    }
    window.location.href = loginUrl.toString();
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    const fallback = isAdminRoute ? '../index.html' : 'index.html';
    window.location.href = fallback;
    return null;
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
        el.classList.toggle('d-none', session.role !== 'admin');
      } else if (el.dataset.authLink === 'account') {
        el.classList.toggle('d-none', session.role !== 'customer');
      } else {
        el.classList.add('d-none');
      }
    } else {
      if (el.dataset.authLink === 'logout' || el.dataset.authLink === 'dashboard' || el.dataset.authLink === 'account') {
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
