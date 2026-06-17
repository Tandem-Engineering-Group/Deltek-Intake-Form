(function () {
  const app = document.querySelector("[data-intake-app]");
  if (!app) return;

  const form = document.getElementById("intakeForm");
  const commonFieldset = document.getElementById("commonFieldset");
  const requestActions = document.getElementById("requestActions");
  const requestIdInput = document.getElementById("requestId");
  const createdAtInput = document.getElementById("createdAt");
  const queueList = document.getElementById("queueList");
  const queueCount = document.getElementById("queueCount");
  const queueStatusFilter = document.getElementById("queueStatusFilter");
  const queueTypeFilter = document.getElementById("queueTypeFilter");
  const fillSampleButton = document.getElementById("fillSample");
  const toast = document.getElementById("toast");
  const addSupplierButton = document.getElementById("addSupplier");
  const supplierRows = Array.from(document.querySelectorAll("[data-supplier-row]"));
  const typeScopedFields = Array.from(document.querySelectorAll("[data-show-for]"));

  const storageKey = "deltek-intake-queue-v2";
  const legacyStorageKeys = ["deltek-intake-queue-v1"];

  let selectedType = "";
  let queue = loadQueue();
  let toastTimer = null;

  initialize();

  function initialize() {
    form.addEventListener("change", handleFormChange);
    form.addEventListener("submit", handleSubmit);

    document.getElementById("resetForm").addEventListener("click", () => {
      resetIntakeForm();
    });
    fillSampleButton.addEventListener("click", fillSampleData);
    if (addSupplierButton) addSupplierButton.addEventListener("click", addSupplierRow);
    queueStatusFilter.addEventListener("change", renderQueue);
    queueTypeFilter.addEventListener("change", renderQueue);
    document.getElementById("exportQueue").addEventListener("click", exportQueue);
    document.getElementById("clearComplete").addEventListener("click", clearComplete);

    setSelectedType("");
    resetSupplierRows();
    renderQueue();
  }

  function resetIntakeForm() {
    form.reset();
    form.querySelectorAll("[data-type-radio]").forEach((radio) => {
      radio.checked = false;
    });
    resetSupplierRows();
    setSelectedType("");
  }

  function handleFormChange(event) {
    if (event.target.matches("[data-type-radio]")) {
      if (selectedType && event.target.value !== selectedType) {
        event.target.checked = false;
        return;
      }

      setSelectedType(event.target.value);
    }
  }

  function setSelectedType(type) {
    selectedType = type;
    const hasType = Boolean(selectedType);

    commonFieldset.hidden = !hasType;
    commonFieldset.disabled = !hasType;
    requestActions.hidden = !hasType;
    fillSampleButton.hidden = !hasType;

    document.querySelectorAll("[data-type-panel]").forEach((panel) => {
      const isActive = panel.dataset.typePanel === selectedType;
      panel.hidden = !isActive;
      panel.disabled = !isActive;
    });

    updateTypeScopedFields();

    if (selectedType !== "Project") {
      resetSupplierRows();
    }

    if (!hasType) {
      requestIdInput.value = "";
      createdAtInput.value = "";
    } else if (!requestIdInput.value) {
      requestIdInput.value = createRequestId(selectedType);
    }

    updateTypeOptionsLock();
    updateAddSupplierButton();
  }

  function updateTypeScopedFields() {
    typeScopedFields.forEach((field) => {
      const allowedTypes = field.dataset.showFor.split(",").filter(Boolean);
      const isVisible = Boolean(selectedType) && allowedTypes.includes(selectedType);
      field.hidden = !isVisible;
      field.querySelectorAll("input, select, textarea, button").forEach((control) => {
        control.disabled = !isVisible;
      });
    });
  }

  function updateTypeOptionsLock() {
    form.querySelectorAll("[data-type-radio]").forEach((radio) => {
      radio.disabled = Boolean(selectedType) && radio.value !== selectedType;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const checkedType = form.querySelector("[data-type-radio]:checked");

    if (!checkedType) {
      showToast("Select a request type.");
      return;
    }

    selectedType = checkedType.value;
    createdAtInput.value = new Date().toISOString();
    requestIdInput.value = requestIdInput.value || createRequestId(selectedType);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    storeLocalQueueItem(formData);
    renderQueue();
    resetIntakeForm();
    showToast("Request saved to the work queue.");
    submitIntakeForm(formData);
  }

  function storeLocalQueueItem(formData) {
    const details = Object.fromEntries(formData.entries());
    const item = {
      id: requestIdInput.value,
      type: selectedType,
      status: "New",
      createdAt: createdAtInput.value,
      details,
      supplier: details.supplier || ""
    };

    queue = queue.filter((existing) => existing.id !== item.id);
    queue.unshift(item);
    saveQueue();
  }

  function submitIntakeForm(formData) {
    if (window.location.protocol === "file:") return;

    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    }).catch(() => {
      showToast("Saved locally. Online submission did not complete.");
    });
  }

  function fillSampleData() {
    if (!selectedType) {
      showToast("Select a request type before loading sample data.");
      return;
    }

    const samples = getSampleData(selectedType);
    if (!samples) return;

    Object.entries(samples).forEach(([id, value]) => {
      setValue(id, value);
    });
  }

  function getSampleData(type) {
    const today = new Date();
    const commonSample = {
      requestTitle: {
        Opportunity: "Automated inspection line pursuit",
        Project: "Packaging line controls upgrade",
        "Supplier PO": "Safety equipment order"
      }[type],
      projectManager: "Jordan Lee",
      managingPrincipal: "Taylor Morgan",
      organization: "Tandem DET",
      ...(type === "Supplier PO" ? {} : {
        estimatedStartDate: formatDate(addDays(today, 10)),
        estimatedFinishDate: formatDate(addDays(today, 45))
      })
    };

    const typeSamples = {
      Opportunity: {
        opportunityCreatePromoProject: "Yes",
        opportunityName: "North plant modernization",
        estimatedRevenue: "125000.00",
        probability: "70%",
        stage: "proposal",
        engineeringCategory: "controls",
        source: "Tradeshow",
        primaryClient: "Atlas Manufacturing",
        mainContactName: "Maya Chen",
        mainContactPhone: "555-0142"
      },
      Project: {
        projectCreatePromoProject: "Yes",
        projectName: "Packaging line controls upgrade",
        clientName: "Atlas Manufacturing",
        contractType: "Time and Materials",
        supplierMarkupRate: "15%",
        supplier1: "Acme Promotional Products",
        supplier2: "Midwest Industrial Supply"
      },
      "Supplier PO": {
        supplier: "Summit Hardware and Safety (V-11063)",
        poDescription: "Replacement PPE and field safety supplies",
        amount: "2850.00",
        paymentTerms: "Net 30",
        mainContact: "Taylor Morgan",
        deliveryDate: formatDate(addDays(today, 45)),
        deliverTo: "Richmond field office",
        glOrProjectCode: "OPS-4521"
      }
    };

    const typeSample = typeSamples[type];
    if (!typeSample) return null;

    return {
      ...commonSample,
      ...typeSample
    };
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    const supplierRow = element.closest("[data-supplier-row]");
    if (supplierRow) {
      showSupplierRow(supplierRow);
    }

    if (element.type === "checkbox") {
      const normalizedValue = String(value).trim().toLowerCase();
      element.checked = value === true || ["yes", "true", "1", "checked"].includes(normalizedValue);
      return;
    }

    element.value = value;
  }

  function addSupplierRow() {
    const nextRow = supplierRows.find((row) => row.hidden);
    if (!nextRow) return;

    showSupplierRow(nextRow);
    const input = nextRow.querySelector("input");
    if (input) input.focus();
    updateAddSupplierButton();
  }

  function showSupplierRow(row) {
    row.hidden = false;
    row.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = false;
    });
    updateAddSupplierButton();
  }

  function resetSupplierRows() {
    supplierRows.forEach((row, index) => {
      row.hidden = index > 0;
      row.querySelectorAll("input, select, textarea, button").forEach((control) => {
        control.value = "";
        control.disabled = index > 0;
      });
    });
    updateAddSupplierButton();
  }

  function updateAddSupplierButton() {
    if (!addSupplierButton) return;

    const visibleCount = supplierRows.filter((row) => !row.hidden).length;
    addSupplierButton.disabled = selectedType !== "Project" || visibleCount >= supplierRows.length;
  }

  function loadQueue() {
    for (const key of [storageKey, ...legacyStorageKeys]) {
      const storedQueue = readStoredQueue(localStorage, key) || readStoredQueue(sessionStorage, key);
      if (storedQueue) return storedQueue;
    }

    return [];
  }

  function saveQueue() {
    const serializedQueue = JSON.stringify(queue);
    writeStoredQueue(localStorage, storageKey, serializedQueue);
    writeStoredQueue(sessionStorage, storageKey, serializedQueue);
  }

  function readStoredQueue(storage, key) {
    try {
      const stored = storage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStoredQueue(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (error) {
      // The queue still works for the current page even if browser storage is unavailable.
    }
  }

  function renderQueue() {
    const statusFilter = queueStatusFilter.value;
    const typeFilter = queueTypeFilter.value;
    const filteredQueue = queue.filter((item) => {
      const statusMatches = statusFilter === "All" || item.status === statusFilter;
      const typeMatches = typeFilter === "All" || item.type === typeFilter;
      return statusMatches && typeMatches;
    });

    updateCounts();
    queueCount.textContent = String(filteredQueue.length);

    if (!filteredQueue.length) {
      queueList.innerHTML = '<div class="queue-empty">No queue items match the current filters.</div>';
      return;
    }

    queueList.innerHTML = filteredQueue.map(renderQueueItem).join("");
    queueList.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", handleQueueAction);
    });
  }

  function renderQueueItem(item) {
    const details = item.details || {};
    const title = details.requestTitle || `${item.type} request`;
    const supplierName = details.supplier || item.supplier || (item.vendor ? item.vendor.name : "");
    const supplierLine = supplierName ? `Supplier: ${supplierName}` : "No supplier selected";
    const statusClass = `status-${item.status.toLowerCase().replaceAll(" ", "-")}`;
    const rows = Object.entries(details)
      .filter(([key]) => !["form-name", "bot-field"].includes(key))
      .map(([key, value]) => renderDetailRow(labelize(key), value || "-"))
      .join("");

    return `
      <article class="queue-item">
        <div class="queue-item-head">
          <div>
            <h3 class="queue-title">${escapeHtml(title)}</h3>
            <div class="queue-subtitle">${escapeHtml(item.id)} | ${escapeHtml(formatDateTime(item.createdAt))} | ${escapeHtml(supplierLine)}</div>
          </div>
          <div class="queue-badges">
            <span class="badge type">${escapeHtml(item.type)}</span>
            <span class="badge ${escapeHtml(statusClass)}">${escapeHtml(item.status)}</span>
          </div>
        </div>
        <div class="queue-details">
          <details>
            <summary>Details</summary>
            <div class="detail-grid">${rows}</div>
          </details>
        </div>
        <div class="queue-actions">
          <button type="button" class="btn btn-secondary mini-btn" data-action="progress" data-id="${escapeHtml(item.id)}">In Progress</button>
          <button type="button" class="btn btn-secondary mini-btn" data-action="complete" data-id="${escapeHtml(item.id)}">Complete</button>
          <button type="button" class="btn btn-danger mini-btn" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  function renderDetailRow(label, value) {
    return `
      <div class="detail-row">
        <span class="detail-label">${escapeHtml(label)}</span>
        <span class="detail-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function handleQueueAction(event) {
    const id = event.currentTarget.dataset.id;
    const action = event.currentTarget.dataset.action;
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1) return;

    if (action === "progress") {
      queue[index].status = "In Progress";
      showToast("Queue item marked In Progress.");
    }

    if (action === "complete") {
      queue[index].status = "Complete";
      showToast("Queue item marked Complete.");
    }

    if (action === "delete") {
      queue.splice(index, 1);
      showToast("Queue item deleted.");
    }

    saveQueue();
    renderQueue();
  }

  function clearComplete() {
    const before = queue.length;
    queue = queue.filter((item) => item.status !== "Complete");
    saveQueue();
    renderQueue();
    showToast(`${before - queue.length} completed item(s) cleared.`);
  }

  function exportQueue() {
    if (!queue.length) {
      showToast("There are no queue items to export.");
      return;
    }

    const headers = ["id", "type", "status", "createdAt", "requestTitle", "projectManager", "managingPrincipal", "organization", "estimatedStartDate", "estimatedFinishDate", "supplier", "details"];
    const rows = queue.map((item) => {
      const details = item.details || {};
      const supplierName = details.supplier || item.supplier || (item.vendor ? item.vendor.name : "");
      return [
        item.id,
        item.type,
        item.status,
        item.createdAt,
        details.requestTitle || "",
        details.projectManager || "",
        details.managingPrincipal || "",
        details.organization || "",
        details.estimatedStartDate || "",
        details.estimatedFinishDate || "",
        supplierName,
        JSON.stringify(details)
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deltek-intake-queue-${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Queue exported as CSV.");
  }

  function updateCounts() {
    const counts = queue.reduce((summary, item) => {
      summary[item.status] = (summary[item.status] || 0) + 1;
      return summary;
    }, {});

    document.getElementById("newCount").textContent = `New: ${counts["New"] || 0}`;
    document.getElementById("progressCount").textContent = `In Progress: ${counts["In Progress"] || 0}`;
    document.getElementById("completeCount").textContent = `Complete: ${counts["Complete"] || 0}`;
  }

  function createRequestId(type) {
    const prefix = {
      Opportunity: "OPP",
      Project: "PRJ",
      "Supplier PO": "PO"
    }[type] || "REQ";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function labelize(value) {
    return String(value)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeCsvValue(value) {
    const stringValue = String(value ?? "");
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }
})();
