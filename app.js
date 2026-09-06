(function () {
  "use strict";

  const config = window.ATTENDANCE_CONFIG || {};
  const classes = config.classes || [];
  const statuses = [
    { key: "present", label: "มาเรียน", short: "มา" },
    { key: "absent", label: "ขาดเรียน", short: "ขาด" },
    { key: "sick", label: "ลาป่วย", short: "ป่วย" },
    { key: "leave", label: "ลากิจ", short: "ลา" },
    { key: "late", label: "มาสาย", short: "สาย" },
  ];
  const $ = (selector) => document.querySelector(selector);
  const storageKey = "suphannapoom-attendance-v1";
  const today = new Date();
  const isoDate = (date) => new Date(date).toISOString().slice(0, 10);
  const dateKey = isoDate(today);
  const state = { selectedClass: classes[0]?.id || "6/1", selectedDate: dateKey, attendance: loadAttendance(), lastSaved: {} };

  function loadAttendance() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (error) { showToast("อ่านข้อมูลเดิมไม่ได้ จึงเริ่มข้อมูลว่าง"); return {}; }
  }
  function saveAttendance() { localStorage.setItem(storageKey, JSON.stringify(state.attendance)); }
  function rosterFor(classId) {
    const classConfig = classes.find((item) => item.id === classId) || { size: 40 };
    return Array.from({ length: classConfig.size }, (_, index) => ({ id: `${classId}-${index + 1}`, number: index + 1, name: `${config.rosterPrefix || "นักเรียน"} ${index + 1}` }));
  }
  function currentKey(classId = state.selectedClass, date = state.selectedDate) { return `${date}|${classId}`; }
  function currentRecords(classId = state.selectedClass, date = state.selectedDate) {
    const roster = rosterFor(classId);
    const saved = state.attendance[currentKey(classId, date)] || {};
    return roster.map((student) => ({ ...student, status: saved[student.id] || "" }));
  }
  function formatThaiDate(value, options = { day: "numeric", month: "long", year: "numeric" }) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("th-TH", options);
  }
  function populateSelects() {
    $("#class-select").innerHTML = classes.map((item) => `<option value="${item.id}">ห้อง ${item.id} · ${item.size} คน</option>`).join("");
    $("#admin-class").innerHTML += classes.map((item) => `<option value="${item.id}">ห้อง ${item.id}</option>`).join("");
    $("#class-select").value = state.selectedClass;
    $("#date-select").value = state.selectedDate;
    $("#admin-date").value = state.selectedDate;
  }
  function countRecords(records) {
    return statuses.reduce((counts, status) => ({ ...counts, [status.key]: records.filter((student) => student.status === status.key).length }), { unmarked: records.filter((student) => !student.status).length });
  }
  function monthCounts(date) {
    const month = date.slice(0, 7);
    return Object.entries(state.attendance).reduce((totals, [key, records]) => {
      if (!key.startsWith(month)) return totals;
      Object.values(records).forEach((status) => { if (totals[status] !== undefined) totals[status] += 1; });
      return totals;
    }, { present: 0, absent: 0, sick: 0, leave: 0, late: 0 });
  }
  function renderSummary(records) {
    const counts = countRecords(records);
    $("#summary-grid").innerHTML = [
      ["present", "มาเรียน"], ["absent", "ขาดเรียน"], ["sick", "ลาป่วย"], ["leave", "ลากิจ"], ["late", "มาสาย"], ["unmarked", "ยังไม่ได้เช็ก"],
    ].map(([key, label]) => `<article class="summary-card ${key}"><strong>${counts[key]}</strong><span>${label}</span></article>`).join("");
    const checked = records.length - counts.unmarked;
    const percent = records.length ? Math.round((checked / records.length) * 100) : 0;
    $("#completion-label").textContent = `${checked} / ${records.length} เช็กแล้ว`;
    $("#completion-bar").style.width = `${percent}%`;
  }
  function renderRoster() {
    const records = currentRecords();
    renderSummary(records);
    $("#roster-title").textContent = `ห้อง ${state.selectedClass}`;
    $("#save-title").textContent = `ห้อง ${state.selectedClass}`;
    const query = ($("#student-search").value || "").toLowerCase();
    const filter = $("#status-filter").value;
    const filtered = records.filter((student) => (!query || `${student.number} ${student.name}`.toLowerCase().includes(query)) && (filter === "all" || (filter === "unmarked" ? !student.status : student.status === filter)));
    $("#roster-list").innerHTML = filtered.length ? filtered.map((student) => `<div class="student-row"><span class="student-number">${String(student.number).padStart(2, "0")}</span><span class="student-name">${student.name}<small>ลำดับที่ ${student.number}</small></span><span class="status-buttons">${statuses.map((status) => `<button class="status-button ${student.status === status.key ? "selected" : ""}" data-student="${student.id}" data-status="${status.key}" type="button" aria-pressed="${student.status === status.key}">${status.short}</button>`).join("")}</span></div>`).join("") : '<div class="empty">ไม่พบนักเรียนที่ตรงกับการค้นหา</div>';
    $("#roster-list").querySelectorAll(".status-button").forEach((button) => button.addEventListener("click", () => {
      const recordsForKey = state.attendance[currentKey()] || {};
      recordsForKey[button.dataset.student] = button.dataset.status;
      state.attendance[currentKey()] = recordsForKey;
      renderRoster();
    }));
    const saved = state.lastSaved[currentKey()];
    $("#last-saved").textContent = saved ? new Date(saved).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "ยังไม่มีข้อมูล";
  }
  function setAll(status) {
    const records = {};
    rosterFor(state.selectedClass).forEach((student) => { if (status) records[student.id] = status; });
    state.attendance[currentKey()] = records;
    renderRoster();
  }
  function saveCurrent() {
    state.lastSaved[currentKey()] = new Date().toISOString();
    saveAttendance();
    renderRoster();
    showToast(`บันทึกห้อง ${state.selectedClass} เรียบร้อยแล้ว`);
  }
  function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800); }
  function renderAdmin() {
    const date = $("#admin-date").value || state.selectedDate;
    const classFilter = $("#admin-class").value;
    const visible = classes.filter((item) => classFilter === "all" || item.id === classFilter);
    const rows = visible.map((item) => {
      const records = currentRecords(item.id, date); const counts = countRecords(records); const checked = records.length - counts.unmarked; const percent = records.length ? Math.round((checked / records.length) * 100) : 0;
      return { item, records, counts, checked, percent };
    });
    const totals = rows.reduce((total, row) => Object.keys(total).reduce((next, key) => ({ ...next, [key]: next[key] + row.counts[key] }), total), { present: 0, absent: 0, sick: 0, leave: 0, late: 0, unmarked: 0 });
    const totalStudents = rows.reduce((sum, row) => sum + row.records.length, 0);
    $("#admin-stats").innerHTML = [["present", "มาเรียนวันนี้", totals.present], ["absent", "ขาดเรียน", totals.absent], ["late", "มาสาย", totals.late], ["unmarked", "ยังไม่ได้เช็ก", totals.unmarked]].map(([key, label, value]) => `<div class="admin-stat"><span>${label}</span><strong>${value} <small>คน</small></strong></div>`).join("");
    $("#admin-count").textContent = `${visible.length} ห้อง`;
    $("#admin-table").innerHTML = rows.map(({ item, counts, checked, percent }) => `<tr><td class="table-class">ห้อง ${item.id}</td><td class="table-muted">${item.size} คน</td><td>${counts.present} คน</td><td>${counts.absent + counts.sick + counts.leave} คน</td><td>${counts.late} คน</td><td><div class="mini-progress"><div><i style="width:${percent}%"></i></div><span class="${percent === 100 ? "complete-badge" : "pending-badge"}">${percent === 100 ? "ครบแล้ว" : `${checked}/${item.size}`}</span></div></td></tr>`).join("");
    $("#month-label").textContent = formatThaiDate(date, { month: "long", year: "numeric" });
    const monthTotals = monthCounts(date);
    const monthItems = statuses.slice(0, 4).map((status) => {
      const value = monthTotals[status.key]; const percentage = totalStudents ? Math.min(100, Math.round((value / totalStudents) * 100)) : 0;
      return `<div class="month-item"><span>${status.label}</span><strong>${value} คน</strong><div class="month-bar"><i style="width:${percentage}%"></i></div></div>`;
    });
    $("#monthly-summary").innerHTML = monthItems.join("");
  }
  function exportCsv() {
    const rows = [["วันที่", "ห้องเรียน", "ลำดับ", "ชื่อสำหรับแก้ไข", "สถานะ"]];
    classes.forEach((item) => currentRecords(item.id, $("#admin-date").value || state.selectedDate).forEach((student) => rows.push([$("#admin-date").value || state.selectedDate, item.id, student.number, student.name, statuses.find((status) => status.key === student.status)?.label || "ยังไม่ได้เช็ก"])));
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `attendance-${$("#admin-date").value || state.selectedDate}.csv`; link.click(); URL.revokeObjectURL(link.href);
    showToast("ดาวน์โหลดรายงาน CSV แล้ว");
  }
  function switchTab(isAdmin) {
    $("#teacher-view").hidden = isAdmin; $("#admin-view").hidden = !isAdmin; $("#teacher-tab").classList.toggle("active", !isAdmin); $("#admin-tab").classList.toggle("active", isAdmin); $("#teacher-tab").setAttribute("aria-selected", String(!isAdmin)); $("#admin-tab").setAttribute("aria-selected", String(isAdmin)); if (isAdmin) renderAdmin();
  }

  $("#today-label").textContent = formatThaiDate(dateKey);
  populateSelects(); renderRoster(); renderAdmin();
  $("#class-select").addEventListener("change", (event) => { state.selectedClass = event.target.value; renderRoster(); });
  $("#date-select").addEventListener("change", (event) => { state.selectedDate = event.target.value; renderRoster(); });
  $("#student-search").addEventListener("input", renderRoster); $("#status-filter").addEventListener("change", renderRoster);
  $("#mark-all-present").addEventListener("click", () => setAll("present")); $("#clear-all").addEventListener("click", () => setAll(""));
  $("#save-button").addEventListener("click", saveCurrent);
  $("#teacher-tab").addEventListener("click", () => switchTab(false)); $("#admin-tab").addEventListener("click", () => switchTab(true));
  $("#admin-date").addEventListener("change", renderAdmin); $("#admin-class").addEventListener("change", renderAdmin); $("#admin-refresh").addEventListener("click", renderAdmin); $("#export-csv").addEventListener("click", exportCsv);
  $("#theme-toggle").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("attendance-theme", document.body.classList.contains("dark") ? "dark" : "light"); });
  if (localStorage.getItem("attendance-theme") === "dark") document.body.classList.add("dark");
  window.setInterval(() => { if (!document.hidden) { state.attendance = loadAttendance(); renderRoster(); if (!$("#admin-view").hidden) renderAdmin(); } }, Math.max(10000, Number(config.pollIntervalMs) || 30000));
})();
