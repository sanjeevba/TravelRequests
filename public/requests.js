const tableContainer = document.querySelector('.table-container');
const tableBody = document.querySelector('#requests-table tbody');
const message = document.querySelector('#requests-message');
const sortButtons = document.querySelectorAll('.sort-button');

let requests = [];
let sortKey = 'startDate';
let sortDirection = 'desc';

function formatDate(value) {
  if (!value) return '';

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-');
  return `${month}/${day}/${year}`;
}

function renderRequests() {
  const sortedRequests = [...requests].sort((first, second) => {
    const firstValue = first[sortKey] ?? '';
    const secondValue = second[sortKey] ?? '';
    const comparison = String(firstValue).localeCompare(String(secondValue), undefined, {
      sensitivity: 'base',
    });
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  tableBody.replaceChildren();

  sortedRequests.forEach((request) => {
    const row = document.createElement('tr');
    const values = [
      request.reason,
      formatDate(request.startDate),
      formatDate(request.endDate),
      request.status,
    ];

    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value ?? '';
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  sortButtons.forEach((button) => {
    const isActive = button.dataset.key === sortKey;
    button.classList.toggle('active-sort', isActive);
    button.setAttribute(
      'aria-sort',
      isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    );
  });
}

sortButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedKey = button.dataset.key;

    if (sortKey === selectedKey) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = selectedKey;
      sortDirection = 'asc';
    }

    renderRequests();
  });
});

async function loadRequests() {
  try {
    const response = await fetch('/api/travel-requests');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Could not load requests.');
    }

    requests = result;
    message.textContent = requests.length === 0 ? 'No travel requests have been submitted.' : '';
    tableContainer.hidden = requests.length === 0;
    renderRequests();
  } catch (error) {
    message.textContent = error.message || 'Could not load requests.';
  }
}

loadRequests();
