(function () {
  "use strict";

  const config = window.DASHBOARD_CONFIG || {};
  const owner = String(config.owner || "").trim();
  const repository = String(config.repository || "").trim();
  const pollInterval = Math.max(10000, Number(config.pollIntervalMs) || 12000);
  const issueLimit = Math.min(100, Math.max(1, Number(config.issueLimit) || 30));
  const questionLabels = (config.questionLabels || []).map((label) => label.toLowerCase());
  const repoUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  let issues = [];
  let activeFilter = "open";

  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const relativeTime = (date) => {
    const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const setLoading = () => {
    $("#issues-list").innerHTML = '<div class="loading"><div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></div>';
    $("#questions-list").innerHTML = '<div class="loading"><div><div class="skeleton"></div><div class="skeleton"></div></div></div>';
  };
  const showNotice = (message) => { $("#notice").textContent = message; $("#notice").hidden = false; };
  const hideNotice = () => { $("#notice").hidden = true; };
  const labelsHtml = (labels) => labels.slice(0, 4).map((label) => `<span class="label">${escapeHtml(label.name)}</span>`).join("");
  const issueHtml = (issue) => `<article class="issue">
    <div class="issue-top"><a class="issue-title" href="${issue.html_url}" target="_blank" rel="noreferrer"><span class="issue-number">#${issue.number}</span>${escapeHtml(issue.title)}</a><span class="status ${issue.state === "closed" ? "closed" : ""}">${issue.state}</span></div>
    <div class="issue-footer"><span>${relativeTime(issue.updated_at)}</span>${issue.assignee ? `<span>· <img class="avatar" src="${issue.assignee.avatar_url}" alt=""> ${escapeHtml(issue.assignee.login)}</span>` : ""}<span class="labels">${labelsHtml(issue.labels)}</span></div>
  </article>`;
  const questionHtml = (issue) => `<article class="question"><div class="question-top"><a class="question-title" href="${issue.html_url}" target="_blank" rel="noreferrer">#${issue.number} ${escapeHtml(issue.title)}</a><span class="status">${issue.comments} ${issue.comments === 1 ? "reply" : "replies"}</span></div><div class="question-meta">${relativeTime(issue.updated_at)} · ${issue.user ? escapeHtml(issue.user.login) : "unknown"}</div></article>`;
  const render = () => {
    const filtered = activeFilter === "all" ? issues : issues.filter((issue) => issue.state === activeFilter);
    $("#issues-list").innerHTML = filtered.length ? filtered.map(issueHtml).join("") : '<div class="empty">No issues in this view.<br>That’s a good thing.</div>';
    const questions = issues.filter((issue) => issue.labels.some((label) => questionLabels.includes(label.name.toLowerCase())));
    $("#questions-list").innerHTML = questions.length ? questions.slice(0, 8).map(questionHtml).join("") : '<div class="empty">No open questions yet.<br>Start the conversation on GitHub.</div>';
    $("#open-count").textContent = issues.filter((issue) => issue.state === "open").length;
    $("#closed-count").textContent = issues.filter((issue) => issue.state === "closed").length;
    $("#question-count").textContent = questions.length;
    $("#question-badge").textContent = questions.length;
    $("#sync-time").textContent = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const load = async () => {
    if (!owner || !repository) { showNotice("Add an owner and repository in config.js to connect this dashboard."); return; }
    setLoading();
    try {
      const response = await fetch(`${apiUrl}/issues?state=all&per_page=${issueLimit}&sort=updated&direction=desc`, { headers: { Accept: "application/vnd.github+json" } });
      if (response.status === 403 || response.status === 429) throw new Error("GitHub API rate limit reached. Try again later.");
      if (!response.ok) throw new Error(response.status === 404 ? "Repository not found or not public. Check config.js." : `GitHub returned ${response.status}.`);
      const data = await response.json();
      issues = data.filter((issue) => !issue.pull_request);
      hideNotice(); render();
    } catch (error) { showNotice(error.message); $("#issues-list").innerHTML = '<div class="empty">Unable to load issues right now.</div>'; $("#questions-list").innerHTML = '<div class="empty">Unable to load questions right now.</div>'; }
  };

  $("#repo-name").textContent = owner && repository ? `${owner} / ${repository}` : "Configure your repository";
  $("#repo-link").href = repoUrl; $("#all-issues").href = `${repoUrl}/issues`; $("#new-issue").onclick = () => { window.open(`${repoUrl}/issues/new`, "_blank", "noopener"); };
  $("#new-question").href = `${repoUrl}/issues/new?labels=question`;
  $("#poll-copy").textContent = `Every ${Math.round(pollInterval / 1000)} seconds`;
  $("#refresh").onclick = load;
  document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => { document.querySelector(".filter.active").classList.remove("active"); button.classList.add("active"); activeFilter = button.dataset.filter; render(); }));
  setLoading(); load(); window.setInterval(load, pollInterval);
})();
