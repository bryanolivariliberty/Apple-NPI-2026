/* Shared logic for the NPI Offer Tracker — used by both editor.html and view.html
   MODE is set by the including page: 'edit' or 'view' */

const LOCAL_KEY = "npi2026_tracker_draft";

function statusClass(status) {
  return status === "Complete" ? "Complete" : status === "In Progress" ? "In-Progress" : "Pending";
}

function computeStats(rows) {
  const items = rows.filter(r => r.type === "item");
  const total = items.length || 1;
  const complete = items.filter(i => i.status === "Complete").length;
  const inProgress = items.filter(i => i.status === "In Progress").length;
  const pending = items.filter(i => i.status === "Pending").length;
  const risks = items.filter(i => (i.risk || "").trim().length > 0).length;
  const avgProgress = Math.round(items.reduce((s, i) => s + (Number(i.progress) || 0), 0) / total);
  return { total: items.length, complete, inProgress, pending, risks, avgProgress };
}

function renderSummary(container, meta, rows) {
  const s = computeStats(rows);
  container.innerHTML = `
    <div class="overall-progress">
      <div class="row"><span>Overall completion</span><span class="pct">${s.avgProgress}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.avgProgress}%"></div></div>
    </div>
    <div class="stat-pills">
      <span class="stat-pill complete">${s.complete} Complete</span>
      <span class="stat-pill progress">${s.inProgress} In Progress</span>
      <span class="stat-pill pending">${s.pending} Pending</span>
      ${s.risks > 0 ? `<span class="stat-pill risk">${s.risks} Open risk${s.risks > 1 ? "s" : ""}</span>` : ""}
    </div>
    <div class="search-box">
      <input id="searchInput" type="text" placeholder="Search milestone..." aria-label="Search milestones" />
    </div>
  `;
}

function itemMatchesQuery(item, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return (
    item.description.toLowerCase().includes(q) ||
    (item.comments || "").toLowerCase().includes(q) ||
    (item.status || "").toLowerCase().includes(q)
  );
}

/* ---------- VIEW (read-only) rendering ---------- */

function renderView(main, meta, rows, query) {
  main.innerHTML = "";
  let visibleCount = 0;

  rows.forEach(row => {
    if (row.type === "banner") {
      const div = document.createElement("div");
      div.className = `section-banner ${row.level}`;
      div.textContent = row.title;
      main.appendChild(div);
    } else if (row.type === "sub") {
      const div = document.createElement("div");
      div.className = "sub-header";
      div.textContent = row.title;
      main.appendChild(div);
    } else if (row.type === "item") {
      const matches = itemMatchesQuery(row, query);
      if (matches) visibleCount++;
      const card = document.createElement("div");
      card.className = "item-card" + (matches ? "" : " hidden");
      const sc = statusClass(row.status);
      const progress = Number(row.progress) || 0;
      const hasComment = (row.comments || "").trim().length > 0;
      const hasRisk = (row.risk || "").trim().length > 0;
      card.innerHTML = `
        <div class="item-top">
          <div class="item-desc">${escapeHtml(row.description)}</div>
          <span class="badge ${sc}">${row.status}</span>
          <div class="item-progress-wrap">
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="pct-num">${progress}%</span>
          </div>
        </div>
        ${(hasComment || hasRisk || (row.mitigation || "").trim()) ? `
        <div class="item-meta">
          ${hasComment ? `<div class="comments has-text">${escapeHtml(row.comments)}</div>` : ""}
          ${hasRisk ? `<div class="risk-flag">⚠ Risk: ${escapeHtml(row.risk)}</div>` : ""}
          ${(row.mitigation || "").trim() ? `<div class="mitigation">Mitigation: ${escapeHtml(row.mitigation)}</div>` : ""}
        </div>` : ""}
      `;
      main.appendChild(card);
    }
  });

  if (visibleCount === 0 && query) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No milestones match "${query}".`;
    main.appendChild(empty);
  }
}

/* ---------- EDIT (interactive) rendering ---------- */

function renderEdit(main, meta, rows, query, onChange) {
  main.innerHTML = "";
  let visibleCount = 0;

  rows.forEach((row, idx) => {
    if (row.type === "banner") {
      const div = document.createElement("div");
      div.className = `section-banner ${row.level}`;
      div.textContent = row.title;
      main.appendChild(div);
    } else if (row.type === "sub") {
      const div = document.createElement("div");
      div.className = "sub-header";
      div.textContent = row.title;
      main.appendChild(div);
    } else if (row.type === "item") {
      const matches = itemMatchesQuery(row, query);
      if (matches) visibleCount++;
      const card = document.createElement("div");
      card.className = "item-card" + (matches ? "" : " hidden");
      const sc = statusClass(row.status);
      const progress = Number(row.progress) || 0;
      card.innerHTML = `
        <div class="item-top">
          <div class="item-desc">${escapeHtml(row.description)}</div>
          <span class="badge ${sc}">${row.status}</span>
          <div class="item-progress-wrap">
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="pct-num">${progress}%</span>
          </div>
        </div>
        <div class="edit-grid">
          <div class="edit-field">
            <label for="status-${row.id}">Status</label>
            <select id="status-${row.id}" data-id="${row.id}" data-field="status">
              <option value="Pending" ${row.status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="In Progress" ${row.status === "In Progress" ? "selected" : ""}>In Progress</option>
              <option value="Complete" ${row.status === "Complete" ? "selected" : ""}>Complete</option>
            </select>
          </div>
          <div class="edit-field">
            <label for="progress-${row.id}">Progress</label>
            <div class="range-row">
              <input type="range" id="progress-${row.id}" data-id="${row.id}" data-field="progress" min="0" max="100" step="5" value="${progress}" />
              <span class="rv">${progress}%</span>
            </div>
          </div>
          <div class="edit-field full">
            <label for="comments-${row.id}">Description | Comments</label>
            <textarea id="comments-${row.id}" data-id="${row.id}" data-field="comments" placeholder="Notes, blockers, context...">${escapeHtml(row.comments || "")}</textarea>
          </div>
          <div class="edit-field">
            <label for="risk-${row.id}">Risk</label>
            <input type="text" id="risk-${row.id}" data-id="${row.id}" data-field="risk" placeholder="e.g. Vendor delay" value="${escapeHtml(row.risk || "")}" />
          </div>
          <div class="edit-field">
            <label for="mitigation-${row.id}">Mitigation</label>
            <input type="text" id="mitigation-${row.id}" data-id="${row.id}" data-field="mitigation" placeholder="Plan to address it" value="${escapeHtml(row.mitigation || "")}" />
          </div>
        </div>
      `;
      main.appendChild(card);
    }
  });

  if (visibleCount === 0 && query) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No milestones match "${query}".`;
    main.appendChild(empty);
  }

  main.querySelectorAll("[data-id][data-field]").forEach(el => {
    const evt = el.tagName === "SELECT" || el.type === "range" ? "input" : "input";
    el.addEventListener(evt, e => {
      const id = e.target.getAttribute("data-id");
      const field = e.target.getAttribute("data-field");
      let value = e.target.value;
      if (field === "progress") value = Number(value);
      onChange(id, field, value);
      if (field === "progress") {
        const rv = e.target.parentElement.querySelector(".rv");
        if (rv) rv.textContent = value + "%";
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
