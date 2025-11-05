document.addEventListener('DOMContentLoaded', () => {
  const requestForm = document.getElementById('requestResetForm');
  const confirmForm = document.getElementById('confirmResetForm');
  const requestFeedback = document.getElementById('resetRequestFeedback');
  const confirmFeedback = document.getElementById('resetConfirmFeedback');

  if (requestForm) {
    requestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      requestFeedback.innerHTML = '';
      try {
        const response = await apiRequest('forgotPassword', { email: document.getElementById('resetEmail').value.trim() });
        if (!response.ok) throw new Error(response.error || 'Unable to process request');
        requestFeedback.innerHTML = '<div class="alert alert-success">If the email exists, a reset code has been sent.</div>';
      } catch (error) {
        console.error(error);
        requestFeedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      }
    });
  }

  if (confirmForm) {
    confirmForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      confirmFeedback.innerHTML = '';
      try {
        const response = await apiRequest('resetPassword', {
          email: document.getElementById('resetEmail').value.trim(),
          resetCode: document.getElementById('resetCode').value.trim(),
          newPassword: document.getElementById('newPassword').value
        });
        if (!response.ok) throw new Error(response.error || 'Unable to reset password');
        confirmFeedback.innerHTML = `<div class="alert alert-success">${response.message}</div>`;
      } catch (error) {
        console.error(error);
        confirmFeedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      }
    });
  }
});
