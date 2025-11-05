document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const feedback = document.getElementById('contactFeedback');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      subject: document.getElementById('contactSubject').value.trim(),
      message: document.getElementById('contactMessage').value.trim()
    };
    try {
      const response = await apiRequest('submitContact', data);
      if (!response.ok) throw new Error(response.error || 'Submission failed');
      feedback.innerHTML = '<div class="alert alert-success">Thank you! We will be in touch soon.</div>';
      form.reset();
    } catch (error) {
      console.error(error);
      feedback.innerHTML = '<div class="alert alert-danger">We could not send your message. Please try again.</div>';
    }
  });
});
