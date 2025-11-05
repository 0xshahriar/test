document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const feedback = document.getElementById('loginFeedback');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.innerHTML = '';
    try {
      const response = await apiRequest('login', {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      });
      if (!response.ok) throw new Error(response.error || 'Unable to login');
      setStoredSession({ token: response.token, expiry: response.expiry, role: response.role, name: response.name });
      window.location.href = 'index.html';
    } catch (error) {
      console.error(error);
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  });
});
