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

/* ---------- Structural editing helpers (add/remove/rename/move rows) ---------- */

function nextId(rows, prefix) {
  let max = 0;
  rows.forEach(r => {
    if (r.id && r.id.startsWith(prefix)) {
      const n = parseInt(r.id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return prefix + String(max + 1).padStart(3, "0");
}

function blankItem(rows, description) {
  return {
    type: "item",
    id: nextId(rows, "m"),
    description: description || "New task",
    responsible: "Not Assigned Yet",
    status: "Pending",
    progress: 0,
    comments: "",
    risk: "",
    mitigation: ""
  };
}

function blankSection(rows, title, level) {
  return { type: "banner", id: nextId(rows, "sec"), level: level || "light", title: title || "New Section" };
}

function blankSubsection(rows, title) {
  return { type: "sub", id: nextId(rows, "sub"), title: title || "New Subsection" };
}

// Build <option> list for "insert after ___" pickers: every existing row, indented by type,
// plus a leading "At the very top" choice.
function buildPositionOptions(rows, selectedId) {
  let html = `<option value="__start__" ${selectedId === "__start__" ? "selected" : ""}>— At the very top —</option>`;
  rows.forEach(r => {
    let label;
    if (r.type === "banner") label = `▉ Section: ${r.title}`;
    else if (r.type === "sub") label = `　▸ Subsection: ${r.title}`;
    else label = `　　• Task: ${r.description}`;
    const sel = r.id === selectedId ? "selected" : "";
    html += `<option value="${r.id}" ${sel}>${escapeHtml(label)}</option>`;
  });
  return html;
}

function insertRowAfter(rows, afterId, newRow) {
  if (afterId === "__start__" || !afterId) {
    rows.unshift(newRow);
    return;
  }
  const idx = rows.findIndex(r => r.id === afterId);
  if (idx === -1) {
    rows.push(newRow);
  } else {
    rows.splice(idx + 1, 0, newRow);
  }
}

// Deletes a banner/sub row AND every row that "belongs" to it (up to the next row of
// equal-or-higher rank). Rank: banner (1) > sub (2) > item (3).
function rankOf(row) {
  return row.type === "banner" ? 1 : row.type === "sub" ? 2 : 3;
}

function cascadeDeleteInfo(rows, id) {
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return { count: 0, endIdx: idx };
  const startRank = rankOf(rows[idx]);
  let end = idx + 1;
  while (end < rows.length && rankOf(rows[end]) > startRank) end++;
  return { count: end - idx, endIdx: end };
}

function cascadeDelete(rows, id) {
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return rows;
  const { endIdx } = cascadeDeleteInfo(rows, id);
  rows.splice(idx, endIdx - idx);
  return rows;
}

function removeItem(rows, id) {
  const idx = rows.findIndex(r => r.id === id);
  if (idx !== -1) rows.splice(idx, 1);
  return rows;
}

function moveRow(rows, id, direction) {
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return rows;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) return rows;
  const tmp = rows[idx];
  rows[idx] = rows[swapWith];
  rows[swapWith] = tmp;
  return rows;
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
      const respUnassigned = !row.responsible || row.responsible.trim() === "" || row.responsible === "Not Assigned Yet";
      card.innerHTML = `
        <div class="item-top">
          <div class="item-desc">${escapeHtml(row.description)}</div>
          <span class="badge ${sc}">${row.status}</span>
          <div class="item-progress-wrap">
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="pct-num">${progress}%</span>
          </div>
        </div>
        <div class="responsible-line ${respUnassigned ? "unassigned" : ""}">Responsible: ${escapeHtml(row.responsible || "Not Assigned Yet")}</div>
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

function renderEdit(main, meta, rows, query, onChange, onStructural) {
  main.innerHTML = "";
  let visibleCount = 0;

  rows.forEach((row, idx) => {
    if (row.type === "banner") {
      const wrap = document.createElement("div");
      wrap.className = "banner-wrap";
      wrap.innerHTML = `
        <div class="section-banner ${row.level}">${escapeHtml(row.title)}</div>
        <div class="row-controls">
          <button class="btn ghost tiny" data-action="rename" data-id="${row.id}">✎ Rename</button>
          <button class="btn ghost tiny" data-action="delete-section" data-id="${row.id}">🗑 Delete section</button>
          <button class="btn ghost tiny" data-action="move-up" data-id="${row.id}">▲ Move up</button>
          <button class="btn ghost tiny" data-action="move-down" data-id="${row.id}">▼ Move down</button>
        </div>
      `;
      main.appendChild(wrap);
    } else if (row.type === "sub") {
      const wrap = document.createElement("div");
      wrap.className = "sub-wrap";
      wrap.innerHTML = `
        <div class="sub-header">${escapeHtml(row.title)}</div>
        <div class="row-controls">
          <button class="btn ghost tiny" data-action="rename" data-id="${row.id}">✎ Rename</button>
          <button class="btn ghost tiny" data-action="delete-sub" data-id="${row.id}">🗑 Delete subsection</button>
          <button class="btn ghost tiny" data-action="move-up" data-id="${row.id}">▲ Move up</button>
          <button class="btn ghost tiny" data-action="move-down" data-id="${row.id}">▼ Move down</button>
        </div>
      `;
      main.appendChild(wrap);
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
          <button class="btn ghost tiny danger" data-action="remove-item" data-id="${row.id}">🗑 Remove task</button>
        </div>
        <div class="edit-grid">
          <div class="edit-field full">
            <label for="description-${row.id}">Milestone description</label>
            <input type="text" id="description-${row.id}" data-id="${row.id}" data-field="description" value="${escapeHtml(row.description)}" />
          </div>
          <div class="edit-field">
            <label for="responsible-${row.id}">Responsible</label>
            <input type="text" id="responsible-${row.id}" data-id="${row.id}" data-field="responsible" placeholder="Not Assigned Yet" value="${escapeHtml(row.responsible || "Not Assigned Yet")}" />
          </div>
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
    el.addEventListener("input", e => {
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

  main.querySelectorAll("[data-action]").forEach(el => {
    el.addEventListener("click", e => {
      const action = e.currentTarget.getAttribute("data-action");
      const id = e.currentTarget.getAttribute("data-id");
      onStructural(action, id);
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
