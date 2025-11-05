document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const feedback = document.getElementById('loginFeedback');
  const limiter = createClientRateLimiter('login', 5, 5 * 60 * 1000);
  const params = new URLSearchParams(window.location.search);
  const nextParam = params.get('next');

  if (nextParam) {
    document.querySelectorAll('[data-forward-signup]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), window.location.href);
      url.searchParams.set('next', nextParam);
      link.setAttribute('href', url.toString());
    });
  }

  function getSafeRedirect() {
    if (!nextParam) {
      return 'index.html';
    }
    if (/^https?:/i.test(nextParam) || nextParam.startsWith('//')) {
      return 'index.html';
    }
    return nextParam.startsWith('/') ? nextParam : `/${nextParam}`;
  }

  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.innerHTML = '';
    if (!limiter.canAttempt()) {
      const wait = formatRateLimitDuration(limiter.getRemainingMs());
      feedback.innerHTML = `<div class="alert alert-warning">Too many login attempts. Please wait ${wait} before trying again.</div>`;
      return;
    }
    try {
      const response = await apiRequest('login', {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      });
      if (!response.ok) throw new Error(response.error || 'Unable to login');
      setStoredSession({
        token: response.token,
        expiry: response.expiry,
        role: response.role,
        name: response.name,
        email: response.email
      });
      limiter.recordSuccess();
      window.location.href = getSafeRedirect();
    } catch (error) {
      console.error(error);
      limiter.recordFailure();
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
});
