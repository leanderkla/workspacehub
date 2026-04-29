// Undo / Redo regression tests.

'use strict';

module.exports = function (describe, { eq, ok, get, sandbox, evalIn }) {

  describe('undo / redo', (it) => {
    const undo = get('undo');
    const redo = get('redo');
    const captureInitialUndoSnapshot = get('captureInitialUndoSnapshot');
    const pushUndoSnapshot = get('pushUndoSnapshot');

    // Stub window.api so saveData → _writeDataToDisk doesn't error.
    evalIn(`window.api = window.api || { saveData: async () => {} };`);
    evalIn(`if (!window.api.saveData) window.api.saveData = async () => {};`);
    // Stub render + theme + body.setAttribute since they touch DOM.
    evalIn(`renderApp = () => {};`);
    evalIn(`applyCurrentTheme = () => {};`);
    evalIn(`showToast = () => {};`);

    // Reset stacks + state cleanly for this test group.
    evalIn(`undoStack.length = 0;`);
    evalIn(`redoStack.length = 0;`);
    evalIn(`state.project = 'eh';`);
    evalIn(`state.data = { schemaVersion: 1, activeProject: 'eh', projects: { eh: { name: 'EH', todos: [] } }, pinned: [] };`);

    it('captures an initial snapshot once data exists', () => {
      captureInitialUndoSnapshot();
      eq(evalIn(`undoStack.length`), 1);
    });

    it('pushUndoSnapshot deep-clones (mutating data does not affect the snapshot)', () => {
      // Reset state to a clean baseline (other tests may have mutated)
      evalIn(`undoStack.length = 0;`);
      evalIn(`redoStack.length = 0;`);
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = { schemaVersion: 1, activeProject: 'eh', projects: { eh: { name: 'EH', todos: [] } }, pinned: [] };`);
      captureInitialUndoSnapshot();
      evalIn(`state.data.projects.eh.todos.push({ id: 't1', title: 'first', done: false });`);
      pushUndoSnapshot();
      eq(evalIn(`undoStack.length`), 2);
      evalIn(`state.data.projects.eh.todos[0].title = 'mutated';`);
      eq(evalIn(`undoStack[1].projects.eh.todos[0].title`), 'first');
    });

    it('undo reverts to the previous saved snapshot', async () => {
      // Restore for clean state
      evalIn(`undoStack.length = 0;`);
      evalIn(`redoStack.length = 0;`);
      evalIn(`state.data = { schemaVersion: 1, activeProject: 'eh', projects: { eh: { name: 'EH', todos: [] } }, pinned: [] };`);
      captureInitialUndoSnapshot(); // [empty]

      // Mutate + snapshot once: add a todo
      evalIn(`state.data.projects.eh.todos.push({ id: 't1', title: 'first' });`);
      pushUndoSnapshot();
      // Mutate + snapshot again: add second
      evalIn(`state.data.projects.eh.todos.push({ id: 't2', title: 'second' });`);
      pushUndoSnapshot();

      eq(evalIn(`state.data.projects.eh.todos.length`), 2);
      eq(evalIn(`undoStack.length`), 3);

      await undo();
      eq(evalIn(`state.data.projects.eh.todos.length`), 1, 'after one undo');
      eq(evalIn(`state.data.projects.eh.todos[0].title`), 'first');
      eq(evalIn(`redoStack.length`), 1);

      await undo();
      eq(evalIn(`state.data.projects.eh.todos.length`), 0, 'after two undos');
      eq(evalIn(`redoStack.length`), 2);

      await undo();
      // Already at oldest — undoStack should still have at least 1
      ok(evalIn(`undoStack.length >= 1`), 'never empty');
    });

    it('redo restores the most recently undone state', async () => {
      // Continue from previous test: undoStack=[empty], redoStack=[first, first+second]
      eq(evalIn(`state.data.projects.eh.todos.length`), 0);
      await redo();
      eq(evalIn(`state.data.projects.eh.todos.length`), 1, 'after redo');
      await redo();
      eq(evalIn(`state.data.projects.eh.todos.length`), 2, 'after second redo');
      eq(evalIn(`redoStack.length`), 0);
    });

    it('a new mutation clears the redo stack', async () => {
      // Set up: 3 items, then undo once, then mutate
      evalIn(`undoStack.length = 0;`);
      evalIn(`redoStack.length = 0;`);
      evalIn(`state.data = { schemaVersion: 1, activeProject: 'eh', projects: { eh: { name: 'EH', todos: [] } }, pinned: [] };`);
      captureInitialUndoSnapshot();
      evalIn(`state.data.projects.eh.todos.push({ id: 't1', title: 'a' });`);
      pushUndoSnapshot();
      evalIn(`state.data.projects.eh.todos.push({ id: 't2', title: 'b' });`);
      pushUndoSnapshot();

      await undo();
      eq(evalIn(`redoStack.length`), 1);

      // New mutation
      evalIn(`state.data.projects.eh.todos.push({ id: 't3', title: 'c' });`);
      pushUndoSnapshot();

      eq(evalIn(`redoStack.length`), 0, 'redo stack cleared after new mutation');
    });

    it('respects UNDO_MAX cap', () => {
      evalIn(`undoStack.length = 0;`);
      evalIn(`redoStack.length = 0;`);
      evalIn(`state.data = { schemaVersion: 1, activeProject: 'eh', projects: { eh: { name: 'EH', todos: [] } }, pinned: [] };`);
      // Push 60 snapshots
      for (let i = 0; i < 60; i++) {
        evalIn(`state.data.projects.eh.todos.push({ id: 't${i}', title: '${i}' });`);
        pushUndoSnapshot();
      }
      eq(evalIn(`undoStack.length`), evalIn(`UNDO_MAX`));
    });

    it('undoSuspended skips snapshot push', () => {
      evalIn(`undoStack.length = 0;`);
      evalIn(`undoSuspended = true;`);
      pushUndoSnapshot();
      eq(evalIn(`undoStack.length`), 0);
      evalIn(`undoSuspended = false;`);
      pushUndoSnapshot();
      eq(evalIn(`undoStack.length`), 1);
    });
  });
};
