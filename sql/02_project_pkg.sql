-- =============================================================
-- PTD_PROJECT_PKG — project and task logic
-- Example APEX usage (page process on the tasks page):
--   ptd_project_pkg.complete_task(p_task_id => :P5_TASK_ID);
-- =============================================================

CREATE OR REPLACE PACKAGE ptd_project_pkg AS

  FUNCTION project_progress (p_project_id IN ptd_projects.project_id%TYPE) RETURN NUMBER;

  PROCEDURE add_task (
    p_project_id  IN ptd_tasks.project_id%TYPE,
    p_task_title  IN ptd_tasks.task_title%TYPE,
    p_assignee_id IN ptd_tasks.assignee_id%TYPE DEFAULT NULL
  );

  PROCEDURE complete_task (p_task_id IN ptd_tasks.task_id%TYPE);

  PROCEDURE reopen_task (p_task_id IN ptd_tasks.task_id%TYPE);

  PROCEDURE set_status (
    p_project_id IN ptd_projects.project_id%TYPE,
    p_status     IN ptd_projects.status%TYPE
  );

END ptd_project_pkg;
/

CREATE OR REPLACE PACKAGE BODY ptd_project_pkg AS

  FUNCTION project_progress (p_project_id IN ptd_projects.project_id%TYPE) RETURN NUMBER IS
    l_total  NUMBER;
    l_done   NUMBER;
    l_status ptd_projects.status%TYPE;
  BEGIN
    SELECT status INTO l_status FROM ptd_projects WHERE project_id = p_project_id;
    IF l_status = 'Completed' THEN
      RETURN 100;
    END IF;

    SELECT COUNT(*), COUNT(CASE WHEN is_done = 'Y' THEN 1 END)
      INTO l_total, l_done
      FROM ptd_tasks
     WHERE project_id = p_project_id;

    RETURN CASE WHEN l_total = 0 THEN 0 ELSE ROUND(l_done / l_total * 100) END;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20101, 'Project ' || p_project_id || ' does not exist.');
  END project_progress;

  -- Keeps the project status in line with its tasks
  PROCEDURE sync_status (p_project_id IN NUMBER) IS
    l_open   NUMBER;
    l_total  NUMBER;
  BEGIN
    SELECT COUNT(*), COUNT(CASE WHEN is_done = 'N' THEN 1 END)
      INTO l_total, l_open
      FROM ptd_tasks
     WHERE project_id = p_project_id;

    IF l_total > 0 AND l_open = 0 THEN
      UPDATE ptd_projects
         SET status = 'Completed', completed_on = TRUNC(SYSDATE)
       WHERE project_id = p_project_id;
    ELSE
      UPDATE ptd_projects
         SET status = 'In progress', completed_on = NULL
       WHERE project_id = p_project_id
         AND status IN ('Completed', 'Planning')
         AND l_total > l_open;   -- at least one task done
    END IF;
  END sync_status;

  PROCEDURE add_task (
    p_project_id  IN ptd_tasks.project_id%TYPE,
    p_task_title  IN ptd_tasks.task_title%TYPE,
    p_assignee_id IN ptd_tasks.assignee_id%TYPE DEFAULT NULL
  ) IS
  BEGIN
    INSERT INTO ptd_tasks (project_id, task_title, assignee_id)
    VALUES (p_project_id, TRIM(p_task_title), p_assignee_id);

    -- A new open task re-opens a completed project
    UPDATE ptd_projects
       SET status = 'In progress', completed_on = NULL
     WHERE project_id = p_project_id
       AND status = 'Completed';
  END add_task;

  PROCEDURE complete_task (p_task_id IN ptd_tasks.task_id%TYPE) IS
    l_project_id NUMBER;
  BEGIN
    UPDATE ptd_tasks
       SET is_done = 'Y', done_on = SYSDATE
     WHERE task_id = p_task_id
    RETURNING project_id INTO l_project_id;

    IF l_project_id IS NULL THEN
      RAISE_APPLICATION_ERROR(-20102, 'Task ' || p_task_id || ' does not exist.');
    END IF;
    sync_status(l_project_id);
  END complete_task;

  PROCEDURE reopen_task (p_task_id IN ptd_tasks.task_id%TYPE) IS
    l_project_id NUMBER;
  BEGIN
    UPDATE ptd_tasks
       SET is_done = 'N', done_on = NULL
     WHERE task_id = p_task_id
    RETURNING project_id INTO l_project_id;

    IF l_project_id IS NULL THEN
      RAISE_APPLICATION_ERROR(-20102, 'Task ' || p_task_id || ' does not exist.');
    END IF;
    sync_status(l_project_id);
  END reopen_task;

  PROCEDURE set_status (
    p_project_id IN ptd_projects.project_id%TYPE,
    p_status     IN ptd_projects.status%TYPE
  ) IS
  BEGIN
    UPDATE ptd_projects
       SET status       = p_status,
           completed_on = CASE WHEN p_status = 'Completed' THEN TRUNC(SYSDATE) END
     WHERE project_id = p_project_id;

    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20101, 'Project ' || p_project_id || ' does not exist.');
    END IF;
  END set_status;

END ptd_project_pkg;
/

-- -------------------------------------------------------------
-- Dashboard queries (APEX cards / charts)
-- -------------------------------------------------------------

-- KPI cards
SELECT COUNT(CASE WHEN status IN ('Planning', 'In progress') THEN 1 END) AS active_projects,
       COUNT(CASE WHEN is_overdue = 'Y' THEN 1 END)                     AS overdue_projects,
       ROUND(AVG(progress_pct))                                         AS avg_progress
  FROM ptd_project_status_v;

-- Projects by status (bar chart)
SELECT status, COUNT(*) AS projects
  FROM ptd_projects
 GROUP BY status
 ORDER BY projects DESC;

-- Upcoming deadlines
SELECT project_name, owner_name, due_date, days_left, progress_pct
  FROM ptd_project_status_v
 WHERE status <> 'Completed'
 ORDER BY due_date
 FETCH FIRST 5 ROWS ONLY;
