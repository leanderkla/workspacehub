// Pure-function regression tests.
// Each test names a real bug we hit so future code can't reintroduce them.

'use strict';

module.exports = function (describe, { eq, ok, get, sandbox, evalIn }) {

  // ---------- noteContentText: HTML→plain stripping ----------
  describe('noteContentText', (it) => {
    const fn = get('noteContentText');

    it('returns empty for empty/null', () => {
      eq(fn(''), '');
      eq(fn(null), '');
      eq(fn(undefined), '');
    });

    it('passes plain text through trimmed', () => {
      eq(fn('  hello world  '), 'hello world');
    });

    it('strips simple HTML tags', () => {
      eq(fn('<b>hello</b> <i>world</i>'), 'hello world');
    });

    it('strips nested HTML and preserves text content', () => {
      eq(fn('<div><p>line one</p><p>line two</p></div>'), 'line oneline two');
    });

    it('does NOT treat plain text with < as HTML', () => {
      eq(fn('a < b is true'), 'a < b is true');
    });
  });

  // ---------- noteContentInitialHTML ----------
  describe('noteContentInitialHTML', (it) => {
    const fn = get('noteContentInitialHTML');

    it('returns empty for empty', () => { eq(fn(''), ''); eq(fn(null), ''); });

    it('preserves existing HTML content', () => {
      eq(fn('<p>hi</p>'), '<p>hi</p>');
    });

    it('escapes plain text and converts \\n to <br>', () => {
      eq(fn('a\nb\nc'), 'a<br>b<br>c');
    });

    it('escapes HTML-unsafe characters in plain text', () => {
      eq(fn('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
    });
  });

  // ---------- parseQuickCapture: palette natural language ----------
  describe('parseQuickCapture', (it) => {
    const fn = get('parseQuickCapture');
    const setup = () => {
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = {
        projects: {
          'eh':  { name: 'Energy Hero',    color: '#f59e0b', todos: [] },
          'ai5': { name: 'AI5innovation',  color: '#0ea5e9', todos: [] }
        },
        pinned: []
      };`);
    };

    it('returns null for empty input', () => { setup(); eq(fn(''), null); eq(fn('   '), null); });

    it('keeps the title without any modifiers', () => {
      setup();
      const r = fn('  buy milk  ');
      eq(r.title, 'buy milk');
      eq(r.dueDate, null);
      eq(r.projectKey, 'eh');
    });

    it('parses @projectkey routing', () => {
      setup();
      const r = fn('call Lukas @ai5');
      eq(r.projectKey, 'ai5');
      eq(r.title, 'call Lukas');
    });

    it('parses tomorrow/heute/morgen', () => {
      setup();
      const today = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
      const r = fn('call Lukas tomorrow');
      eq(r.dueDate, expected);
      eq(r.title, 'call Lukas');
    });

    it('parses in 3 days', () => {
      setup();
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(today); target.setDate(target.getDate() + 3);
      const expected = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`;
      const r = fn('review deck in 3 days');
      eq(r.dueDate, expected);
      eq(r.title, 'review deck');
    });

    it('parses DD.MM. shorthand and rolls to next year if past', () => {
      setup();
      const r = fn('quarterly report 1.1');
      ok(r.dueDate, 'should set a due date');
      ok(/-01-01$/.test(r.dueDate), 'expected end with -01-01');
    });
  });

  // ---------- parseTodoSlashCommands ----------
  describe('parseTodoSlashCommands', (it) => {
    const fn = get('parseTodoSlashCommands');
    const setup = () => {
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = {
        projects: { 'eh': { name: 'Energy Hero', subprojects: [{ id: 'sp1', name: 'Sales' }, { id: 'sp2', name: 'Marketing' }], todos: [] } }
      };`);
    };

    it('returns null-ish defaults for plain title', () => {
      setup();
      const r = fn('buy milk');
      eq(r.title, 'buy milk');
      eq(r.dueDate, null);
      eq(r.priority, null);
      eq(r.subprojectId, null);
      eq(r.recurrence, null);
      eq(r.tokens.length, 0);
    });

    it('parses /tomorrow as a due date', () => {
      setup();
      const r = fn('call Lukas /tomorrow');
      eq(r.title, 'call Lukas');
      ok(r.dueDate, 'dueDate should be set');
      eq(r.tokens.some(t => t.type === 'due'), true);
    });

    it('parses /due 5d', () => {
      setup();
      const r = fn('review deck /due 5d');
      eq(r.title, 'review deck');
      ok(r.dueDate, 'dueDate set');
    });

    it('parses /due YYYY-MM-DD', () => {
      setup();
      const r = fn('quarterly /due 2099-12-31');
      eq(r.title, 'quarterly');
      eq(r.dueDate, '2099-12-31');
    });

    it('parses /high /low /med', () => {
      setup();
      eq(fn('foo /high').priority, 'high');
      eq(fn('bar /low').priority, 'low');
      eq(fn('baz /med').priority, 'medium');
      eq(fn('qux /lo').priority, 'low');
    });

    it('parses /sp:sales subproject by name', () => {
      setup();
      const r = fn('client outreach /sp:sales');
      eq(r.title, 'client outreach');
      eq(r.subprojectId, 'sp1');
    });

    it('parses /sub marketing with space syntax', () => {
      setup();
      const r = fn('newsletter /sub marketing');
      eq(r.title, 'newsletter');
      eq(r.subprojectId, 'sp2');
    });

    it('leaves unknown subproject in title', () => {
      setup();
      const r = fn('thing /sp:nonexistent');
      ok(r.title.includes('/sp:nonexistent'), 'unknown sp stays in title');
      eq(r.subprojectId, null);
    });

    it('parses /weekly recurrence', () => {
      setup();
      const r = fn('standup /weekly');
      eq(r.title, 'standup');
      ok(r.recurrence && r.recurrence.type === 'weekly', 'recurrence is weekly');
    });

    it('combines multiple commands', () => {
      setup();
      const r = fn('Call Lukas /tomorrow /high /sp:sales');
      eq(r.title, 'Call Lukas');
      ok(r.dueDate, 'has dueDate');
      eq(r.priority, 'high');
      eq(r.subprojectId, 'sp1');
      eq(r.tokens.length, 3);
    });

    it('strips slash commands from anywhere in the title', () => {
      setup();
      const r = fn('/tomorrow Call Lukas /high');
      eq(r.title, 'Call Lukas');
    });
  });

  // ---------- suggestSlashCompletion ----------
  describe('suggestSlashCompletion', (it) => {
    const fn = get('suggestSlashCompletion');
    const setup = () => {
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = {
        projects: { eh: { name: 'EH', subprojects: [{ id: 'sp1', name: 'Sales' }, { id: 'sp2', name: 'Marketing' }] } }
      };`);
    };

    it('returns null when nothing to complete', () => {
      setup();
      eq(fn('', 0), null);
      eq(fn('hello world', 11), null);
    });

    it('completes /tom → /tomorrow', () => {
      setup();
      const r = fn('call Lukas /tom', 15);
      ok(r, 'has suggestion');
      eq(r.completion, 'orrow');
      eq(r.full, 'call Lukas /tomorrow');
    });

    it('completes /hi → first match by command priority', () => {
      setup();
      const r = fn('thing /hi', 9);
      ok(r, 'has suggestion');
      // /high comes before /hi in priority order, so /hi is exact-match-ignore;
      // /high.startsWith('/hi') wins.
      eq(r.completion, 'gh');
    });

    it('returns null when prefix is already a complete command', () => {
      setup();
      eq(fn('foo /tomorrow', 13), null);
    });

    it('returns null with too-short prefix (just slash)', () => {
      setup();
      eq(fn('foo /', 5), null);
    });

    it('completes subproject value /sp:sa → Sales', () => {
      setup();
      const r = fn('lead /sp:sa', 11);
      ok(r, 'has suggestion');
      eq(r.completion, 'les');
      eq(r.full, 'lead /sp:sales');
    });

    it('returns null when no subproject matches', () => {
      setup();
      eq(fn('lead /sp:zz', 11), null);
    });

    it('uses text before the caret, ignores text after', () => {
      setup();
      // caret position 4 puts "before" = "/tom", text after caret is irrelevant for completion.
      const r = fn('/tomXYZ', 4);
      ok(r, 'has suggestion');
      eq(r.completion, 'orrow');
    });
  });

  // ---------- isOverdue ----------
  describe('isOverdue', (it) => {
    const fn = get('isOverdue');

    it('returns false for null/empty', () => {
      eq(fn(null), false);
      eq(fn(''), false);
    });

    it('returns true for a date in the past', () => {
      eq(fn('2020-01-01'), true);
    });

    it('returns false for a far-future date', () => {
      eq(fn('2099-12-31'), false);
    });
  });

  // ---------- formatTimer (sticky/focus mode) ----------
  describe('formatTimer', (it) => {
    const fn = get('formatTimer');

    it('formats minutes:seconds with zero padding', () => {
      eq(fn(0), '00:00');
      eq(fn(1000), '00:01');
      eq(fn(60_000), '01:00');
      eq(fn(75_000), '01:15');
      eq(fn(25 * 60 * 1000), '25:00');
    });

    it('clamps negative to 00:00', () => {
      eq(fn(-1), '00:00');
    });
  });

  // ---------- pin helpers ----------
  describe('togglePin / isPinned', (it) => {
    const togglePin = get('togglePin');
    const isPinned = get('isPinned');
    const setup = () => {
      evalIn(`saveData = function () {};`);
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = { projects: { eh: { name: 'EH', todos: [{ id: 't1', title: 'foo' }] } }, pinned: [] };`);
    };

    it('starts unpinned', () => { setup(); eq(isPinned('todo','eh','t1'), false); });
    it('toggles on', () => { setup(); togglePin('todo','eh','t1'); eq(isPinned('todo','eh','t1'), true); });
    it('toggles off', () => {
      setup();
      togglePin('todo','eh','t1');
      togglePin('todo','eh','t1');
      eq(isPinned('todo','eh','t1'), false);
    });
  });

  // ---------- archive helpers ----------
  describe('setTodoArchived / setNoteArchived / setProjectArchived', (it) => {
    const setTodoArchived = get('setTodoArchived');
    const setNoteArchived = get('setNoteArchived');
    const setProjectArchived = get('setProjectArchived');
    const setup = () => {
      evalIn(`saveData = function () {};`);
      evalIn(`state.project = 'eh';`);
      evalIn(`state.data = { projects: { eh: { name: 'EH', todos: [{ id: 't1', title: 'foo' }], notes: [{ id: 'n1', title: 'bar' }] } }, pinned: [] };`);
    };

    it('archives a todo and stores archivedAt', () => {
      setup();
      eq(setTodoArchived('t1', true), true);
      eq(evalIn(`state.data.projects.eh.todos[0].archived`), true);
      ok(evalIn(`!!state.data.projects.eh.todos[0].archivedAt`), 'archivedAt set');
    });

    it('restoring a todo clears archivedAt', () => {
      setup();
      setTodoArchived('t1', true);
      eq(setTodoArchived('t1', false), true);
      eq(evalIn(`state.data.projects.eh.todos[0].archived`), false);
      eq(evalIn(`'archivedAt' in state.data.projects.eh.todos[0]`), false);
    });

    it('returns false on no-op (already in target state)', () => {
      setup();
      eq(setTodoArchived('t1', false), false);
      setTodoArchived('t1', true);
      eq(setTodoArchived('t1', true), false);
    });

    it('returns false on missing id', () => {
      setup();
      eq(setTodoArchived('does-not-exist', true), false);
      eq(setNoteArchived('does-not-exist', true), false);
    });

    it('archives a note and tracks archivedAt', () => {
      setup();
      eq(setNoteArchived('n1', true), true);
      eq(evalIn(`state.data.projects.eh.notes[0].archived`), true);
      ok(evalIn(`!!state.data.projects.eh.notes[0].archivedAt`), 'archivedAt set');
    });

    it('archives a project (hide/unhide)', () => {
      setup();
      eq(setProjectArchived('eh', true), true);
      eq(evalIn(`state.data.projects.eh.archived`), true);
      ok(evalIn(`!!state.data.projects.eh.archivedAt`), 'archivedAt set');
      eq(setProjectArchived('eh', false), true);
      eq(evalIn(`state.data.projects.eh.archived`), false);
      eq(evalIn(`'archivedAt' in state.data.projects.eh`), false);
    });

    it('setProjectArchived returns false for unknown project key', () => {
      setup();
      eq(setProjectArchived('nope', true), false);
    });
  });

  // ---------- reorderPinned ----------
  describe('reorderPinned', (it) => {
    const reorderPinned = get('reorderPinned');
    const setup = () => {
      evalIn(`saveData = function () {};`);
      evalIn(`state.data = { pinned: [
        { type: 'todo', projectKey: 'eh', refId: 'a' },
        { type: 'todo', projectKey: 'eh', refId: 'b' },
        { type: 'todo', projectKey: 'eh', refId: 'c' },
        { type: 'todo', projectKey: 'eh', refId: 'd' }
      ], projects: { eh: { name: 'EH' } } };`);
    };

    it('moves an item later (down) in the list', () => {
      setup();
      reorderPinned(0, 3); // move 'a' to position before index 3 → b, c, a, d... wait
      // Move a (index 0) to insertion point 3 → a removed, then inserted at 2 (3-1) → [b,c,a,d]
      eq(evalIn(`state.data.pinned.map(p => p.refId).join(',')`), 'b,c,a,d');
    });

    it('moves an item to the end', () => {
      setup();
      reorderPinned(1, 4); // b → end
      eq(evalIn(`state.data.pinned.map(p => p.refId).join(',')`), 'a,c,d,b');
    });

    it('moves an item earlier (up) in the list', () => {
      setup();
      reorderPinned(3, 1); // d → before index 1
      eq(evalIn(`state.data.pinned.map(p => p.refId).join(',')`), 'a,d,b,c');
    });

    it('returns false on a no-op (drop at the same slot)', () => {
      setup();
      eq(reorderPinned(2, 2), false);
      eq(reorderPinned(2, 3), false); // index+1 is also a no-op
      eq(evalIn(`state.data.pinned.map(p => p.refId).join(',')`), 'a,b,c,d');
    });

    it('clamps out-of-range indices safely', () => {
      setup();
      eq(reorderPinned(-1, 0), false);
      eq(reorderPinned(0, 99), true); // clamps to end
      eq(evalIn(`state.data.pinned.map(p => p.refId).join(',')`), 'b,c,d,a');
    });
  });

  // ---------- schema migrations ----------
  describe('runSchemaMigrations', (it) => {
    const fn = get('runSchemaMigrations');

    it('returns null/undef untouched', () => {
      eq(fn(null), null);
      eq(fn(undefined), undefined);
    });

    it('initializes pinned array on a fresh install', () => {
      const data = { projects: { p: { name: 'P' } } };
      const out = fn(data);
      eq(Array.isArray(out.pinned), true);
      eq(out.schemaVersion, 3);
    });

    it('does not re-run migrations once schemaVersion is current', () => {
      const data = { projects: { p: {} }, pinned: ['MARK'], schemaVersion: 1 };
      const out = fn(data);
      eq(out.pinned[0], 'MARK');
    });

    it('fills missing per-project arrays', () => {
      const data = { projects: { p: { name: 'P' } } };
      const out = fn(data);
      eq(Array.isArray(out.projects.p.todos || []), true);
      eq(Array.isArray(out.projects.p.flows), true);
      eq(Array.isArray(out.projects.p.commitments), true);
    });

    it('v2 backfills linkedItems on every brainmap node', () => {
      const data = {
        projects: {
          p: {
            name: 'P',
            brainmap: { rootId: 'r', nodes: { r: { id: 'r', label: 'root' } } }
          }
        }
      };
      const out = fn(data);
      eq(Array.isArray(out.projects.p.brainmap.nodes.r.linkedItems), true);
      eq(out.schemaVersion, 3);
    });

    it('v2 migration is idempotent', () => {
      const data = {
        schemaVersion: 3,
        projects: {
          p: {
            brainmap: { rootId: 'r', nodes: { r: { id: 'r', linkedItems: [{ entityType: 'todo', entityId: 't1' }] } } }
          }
        }
      };
      const out = fn(data);
      eq(out.projects.p.brainmap.nodes.r.linkedItems.length, 1);
      eq(out.schemaVersion, 3);
    });

    it('v3 backfills tags on every taggable entity type', () => {
      const data = {
        projects: {
          p: {
            todos:       [{ id: 't1', title: 'T' }],
            notes:       [{ id: 'n1', title: 'N' }],
            commitments: [{ id: 'c1', counterparty: 'X', description: 'd' }],
            delegations: [{ id: 'd1', task: 'k' }],
            dumps:       [{ id: 'm1', text: 'm' }],
            reminders:   [{ id: 'r1', title: 'R' }]
          }
        }
      };
      const out = fn(data);
      const p = out.projects.p;
      eq(Array.isArray(p.todos[0].tags),       true);
      eq(Array.isArray(p.notes[0].tags),       true);
      eq(Array.isArray(p.commitments[0].tags), true);
      eq(Array.isArray(p.delegations[0].tags), true);
      eq(Array.isArray(p.dumps[0].tags),       true);
      eq(Array.isArray(p.reminders[0].tags),   true);
      eq(out.schemaVersion, 3);
    });

    it('v3 migration is idempotent (preserves existing tags)', () => {
      const data = {
        schemaVersion: 3,
        projects: {
          p: { todos: [{ id: 't1', title: 'T', tags: ['q4', 'urgent'] }] }
        }
      };
      const out = fn(data);
      eq(out.projects.p.todos[0].tags.length, 2);
      eq(out.projects.p.todos[0].tags[0], 'q4');
    });
  });

  // ---------- nodeLinks helper module ----------
  describe('nodeLinks', (it) => {
    const addNodeLink   = get('addNodeLink');
    const removeNodeLink = get('removeNodeLink');
    const nodeLinkExists = get('nodeLinkExists');
    const nodeLinkCount  = get('nodeLinkCount');
    const getLinkedItems = get('getLinkedItems');
    const getLinkedNodes = get('getLinkedNodes');
    const cleanupNodeLinksOnEntityDelete = get('cleanupNodeLinksOnEntityDelete');

    // Reset state to a known baseline before each test group. Two projects
    // so we can verify cross-project isolation. Active project is 'p1'.
    const setup = () => {
      evalIn(`saveData = function () {};`);  // no-op the persist for tests
      evalIn(`state.project = 'p1';`);
      // Note: notes intentionally include an item with id 't1' that collides
      // with a todo's id. This tests that {entityType, entityId} reliably
      // disambiguates — cleanup of (todo, t1) must NOT touch (note, t1).
      evalIn(`state.data = {
        projects: {
          p1: {
            name: 'P1',
            todos: [{ id: 't1', title: 'todo one' }, { id: 't2', title: 'todo two', archived: true, archivedAt: '2026-01-01T00:00:00Z' }],
            notes: [{ id: 'n1', title: 'note one' }, { id: 't1', title: 'note with todo-shaped id' }],
            reminders: [{ id: 'r1', title: 'rem one' }],
            commitments: [], delegations: [], flows: [{ id: 'f1', name: 'flow one' }],
            brainmap: {
              rootId: 'b-root',
              nodes: {
                'b-root': { id: 'b-root', parentId: null, label: 'root', linkedItems: [] },
                'b-1':    { id: 'b-1',    parentId: 'b-root', label: 'child', linkedItems: [] }
              }
            }
          },
          p2: {
            name: 'P2',
            todos: [{ id: 'tx', title: 'cross-project todo' }],
            notes: [], reminders: [], commitments: [], delegations: [], flows: [],
            brainmap: { rootId: 'b-other', nodes: { 'b-other': { id: 'b-other', linkedItems: [] } } }
          }
        }
      };`);
      // Cache may have stale entries from previous tests; flush.
      evalIn(`if (typeof _linkIndexByProject !== 'undefined') _linkIndexByProject.clear();`);
    };

    it('addNodeLink succeeds, returns true, appends to end', () => {
      setup();
      eq(addNodeLink('b-root', 'todo', 't1'), true);
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems.length`), 1);
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems[0].entityType`), 'todo');
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems[0].entityId`), 't1');
    });

    it('addNodeLink appends in order (newest at end)', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      addNodeLink('b-root', 'note', 'n1');
      addNodeLink('b-root', 'reminder', 'r1');
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems.map(l => l.entityType).join(',')`),
         'todo,note,reminder');
    });

    it('addNodeLink is idempotent (returns false on duplicate)', () => {
      setup();
      eq(addNodeLink('b-root', 'todo', 't1'), true);
      eq(addNodeLink('b-root', 'todo', 't1'), false);
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems.length`), 1);
    });

    it('addNodeLink rejects nonexistent nodeId', () => {
      setup();
      eq(addNodeLink('does-not-exist', 'todo', 't1'), false);
    });

    it('addNodeLink rejects nonexistent entityId', () => {
      setup();
      eq(addNodeLink('b-root', 'todo', 'never-was'), false);
    });

    it('addNodeLink rejects unknown entityType', () => {
      setup();
      eq(addNodeLink('b-root', 'gizmo', 't1'), false);
    });

    it('addNodeLink rejects cross-project entity (defense in depth)', () => {
      // Active project is p1; tx exists in p2's todos. Helper should reject.
      setup();
      eq(addNodeLink('b-root', 'todo', 'tx'), false);
    });

    it('removeNodeLink succeeds, returns true', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      eq(removeNodeLink('b-root', 'todo', 't1'), true);
      eq(evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems.length`), 0);
    });

    it('removeNodeLink returns false when no matching link', () => {
      setup();
      eq(removeNodeLink('b-root', 'todo', 't1'), false);
    });

    it('nodeLinkExists round-trips after add/remove', () => {
      setup();
      eq(nodeLinkExists('b-root', 'todo', 't1'), false);
      addNodeLink('b-root', 'todo', 't1');
      eq(nodeLinkExists('b-root', 'todo', 't1'), true);
      removeNodeLink('b-root', 'todo', 't1');
      eq(nodeLinkExists('b-root', 'todo', 't1'), false);
    });

    it('nodeLinkCount tracks the array length', () => {
      setup();
      eq(nodeLinkCount('b-root'), 0);
      addNodeLink('b-root', 'todo', 't1');
      addNodeLink('b-root', 'note', 'n1');
      eq(nodeLinkCount('b-root'), 2);
    });

    it('getLinkedItems flags orphan when entity is missing', () => {
      setup();
      // Manually push a link to a non-existent todo (simulating future-deleted state).
      evalIn(`state.data.projects.p1.brainmap.nodes['b-root'].linkedItems.push({ entityType: 'todo', entityId: 'gone' });`);
      const items = getLinkedItems('b-root');
      eq(items.length, 1);
      eq(items[0].isOrphan, true);
      eq(items[0].entity, null);
    });

    it('getLinkedItems flags archived when entity has archived=true', () => {
      setup();
      addNodeLink('b-root', 'todo', 't2');  // t2 is archived in setup
      const items = getLinkedItems('b-root');
      eq(items.length, 1);
      eq(items[0].isArchived, true);
      eq(items[0].isOrphan, false);
    });

    it('getLinkedItems preserves array order (oldest first)', () => {
      setup();
      addNodeLink('b-root', 'note', 'n1');
      addNodeLink('b-root', 'todo', 't1');
      addNodeLink('b-root', 'reminder', 'r1');
      const types = getLinkedItems('b-root').map(it => it.entityType);
      eq(types.join(','), 'note,todo,reminder');
    });

    it('getLinkedNodes returns the linking nodes via cache', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      addNodeLink('b-1',    'todo', 't1');
      const nodes = getLinkedNodes('todo', 't1');
      eq(nodes.length, 2);
      eq(nodes.map(n => n.id).sort().join(','), 'b-1,b-root');
    });

    it('getLinkedNodes returns [] for an entity with no links', () => {
      setup();
      eq(getLinkedNodes('todo', 't1').length, 0);
    });

    it('cache invalidates on addNodeLink', () => {
      setup();
      // Prime the cache (no links yet → empty index).
      eq(getLinkedNodes('todo', 't1').length, 0);
      // Add a link; cache should rebuild on next read and reflect the new link.
      addNodeLink('b-root', 'todo', 't1');
      eq(getLinkedNodes('todo', 't1').length, 1);
    });

    it('cache invalidates on removeNodeLink', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      eq(getLinkedNodes('todo', 't1').length, 1);
      removeNodeLink('b-root', 'todo', 't1');
      eq(getLinkedNodes('todo', 't1').length, 0);
    });

    it('cleanupNodeLinksOnEntityDelete removes only the matching type+id', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      addNodeLink('b-root', 'note', 't1');  // same id-suffix, different type — must NOT be touched
      addNodeLink('b-1',    'todo', 't1');
      const removed = cleanupNodeLinksOnEntityDelete('p1', 'todo', 't1');
      eq(removed, 2);
      eq(nodeLinkExists('b-root', 'todo', 't1'), false);
      eq(nodeLinkExists('b-root', 'note', 't1'), true);   // wrong-type link untouched
      eq(nodeLinkExists('b-1',    'todo', 't1'), false);
    });

    it('cleanupNodeLinksOnEntityDelete invalidates cache', () => {
      setup();
      addNodeLink('b-root', 'todo', 't1');
      eq(getLinkedNodes('todo', 't1').length, 1);
      cleanupNodeLinksOnEntityDelete('p1', 'todo', 't1');
      eq(getLinkedNodes('todo', 't1').length, 0);
    });

    it('debug surface window.__nodeLinks exposes all helpers', () => {
      // The test sandbox provides a fake `window` global. Verify __nodeLinks
      // is attached and points at the same functions exported via get().
      ok(evalIn(`typeof window.__nodeLinks === 'object' && window.__nodeLinks !== null`), '__nodeLinks should be on window');
      ok(evalIn(`typeof window.__nodeLinks.add === 'function'`), 'add');
      ok(evalIn(`typeof window.__nodeLinks.remove === 'function'`), 'remove');
      ok(evalIn(`typeof window.__nodeLinks.exists === 'function'`), 'exists');
      ok(evalIn(`typeof window.__nodeLinks.count === 'function'`), 'count');
      ok(evalIn(`typeof window.__nodeLinks.items === 'function'`), 'items');
      ok(evalIn(`typeof window.__nodeLinks.nodes === 'function'`), 'nodes');
      ok(evalIn(`typeof window.__nodeLinks.cleanup === 'function'`), 'cleanup');
    });
  });
};
