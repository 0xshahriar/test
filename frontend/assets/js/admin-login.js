document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const feedback = document.getElementById('adminLoginFeedback');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.innerHTML = '';
    try {
      const response = await apiRequest('adminLogin', {
        email: document.getElementById('adminLoginEmail').value.trim(),
        password: document.getElementById('adminLoginPassword').value
      });
      if (!response.ok) throw new Error(response.error || 'Unable to login');
      setStoredSession({ token: response.token, expiry: response.expiry, role: response.role, name: response.name });
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error(error);
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
});
