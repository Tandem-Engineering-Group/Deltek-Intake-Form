(function () {
  const app = document.querySelector("[data-intake-app]");
  if (!app) return;

  const form = document.getElementById("intakeForm");
  const commonFieldset = document.getElementById("commonFieldset");
  const requestActions = document.getElementById("requestActions");
  const vendorFieldset = document.getElementById("vendorFieldset");
  const vendorSearch = document.getElementById("vendorSearch");
  const vendorSelect = document.getElementById("vendorId");
  const vendorDetails = document.getElementById("vendorDetails");
  const requestIdInput = document.getElementById("requestId");
  const createdAtInput = document.getElementById("createdAt");
  const queueList = document.getElementById("queueList");
  const queueCount = document.getElementById("queueCount");
  const queueStatusFilter = document.getElementById("queueStatusFilter");
  const queueTypeFilter = document.getElementById("queueTypeFilter");
  const fillSampleButton = document.getElementById("fillSample");
  const toast = document.getElementById("toast");

  const storageKey = "deltek-intake-queue-v2";
  const legacyStorageKeys = ["deltek-intake-queue-v1"];
  const vendorTypes = app.dataset.vendorTypes.split(",").filter(Boolean);
  const allVendorOptions = Array.from(vendorSelect.options)
    .filter((option) => option.value)
    .map((option) => ({
      id: option.value,
      name: option.dataset.name,
      category: option.dataset.category,
      contact: option.dataset.contact,
      terms: option.dataset.terms,
      status: option.dataset.status,
      label: option.textContent
    }));

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
    vendorSearch.addEventListener("input", renderVendorOptions);
    vendorSelect.addEventListener("change", renderVendorDetails);
    queueStatusFilter.addEventListener("change", renderQueue);
    queueTypeFilter.addEventListener("change", renderQueue);
    document.getElementById("exportQueue").addEventListener("click", exportQueue);
    document.getElementById("clearComplete").addEventListener("click", clearComplete);

    setSelectedType("");
    renderVendorOptions();
    renderVendorDetails();
    renderQueue();
  }

  function resetIntakeForm() {
    form.reset();
    form.querySelectorAll("[data-type-radio]").forEach((radio) => {
      radio.checked = false;
    });
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

    const needsVendor = vendorTypes.includes(selectedType);
    vendorFieldset.hidden = !needsVendor;
    vendorFieldset.disabled = !needsVendor;

    if (!needsVendor) {
      vendorSearch.value = "";
      vendorSelect.value = "";
    }

    if (!hasType) {
      requestIdInput.value = "";
      createdAtInput.value = "";
    } else if (!requestIdInput.value) {
      requestIdInput.value = createRequestId(selectedType);
    }

    updateTypeOptionsLock();
    renderVendorOptions();
    renderVendorDetails();
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
    const item = {
      id: requestIdInput.value,
      type: selectedType,
      status: "New",
      createdAt: createdAtInput.value,
      details: Object.fromEntries(formData.entries()),
      vendor: getSelectedVendor()
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

  function renderVendorOptions() {
    const currentValue = vendorSelect.value;
    const searchTerm = vendorSearch.value.trim().toLowerCase();
    const filtered = allVendorOptions.filter((vendor) => {
      return [vendor.id, vendor.name, vendor.category, vendor.contact].some((value) => {
        return String(value).toLowerCase().includes(searchTerm);
      });
    });

    vendorSelect.innerHTML = '<option value="">Select vendor</option>';
    filtered.forEach((vendor) => {
      const option = document.createElement("option");
      option.value = vendor.id;
      option.textContent = vendor.label;
      option.dataset.name = vendor.name;
      option.dataset.category = vendor.category;
      option.dataset.contact = vendor.contact;
      option.dataset.terms = vendor.terms;
      option.dataset.status = vendor.status;
      vendorSelect.appendChild(option);
    });

    if (filtered.some((vendor) => vendor.id === currentValue)) {
      vendorSelect.value = currentValue;
    }
  }

  function renderVendorDetails() {
    const vendor = getSelectedVendor();
    const rows = vendor
      ? [
          ["Vendor ID", vendor.id],
          ["Category", vendor.category],
          ["Contact", vendor.contact],
          ["Terms", vendor.terms]
        ]
      : [
          ["Vendor ID", "-"],
          ["Category", "-"],
          ["Contact", "-"],
          ["Terms", "-"]
        ];

    vendorDetails.innerHTML = rows.map(([label, value]) => `
      <div class="detail-box">
        <span class="detail-label">${escapeHtml(label)}</span>
        <span class="detail-value">${escapeHtml(value)}</span>
      </div>
    `).join("");
  }

  function getSelectedVendor() {
    const selectedOption = vendorSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return null;

    return {
      id: selectedOption.value,
      name: selectedOption.dataset.name,
      category: selectedOption.dataset.category,
      contact: selectedOption.dataset.contact,
      terms: selectedOption.dataset.terms,
      status: selectedOption.dataset.status
    };
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
    renderVendorDetails();
  }

  function getSampleData(type) {
    const today = new Date();
    const commonSample = {
      requestTitle: {
        Opportunity: "Automated inspection line pursuit",
        Promo: "Safety week giveaway",
        Project: "Packaging line controls upgrade",
        "Supplier PO": "Safety equipment order"
      }[type],
      projectManager: "Jordan Lee",
      managingPrincipal: "Taylor Morgan",
      organization: "Tandem DET",
      estimatedStartDate: formatDate(addDays(today, 10)),
      estimatedFinishDate: formatDate(addDays(today, 45))
    };

    const typeSamples = {
      Opportunity: {
        opportunityName: "North plant modernization",
        estimatedRevenue: "125000.00",
        probability: "70%",
        stage: "proposal",
        engineeringCategory: "controls",
        source: "Tradeshow",
        primaryClient: "Atlas Manufacturing"
      },
      Promo: {
        vendorId: "V-10014",
        campaignName: "Safety week giveaway",
        itemDescription: "Branded high-visibility safety shirts",
        quantity: "150",
        inHandsDate: formatDate(addDays(today, 30)),
        budget: "3200.00",
        shipTo: "Richmond field office"
      },
      Project: {
        projectName: "Packaging line controls upgrade",
        clientName: "Atlas Manufacturing",
        projectCode: "PRJ-4521",
        contractType: "Time and Materials"
      },
      "Supplier PO": {
        vendorId: "V-11063",
        poDescription: "Replacement PPE and field safety supplies",
        amount: "2850.00",
        buyer: "Taylor Morgan",
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
    if (element) element.value = value;
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
    const vendorLine = item.vendor ? `Vendor: ${item.vendor.name}` : "No vendor lookup";
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
            <div class="queue-subtitle">${escapeHtml(item.id)} | ${escapeHtml(formatDateTime(item.createdAt))} | ${escapeHtml(vendorLine)}</div>
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

    const headers = ["id", "type", "status", "createdAt", "requestTitle", "projectManager", "managingPrincipal", "organization", "estimatedStartDate", "estimatedFinishDate", "vendorId", "vendorName", "details"];
    const rows = queue.map((item) => {
      const details = item.details || {};
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
        item.vendor ? item.vendor.id : "",
        item.vendor ? item.vendor.name : "",
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
      Promo: "PRM",
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
