import { useEffect, useMemo, useRef, useState } from "react";

const initialColumnWidths = [42, 16, 16, 16, 10];

function Header() {
  return (
    <header className="app-header">
      <div className="brand-icon" aria-hidden="true">
        ✈
      </div>
      <h1>Travel Requests System</h1>
    </header>
  );
}

async function readJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "The requests API is unavailable. Restart or redeploy the web server."
        : "The server returned an unexpected response.",
    );
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || fallbackMessage);
  return result;
}

function NewRequest() {
  const [form, setForm] = useState({ reason: "", startDate: "", endDate: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "startDate" && next.endDate && next.endDate < value)
        next.endDate = "";
      return next;
    });
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Submitting travel request...");

    try {
      const response = await fetch("/api/travel-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await readJsonResponse(response, "Submission failed.");
      setForm({ reason: "", startDate: "", endDate: "" });
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message || "Travel request submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="request-card">
      <h2>New request</h2>
      <form onSubmit={submitRequest}>
        <div className="field field-wide">
          <label htmlFor="reason">Reason for travel</label>
          <textarea
            id="reason"
            name="reason"
            value={form.reason}
            onChange={updateField}
            required
          />
        </div>
        <div className="field field-date">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={updateField}
            required
          />
        </div>
        <div className="field field-date">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            name="endDate"
            type="date"
            min={form.startDate}
            value={form.endDate}
            onChange={updateField}
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
          <a className="button-link" href="/requests">
            My Requests
          </a>
        </div>
        <p className="form-message" role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}

function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8.5 0 1 13h9l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

function ColumnResizer({ index, columns, setColumns, tableRef, label }) {
  function resize(width) {
    const tableWidth = tableRef.current?.getBoundingClientRect().width || 1;
    setColumns((current) => {
      const widths = current.map((value) => (value / 100) * tableWidth);
      const combined = widths[index] + widths[index + 1];
      const minimum = Math.min(100, combined / 2);
      widths[index] = Math.min(Math.max(minimum, width), combined - minimum);
      widths[index + 1] = combined - widths[index];
      return widths.map((value) => (value / tableWidth) * 100);
    });
  }

  function startResize(event) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth =
      (columns[index] / 100) * tableRef.current.getBoundingClientRect().width;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-column");

    const handle = event.currentTarget;
    const move = (moveEvent) => resize(startWidth + moveEvent.clientX - startX);
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      document.body.classList.remove("resizing-column");
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  function resizeWithKeyboard(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const width =
      (columns[index] / 100) * tableRef.current.getBoundingClientRect().width;
    resize(
      width + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 25 : 10),
    );
  }

  return (
    <span
      className="column-resizer"
      tabIndex="0"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      onPointerDown={startResize}
      onKeyDown={resizeWithKeyboard}
    />
  );
}

const columnDefinitions = [
  ["reason", "Reason for Travel"],
  ["startDate", "Start Date"],
  ["endDate", "End Date"],
  ["status", "Request Status"],
];

function RequestsTable() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "startDate", direction: "desc" });
  const [message, setMessage] = useState("Loading requests...");
  const [deletingId, setDeletingId] = useState(null);
  const [columns, setColumns] = useState(initialColumnWidths);
  const tableRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRequests() {
      try {
        const response = await fetch("/api/travel-requests", {
          signal: controller.signal,
        });
        const result = await readJsonResponse(
          response,
          "Could not load requests.",
        );
        setRequests(result);
        setMessage(
          result.length ? "" : "No travel requests have been submitted.",
        );
      } catch (error) {
        if (error.name !== "AbortError")
          setMessage(error.message || "Could not load requests.");
      }
    }
    loadRequests();
    return () => controller.abort();
  }, []);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return requests
      .filter((request) =>
        [
          request.reason,
          formatDate(request.startDate),
          formatDate(request.endDate),
          request.status,
        ].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(term),
        ),
      )
      .toSorted((first, second) => {
        const comparison = String(first[sort.key] ?? "").localeCompare(
          String(second[sort.key] ?? ""),
          undefined,
          { sensitivity: "base" },
        );
        return sort.direction === "asc" ? comparison : -comparison;
      });
  }, [requests, search, sort]);

  function changeSort(key) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  async function deleteRequest(request) {
    if (!window.confirm(`Delete the travel request for "${request.reason}"?`))
      return;
    setDeletingId(request.id);
    setMessage("Deleting travel request…");
    try {
      const response = await fetch(
        `/api/travel-requests/${encodeURIComponent(request.id)}`,
        {
          method: "DELETE",
        },
      );
      await readJsonResponse(response, "Could not delete the travel request.");
      const next = requests.filter((item) => item.id !== request.id);
      setRequests(next);
      setMessage(next.length ? "" : "No travel requests have been submitted.");
    } catch (error) {
      setMessage(error.message || "Could not delete the travel request.");
    } finally {
      setDeletingId(null);
    }
  }

  const statusMessage =
    search && requests.length && !visibleRequests.length
      ? "No requests match your search."
      : message;

  return (
    <main className="request-card">
      <div className="page-heading">
        <h2>My Requests</h2>
        <a className="button-link" href="/">
          New Request
        </a>
      </div>
      <div className="table-search">
        <label className="visually-hidden" htmlFor="requests-search">
          Search requests
        </label>
        <SearchIcon />
        <input
          id="requests-search"
          type="search"
          placeholder="Search requests"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <p className="table-message" role="status" aria-live="polite">
        {statusMessage}
      </p>
      {requests.length > 0 && (
        <div className="table-container">
          <table ref={tableRef}>
            <colgroup>
              {columns.map((width, index) => (
                <col key={index} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columnDefinitions.map(([key, label], index) => {
                  const active = sort.key === key;
                  return (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={active ? `${sort.direction}ending` : "none"}
                    >
                      <button
                        className={`sort-button${active ? " active-sort" : ""}`}
                        type="button"
                        onClick={() => changeSort(key)}
                      >
                        {label}
                      </button>
                      <ColumnResizer
                        index={index}
                        columns={columns}
                        setColumns={setColumns}
                        tableRef={tableRef}
                        label={label}
                      />
                    </th>
                  );
                })}
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.reason}</td>
                  <td>{formatDate(request.startDate)}</td>
                  <td>{formatDate(request.endDate)}</td>
                  <td>{request.status}</td>
                  <td>
                    <button
                      className="delete-button"
                      type="button"
                      title="Delete"
                      disabled={deletingId === request.id}
                      aria-label={`${deletingId === request.id ? "Deleting" : "Delete"} travel request for ${request.reason}`}
                      onClick={() => deleteRequest(request)}
                    >
                      <DeleteIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const isRequestsPage = ["/requests", "/requests.html"].includes(
    window.location.pathname,
  );
  return (
    <>
      <Header />
      {isRequestsPage ? <RequestsTable /> : <NewRequest />}
    </>
  );
}
