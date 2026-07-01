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
  return { combat: context.window.HeroCombatModule, context };
}

test('hero combat builds Imperium-style fast attack requests for signed runtime ids', () => {
  const { combat } = loadHeroCombatModule();

  assert.equal(combat.normalizeRuntimeId('-360479'), -360479);
  assert.equal(combat.normalizeRuntimeId('0'), null);
  assert.equal(combat.buildFightAttackRequest(-360479), 'fight&a=attack&id=-360479&ff=1');
  assert.equal(combat.buildFightAttackRequest(240612, 0), 'fight&a=attack&id=240612&ff=0');
});

test('hero combat quick fight uses npc context menu when target is adjacent', () => {
  const { combat, context } = loadHeroCombatModule();
  let contextMenuCalls = 0;
  context.Engine = {
    hero: { d: { x: 10, y: 10 } },
    npcs: {
      check: () => ({
        '-360479': {
          d: { id: -360479, x: 11, y: 10, type: 1, nick: 'Test mob' },
          oncontextmenu: (event) => {
            contextMenuCalls += 1;
            event.stopPropagation();
            event.preventDefault();
          }
        }
      })
    },
    interactions: {
      quickFight: () => {
        throw new Error('quickFight fallback should not run when context menu is available');
      }
    }
  };

  assert.equal(combat.quickFightNpc(-360479), true);
  assert.equal(contextMenuCalls, 1);
});
