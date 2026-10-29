// Project Tracking Dashboard — front-end demo
// Mirrors the Oracle tables in /sql (PTD_PROJECTS, PTD_TASKS). Data is kept in localStorage.

const STORE_KEY = 'ptd-data-v1';
const STATUSES = ['Planning', 'In progress', 'On hold', 'Completed'];
const PRIORITY_RANK = { High: 1, Medium: 2, Low: 3 };

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const tasks = (list, doneCount) => list.map((title, i) => ({ id: i + 1, title, done: i < doneCount }));

const SEED = [
  { name: 'HR Portal Upgrade', owner: 'Ayesha Khan', priority: 'High', status: 'In progress', start: day(-40), due: day(12),
    description: 'Move the HR portal to the latest APEX release and refresh the UI.',
    tasks: tasks(['Upgrade test workspace', 'Fix deprecated plug-ins', 'Theme refresh', 'User acceptance testing', 'Go-live'], 3) },
  { name: 'Payroll Reports', owner: 'Bilal Ahmed', priority: 'Medium', status: 'In progress', start: day(-20), due: day(5),
    description: 'Monthly payroll and tax summary reports for finance.',
    tasks: tasks(['Gather requirements', 'Write SQL queries', 'Build interactive reports', 'Sign-off'], 2) },
  { name: 'Inventory Barcode Scanning', owner: 'Hamza Iqbal', priority: 'High', status: 'Planning', start: day(3), due: day(45),
    description: 'Scan stock in and out with a phone camera.',
    tasks: tasks(['Research scanner libraries', 'Prototype page', 'Data model changes'], 0) },
  { name: 'Customer Feedback Survey', owner: 'Fatima Raza', priority: 'Low', status: 'Completed', start: day(-60), due: day(-10),
    description: 'Public survey form with results dashboard.',
    tasks: tasks(['Survey form', 'Results chart', 'Email invitations'], 3) },
  { name: 'Leave Management', owner: 'Sana Malik', priority: 'Medium', status: 'On hold', start: day(-15), due: day(-2),
    description: 'Leave requests with manager approval workflow.',
    tasks: tasks(['Leave types table', 'Request form', 'Approval workflow', 'Email notifications'], 1) },
  { name: 'Sales Dashboard', owner: 'Omar Farooq', priority: 'High', status: 'In progress', start: day(-10), due: day(20),
    description: 'Regional sales KPIs with drill-down charts.',
    tasks: tasks(['KPI definitions', 'Region chart', 'Product drill-down', 'Mobile layout', 'Review'], 1) },
].map((p, i) => ({ id: i + 1, ...p }));

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

let projects = load();
let sort = { key: 'due', dir: 1 };
let openProjectId = null;

function load() {
  try { const d = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(d)) return d; } catch { /* ignore */ }
  return structuredClone(SEED);
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch { /* ignore */ } }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2000);
}

// Same rule as ptd_project_pkg.project_progress
const progress = (p) => (p.status === 'Completed' ? 100 : p.tasks.length ? Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100) : 0);
const isOverdue = (p) => p.status !== 'Completed' && p.due < today();
const daysLeft = (p) => Math.round((new Date(p.due) - new Date(today())) / 86400000);

const statusBadge = (s) => `<span class="badge ${{ Planning: 'b-gray', 'In progress': 'b-blue', 'On hold': 'b-amber', Completed: 'b-green' }[s]}">${esc(s)}</span>`;
const priorityBadge = (p) => `<span class="badge ${{ High: 'b-red', Medium: 'b-amber', Low: 'b-gray' }[p]}">${esc(p)}</span>`;

function renderKpis() {
  const active = projects.filter((p) => p.status === 'In progress' || p.status === 'Planning');
  const overdue = projects.filter(isOverdue).length;
  const avg = projects.length ? Math.round(projects.reduce((s, p) => s + progress(p), 0) / projects.length) : 0;
  const allTasks = projects.flatMap((p) => p.tasks);
  const done = allTasks.filter((t) => t.done).length;
  $('#kpis').innerHTML = [
    ['Active projects', active.length, `${projects.length} in total`],
    ['Overdue', overdue, overdue ? 'need attention' : 'all on schedule'],
    ['Average progress', `${avg}%`, 'across all projects'],
    ['Tasks completed', `${done}/${allTasks.length}`, 'this portfolio'],
  ].map(([l, v, s]) => `<div class="kpi"><span>${l}</span><strong>${v}</strong><em>${s}</em></div>`).join('');
}

function renderCharts() {
  const counts = STATUSES.map((s) => [s, projects.filter((p) => p.status === s).length]);
  const max = Math.max(1, ...counts.map((c) => c[1]));
  $('#statusBars').innerHTML = counts.map(([s, n]) =>
    `<div class="bar-row"><span>${s}</span><div class="progress"><span style="width:${(n / max) * 100}%"></span></div><b>${n}</b></div>`).join('');

  const upcoming = projects.filter((p) => p.status !== 'Completed').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  $('#deadlines').innerHTML = upcoming.length ? upcoming.map((p) => {
    const d = daysLeft(p);
    const label = d < 0 ? `<span class="overdue">${-d} days overdue</span>` : d === 0 ? 'Due today' : `${d} days left`;
    return `<div><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${p.due} · ${label}</div></div>`;
  }).join('') : '<div class="cell-sub">Nothing due — all projects completed.</div>';
}

function filtered() {
  const q = $('#search').value.trim().toLowerCase();
  const st = $('#statusFilter').value;
  const pr = $('#priorityFilter').value;
  const val = (p, k) => (k === 'progress' ? progress(p) : k === 'priority' ? PRIORITY_RANK[p.priority] : p[k]);
  return projects
    .filter((p) => (!st || p.status === st) && (!pr || p.priority === pr))
    .filter((p) => !q || `${p.name} ${p.owner}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const va = val(a, sort.key), vb = val(b, sort.key);
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
    });
}

function renderTable() {
  const list = filtered();
  $('#count').textContent = list.length;
  $('#rows').innerHTML = list.length ? list.map((p) => {
    const pct = progress(p);
    return `<tr>
      <td><button class="link-btn" data-tasks="${p.id}">${esc(p.name)}</button><div class="cell-sub">${p.tasks.length} tasks</div></td>
      <td>${esc(p.owner)}</td>
      <td>${priorityBadge(p.priority)}</td>
      <td>${statusBadge(p.status)}</td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="progress"><span style="width:${pct}%"></span></div><b>${pct}%</b></div></td>
      <td class="${isOverdue(p) ? 'overdue' : ''}">${p.due}</td>
      <td><div class="actions">
        <button class="btn btn-sm" data-tasks="${p.id}">Tasks</button>
        <button class="btn btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${p.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">No projects match your filters.</td></tr>';
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.classList.toggle('asc', th.dataset.sort === sort.key && sort.dir === 1);
    th.classList.toggle('desc', th.dataset.sort === sort.key && sort.dir === -1);
  });
}

function render() { renderKpis(); renderCharts(); renderTable(); }

// ---------- Project form ----------
const modal = $('#modal');
const form = $('#form');

function openForm(p) {
  form.reset();
  $('#modalTitle').textContent = p ? 'Edit project' : 'New project';
  const data = p || { start: today(), due: day(30), status: 'Planning', priority: 'Medium' };
  for (const [k, v] of Object.entries(data)) if (form.elements[k]) form.elements[k].value = v;
  if (!p) form.elements.id.value = '';
  modal.classList.add('open');
  form.elements.name.focus();
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  if (d.due < d.start) { toast('Due date must be after the start date'); return; }
  if (d.id) {
    const p = projects.find((x) => String(x.id) === d.id);
    Object.assign(p, { ...d, id: p.id });
    toast('Project updated');
  } else {
    projects.push({ ...d, id: Math.max(0, ...projects.map((p) => p.id)) + 1, tasks: [] });
    toast('Project created');
  }
  save(); modal.classList.remove('open'); render();
});

// ---------- Tasks panel ----------
const tasksModal = $('#tasksModal');

function renderTasks() {
  const p = projects.find((x) => x.id === openProjectId);
  if (!p) return;
  $('#tasksTitle').textContent = p.name;
  $('#tasksProgress').style.width = `${progress(p)}%`;
  $('#taskList').innerHTML = p.tasks.length ? p.tasks.map((t) => `
    <li class="${t.done ? 'done' : ''}">
      <input type="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark done" />
      <span>${esc(t.title)}</span>
      <button class="icon-btn" data-remove="${t.id}" aria-label="Remove task">×</button>
    </li>`).join('') : '<li class="cell-sub">No tasks yet — add the first one below.</li>';
}

function openTasks(id) { openProjectId = id; renderTasks(); tasksModal.classList.add('open'); }

$('#taskList').addEventListener('change', (ev) => {
  const p = projects.find((x) => x.id === openProjectId);
  const t = p.tasks.find((x) => x.id === Number(ev.target.dataset.toggle));
  if (!t) return;
  t.done = ev.target.checked;
  if (p.tasks.every((x) => x.done) && p.tasks.length) { p.status = 'Completed'; toast('All tasks done — project completed'); }
  else if (p.status === 'Completed') p.status = 'In progress';
  else if (p.status === 'Planning' && t.done) p.status = 'In progress';
  save(); renderTasks(); render();
});

$('#taskList').addEventListener('click', (ev) => {
  const id = Number(ev.target.dataset.remove); if (!id) return;
  const p = projects.find((x) => x.id === openProjectId);
  p.tasks = p.tasks.filter((t) => t.id !== id);
  save(); renderTasks(); render();
});

$('#taskForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const p = projects.find((x) => x.id === openProjectId);
  const title = ev.target.elements.title.value.trim();
  if (!title) return;
  p.tasks.push({ id: Math.max(0, ...p.tasks.map((t) => t.id)) + 1, title, done: false });
  if (p.status === 'Completed') p.status = 'In progress';
  ev.target.reset(); save(); renderTasks(); render();
});

// ---------- Shared events ----------
[modal, tasksModal].forEach((m) => m.addEventListener('click', (ev) => {
  if (ev.target === m || ev.target.hasAttribute('data-close')) m.classList.remove('open');
}));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { modal.classList.remove('open'); tasksModal.classList.remove('open'); } });

$('#rows').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  const id = Number(b.dataset.edit || b.dataset.del || b.dataset.tasks);
  const p = projects.find((x) => x.id === id);
  if (b.dataset.tasks) openTasks(id);
  if (b.dataset.edit) openForm(p);
  if (b.dataset.del && confirm(`Delete "${p.name}" and its tasks?`)) { projects = projects.filter((x) => x.id !== id); save(); render(); toast('Project deleted'); }
});

document.querySelectorAll('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
  sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 };
  renderTable();
}));
['#search', '#statusFilter', '#priorityFilter'].forEach((s) => $(s).addEventListener('input', renderTable));
$('#addBtn').addEventListener('click', () => openForm());
$('#resetBtn').addEventListener('click', () => { projects = structuredClone(SEED); save(); render(); toast('Demo data restored'); });

render();
