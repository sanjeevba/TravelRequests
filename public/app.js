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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  message.textContent = 'Request captured.';
});
