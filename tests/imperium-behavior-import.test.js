const test = require('node:test');
const assert = require('node:assert/strict');

const {
  imperiumBehaviorKnowledge,
  imperiumMovementExecutor
} = require('../routing');

test('loads imported Imperium behavior knowledge', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const summary = imperiumBehaviorKnowledge.summarizeImperiumBehaviorKnowledge(brain);

  assert.equal(summary.questQueueStatus, 'observed-engine-queue');
  assert.ok(summary.routes >= 300);
  assert.ok(summary.npcInteractions >= 6);
  assert.ok(summary.questActions >= 4);
  assert.ok(summary.fightActions >= 1);
  assert.ok(summary.lootActions >= 1);
  assert.ok(summary.questTracking >= 5);
  assert.ok(summary.questObservedQueue >= 10);
  assert.ok(summary.requests >= 90);
});

test('finds captured routes and endpoint matches', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const route = imperiumBehaviorKnowledge.getCapturedRouteById(brain, '4b5680bf19');

  assert.ok(route);
  assert.equal(route.points.length, 27);

  const matches = imperiumBehaviorKnowledge.findRoutesByEndpoint(brain, {
    start: { x: 28, y: 20 },
    end: { x: 37, y: 35 }
  });
  assert.equal(matches.some((match) => match.id === route.id), true);
});

test('builds reusable NPC request plans', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const sequence = imperiumBehaviorKnowledge.buildNpcRequestSequence(brain, '32691', { unique: true });
  const plan = imperiumBehaviorKnowledge.buildNpcActionPlan(brain, '32691', { unique: true });

  assert.deepEqual(sequence, ['talk&id=32691', 'talk&id=32691&c=20.4']);
  assert.deepEqual(plan, [
    { type: 'request', transport: '_g', request: 'talk&id=32691' },
    { type: 'request', transport: '_g', request: 'talk&id=32691&c=20.4' }
  ]);
});

test('builds reusable quest request plans', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();

  assert.deepEqual(
    imperiumBehaviorKnowledge.buildQuestRequestSequence(brain, 'open', { unique: true }),
    ['quests&action=open&tab=available']
  );
  assert.deepEqual(
    imperiumBehaviorKnowledge.buildQuestActionPlan(brain, '13256', { unique: true }),
    [{ type: 'request', transport: '_g', request: 'quests&action=start&id=13256' }]
  );
  assert.deepEqual(
    imperiumBehaviorKnowledge.buildQuestActionPlan(brain, '13257', { unique: true }),
    [{ type: 'request', transport: '_g', request: 'quests&action=start&id=13257' }]
  );
});

test('builds fight requests from observed combat pattern', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const fight = imperiumBehaviorKnowledge.getFightAction(brain, 'attack:1');

  assert.ok(fight);
  assert.equal(fight.fightAction, 'attack');
  assert.equal(fight.fastFight, '1');
  assert.equal(imperiumBehaviorKnowledge.buildFightAttackRequest(-12345), 'fight&a=attack&id=-12345&ff=1');
});

test('builds loot requests from observed loot pattern', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const loot = imperiumBehaviorKnowledge.getLootAction(brain, 'final:1');

  assert.ok(loot);
  assert.equal(loot.final, '1');
  assert.equal(imperiumBehaviorKnowledge.buildLootRequest(1206538915), 'loot&want=1206538915&not=&must=&final=1');
});

test('loads quest tracking targets and positions', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const talkTargets = imperiumBehaviorKnowledge.listQuestTargets(brain, 13256, { interactionType: 'TALK' });
  const killTargets = imperiumBehaviorKnowledge.listQuestTargets(brain, 13256, { interactionType: 'KILL' });

  assert.equal(talkTargets.some((target) => target.name === 'Zakonnik Równowagi'), true);
  assert.ok(killTargets.length >= 10);
  assert.equal(killTargets.some((target) => target.positions.length > 1), true);
});

test('loads observed quest queue snapshots', () => {
  const brain = imperiumBehaviorKnowledge.loadImperiumBehaviorKnowledge();
  const latest = imperiumBehaviorKnowledge.getLatestQuestObservedQueue(brain);
  const ids = imperiumBehaviorKnowledge.getObservedQuestIds(brain);

  assert.ok(latest);
  assert.deepEqual(latest.questIds, [13258]);
  assert.equal(ids.includes(13175), true);
  assert.equal(ids.includes(13258), true);
});

test('creates movement decisions from point routes', () => {
  const { directionTo, createStepDecision, trimReachedPoints } = imperiumMovementExecutor;

  assert.equal(directionTo({ x: 1, y: 1 }, { x: 2, y: 1 }), 'd');
  assert.equal(directionTo({ x: 1, y: 1 }, { x: 0, y: 1 }), 'a');
  assert.equal(directionTo({ x: 1, y: 1 }, { x: 1, y: 2 }), 's');
  assert.equal(directionTo({ x: 1, y: 1 }, { x: 1, y: 0 }), 'w');

  const route = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  assert.deepEqual(trimReachedPoints(route, { x: 1, y: 1 }), [{ x: 2, y: 1 }, { x: 3, y: 1 }]);

  const decision = createStepDecision(route, { x: 1, y: 1 });
  assert.equal(decision.status, 'move');
  assert.equal(decision.direction, 'd');
  assert.deepEqual(decision.target, { x: 2, y: 1 });
});

test('executes point route through an adapter', async () => {
  const { executePointRoute } = imperiumMovementExecutor;
  const pressed = [];
  const hero = { x: 1, y: 1 };
  const route = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }];

  const adapter = {
    getHeroPosition: () => ({ ...hero }),
    getMapId: () => 500,
    sendKey: async (direction) => {
      pressed.push(direction);
      if (direction === 'd') hero.x += 1;
      if (direction === 'a') hero.x -= 1;
      if (direction === 's') hero.y += 1;
      if (direction === 'w') hero.y -= 1;
    }
  };

  const result = await executePointRoute(route, adapter, { wait: async () => {}, delayMs: 0 });

  assert.equal(result.status, 'done');
  assert.deepEqual(pressed, ['d', 's']);
  assert.deepEqual(hero, { x: 2, y: 2 });
});
