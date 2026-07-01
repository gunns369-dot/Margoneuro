const test = require('node:test');
const assert = require('node:assert/strict');
const { HeroRouteCombatFSM } = require('../berserk-fsm');

test('matrix: [route map/non-route] x [running/stop] x [checkbox]', () => {
  const bools = [false, true];
  for (const inRouteMap of bools) {
    for (const running of bools) {
      for (const checkbox of bools) {
        const fsm = new HeroRouteCombatFSM();
        fsm.onMapChange(inRouteMap);
        fsm.setCheckbox(checkbox);
        fsm.setTask('EXP');
        fsm.setRunning(running);

        const expected = false;
        assert.equal(fsm.state.berserkActive, expected, `failed combo route=${inRouteMap} running=${running} checkbox=${checkbox}`);
      }
    }
  }
});

test('flow: exp map -> start -> server berserk stays OFF', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.setCheckbox(true);
  fsm.setTask('EXP');
  fsm.onMapChange(true);
  fsm.setRunning(true);
  assert.equal(fsm.state.berserkActive, false);

  fsm.onMapChange(false);
  assert.equal(fsm.state.berserkActive, false);

  const hasOn = fsm.events.some(e => e.event === 'berserk_on');
  assert.equal(hasOn, false);
});

test('trap flow: detect -> fullscreen ON before first action -> resolve -> fullscreen OFF', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.detectTrap();
  fsm.beforeFirstTrapAction();
  fsm.beforeFirstTrapAction(); // idempotent
  assert.equal(fsm.state.fullscreenByBot, true);

  const onEvents = fsm.events.filter(e => e.event === 'fullscreen_on');
  assert.equal(onEvents.length, 1);

  fsm.onTrapResolvedAndMovementResumed();
  fsm.onTrapResolvedAndMovementResumed(); // idempotent
  assert.equal(fsm.state.fullscreenByBot, false);

  const offEvents = fsm.events.filter(e => e.event === 'fullscreen_off');
  assert.equal(offEvents.length, 1);
});

test('quick attack is allowed when server berserk is OFF', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.setCheckbox(false);
  fsm.setTask('EXP');
  fsm.onMapChange(true);
  fsm.setRunning(true);

  assert.equal(fsm.state.berserkActive, false);
  assert.equal(fsm.autoAttack(), true);
  assert.equal(fsm.attackCalls, 1);
  assert.equal(fsm.events.some(e => e.event === 'quick_attack_allowed'), true);
});

test('stopped -> berserk is turned OFF', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.setCheckbox(true);
  fsm.setTask('EXP');
  fsm.onMapChange(true);
  fsm.setRunning(true);
  assert.equal(fsm.state.berserkActive, false);

  fsm.setRunning(false);
  assert.equal(fsm.state.berserkActive, false);
});

test('running + task != EXP -> berserk OFF', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.setCheckbox(true);
  fsm.onMapChange(true);
  fsm.setRunning(true);
  fsm.setTask('AUTOSELL');
  assert.equal(fsm.state.berserkActive, false);
});

test('manual berserk detected while stopped does not start route/task', () => {
  const fsm = new HeroRouteCombatFSM();
  fsm.setCheckbox(true);
  fsm.setRunning(false);
  fsm.setTask('IDLE');
  fsm.onMapChange(false);

  fsm.detectManualBerserkState(true);

  assert.equal(fsm.state.running, false);
  assert.equal(fsm.state.currentTask, 'IDLE');
  assert.equal(fsm.state.inRouteMap, false);
  assert.equal(fsm.state.berserkActive, false);
});
