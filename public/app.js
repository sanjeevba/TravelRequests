const form = document.querySelector('#travel-request-form');
const message = document.querySelector('#form-message');
const startDate = document.querySelector('#start-date');
const endDate = document.querySelector('#end-date');

startDate.addEventListener('change', () => {
  endDate.min = startDate.value;

  if (endDate.value && endDate.value < startDate.value) {
    endDate.value = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  message.textContent = 'Testing database connection...';

  try {
    const response = await fetch('/api/test-database', { method: 'POST' });
    const result = await response.json();

    if (!response.ok || !result.connected) {
      throw new Error(result.message || 'Connection test failed.');
    }

    message.textContent = 'Database connection successful.';
  } catch (error) {
    message.textContent = error.message || 'Database connection failed.';
  } finally {
    submitButton.disabled = false;
  }
});
