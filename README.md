# Project Tracking Dashboard

A dashboard for tracking projects, owners, tasks and deadlines.
It has two parts:

- **Database (`/sql`)** — Oracle tables for team members, projects and tasks, a dashboard view that calculates progress and overdue flags, and a PL/SQL package that keeps project status in sync with its tasks.
- **Web demo (root folder)** — a working front end in plain HTML, CSS and JavaScript using the same data model.

## Features

- KPI cards: active projects, overdue projects, average progress, tasks completed
- Projects-by-status chart and an upcoming-deadlines list with days left / overdue
- Sortable, filterable project table with progress bars and priority badges
- Create, edit and delete projects (with date validation)
- Task checklist per project — ticking every task completes the project automatically, just like `ptd_project_pkg.sync_status`
- Data saved in the browser (localStorage), with a "Reset demo data" button

## Run the web demo

Open `index.html` in a browser — no install needed.
In VS Code you can also use the **Live Server** extension.

## Set up the database (Oracle / Oracle APEX)

| Script | What it creates |
| --- | --- |
| `sql/01_schema.sql` | `PTD_TEAM_MEMBERS`, `PTD_PROJECTS`, `PTD_TASKS`, `PTD_PROJECT_STATUS_V` view, sample data |
| `sql/02_project_pkg.sql` | `PTD_PROJECT_PKG` — progress, add/complete/reopen task, set status — plus dashboard queries |

### Suggested APEX pages

1. **Dashboard** — cards region (KPI query) and a bar chart (projects by status)
2. **Projects** — interactive report on `PTD_PROJECT_STATUS_V` with a percent-bar column
3. **Project detail** — form on `PTD_PROJECTS` plus an interactive grid of tasks; the "Done" button calls `ptd_project_pkg.complete_task`

## Tech

Oracle SQL · PL/SQL · HTML · CSS · JavaScript

---

Built by [Muhammad Usman](https://github.com/musmantech8) — Oracle APEX Developer.
