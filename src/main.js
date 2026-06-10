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
  ]
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
        </section>
      </header>

      <section class="layout">
        <aside class="panel">
          <h2>新增项目</h2>
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

function bindEvents() {
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
