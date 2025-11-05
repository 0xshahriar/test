document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const feedback = document.getElementById('adminLoginFeedback');
  const limiter = createClientRateLimiter('adminLogin', 5, 5 * 60 * 1000);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.innerHTML = '';
    if (!limiter.canAttempt()) {
      const wait = formatRateLimitDuration(limiter.getRemainingMs());
      feedback.innerHTML = `<div class="alert alert-warning">Too many admin login attempts. Please wait ${wait} before trying again.</div>`;
      return;
    }
    try {
      const response = await apiRequest('adminLogin', {
        email: document.getElementById('adminLoginEmail').value.trim(),
        password: document.getElementById('adminLoginPassword').value
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
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      limiter.recordFailure();
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
});
