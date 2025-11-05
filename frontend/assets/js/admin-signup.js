let adminPendingEmail = null;

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('adminSignupForm');
  const signupFeedback = document.getElementById('adminSignupFeedback');
  const verifySection = document.getElementById('adminVerificationSection');
  const verifyEmail = document.getElementById('adminVerifyEmail');
  const verifyForm = document.getElementById('adminVerifyForm');
  const verifyFeedback = document.getElementById('adminVerifyFeedback');
  const limiter = createClientRateLimiter('adminSignup', 5, 60 * 60 * 1000);

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      signupFeedback.innerHTML = '';
      if (!limiter.canAttempt()) {
        const wait = formatRateLimitDuration(limiter.getRemainingMs());
        signupFeedback.innerHTML = `<div class="alert alert-warning">Too many admin signup attempts. Please wait ${wait} before trying again.</div>`;
        return;
      }
      try {
        const email = document.getElementById('adminSignupEmail').value.trim().toLowerCase();
        if (!/@gmail\.com$/i.test(email)) {
          signupFeedback.innerHTML = '<div class="alert alert-warning">Admin registration requires a Gmail address.</div>';
          return;
        }
        const response = await apiRequest('adminSignup', {
          name: document.getElementById('adminSignupName').value.trim(),
          email,
          password: document.getElementById('adminSignupPassword').value,
          adminCode: document.getElementById('adminSignupCode').value.trim()
        });
        if (!response.ok) throw new Error(response.error || 'Unable to submit request');
        signupFeedback.innerHTML = `<div class="alert alert-success">${response.message}</div>`;
        verifySection.classList.remove('d-none');
        adminPendingEmail = email;
        verifyEmail.textContent = email;
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
          email: adminPendingEmail || document.getElementById('adminSignupEmail').value.trim(),
          code: document.getElementById('adminVerifyCode').value.trim()
        });
        if (!response.ok) throw new Error(response.error || 'Unable to verify');
        verifyFeedback.innerHTML = `<div class="alert alert-success">${response.message}</div>`;
        setTimeout(() => (window.location.href = 'login.html'), 1500);
      } catch (error) {
        console.error(error);
        verifyFeedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      }
    });
  }
});
