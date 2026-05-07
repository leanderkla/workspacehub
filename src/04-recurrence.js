'use strict';

// ===== src/04-recurrence.js =====
// Wave-1 extraction (M0): the recurrence engine. Date math, recurrence
// rule expansion, the next-occurrence calculator, and the recurring-reminder
// spawner that the main-process reminder poller calls back into via a
// preload-bridged event handler.
//
// var conversion: WEEKDAY_LABELS_SHORT and NTH_LABELS, both top-level
// consts referenced inside this file today but kept on the cross-file
// rule for uniformity.
//
// spawnNextRecurringReminder is called from the residual init()'s
// window.api.onReminderFired callback. The function declaration stays
// global at script top-level, so the callback resolves it identically
// across the script-tag boundary.
// ===== RECURRENCE =====
var WEEKDAY_LABELS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var NTH_LABELS = { '1':'first', '2':'second', '3':'third', '4':'fourth', '-1':'last' };

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nthWeekdayOfMonth(year, month, nth, weekday) {
  if (nth === -1) {
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    last.setDate(last.getDate() - diff);
    return last;
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const date = 1 + offset + (nth - 1) * 7;
  const result = new Date(year, month, date);
  if (result.getMonth() !== month) return null;
  return result;
}

function computeNextOccurrence(rule, fromDate) {
  if (!rule) return null;
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  const n = Math.max(1, parseInt(rule.interval) || 1);

  switch (rule.type) {
    case 'daily': {
      d.setDate(d.getDate() + n);
      return d;
    }
    case 'weekly': {
      const days = (rule.weekdays && rule.weekdays.length)
        ? [...rule.weekdays].sort((a,b) => a - b)
        : [d.getDay()];
      const cur = d.getDay();
      const later = days.find(x => x > cur);
      if (later != null && n === 1) {
        const next = new Date(d);
        next.setDate(d.getDate() + (later - cur));
        return next;
      }
      const next = new Date(d);
      next.setDate(d.getDate() + (7 * n) - cur + days[0]);
      return next;
    }
    case 'monthly-date': {
      const day = rule.monthDay || d.getDate();
      const next = new Date(d);
      next.setDate(1);
      next.setMonth(next.getMonth() + n);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, lastDay));
      return next;
    }
    case 'monthly-nth': {
      const next = new Date(d.getFullYear(), d.getMonth() + n, 1);
      return nthWeekdayOfMonth(next.getFullYear(), next.getMonth(), rule.nthWeek, rule.nthWeekday) || next;
    }
    case 'yearly': {
      const next = new Date(d);
      next.setFullYear(d.getFullYear() + n);
      return next;
    }
  }
  return null;
}

function computeFirstUpcomingOccurrence(rule, fromDate) {
  if (!rule) return null;
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  switch (rule.type) {
    case 'daily':
      return new Date(today);
    case 'weekly': {
      const days = (rule.weekdays && rule.weekdays.length)
        ? [...rule.weekdays].sort((a,b) => a - b)
        : [today.getDay()];
      const cur = today.getDay();
      const same = days.find(x => x >= cur);
      if (same != null) {
        const d = new Date(today);
        d.setDate(today.getDate() + (same - cur));
        return d;
      }
      const d = new Date(today);
      d.setDate(today.getDate() + (7 - cur) + days[0]);
      return d;
    }
    case 'monthly-date': {
      const day = rule.monthDay || 1;
      const lastDayThis = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(day, lastDayThis));
      if (thisMonth >= today) return thisMonth;
      const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayNext = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth() + 1, 0).getDate();
      nextMonthFirst.setDate(Math.min(day, lastDayNext));
      return nextMonthFirst;
    }
    case 'monthly-nth': {
      const thisMonth = nthWeekdayOfMonth(today.getFullYear(), today.getMonth(), rule.nthWeek, rule.nthWeekday);
      if (thisMonth && thisMonth >= today) return thisMonth;
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return nthWeekdayOfMonth(next.getFullYear(), next.getMonth(), rule.nthWeek, rule.nthWeekday) || next;
    }
    case 'yearly':
      return new Date(today);
  }
  return null;
}

function describeRecurrence(r) {
  if (!r) return '';
  const n = Math.max(1, parseInt(r.interval) || 1);
  switch (r.type) {
    case 'daily':
      return n === 1 ? 'Every day' : `Every ${n} days`;
    case 'weekly': {
      const days = (r.weekdays || []).slice().sort((a,b)=>a-b).map(d => WEEKDAY_LABELS_SHORT[d]).join(', ');
      if (n === 1) return days ? `Every week on ${days}` : 'Every week';
      return days ? `Every ${n} weeks on ${days}` : `Every ${n} weeks`;
    }
    case 'monthly-date':
      return (n === 1 ? 'Every month' : `Every ${n} months`) + ` on day ${r.monthDay}`;
    case 'monthly-nth':
      return (n === 1 ? 'Every month' : `Every ${n} months`) + ` on the ${NTH_LABELS[String(r.nthWeek)]} ${WEEKDAY_LABELS_SHORT[r.nthWeekday]}`;
    case 'yearly':
      return n === 1 ? 'Every year' : `Every ${n} years`;
  }
  return '';
}

/**
 * Spawn the next occurrence of a recurring reminder. Adds a new reminder
 * to the project's reminder list with the next datetime. Returns the new
 * reminder or null. Caller should saveData() afterwards.
 */
function spawnNextRecurringReminder(projectKey, r) {
  if (!r || !r.recurrence || !r.datetime) return null;
  const proj = state.data.projects[projectKey];
  if (!proj) return null;
  const baseDate = new Date(r.datetime);
  const nextDay = computeNextOccurrence(r.recurrence, baseDate);
  if (!nextDay) return null;
  // Preserve the original time-of-day on the new occurrence
  nextDay.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
  const clone = {
    id: generateId('rem'),
    title: r.title,
    note: r.note || '',
    datetime: nextDay.toISOString(),
    fired: false,
    tags: [...(r.tags || [])],
    recurrence: { ...r.recurrence, weekdays: r.recurrence.weekdays ? [...r.recurrence.weekdays] : undefined }
  };
  proj.reminders.push(clone);
  return clone;
}

function spawnNextRecurringTodo(t) {
  if (!t || !t.recurrence) return null;
  const base = t.dueDate ? new Date(t.dueDate) : new Date();
  const next = computeNextOccurrence(t.recurrence, base);
  if (!next) return null;
  const clone = {
    id: generateId('todo'),
    title: t.title,
    done: false,
    priority: t.priority,
    subprojectId: t.subprojectId,
    tags: [...(t.tags || [])],
    startDate: null,
    dueDate: toDateString(next),
    created: new Date().toISOString(),
    attachments: [],
    steps: (t.steps || []).map(s => ({
      id: generateId('step'),
      title: s.title,
      done: false,
      created: new Date().toISOString()
    })),
    recurrence: { ...t.recurrence, weekdays: t.recurrence.weekdays ? [...t.recurrence.weekdays] : undefined }
  };
  if (t.startDate && t.dueDate) {
    const diffMs = new Date(t.dueDate) - new Date(t.startDate);
    if (!isNaN(diffMs)) {
      const newStart = new Date(next.getTime() - diffMs);
      clone.startDate = toDateString(newStart);
    }
  }
  getProject().todos.unshift(clone);
  return clone;
}

function openRecurrenceEditor({ title, initial, hasExisting, onSave, onRemove, onRestart }) {
  const overlay = document.getElementById('modal-overlay');
  const today = new Date();
  let draft = initial ? JSON.parse(JSON.stringify(initial)) : null;

  const presetDefault = (type) => {
    switch (type) {
      case 'daily':        return { type, interval: 1 };
      case 'weekly':       return { type, interval: 1, weekdays: [today.getDay()] };
      case 'monthly-date': return { type, interval: 1, monthDay: today.getDate() };
      case 'monthly-nth':  return { type, interval: 1, nthWeek: Math.min(4, Math.ceil(today.getDate() / 7)), nthWeekday: today.getDay() };
      case 'yearly':       return { type, interval: 1 };
    }
    return null;
  };

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };

  const render = () => {
    const type = draft?.type || 'none';
    const unit = { daily: 'days', weekly: 'weeks', 'monthly-date': 'months', 'monthly-nth': 'months', yearly: 'years' }[type] || '';
    const isMonthly = type === 'monthly-date' || type === 'monthly-nth';
    overlay.innerHTML = `
      <div class="modal recurrence-modal">
        <h3>Repeat — ${escapeHTML(title)}</h3>
        <div class="settings-label">Frequency</div>
        <div class="recur-presets">
          ${['none','daily','weekly','monthly','yearly'].map(p => {
            const active = (p === 'none' && type === 'none') ||
              (p === 'daily' && type === 'daily') ||
              (p === 'weekly' && type === 'weekly') ||
              (p === 'monthly' && isMonthly) ||
              (p === 'yearly' && type === 'yearly');
            const label = { none:'Never', daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly' }[p];
            return `<button class="recur-preset ${active?'selected':''}" data-preset="${p}">${label}</button>`;
          }).join('')}
        </div>
        ${type !== 'none' ? `
          <div class="recur-row">
            <span>Every</span>
            <input type="number" min="1" max="99" class="recur-interval" value="${draft.interval || 1}">
            <span>${unit}</span>
          </div>
          ${type === 'weekly' ? `
            <div class="settings-label">On these days</div>
            <div class="recur-weekdays">
              ${WEEKDAY_LABELS_SHORT.map((lbl, i) => `
                <button class="recur-day ${draft.weekdays?.includes(i)?'selected':''}" data-weekday="${i}">${lbl}</button>
              `).join('')}
            </div>` : ''}
          ${isMonthly ? `
            <div class="recur-row recur-month-mode">
              <label class="recur-radio">
                <input type="radio" name="monthly-mode" value="date" ${type==='monthly-date'?'checked':''}>
                On day
                <input type="number" min="1" max="31" class="recur-month-day" value="${draft.monthDay || 1}" ${type!=='monthly-date'?'disabled':''}>
              </label>
            </div>
            <div class="recur-row recur-month-mode">
              <label class="recur-radio">
                <input type="radio" name="monthly-mode" value="nth" ${type==='monthly-nth'?'checked':''}>
                On the
                <select class="recur-nth-week" ${type!=='monthly-nth'?'disabled':''}>
                  ${[[1,'First'],[2,'Second'],[3,'Third'],[4,'Fourth'],[-1,'Last']].map(([v,l]) => `<option value="${v}" ${draft.nthWeek==v?'selected':''}>${l}</option>`).join('')}
                </select>
                <select class="recur-nth-weekday" ${type!=='monthly-nth'?'disabled':''}>
                  ${WEEKDAY_LABELS_SHORT.map((lbl, i) => `<option value="${i}" ${draft.nthWeekday==i?'selected':''}>${lbl}</option>`).join('')}
                </select>
              </label>
            </div>` : ''}
          <div class="recur-preview">🔁 ${escapeHTML(describeRecurrence(draft))}</div>
        ` : '<div class="recur-preview recur-preview-muted">This todo will not repeat.</div>'}
        <div class="modal-buttons">
          ${hasExisting ? `<button class="btn btn-danger btn-sm" id="recur-remove" style="margin-right:auto">Remove</button>` : ''}
          ${draft && onRestart ? `<button class="btn btn-secondary btn-sm" id="recur-restart" title="Reset due date to the next upcoming occurrence from today">↺ Restart</button>` : ''}
          <button class="btn btn-secondary" id="recur-cancel">Cancel</button>
          <button class="btn btn-primary" id="recur-save">Save</button>
        </div>
      </div>`;

    overlay.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'none') draft = null;
      else if (p === 'monthly') draft = presetDefault('monthly-date');
      else draft = presetDefault(p);
      render();
    }));

    const intervalInput = overlay.querySelector('.recur-interval');
    intervalInput?.addEventListener('input', () => {
      draft.interval = Math.max(1, parseInt(intervalInput.value) || 1);
      const preview = overlay.querySelector('.recur-preview');
      if (preview) preview.textContent = '🔁 ' + describeRecurrence(draft);
    });

    overlay.querySelectorAll('.recur-day').forEach(b => b.addEventListener('click', () => {
      const d = parseInt(b.dataset.weekday);
      if (!Array.isArray(draft.weekdays)) draft.weekdays = [];
      if (draft.weekdays.includes(d)) draft.weekdays = draft.weekdays.filter(x => x !== d);
      else draft.weekdays.push(d);
      render();
    }));

    overlay.querySelectorAll('input[name="monthly-mode"]').forEach(r => r.addEventListener('change', () => {
      if (r.value === 'date') draft = presetDefault('monthly-date');
      else draft = presetDefault('monthly-nth');
      render();
    }));

    overlay.querySelector('.recur-month-day')?.addEventListener('change', (e) => {
      draft.monthDay = Math.max(1, Math.min(31, parseInt(e.target.value) || 1));
      render();
    });
    overlay.querySelector('.recur-nth-week')?.addEventListener('change', (e) => {
      draft.nthWeek = parseInt(e.target.value);
      render();
    });
    overlay.querySelector('.recur-nth-weekday')?.addEventListener('change', (e) => {
      draft.nthWeekday = parseInt(e.target.value);
      render();
    });

    document.getElementById('recur-remove')?.addEventListener('click', () => {
      close();
      if (onRemove) onRemove();
    });
    document.getElementById('recur-restart')?.addEventListener('click', () => {
      if (!draft) return;
      if (draft.type === 'weekly' && (!draft.weekdays || !draft.weekdays.length)) {
        showToast('Pick at least one weekday first.', 'error');
        return;
      }
      close();
      if (onRestart) onRestart(draft);
    });
    document.getElementById('recur-cancel').onclick = close;
    document.getElementById('recur-save').onclick = () => {
      if (draft && draft.type === 'weekly' && (!draft.weekdays || !draft.weekdays.length)) {
        showToast('Pick at least one weekday.', 'error');
        return;
      }
      close();
      if (onSave) onSave(draft);
    };
  };

  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function showRecurrenceModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  openRecurrenceEditor({
    title: t.title,
    initial: t.recurrence,
    hasExisting: !!t.recurrence,
    onSave: (rule) => {
      t.recurrence = rule;
      if (rule && !t.dueDate) {
        const first = computeNextOccurrence(rule, new Date());
        if (first) t.dueDate = toDateString(first);
      }
      saveData();
      renderApp();
    },
    onRemove: () => {
      t.recurrence = null;
      saveData();
      renderApp();
    },
    onRestart: (draft) => {
      const first = computeFirstUpcomingOccurrence(draft, new Date());
      if (!first) { showToast('Could not compute next occurrence.', 'error'); return; }
      const newDue = toDateString(first);
      if (t.dueDate === newDue) {
        showToast(`Already set to ${formatDate(newDue)}.`, 'info');
        return;
      }
      if (t.startDate && t.dueDate) {
        const diffMs = new Date(t.dueDate) - new Date(t.startDate);
        if (!isNaN(diffMs) && diffMs >= 0) {
          t.startDate = toDateString(new Date(first.getTime() - diffMs));
        }
      }
      t.dueDate = newDue;
      t.recurrence = draft;
      t.done = false;
      saveData();
      renderApp();
      showToast(`Restarted → due ${formatDate(newDue)}`, 'success');
    }
  });
}

function updatePendingRecurrenceButton(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const rule = state.pendingTodoRecurrence;
  btn.classList.toggle('active', !!rule);
  btn.title = rule ? describeRecurrence(rule) : 'Set recurrence';
  btn.textContent = rule ? `🔁 ${describeRecurrence(rule)}` : '🔁 Repeat';
}

function openPendingRecurrenceEditor(options = {}) {
  const inputId = options.inputId || 'todo-input';
  const buttonId = options.buttonId || 'btn-add-todo-recur';
  const title = document.getElementById(inputId)?.value.trim() || 'New todo';
  openRecurrenceEditor({
    title,
    initial: state.pendingTodoRecurrence,
    hasExisting: !!state.pendingTodoRecurrence,
    onSave: (rule) => {
      state.pendingTodoRecurrence = rule;
      updatePendingRecurrenceButton(buttonId);
      document.getElementById(inputId)?.focus();
    },
    onRemove: () => {
      state.pendingTodoRecurrence = null;
      updatePendingRecurrenceButton(buttonId);
      document.getElementById(inputId)?.focus();
    }
  });
}

function toggleTodoExpanded(todoId) {
  if (!state.expandedTodos) state.expandedTodos = new Set();
  if (state.expandedTodos.has(todoId)) state.expandedTodos.delete(todoId);
  else state.expandedTodos.add(todoId);
  renderTodos();
}

function addTodoStep(todoId, title) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const trimmed = (title || '').trim();
  if (!trimmed) return false;
  if (!Array.isArray(t.steps)) t.steps = [];
  t.steps.push({ id: generateId('step'), title: trimmed, done: false, created: new Date().toISOString() });
  state.expandedTodos.add(todoId);
  saveData();
  return true;
}

function toggleTodoStep(todoId, stepId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  const s = t.steps.find(x => x.id === stepId);
  if (!s) return false;
  s.done = !s.done;
  saveData();
  return true;
}

function deleteTodoStep(todoId, stepId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  t.steps = t.steps.filter(x => x.id !== stepId);
  saveData();
  return true;
}

function updateTodoStepTitle(todoId, stepId, newTitle) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  const s = t.steps.find(x => x.id === stepId);
  if (!s) return false;
  const trimmed = (newTitle || '').trim();
  if (!trimmed || trimmed === s.title) return false;
  s.title = trimmed;
  saveData();
  return true;
}

function convertTodoToNote(todoId) {
  const proj = getProject();
  const t = proj.todos.find(x => x.id === todoId);
  if (!t) return;

  const lines = [];
  const meta = [];
  if (t.priority && t.priority !== 'medium') meta.push(`Priority: ${t.priority}`);
  if (t.startDate && t.dueDate) meta.push(`${formatDate(t.startDate)} → ${formatDate(t.dueDate)}`);
  else if (t.dueDate) meta.push(`Due: ${formatDate(t.dueDate)}`);
  else if (t.startDate) meta.push(`Starts: ${formatDate(t.startDate)}`);
  if (t.recurrence) meta.push(`Repeats: ${describeRecurrence(t.recurrence)}`);
  if (meta.length) {
    lines.push(meta.join(' · '));
    lines.push('');
  }
  if (Array.isArray(t.steps) && t.steps.length) {
    t.steps.forEach(s => {
      lines.push(`${s.done ? '☑' : '☐'} ${s.title}`);
    });
  }
  const content = lines.join('\n');

  const now = new Date().toISOString();
  const note = {
    id: generateId('note'),
    title: t.title,
    content,
    priority: t.priority || 'medium',
    tags: [],
    subprojectId: t.subprojectId || null,
    linkedTodos: [t.id],
    created: now,
    updated: now,
    attachments: []
  };
  proj.notes.unshift(note);
  saveData();
  showToast(`Converted to note: "${t.title}"`, 'success');

  state.editingNote = note.id;
  showView('notes');
}

function setTodoDates(todoId, startDate, dueDate) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const s = startDate || null;
  const d = dueDate || null;
  if (s && d && new Date(s) > new Date(d)) return false;
  if (t.startDate === s && t.dueDate === d) return false;
  t.startDate = s;
  t.dueDate = d;
  saveData();
  return true;
}

function showTodoDatesModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Set dates</h3>
      <div style="font-size:12px; color:var(--text-muted); margin:-8px 0 14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHTML(t.title)}</div>
      <div class="dates-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Start</label>
          <input type="date" class="form-input" id="dates-start" value="${t.startDate || ''}">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Due</label>
          <input type="date" class="form-input" id="dates-due" value="${t.dueDate || ''}">
        </div>
      </div>
      <div class="dates-hint">Leave either field empty to remove it.</div>
      <div class="modal-buttons">
        ${(t.startDate || t.dueDate) ? `<button class="btn btn-danger btn-sm" id="dates-clear" style="margin-right:auto">Clear</button>` : ''}
        <button class="btn btn-secondary" id="dates-cancel">Cancel</button>
        <button class="btn btn-primary" id="dates-save">Save</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  document.getElementById('dates-clear')?.addEventListener('click', () => {
    if (setTodoDates(todoId, null, null)) { close(); renderApp(); }
    else close();
  });
  document.getElementById('dates-cancel').onclick = close;
  document.getElementById('dates-save').onclick = () => {
    const s = document.getElementById('dates-start').value || null;
    const d = document.getElementById('dates-due').value || null;
    if (s && d && new Date(s) > new Date(d)) {
      showToast('Start date must be on or before due date.', 'error');
      return;
    }
    setTodoDates(todoId, s, d);
    close();
    renderApp();
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function setTodoSubproject(todoId, spId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const next = spId || null;
  if (t.subprojectId === next) return false;
  t.subprojectId = next;
  saveData();
  return true;
}

function moveTodoToProject(todoId, targetKey) {
  if (!state.data.projects[targetKey]) return false;
  if (targetKey === state.project) return false;
  const source = state.data.projects[state.project];
  const idx = source.todos.findIndex(t => t.id === todoId);
  if (idx === -1) return false;
  const [todo] = source.todos.splice(idx, 1);
  todo.subprojectId = null;
  source.notes.forEach(n => {
    if (Array.isArray(n.linkedTodos)) n.linkedTodos = n.linkedTodos.filter(id => id !== todoId);
  });
  state.data.projects[targetKey].todos.unshift(todo);
  saveData();
  return true;
}

function setTodoPriority(id, priority) {
  if (!['high','medium','low'].includes(priority)) return false;
  const t = getProject().todos.find(x => x.id === id);
  if (!t || t.priority === priority) return false;
  t.priority = priority;
  saveData();
  return true;
}

function updateTodoTitle(id, newTitle) {
  const t = getProject().todos.find(x => x.id === id);
  if (!t) return false;
  const trimmed = newTitle.trim();
  if (!trimmed || trimmed === t.title) return false;
  t.title = trimmed;
  saveData();
  return true;
}

function bindEditableTodoTitles(scopeSelector, onCommit) {
  document.querySelectorAll(`${scopeSelector} .todo-title[contenteditable="true"]`).forEach(el => {
    const id = el.dataset.id;
    const original = el.textContent;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.textContent = original; el.blur(); }
    });
    el.addEventListener('blur', () => {
      const changed = updateTodoTitle(id, el.textContent);
      if (changed) onCommit();
      else el.textContent = original;
    });
  });
}

function addTodo() {
  const rawTitle = document.getElementById('todo-input').value.trim();
  if (!rawTitle) return;
  // Slash commands inside the title override the form fields so power users can
  // capture priority, due date, subproject etc. without leaving the keyboard.
  const slash = parseTodoSlashCommands(rawTitle);
  const title = slash.title || rawTitle;
  if (!title) return;
  const priority     = slash.priority || document.getElementById('todo-priority').value;
  const subprojectId = slash.subprojectId || document.getElementById('todo-subproject').value || null;
  const startDate    = slash.startDate || document.getElementById('todo-start').value;
  let   dueDate      = slash.dueDate || document.getElementById('todo-due').value;
  const recurrence   = slash.recurrence
    ? JSON.parse(JSON.stringify(slash.recurrence))
    : (state.pendingTodoRecurrence ? JSON.parse(JSON.stringify(state.pendingTodoRecurrence)) : null);
  if (recurrence && !dueDate) {
    const first = computeNextOccurrence(recurrence, new Date());
    if (first) dueDate = toDateString(first);
  }
  const proj = getProject();
  const tagsRaw = document.getElementById('todo-tags')?.value || '';
  const tags = parseTagsString(tagsRaw);
  proj.todos.unshift({
    id: generateId('todo'), title, done: false, priority, startDate, dueDate, subprojectId, tags,
    created: new Date().toISOString(),
    attachments: [], steps: [], recurrence
  });
  state.pendingTodoRecurrence = null;
  saveData();
  renderTodos();
}

// Renders the grey ghost-text completion behind the todo input. The ghost div mirrors
// the input's typed text in transparent ink (so it takes up the same horizontal space)
// and appends the suggestion in a muted color right after the caret position.
// Element refs default to the main todos-view IDs so existing callers keep
// working unchanged. Pass explicit elements to drive a different input/ghost
// pair (the spark-map detail panel uses this for its own todo input).
function updateTodoSlashGhost(input, ghost) {
  input = input || document.getElementById('todo-input');
  ghost = ghost || document.getElementById('todo-input-ghost');
  if (!input || !ghost) return;
  const cur = input.selectionStart ?? input.value.length;
  // Only show the ghost when the caret is at the end of the value AND of the slash token.
  // If the user has the caret in the middle of the input, suggesting feels wrong.
  if (cur !== input.value.length) {
    ghost.hidden = true;
    ghost.innerHTML = '';
    return;
  }
  const sug = suggestSlashCompletion(input.value, cur);
  if (!sug || !sug.completion) {
    ghost.hidden = true;
    ghost.innerHTML = '';
    return;
  }
  ghost.hidden = false;
  ghost.innerHTML = `<span class="todo-input-ghost-typed">${escapeHTML(sug.typed)}</span><span class="todo-input-ghost-suggest">${escapeHTML(sug.completion)}</span><span class="todo-input-ghost-tab" title="Press Tab to accept">⇥ Tab</span>`;
}

// Live feedback for the slash-command parser — shown as chips under the input.
// `host` defaults to the main todos-view chips container; pass a different
// element to drive a panel-specific chips strip (spark-map detail panel).
function updateTodoSlashChips(rawText, host) {
  host = host || document.getElementById('todo-slash-chips');
  if (!host) return;
  const slash = parseTodoSlashCommands(rawText || '');
  if (!slash.tokens.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  const iconFor = (type) => type === 'due' ? '📅'
                          : type === 'start' ? '▶'
                          : type === 'priority' ? '🎯'
                          : type === 'subproject' ? '📁'
                          : type === 'recurrence' ? '🔁' : '·';
  host.hidden = false;
  host.innerHTML = slash.tokens.map(tok =>
    `<span class="slash-chip slash-chip-${tok.type}">
      <span class="slash-chip-ic">${iconFor(tok.type)}</span>
      <span>${escapeHTML(tok.label)}</span>
    </span>`
  ).join('');
}

// Wires ghost-text completion + live chips + Tab-accept onto an arbitrary
// input. Both the main todos-view and the spark-map detail panel call this
// to get identical slash-command UX. `chipsHost` and `fields` are optional.
//
// `fields`, when provided, gives a real-time sync: as the user types a slash
// command, the corresponding form field's value updates so the user sees the
// parse reflected in the controls below. Manually changing a field releases
// our control and remembers the user's pick — backspacing the slash then
// reverts to that manual value, not the hard default.
function installTodoSlashCompletion(input, ghost, chipsHost, fields) {
  if (!input) return;
  fields = fields || {};

  // Manual-change listener per synced field. When the user manually changes
  // a field while slash had control of it, we record the slash value at
  // that moment as `slashOverrideFor` — future refreshes that see the same
  // slash value skip re-taking control, so the manual pick survives across
  // keystrokes. As soon as the slash command resolves to a different value
  // (or disappears), control is taken back / released cleanly.
  Object.values(fields).forEach(el => {
    if (!el || el._slashChangeHooked) return;
    el.addEventListener('change', () => {
      if (el.dataset.slashControlled === '1') {
        el.dataset.slashOverrideFor = el.dataset.slashControlValue || '';
      }
      delete el.dataset.slashControlled;
      delete el.dataset.slashManual;
      delete el.dataset.slashControlValue;
    });
    el._slashChangeHooked = true;
  });

  const refresh = () => {
    if (ghost) updateTodoSlashGhost(input, ghost);
    const slash = parseTodoSlashCommands(input.value);
    if (chipsHost) updateTodoSlashChips(input.value, chipsHost);
    syncSlashField(fields.priority,   slash.priority,    'medium');
    syncSlashField(fields.due,        slash.dueDate,     '');
    syncSlashField(fields.start,      slash.startDate,   '');
    syncSlashField(fields.subproject, slash.subprojectId, '');
  };

  input.addEventListener('input', refresh);
  input.addEventListener('focus', refresh);
  input.addEventListener('click', refresh);
  input.addEventListener('keyup', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) refresh();
  });
  input.addEventListener('blur', () => {
    if (ghost) { ghost.hidden = true; ghost.innerHTML = ''; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const sug = suggestSlashCompletion(input.value, input.selectionStart || 0);
    if (!sug || !sug.completion) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = input.selectionStart || 0;
    input.value = input.value.slice(0, cur) + sug.completion + input.value.slice(cur);
    const newPos = cur + sug.completion.length;
    input.setSelectionRange(newPos, newPos);
    refresh();
  });
  refresh();
}

// Drive a single form field from a slash-parsed value. The state machine:
//
//   slash has value, no override:     take control, snapshot manual baseline,
//                                     remember slash value for override check
//   slash has value, override matches: leave field alone (user overrode)
//   slash has value, override differs: take control again (slash command
//                                     changed; the previous override no
//                                     longer applies)
//   slash has no value, was controlled: revert to manual baseline (or hard
//                                       default if none was captured)
//
// The slashControlled / slashControlValue / slashOverrideFor data attributes
// double as a styling hook so users can see at a glance which fields are
// currently driven by their typed slash command.
function syncSlashField(el, slashValue, hardDefault) {
  if (!el) return;
  const isControlled = el.dataset.slashControlled === '1';
  const overrideFor  = el.dataset.slashOverrideFor;
  if (slashValue !== undefined && slashValue !== null && slashValue !== '') {
    const slashStr = String(slashValue);
    if (overrideFor !== undefined && overrideFor === slashStr) {
      return;  // user overrode this exact slash value — respect their pick
    }
    if (!isControlled) {
      el.dataset.slashManual = el.value;
    }
    if (el.value !== slashStr) el.value = slashStr;
    el.dataset.slashControlled = '1';
    el.dataset.slashControlValue = slashStr;
    delete el.dataset.slashOverrideFor;  // fresh slash value retakes control
  } else if (isControlled) {
    el.value = el.dataset.slashManual !== undefined ? el.dataset.slashManual : hardDefault;
    delete el.dataset.slashControlled;
    delete el.dataset.slashManual;
    delete el.dataset.slashControlValue;
    delete el.dataset.slashOverrideFor;
  }
}

function openTodoSlashHelp() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const rows = [
    ['/today, /tomorrow', 'Set due date'],
    ['/heute, /morgen', 'German aliases'],
    ['/due 5d', 'Due in N days'],
    ['/due 2026-05-01', 'Due on a specific date'],
    ['/due 5.5.', 'Due on D.M. (rolls to next year if past)'],
    ['/start <date>', 'Set start date (same syntax)'],
    ['/high, /medium, /low', 'Set priority (also /hi /med /lo)'],
    ['/sp:name, /sub name', 'Move to subproject (matches by name)'],
    ['/daily, /weekly, /monthly, /yearly', 'Set recurrence'],
  ];
  overlay.innerHTML = `
    <div class="modal slash-help-modal">
      <h3>Slash commands</h3>
      <p class="slash-help-intro">Type these inside a new todo title — they override the form fields and get stripped from the saved title.</p>
      <table class="slash-help-table">
        ${rows.map(([cmd, desc]) => `
          <tr>
            <td><code>${escapeHTML(cmd)}</code></td>
            <td>${escapeHTML(desc)}</td>
          </tr>`).join('')}
      </table>
      <div class="slash-help-example"><strong>Example:</strong> <code>Call Lukas /tomorrow /high /sp:eh</code></div>
      <div class="modal-buttons">
        <button class="btn btn-primary" id="slash-help-close">Got it</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('slash-help-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function toggleTodo(id) {
  const t = getProject().todos.find(x => x.id === id);
  if (t) { t.done = !t.done; saveData(); }
}

function deleteTodo(id) {
  const proj = getProject();
  proj.todos = proj.todos.filter(t => t.id !== id);
  // Remove from any notes that linked to this todo
  proj.notes.forEach(n => { if (n.linkedTodos) n.linkedTodos = n.linkedTodos.filter(tid => tid !== id); });
  // Remove from any spark-map node linkedItems in this project (Phase 1
  // orphan cleanup — keeps the link graph tidy without relying on
  // orphan rendering as a safety net).
  cleanupNodeLinksOnEntityDelete(state.project, 'todo', id);
  saveData();
  if (state.view === 'todos') renderTodos();
  else if (state.view === 'subprojects') renderSubprojects();
  else if (state.view === 'dashboard') renderDashboard();
}

function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 };
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return { h: 0, s: 0, l: 0 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) hue = ((b - r) / d + 2);
    else hue = ((r - g) / d + 4);
    hue *= 60;
  }
  return { h: hue, s, l };
}

function sortSubprojects(sps, sortBy) {
  const arr = [...sps];
  if (sortBy === 'name') {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'color') {
    arr.sort((a, b) => {
      const ha = hexToHsl(a.color);
      const hb = hexToHsl(b.color);
      const aGray = ha.s < 0.1 ? 1 : 0;
      const bGray = hb.s < 0.1 ? 1 : 0;
      if (aGray !== bGray) return aGray - bGray;
      if (aGray) return ha.l - hb.l;
      return ha.h - hb.h;
    });
  } else if (sortBy === 'firstTag') {
    arr.sort((a, b) => {
      const ta = (a.tags && a.tags[0]) || '';
      const tb = (b.tags && b.tags[0]) || '';
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    });
  }
  return arr;
}

function getAllProjectTags() {
  const proj = getProject();
  if (!proj) return [];
  const tags = new Set();
  (proj.notes || []).forEach(n => (n.tags || []).forEach(t => { if (t) tags.add(t); }));
  (proj.subprojects || []).forEach(s => (s.tags || []).forEach(t => { if (t) tags.add(t); }));
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

