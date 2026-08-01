const tableContainer = document.querySelector('.table-container');
const table = document.querySelector('#requests-table');
const tableBody = document.querySelector('#requests-table tbody');
const message = document.querySelector('#requests-message');
const searchInput = document.querySelector('#requests-search');
const sortButtons = document.querySelectorAll('.sort-button');
const columns = table.querySelectorAll('col');

let requests = [];
let sortKey = 'startDate';
let sortDirection = 'desc';

function resizeColumn(columnIndex, width) {
  const minimumWidth = 100;
  const currentWidths = Array.from(columns, (column) => column.getBoundingClientRect().width);
  currentWidths[columnIndex] = Math.max(minimumWidth, width);

  currentWidths.forEach((columnWidth, index) => {
    columns[index].style.width = `${columnWidth}px`;
  });

  table.style.width = `${Math.max(tableContainer.clientWidth, currentWidths.reduce((sum, value) => sum + value, 0))}px`;
}

table.querySelectorAll('th').forEach((header, columnIndex) => {
  const handle = document.createElement('span');
  handle.className = 'column-resizer';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', `Resize ${header.textContent.trim()} column`);

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = columns[columnIndex].getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing-column');

    const onPointerMove = (moveEvent) => {
      resizeColumn(columnIndex, startWidth + moveEvent.clientX - startX);
    };

    const onPointerUp = () => {
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
      document.body.classList.remove('resizing-column');
    };

    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  });

  handle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const step = event.shiftKey ? 25 : 10;
    resizeColumn(columnIndex, columns[columnIndex].getBoundingClientRect().width + direction * step);
  });

  header.appendChild(handle);
});

function formatDate(value) {
  if (!value) return '';

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-');
  return `${month}/${day}/${year}`;
}

async function deleteRequest(request, button) {
  if (!window.confirm(`Delete the travel request for "${request.reason}"?`)) return;

  button.disabled = true;
  message.textContent = 'Deleting travel request...';

  try {
    const response = await fetch(`/api/travel-requests/${encodeURIComponent(request.id)}`, {
      method: 'DELETE',
    });
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error('The server returned an unexpected response.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Could not delete the travel request.');
    }

    requests = requests.filter((item) => item.id !== request.id);
    tableContainer.hidden = requests.length === 0;
    renderRequests();
  } catch (error) {
    console.error('[Travel Requests] Could not delete request:', error);
    message.textContent = error.message || 'Could not delete the travel request.';
    button.disabled = false;
  }
}

function renderRequests() {
  const searchTerm = searchInput.value.trim().toLocaleLowerCase();
  const filteredRequests = requests.filter((request) => {
    const values = [
      request.reason,
      formatDate(request.startDate),
      formatDate(request.endDate),
      request.status,
    ];

    return values.some((value) => String(value ?? '').toLocaleLowerCase().includes(searchTerm));
  });

  const sortedRequests = filteredRequests.sort((first, second) => {
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

    const actionsCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.title = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete travel request for ${request.reason}`);
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="m6.5 7 1 13h9l1-13" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    `;
    deleteButton.addEventListener('click', () => deleteRequest(request, deleteButton));
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

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

  if (requests.length === 0) {
    message.textContent = 'No travel requests have been submitted.';
  } else {
    message.textContent =
      filteredRequests.length === 0 ? 'No requests match your search.' : '';
  }
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

searchInput.addEventListener('input', renderRequests);

async function loadRequests() {
  console.log('[Travel Requests] Requesting GET /api/travel-requests...');

  try {
    const response = await fetch('/api/travel-requests');
    const contentType = response.headers.get('content-type') || '';

    console.log('[Travel Requests] API response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
    });

    if (!contentType.includes('application/json')) {
      throw new Error(
        response.status === 404
          ? 'The requests API is unavailable. Restart or redeploy the web server.'
          : 'The server returned an unexpected response.',
      );
    }

    const result = await response.json();

    console.log('[Travel Requests] API response body:', result);

    if (!response.ok) {
      const diagnosticDetails = [result.errorCode, result.diagnosticId]
        .filter(Boolean)
        .join(' / ');
      throw new Error(
        `${result.message || 'Could not load requests.'}${
          diagnosticDetails ? ` (${diagnosticDetails})` : ''
        }`,
      );
    }

    requests = result;
    message.textContent = requests.length === 0 ? 'No travel requests have been submitted.' : '';
    tableContainer.hidden = requests.length === 0;
    renderRequests();
  } catch (error) {
    console.error('[Travel Requests] Could not load requests:', error);
    message.textContent = error.message || 'Could not load requests.';
  }
}

loadRequests();
