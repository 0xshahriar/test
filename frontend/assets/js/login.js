document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const feedback = document.getElementById('loginFeedback');
  const limiter = createClientRateLimiter('login', 5, 5 * 60 * 1000);
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
      setStoredSession({ token: response.token, expiry: response.expiry, role: response.role, name: response.name });
      limiter.recordSuccess();
      window.location.href = 'index.html';
    } catch (error) {
      console.error(error);
      limiter.recordFailure();
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
});
