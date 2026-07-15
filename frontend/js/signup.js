const form = document.getElementById('signup-form');
  const errorBox = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  // If already signed in, skip straight to the app.
  fetch('/api/auth/me', { credentials: 'include' })
    .then(r => r.ok ? window.location.href = 'app.html' : null)
    .catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // send/receive the session cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create account.');
      window.location.href = 'app.html';
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });