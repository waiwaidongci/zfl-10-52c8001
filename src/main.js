import "./styles.css";

const STORAGE_KEY = "zfl-10-kanban";
const statuses = [
  { id: "todo", label: "待办" },
  { id: "doing", label: "进行中" },
  { id: "done", label: "已完成" }
];

const initialState = {
  selectedProject: "all",
  projects: [
    { id: crypto.randomUUID(), name: "官网改版" },
    { id: crypto.randomUUID(), name: "客户交付" }
  ],
  tasks: [
    {
      id: crypto.randomUUID(),
      project: "官网改版",
      title: "整理首页模块",
      owner: "林西",
      due: new Date().toISOString().slice(0, 10),
      note: "先确定首屏和案例区",
      status: "todo"
    },
    {
      id: crypto.randomUUID(),
      project: "客户交付",
      title: "核对验收清单",
      owner: "周白",
      due: "",
      note: "收集遗漏项",
      status: "doing"
    }
  ],
  inboxTasks: []
};

let state = loadState();
const app = document.querySelector("#app");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : initialState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function visibleTasks() {
  if (state.selectedProject === "all") return state.tasks;
  return state.tasks.filter((task) => task.project === state.selectedProject);
}

function render() {
  const tasks = visibleTasks();
  const done = tasks.filter((task) => task.status === "done").length;
  const doing = tasks.filter((task) => task.status === "doing").length;
  const dueSoon = tasks.filter((task) => task.due && daysUntil(task.due) <= 3 && task.status !== "done").length;

  const defaultProject = state.projects[0] ? state.projects[0].name : "";

  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">本地项目管理</p>
          <h1>小团队项目看板</h1>
        </div>
        <section class="summary" aria-label="任务统计">
          <div class="metric"><span>任务总数</span><strong>${tasks.length}</strong></div>
          <div class="metric"><span>进行中</span><strong>${doing}</strong></div>
          <div class="metric"><span>近三天截止</span><strong>${dueSoon}</strong></div>
          <div class="metric inbox-metric"><span>收集箱</span><strong>${state.inboxTasks.length}</strong></div>
        </section>
      </header>

      <section class="layout">
        <aside class="panel">
          <h2>任务快速收集</h2>
          <form class="quick-input" id="quick-input-form">
            <input name="quickTitle" placeholder="快速记录任务标题，稍后补全信息..." autocomplete="off">
            <button class="primary" type="submit">+</button>
          </form>

          <h2 style="margin-top:22px;">新增项目</h2>
          <form class="form" id="project-form">
            <label>项目名称<input name="name" required placeholder="例如品牌活动"></label>
            <button class="primary" type="submit">添加项目</button>
          </form>
          <div class="project-list">
            ${state.projects.map((project) => `<div class="project-pill"><span>${escapeHtml(project.name)}</span><button class="ghost" data-remove-project="${project.id}">删除</button></div>`).join("")}
          </div>

          <h2 style="margin-top:22px;">新增任务</h2>
          <form class="form" id="task-form">
            <label>所属项目<select name="project">${state.projects.map((project) => `<option>${escapeHtml(project.name)}</option>`).join("")}</select></label>
            <label>任务标题<input name="title" required placeholder="例如确认页面结构"></label>
            <label>负责人<input name="owner" required placeholder="例如小陈"></label>
            <label>截止日期<input name="due" type="date"></label>
            <label>备注<textarea name="note" placeholder="补充任务背景"></textarea></label>
            <button class="primary" type="submit">添加任务</button>
          </form>
        </aside>

        <section>
          <div class="toolbar">
            <label>项目筛选
              <select id="project-filter">
                <option value="all">全部项目</option>
                ${state.projects.map((project) => `<option value="${escapeHtml(project.name)}" ${state.selectedProject === project.name ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}
              </select>
            </label>
            <div class="metric"><span>完成数</span><strong>${done}</strong></div>
          </div>

          ${state.inboxTasks.length > 0 ? `
          <section class="inbox-section">
            <div class="inbox-header">
              <h2>📥 任务收集箱 <span class="inbox-count">${state.inboxTasks.length}</span></h2>
              <p class="inbox-hint">点击卡片补全信息后，自动进入「待办」列</p>
            </div>
            <div class="inbox-list">
              ${state.inboxTasks.map((task) => renderInboxTask(task, defaultProject)).join("")}
            </div>
          </section>
          ` : ""}

          <div class="board">
            ${statuses.map((status) => renderColumn(status, tasks)).join("")}
          </div>
        </section>
      </section>
    </main>
  `;

  bindEvents();
}

function renderColumn(status, tasks) {
  const columnTasks = tasks.filter((task) => task.status === status.id);
  return `
    <article class="column">
      <div class="column-header"><h2>${status.label}</h2><span class="count">${columnTasks.length}</span></div>
      <div class="dropzone" data-status="${status.id}">
        ${columnTasks.length ? columnTasks.map(renderTask).join("") : `<div class="empty">暂无任务</div>`}
      </div>
    </article>
  `;
}

function renderTask(task) {
  const dueText = task.due ? `截止 ${task.due}` : "未设截止";
  const danger = task.due && daysUntil(task.due) < 0 && task.status !== "done";
  return `
    <article class="card" draggable="true" data-task-id="${task.id}">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.note || "暂无备注")}</p>
      <div class="meta">
        <span class="tag">${escapeHtml(task.project)}</span>
        <span class="tag">${escapeHtml(task.owner)}</span>
        <span class="tag ${danger ? "danger" : ""}">${dueText}</span>
        <button class="ghost" data-delete-task="${task.id}">删除</button>
      </div>
    </article>
  `;
}

function renderInboxTask(task, defaultProject) {
  const createdAt = new Date(task.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return `
    <article class="inbox-card" data-inbox-id="${task.id}">
      <div class="inbox-card-main">
        <div class="inbox-card-header">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="inbox-time">${createdAt}</span>
        </div>
        <form class="inbox-form" data-inbox-form="${task.id}">
          <div class="inbox-form-row">
            <label>所属项目
              <select name="project" required>
                ${state.projects.map((project) => `<option value="${escapeHtml(project.name)}" ${project.name === defaultProject ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}
              </select>
            </label>
            <label>负责人
              <input name="owner" required placeholder="例如小陈">
            </label>
            <label>截止日期
              <input name="due" type="date">
            </label>
          </div>
          <label>备注
            <textarea name="note" placeholder="补充任务背景"></textarea>
          </label>
          <div class="inbox-form-actions">
            <button type="button" class="ghost" data-delete-inbox="${task.id}">删除</button>
            <button type="submit" class="primary">补全并加入待办 →</button>
          </div>
        </form>
      </div>
    </article>
  `;
}

function bindEvents() {
  document.querySelector("#quick-input-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = new FormData(event.target).get("quickTitle").trim();
    if (!title) return;
    state.inboxTasks.unshift({
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString()
    });
    saveState();
    render();
  });

  document.querySelector("#project-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = new FormData(event.target).get("name").trim();
    if (!name || state.projects.some((project) => project.name === name)) return;
    state.projects.push({ id: crypto.randomUUID(), name });
    saveState();
    render();
  });

  document.querySelector("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.tasks.unshift({
      id: crypto.randomUUID(),
      project: data.project,
      title: data.title.trim(),
      owner: data.owner.trim(),
      due: data.due,
      note: data.note.trim(),
      status: "todo"
    });
    saveState();
    render();
  });

  document.querySelector("#project-filter").addEventListener("change", (event) => {
    state.selectedProject = event.target.value;
    saveState();
    render();
  });

  document.querySelectorAll("[data-remove-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = state.projects.find((item) => item.id === button.dataset.removeProject);
      state.projects = state.projects.filter((item) => item.id !== button.dataset.removeProject);
      state.tasks = state.tasks.filter((task) => task.project !== project.name);
      state.selectedProject = "all";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => task.id !== button.dataset.deleteTask);
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-delete-inbox]").forEach((button) => {
    button.addEventListener("click", () => {
      state.inboxTasks = state.inboxTasks.filter((task) => task.id !== button.dataset.deleteInbox);
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-inbox-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const inboxId = form.dataset.inboxForm;
      const inboxTask = state.inboxTasks.find((t) => t.id === inboxId);
      if (!inboxTask) return;
      const data = Object.fromEntries(new FormData(form));
      state.tasks.unshift({
        id: crypto.randomUUID(),
        project: data.project,
        title: inboxTask.title,
        owner: data.owner.trim(),
        due: data.due,
        note: data.note.trim(),
        status: "todo"
      });
      state.inboxTasks = state.inboxTasks.filter((t) => t.id !== inboxId);
      saveState();
      render();
    });
  });

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", card.dataset.taskId));
  });

  document.querySelectorAll(".dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      const task = state.tasks.find((item) => item.id === event.dataTransfer.getData("text/plain"));
      if (task) task.status = zone.dataset.status;
      saveState();
      render();
    });
  });
}

function daysUntil(dateValue) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateValue) - start) / 86400000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

render();
