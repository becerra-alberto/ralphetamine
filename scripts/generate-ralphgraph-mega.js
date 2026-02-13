#!/usr/bin/env node

const args = process.argv.slice(2);

function getNumberArg(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return fallback;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function getStringArg(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return fallback;
  return String(args[i + 1]);
}

const totalEpics = getNumberArg('--epics', 18);
const storiesPerEpic = getNumberArg('--stories-per-epic', 6);
const maxWorkers = getNumberArg('--max-workers', 8);
const projectName = getStringArg('--project', 'ralph-enterprise-mega-flow');

const epicTitleSeed = [
  'Platform Foundations',
  'Identity and Access',
  'Billing Core',
  'Catalog and Inventory',
  'Orders and Fulfillment',
  'Search and Discovery',
  'Recommendations',
  'Notifications',
  'Analytics Pipeline',
  'Admin Console',
  'Mobile API',
  'Internationalization',
  'Compliance and Audit',
  'Performance Hardening',
  'Reliability and Recovery',
  'Developer Experience',
  'Integrations Hub',
  'Growth Experiments',
  'Partner Ecosystem',
  'Self-Serve Onboarding',
  'Risk Scoring',
  'Data Governance',
  'Monetization Experiments',
  'Trust and Safety'
];

function epicTitle(e) {
  if (e <= epicTitleSeed.length) return epicTitleSeed[e - 1];
  return `Epic ${e}: Expansion Track`;
}

function sid(e, s) {
  return `${e}.${s}`;
}

function batchForEpic(e) {
  if (e <= 2) return 0;
  if (e <= 5) return 1;
  if (e <= 8) return 2;
  if (e <= 11) return 3;
  if (e <= 14) return 4;
  if (e <= 17) return 5;
  return 6;
}

function titleFor(s) {
  const names = [
    'Establish schema and contracts',
    'Implement write path',
    'Implement read/query path',
    'Add validation and guardrails',
    'Add observability and runbooks',
    'Polish edge-cases and docs',
    'Finalize rollout and SLO checks',
    'Post-launch hardening',
    'Operational game-day and chaos checks',
    'Clean-up and migration safety net'
  ];
  return names[(s - 1) % names.length];
}

function depsFor(e, s, maxStoriesInPrevEpic) {
  const deps = [];
  if (s > 1) deps.push(sid(e, s - 1));
  if (e > 1 && s <= 2) deps.push(sid(e - 1, Math.min(maxStoriesInPrevEpic, 6)));
  if (e > 2 && s === 3) deps.push(sid(e - 2, Math.min(maxStoriesInPrevEpic, 4)));
  if (e > 3 && s === 5) deps.push(sid(e - 3, Math.min(maxStoriesInPrevEpic, 2)));
  if (e > 4 && s === 7) deps.push(sid(e - 4, Math.min(maxStoriesInPrevEpic, 5)));
  return [...new Set(deps)];
}

function getStatus(e, s) {
  // Rich, deterministic distribution of outcomes.
  // 1-3 done, 4 tentative, 5 failed, 6 pending, 7 done, 8 tentative, 9 failed, 10 pending.
  const mod = ((s - 1) % 10) + 1;
  if (mod <= 3) return 'done';
  if (mod === 4) return 'tentative';
  if (mod === 5) return 'failed';
  if (mod === 6) return 'pending';
  if (mod === 7) return 'done';
  if (mod === 8) return 'tentative';
  if (mod === 9) return 'failed';
  return 'pending';
}

function laneForBatch(batch) {
  return batch === 0 ? 'sequential' : 'parallel';
}

function storyExecutionMode(storyId, batch) {
  // Some parallel batches still execute in sequential fallback paths (single member shards).
  if (batch === 0) return 'sequential';
  const parts = storyId.split('.').map(Number);
  const seed = (parts[0] * 13) + (parts[1] * 7);
  return seed % 11 === 0 ? 'sequential_fallback' : 'parallel';
}

function workerForStory(storyId, workerCount) {
  const parts = storyId.split('.').map(Number);
  let score = 0;
  for (const n of parts) score += n * 17;
  const idx = (score % workerCount) + 1;
  return `worker-${idx}`;
}

const epics = [];
const stories = [];
const storyMap = new Map();
const events = [];
const batches = new Map();

for (let e = 1; e <= totalEpics; e++) {
  const batch = batchForEpic(e);

  epics.push({
    id: e,
    title: epicTitle(e),
    objective: `Deliver ${epicTitle(e)} capabilities with robust validation, retries, testing review, and merge safety.`,
    priority: e <= Math.ceil(totalEpics / 3) ? 'P0' : e <= Math.ceil((2 * totalEpics) / 3) ? 'P1' : 'P2',
    batch,
    execution_lane: laneForBatch(batch)
  });

  if (!batches.has(batch)) {
    batches.set(batch, {
      id: batch,
      lane: laneForBatch(batch),
      mode: batch === 0 ? 'foundation_sequential' : 'parallel_worktree',
      story_ids: []
    });
  }

  for (let s = 1; s <= storiesPerEpic; s++) {
    const id = sid(e, s);
    const baseStatus = getStatus(e, s);
    const batchStory = batchForEpic(e);
    const mode = storyExecutionMode(id, batchStory);

    const story = {
      id,
      epic: e,
      title: `${epicTitle(e)}: ${titleFor(s)}`,
      batch: batchStory,
      lane: laneForBatch(batchStory),
      execution_mode: mode,
      depends_on: depsFor(e, s, storiesPerEpic),
      status: baseStatus,
      retries: baseStatus === 'failed' ? 3 : baseStatus === 'tentative' ? 1 : 0,
      branch: {
        name: ['done', 'tentative', 'failed'].includes(baseStatus) ? `ralph/story-${id}` : null,
        state:
          baseStatus === 'pending'
            ? 'not_created'
            : baseStatus === 'failed'
              ? 'pending_manual_intervention'
              : 'created'
      },
      decomposition: {
        eligible: true,
        attempted: false,
        max_depth: 2,
        parent: null,
        children: []
      },
      absorption: {
        absorbed: false,
        absorbed_by: null
      },
      merge: {
        queued: baseStatus !== 'pending',
        status:
          baseStatus === 'pending'
            ? 'not_started'
            : baseStatus === 'failed'
              ? 'blocked'
              : baseStatus === 'tentative'
                ? 'merged_with_review'
                : 'merged',
        conflicts: (baseStatus === 'failed' || baseStatus === 'tentative') ? ((e + s) % 3) + 1 : 0,
        resolution_agent_used: (baseStatus === 'failed' || baseStatus === 'tentative')
      },
      testing: {
        enabled: true,
        review_required: baseStatus !== 'pending',
        review_status:
          baseStatus === 'pending'
            ? 'not_run'
            : baseStatus === 'failed'
              ? 'skipped_due_to_failure'
              : ((e + s) % 9 === 0 ? 'non_fatal_warn' : 'passed'),
        test_suites: ['unit', 'integration', 'smoke']
      },
      worker_hint: workerForStory(id, Math.max(2, maxWorkers)),
      metrics: {
        est_points: ((s - 1) % 4) + 2,
        tokens_in: baseStatus === 'pending' ? 0 : 10000 + e * 850 + s * 375,
        tokens_out: baseStatus === 'pending' ? 0 : 2200 + e * 135 + s * 60,
        cost_usd: baseStatus === 'pending' ? 0 : Number((0.16 + e * 0.025 + s * 0.012).toFixed(2)),
        duration_seconds: baseStatus === 'pending' ? 0 : 380 + e * 30 + s * 18,
        retries_used: baseStatus === 'failed' ? 3 : baseStatus === 'tentative' ? 1 : 0
      }
    };

    // Absorption sample points
    if ((e % 6 === 5 && s === 2) || (e % 7 === 4 && s === 3)) {
      story.status = 'done';
      story.retries = 0;
      story.absorption.absorbed = true;
      story.absorption.absorbed_by = sid(e, Math.min(s + 1, storiesPerEpic));
      story.merge.status = 'absorbed';
      story.merge.queued = false;
      story.branch.state = 'absorbed_then_closed';
      story.testing.review_status = 'absorbed';
    }

    // Decomposition sample points
    if (s % 10 === 5 && e % 4 === 3) {
      const c1 = sid(e, `${s}.1`);
      const c2 = sid(e, `${s}.2`);
      const c3 = sid(e, `${s}.3`);
      story.decomposition.attempted = true;
      story.decomposition.children = [c1, c2, c3];
    }

    stories.push(story);
    storyMap.set(id, story);
    batches.get(batchStory).story_ids.push(id);
  }
}

// Add decomposition children stories
const parents = stories.filter(s => s.decomposition.children.length > 0);
for (const parent of parents) {
  parent.decomposition.children.forEach((childId, idx) => {
    const childStory = {
      id: childId,
      epic: parent.epic,
      title: `${parent.title} (sub-story ${idx + 1})`,
      batch: parent.batch + 1,
      lane: laneForBatch(parent.batch + 1),
      execution_mode: 'parallel',
      depends_on: idx === 0 ? parent.depends_on : [parent.decomposition.children[idx - 1]],
      status: idx < 2 ? 'done' : 'tentative',
      retries: idx === 2 ? 1 : 0,
      branch: {
        name: `ralph/story-${childId}`,
        state: idx < 2 ? 'merged_and_deleted' : 'merged_pending_review'
      },
      decomposition: {
        eligible: true,
        attempted: false,
        max_depth: 2,
        parent: parent.id,
        children: []
      },
      absorption: {
        absorbed: false,
        absorbed_by: null
      },
      merge: {
        queued: true,
        status: idx < 2 ? 'merged' : 'merged_with_review',
        conflicts: idx === 1 ? 1 : 0,
        resolution_agent_used: idx === 1
      },
      testing: {
        enabled: true,
        review_required: true,
        review_status: idx === 2 ? 'non_fatal_warn' : 'passed',
        test_suites: ['unit', 'integration', 'smoke']
      },
      worker_hint: workerForStory(childId, Math.max(2, maxWorkers)),
      metrics: {
        est_points: 2,
        tokens_in: 7600 + idx * 1300,
        tokens_out: 1700 + idx * 260,
        cost_usd: Number((0.2 + idx * 0.05).toFixed(2)),
        duration_seconds: 340 + idx * 90,
        retries_used: idx === 2 ? 1 : 0
      }
    };

    stories.push(childStory);
    storyMap.set(childId, childStory);

    if (!batches.has(childStory.batch)) {
      batches.set(childStory.batch, {
        id: childStory.batch,
        lane: laneForBatch(childStory.batch),
        mode: childStory.batch === 0 ? 'foundation_sequential' : 'parallel_worktree',
        story_ids: []
      });
    }
    batches.get(childStory.batch).story_ids.push(childId);
  });
}

const sortedBatchIds = [...batches.keys()].sort((a, b) => a - b);

// Timeline event generation
const start = new Date('2026-02-10T14:00:00Z').getTime();
let minute = 0;
const ts = () => {
  const t = new Date(start + minute * 60000).toISOString();
  minute += 2;
  return t;
};

function pushGlobal(type, data = {}) {
  events.push({ ts: ts(), scope: 'run', type, data });
}

function pushBatch(batchId, type, data = {}) {
  events.push({ ts: ts(), scope: 'batch', batch: batchId, type, data });
}

function pushStory(storyId, type, data = {}) {
  const s = storyMap.get(storyId);
  events.push({
    ts: ts(),
    scope: 'story',
    story: storyId,
    batch: s ? s.batch : null,
    lane: s ? s.lane : null,
    type,
    data
  });
}

pushGlobal('RUN_START', {
  project: projectName,
  lock_file: '.ralph/.lock',
  parallel_enabled: true,
  max_workers: maxWorkers,
  testing_phase_enabled: true,
  decomposition_enabled: true
});
pushGlobal('RUN_LOCK_ACQUIRED', { pid: 43120 });
pushGlobal('STATE_INIT', { file: '.ralph/state.json' });
pushGlobal('QUEUE_LOADED', { file: '.ralph/stories.txt', total_stories: stories.length });

for (const batchId of sortedBatchIds) {
  const batch = batches.get(batchId);
  const list = batch.story_ids
    .map(id => storyMap.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const pa = a.id.split('.').map(Number);
      const pb = b.id.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const da = pa[i] || 0;
        const db = pb[i] || 0;
        if (da !== db) return da - db;
      }
      return 0;
    });

  const mode = batchId === 0 ? 'sequential' : 'parallel';
  const workersForBatch = mode === 'parallel' ? Math.max(2, Math.min(maxWorkers, Math.ceil(list.length / 2))) : 1;

  pushBatch(batchId, 'BATCH_START', {
    mode,
    workers_planned: workersForBatch,
    story_count: list.length
  });

  if (mode === 'parallel') {
    pushBatch(batchId, 'WORKER_POOL_READY', {
      workers: Array.from({ length: workersForBatch }, (_, i) => `worker-${i + 1}`)
    });
    pushBatch(batchId, 'PARALLEL_QUEUE_READY', {
      queue_depth: list.length,
      strategy: 'worktree_per_story'
    });
  } else {
    pushBatch(batchId, 'SEQUENTIAL_PHASE_READY', {
      reason: 'foundation_or_fallback'
    });
  }

  for (const s of list) {
    const blockedDeps = s.depends_on.filter(dep => {
      const depStory = storyMap.get(dep);
      return depStory && ['pending', 'failed'].includes(depStory.status);
    });

    pushStory(s.id, 'STORY_QUEUED', {
      execution_mode: s.execution_mode,
      depends_on: s.depends_on,
      blocked_dependencies: blockedDeps
    });

    if (s.status === 'pending') {
      pushStory(s.id, 'STORY_PENDING_BLOCKED', {
        reason: blockedDeps.length > 0 ? 'upstream_incomplete' : 'not_dispatched_this_run',
        blocked_dependencies: blockedDeps
      });
      if (s.branch.name) {
        pushStory(s.id, 'BRANCH_PENDING', {
          branch: s.branch.name,
          branch_state: s.branch.state
        });
      }
      continue;
    }

    const worker = mode === 'parallel' ? workerForStory(s.id, workersForBatch) : 'worker-1';

    if (mode === 'parallel') {
      pushStory(s.id, 'WORKER_ASSIGNED', {
        worker,
        workers_total: workersForBatch,
        node: `batch-${batchId}`
      });
      pushStory(s.id, 'WORKTREE_CREATED', {
        path: `.ralph/worktrees/story-${s.id}`,
        branch: s.branch.name
      });
      pushStory(s.id, 'PRE_WORKTREE_HOOK_OK', {
        hook: 'pre_worktree'
      });
    }

    pushStory(s.id, 'PRE_STORY_HOOK_OK', { hook: 'pre_story' });
    pushStory(s.id, 'PROMPT_BUILT', {
      template: 'implement.md',
      learnings_injected: (Number(s.id.split('.')[1]) % 5) + 1
    });

    pushStory(s.id, 'ATTEMPT_START', { attempt: 1, worker });

    if (s.status === 'failed') {
      pushStory(s.id, 'TIMEOUT', { effective_timeout_s: 1500 });
      pushStory(s.id, 'POSTMORTEM_START', { window_seconds: 300 });
      pushStory(s.id, 'POSTMORTEM_DONE', { learning_written: `.ralph/learnings/timeouts/${s.id}.md` });

      pushStory(s.id, 'ATTEMPT_START', { attempt: 2, worker });
      pushStory(s.id, 'FAIL_SIGNAL', { reason: 'validation failed in parallel branch' });
      pushStory(s.id, 'RETRY_SCHEDULED', { next_attempt: 3 });

      pushStory(s.id, 'ATTEMPT_START', { attempt: 3, worker });
      pushStory(s.id, 'MAX_RETRIES_EXCEEDED', { retries: 3 });

      if (s.decomposition.children.length > 0) {
        pushStory(s.id, 'AUTO_DECOMPOSE_START', { parent_story: s.id });
        pushStory(s.id, 'DECOMPOSE_DONE', { children: s.decomposition.children });
      } else {
        pushStory(s.id, 'AUTO_DECOMPOSE_SKIPPED', { reason: 'agent_declined_or_atomic' });
      }

      pushStory(s.id, 'BRANCH_PENDING', {
        branch: s.branch.name,
        branch_state: 'preserved_for_manual_recovery'
      });

      if (mode === 'parallel') {
        pushStory(s.id, 'WORKER_RELEASED', {
          worker,
          outcome: 'failed',
          pending_branch: s.branch.name
        });
      }

      pushStory(s.id, 'POST_STORY_HOOK_OK', { hook: 'post_story', result: 'failed' });
      continue;
    }

    if (s.status === 'tentative') {
      pushStory(s.id, 'NO_DONE_SIGNAL', {});
      pushStory(s.id, 'COMMITS_DETECTED', { ahead_commits: 2 });
      pushStory(s.id, 'VALIDATION_PASSED', { checks: ['typecheck', 'tests'] });
      pushStory(s.id, 'TENTATIVE_SUCCESS', { review_required: true });
    } else {
      pushStory(s.id, 'DONE_SIGNAL', {});
    }

    if (s.absorption.absorbed) {
      pushStory(s.id, 'ABSORBED', { by: s.absorption.absorbed_by });
      pushStory(s.id, 'STATE_MARK_ABSORBED', { story: s.id, absorbed_by: s.absorption.absorbed_by });
    } else {
      pushStory(s.id, 'STATE_MARK_DONE', { story: s.id });
    }

    // Testing phase modeled as non-fatal side phase
    if (s.testing.review_required) {
      pushStory(s.id, 'TEST_REVIEW_START', { suites: s.testing.test_suites });
      if (s.testing.review_status === 'non_fatal_warn') {
        pushStory(s.id, 'TEST_REVIEW_WARN_NON_FATAL', {
          reason: 'flake_detected_but_main_outcome_kept',
          output_tag: '<ralph>TEST_REVIEW_DONE X.X: warn</ralph>'
        });
      } else {
        pushStory(s.id, 'TEST_REVIEW_DONE', {
          output_tag: '<ralph>TEST_REVIEW_DONE X.X: pass</ralph>'
        });
      }
    }

    if (!s.absorption.absorbed) {
      pushStory(s.id, 'MERGE_QUEUED', { branch: s.branch.name });
      pushStory(s.id, 'MERGE_START', { branch: s.branch.name });

      if (s.merge.conflicts > 0) {
        pushStory(s.id, 'MERGE_CONFLICT', { files: s.merge.conflicts });
        pushStory(s.id, 'MERGE_RESOLUTION_AGENT_START', {
          template: 'merge-review.md',
          timeout_seconds: 900
        });
        pushStory(s.id, 'MERGE_RESOLUTION_AGENT_DONE', {
          resolved_files: s.merge.conflicts,
          signal: '<ralph>MERGE_DONE: resolved conflicts</ralph>'
        });
      }

      pushStory(s.id, 'MERGE_DONE', {
        resolved_files: s.merge.conflicts,
        branch_disposition: s.status === 'tentative' ? 'merged_pending_review' : 'merged_and_deleted'
      });
    }

    pushStory(s.id, 'LEARN', {
      text: `Story ${s.id}: Keep validation commands deterministic and idempotent.`
    });

    if (mode === 'parallel') {
      pushStory(s.id, 'WORKER_RELEASED', { worker, outcome: s.status });
      pushStory(s.id, 'WORKTREE_CLEANUP', {
        path: `.ralph/worktrees/story-${s.id}`,
        branch_deleted: s.status !== 'tentative'
      });
    }

    pushStory(s.id, 'POST_STORY_HOOK_OK', { hook: 'post_story', result: s.status });
  }

  pushBatch(batchId, 'BATCH_COMPLETE', {
    mode,
    completed: list.filter(s => s.status === 'done').length,
    tentative: list.filter(s => s.status === 'tentative').length,
    failed: list.filter(s => s.status === 'failed').length,
    pending: list.filter(s => s.status === 'pending').length
  });
}

pushGlobal('RUN_SUMMARY_EMITTED', {
  completed: stories.filter(s => s.status === 'done').length,
  tentative: stories.filter(s => s.status === 'tentative').length,
  failed: stories.filter(s => s.status === 'failed').length,
  pending: stories.filter(s => s.status === 'pending').length,
  decomposed_parents: stories.filter(s => s.decomposition.children.length > 0).length
});
pushGlobal('RUN_LOCK_RELEASED', { lock_file: '.ralph/.lock' });
pushGlobal('RUN_COMPLETE', { status: 'partial_success_with_followups' });

const eventTypeCounts = {};
for (const e of events) {
  eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
}

const workerNodes = Array.from({ length: Math.max(2, maxWorkers) }, (_, i) => {
  const workerId = `worker-${i + 1}`;
  const assignedStories = stories.filter(s => s.worker_hint === workerId).length;
  return {
    worker: workerId,
    capacity: 1,
    assigned_story_count: assignedStories,
    utilization_hint: Number((assignedStories / Math.max(1, stories.length)).toFixed(4))
  };
});

const graph = {
  schema_version: '2.1.0',
  run: {
    project: projectName,
    generated_at: new Date().toISOString(),
    timezone: 'UTC',
    max_retries: 3,
    postmortem_window_seconds: 300,
    decomposition: { enabled: true, max_depth: 2, timeout_seconds: 600 },
    testing_phase: { enabled: true, timeout_seconds: 600, non_fatal: true },
    parallel: {
      enabled: true,
      max_concurrent: maxWorkers,
      auto_merge: true,
      stagger_seconds: 3,
      worker_nodes: workerNodes
    },
    merge: {
      auto_merge: true,
      merge_review_timeout_seconds: 900,
      conflict_agent_template: 'merge-review.md'
    },
    signal_protocol: {
      done: '<ralph>DONE X.X</ralph>',
      fail: '<ralph>FAIL X.X: reason</ralph>',
      learn: '<ralph>LEARN: text</ralph>',
      merge_done: '<ralph>MERGE_DONE: message</ralph>',
      merge_fail: '<ralph>MERGE_FAIL: reason</ralph>',
      decompose_done: '<ralph>DECOMPOSE_DONE X.X: N sub-stories</ralph>',
      test_review_done: '<ralph>TEST_REVIEW_DONE X.X: result</ralph>'
    }
  },
  batches: sortedBatchIds.map(id => {
    const b = batches.get(id);
    return {
      id: b.id,
      lane: b.lane,
      mode: b.mode,
      story_count: b.story_ids.length,
      story_ids: [...b.story_ids]
    };
  }),
  epics,
  stories,
  events,
  views: {
    dependency_focus_story_ids: stories.filter(s => s.decomposition.children.length > 0).slice(0, 10).map(s => s.id),
    failure_focus_story_ids: stories.filter(s => s.status === 'failed').map(s => s.id),
    tentative_focus_story_ids: stories.filter(s => s.status === 'tentative').map(s => s.id),
    pending_branch_story_ids: stories.filter(s => s.branch.state && s.branch.state.includes('pending')).map(s => s.id)
  },
  stats: {
    epic_count: epics.length,
    story_count: stories.length,
    batch_count: sortedBatchIds.length,
    event_count: events.length,
    event_types: eventTypeCounts,
    outcomes: {
      done: stories.filter(s => s.status === 'done').length,
      tentative: stories.filter(s => s.status === 'tentative').length,
      failed: stories.filter(s => s.status === 'failed').length,
      pending: stories.filter(s => s.status === 'pending').length
    },
    execution_modes: {
      sequential: stories.filter(s => s.execution_mode === 'sequential').length,
      sequential_fallback: stories.filter(s => s.execution_mode === 'sequential_fallback').length,
      parallel: stories.filter(s => s.execution_mode === 'parallel').length
    },
    decomposed_parents: stories.filter(s => s.decomposition.children.length > 0).length,
    absorbed_stories: stories.filter(s => s.absorption.absorbed).length,
    pending_branches: stories.filter(s => s.branch.state && s.branch.state.includes('pending')).length,
    merge_conflict_stories: stories.filter(s => s.merge.conflicts > 0).length,
    testing_non_fatal_warnings: stories.filter(s => s.testing.review_status === 'non_fatal_warn').length
  }
};

process.stdout.write(`${JSON.stringify(graph, null, 2)}\n`);
