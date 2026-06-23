const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadHeroCombatModule() {
  const context = {
    window: {},
    console,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'hero-combat.js'), 'utf8');
  vm.runInContext(source, context);
  return context.window.HeroCombatModule;
}

test('hero combat builds Imperium-style fast attack requests for signed runtime ids', () => {
  const combat = loadHeroCombatModule();

  assert.equal(combat.normalizeRuntimeId('-360479'), -360479);
  assert.equal(combat.normalizeRuntimeId('0'), null);
  assert.equal(combat.buildFightAttackRequest(-360479), 'fight&a=attack&id=-360479&ff=1');
  assert.equal(combat.buildFightAttackRequest(240612, 0), 'fight&a=attack&id=240612&ff=0');
});
