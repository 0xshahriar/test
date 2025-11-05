let pendingEmail = null;

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const signupFeedback = document.getElementById('signupFeedback');
  const verifySection = document.getElementById('verificationSection');
  const verifyEmail = document.getElementById('verifyEmail');
  const verifyForm = document.getElementById('verifyForm');
  const verifyFeedback = document.getElementById('verifyFeedback');
  const limiter = createClientRateLimiter('signup', 5, 60 * 60 * 1000);
  const params = new URLSearchParams(window.location.search);
  const nextParam = params.get('next');

  if (nextParam) {
    document.querySelectorAll('[data-forward-login]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), window.location.href);
      url.searchParams.set('next', nextParam);
      link.setAttribute('href', url.toString());
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      signupFeedback.innerHTML = '';
      if (!limiter.canAttempt()) {
        const wait = formatRateLimitDuration(limiter.getRemainingMs());
        signupFeedback.innerHTML = `<div class="alert alert-warning">Too many signup attempts. Please wait ${wait} before trying again.</div>`;
        return;
      }
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirm').value;
      if (password !== confirm) {
        signupFeedback.innerHTML = '<div class="alert alert-warning">Passwords do not match.</div>';
        return;
      }
      const email = document.getElementById('signupEmail').value.trim().toLowerCase();
      if (!/@gmail\.com$/i.test(email)) {
        signupFeedback.innerHTML = '<div class="alert alert-warning">A Gmail address is required to create an account.</div>';
        return;
      }
      try {
        const response = await apiRequest('signup', {
          name: document.getElementById('signupName').value.trim(),
          email,
          password
        });
        if (!response.ok) throw new Error(response.error || 'Unable to sign up');
        signupFeedback.innerHTML = `<div class="alert alert-success">${response.message}</div>`;
        pendingEmail = email;
        verifyEmail.textContent = email;
        verifySection.classList.remove('d-none');
        limiter.recordSuccess();
      } catch (error) {
        console.error(error);
        limiter.recordFailure();
        signupFeedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      }
    });
  }

  if (verifyForm) {
    verifyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      verifyFeedback.innerHTML = '';
      try {
        const response = await apiRequest('verifyEmail', {
          email: pendingEmail || document.getElementById('signupEmail').value.trim(),
          code: document.getElementById('verifyCode').value.trim()
        });
        if (!response.ok) throw new Error(response.error || 'Unable to verify');
        verifyFeedback.innerHTML = `<div class="alert alert-success">${response.message}</div>`;
        const loginUrl = new URL('login.html', window.location.href);
        if (nextParam) {
          loginUrl.searchParams.set('next', nextParam);
        }
        setTimeout(() => (window.location.href = loginUrl.toString()), 1500);
      } catch (error) {
        console.error(error);
        verifyFeedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      }
    });
  }
});
