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
  message.textContent = 'Submitting travel request...';

  try {
    const formData = new FormData(form);
    const response = await fetch('/api/travel-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: formData.get('reason'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Submission failed.');
    }

    form.reset();
    endDate.min = '';
    message.textContent = result.message;
  } catch (error) {
    message.textContent = error.message || 'Travel request submission failed.';
  } finally {
    submitButton.disabled = false;
  }
});
