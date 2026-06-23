const fs = require('fs');
const path = require('path');

const DEFAULT_BRAIN_PATH = path.join(__dirname, '..', 'data', 'imperium_behavior_import', 'brain.json');

function loadImperiumBehaviorKnowledge(filePath = DEFAULT_BRAIN_PATH) {
  const brain = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateImperiumBehaviorKnowledge(brain);
  return brain;
}

function validateImperiumBehaviorKnowledge(brain) {
  if (!brain || typeof brain !== 'object') {
    throw new Error('Imperium behavior knowledge must be an object');
  }
  if (brain.schema !== 'margoneuro.behavior-brain.v1') {
    throw new Error(`Unsupported Imperium behavior schema: ${brain.schema || '(missing)'}`);
  }
  for (const key of ['routes', 'npcInteractions', 'requestTimeline']) {
    if (!Array.isArray(brain[key])) throw new Error(`Imperium behavior field must be an array: ${key}`);
  }
  if (brain.questActions && !Array.isArray(brain.questActions)) {
    throw new Error('Imperium behavior field must be an array: questActions');
  }
  if (brain.fightActions && !Array.isArray(brain.fightActions)) {
    throw new Error('Imperium behavior field must be an array: fightActions');
  }
  if (brain.lootActions && !Array.isArray(brain.lootActions)) {
    throw new Error('Imperium behavior field must be an array: lootActions');
  }
  if (brain.questTracking && !Array.isArray(brain.questTracking)) {
    throw new Error('Imperium behavior field must be an array: questTracking');
  }
  if (brain.questObservedQueue && !Array.isArray(brain.questObservedQueue)) {
    throw new Error('Imperium behavior field must be an array: questObservedQueue');
  }
  for (const route of brain.routes) {
    if (!route.id) throw new Error('Imported route is missing id');
    if (!Array.isArray(route.points)) throw new Error(`Imported route is missing points: ${route.id}`);
    for (const point of route.points) normalizePoint(point);
  }
  return true;
}

function summarizeImperiumBehaviorKnowledge(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return {
    routes: brain.routes.length,
    routePoints: brain.routes.reduce((sum, route) => sum + route.points.length, 0),
    npcInteractions: brain.npcInteractions.length,
    questActions: Array.isArray(brain.questActions) ? brain.questActions.length : 0,
    fightActions: Array.isArray(brain.fightActions) ? brain.fightActions.length : 0,
    lootActions: Array.isArray(brain.lootActions) ? brain.lootActions.length : 0,
    questTracking: Array.isArray(brain.questTracking) ? brain.questTracking.length : 0,
    questObservedQueue: Array.isArray(brain.questObservedQueue) ? brain.questObservedQueue.length : 0,
    requests: brain.requestTimeline.length,
    towns: Array.isArray(brain.towns) ? brain.towns.length : 0,
    questQueueStatus: brain.mechanics?.questQueue?.status || 'unknown'
  };
}

function listCapturedRoutes(brain, { minLength = 1, minCount = 1 } = {}) {
  validateImperiumBehaviorKnowledge(brain);
  return brain.routes.filter((route) => route.points.length >= minLength && (route.count || 0) >= minCount);
}

function findRoutesByEndpoint(brain, { start, end } = {}) {
  validateImperiumBehaviorKnowledge(brain);
  const startPoint = start ? normalizePoint(start) : null;
  const endPoint = end ? normalizePoint(end) : null;
  return brain.routes.filter((route) => {
    const routeStart = route.start || route.points[0];
    const routeEnd = route.end || route.points[route.points.length - 1];
    if (startPoint && !samePoint(routeStart, startPoint)) return false;
    if (endPoint && !samePoint(routeEnd, endPoint)) return false;
    return true;
  });
}

function getCapturedRouteById(brain, routeId) {
  validateImperiumBehaviorKnowledge(brain);
  return brain.routes.find((route) => route.id === routeId) || null;
}

function listNpcInteractions(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...brain.npcInteractions];
}

function getNpcInteraction(brain, npcId) {
  validateImperiumBehaviorKnowledge(brain);
  const id = String(npcId);
  return brain.npcInteractions.find((interaction) => interaction.npcId === id) || null;
}

function buildNpcRequestSequence(brain, npcId, { unique = false } = {}) {
  const interaction = getNpcInteraction(brain, npcId);
  if (!interaction) return [];
  const requests = interaction.sequence.map((step) => step.request).filter(Boolean);
  if (!unique) return requests;
  return [...new Set(requests)];
}

function buildNpcActionPlan(brain, npcId, options = {}) {
  return buildNpcRequestSequence(brain, npcId, options).map((request) => ({
    type: 'request',
    transport: '_g',
    request
  }));
}

function listQuestActions(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...(brain.questActions || [])];
}

function getQuestAction(brain, keyOrQuestId) {
  validateImperiumBehaviorKnowledge(brain);
  const key = String(keyOrQuestId);
  return (brain.questActions || []).find((action) => action.key === key || action.questId === key) || null;
}

function buildQuestRequestSequence(brain, keyOrQuestId, { unique = false } = {}) {
  const action = getQuestAction(brain, keyOrQuestId);
  if (!action) return [];
  const requests = action.sequence.map((step) => step.request).filter(Boolean);
  if (!unique) return requests;
  return [...new Set(requests)];
}

function buildQuestActionPlan(brain, keyOrQuestId, options = {}) {
  return buildQuestRequestSequence(brain, keyOrQuestId, options).map((request) => ({
    type: 'request',
    transport: '_g',
    request
  }));
}

function listFightActions(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...(brain.fightActions || [])];
}

function getFightAction(brain, key = 'attack:1') {
  validateImperiumBehaviorKnowledge(brain);
  return (brain.fightActions || []).find((action) => action.key === key) || null;
}

function buildFightAttackRequest(targetRuntimeId, { fastFight = 1 } = {}) {
  if (targetRuntimeId == null || targetRuntimeId === '') {
    throw new Error('buildFightAttackRequest requires targetRuntimeId');
  }
  return `fight&a=attack&id=${targetRuntimeId}&ff=${fastFight}`;
}

function listLootActions(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...(brain.lootActions || [])];
}

function getLootAction(brain, key = 'final:1') {
  validateImperiumBehaviorKnowledge(brain);
  return (brain.lootActions || []).find((action) => action.key === key) || null;
}

function buildLootRequest(itemRuntimeId, { final = 1, not = '', must = '' } = {}) {
  if (itemRuntimeId == null || itemRuntimeId === '') {
    throw new Error('buildLootRequest requires itemRuntimeId');
  }
  return `loot&want=${itemRuntimeId}&not=${not}&must=${must}&final=${final}`;
}

function listQuestTracking(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...(brain.questTracking || [])];
}

function getQuestTracking(brain, questId) {
  validateImperiumBehaviorKnowledge(brain);
  const id = String(questId);
  return (brain.questTracking || []).find((quest) => String(quest.questId) === id) || null;
}

function listQuestTargets(brain, questId, { interactionType } = {}) {
  const tracking = getQuestTracking(brain, questId);
  if (!tracking) return [];
  return tracking.targets.filter((target) => !interactionType || target.interactionType === interactionType);
}

function listQuestObservedQueues(brain) {
  validateImperiumBehaviorKnowledge(brain);
  return [...(brain.questObservedQueue || [])];
}

function getLatestQuestObservedQueue(brain) {
  const queues = listQuestObservedQueues(brain);
  return queues.length ? queues[queues.length - 1] : null;
}

function getObservedQuestIds(brain) {
  return [...new Set(listQuestObservedQueues(brain).flatMap((snapshot) => snapshot.questIds || []))];
}

function normalizePoint(point) {
  if (typeof point === 'string') {
    const [x, y] = point.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
    return { x: Number(point.x), y: Number(point.y) };
  }
  throw new Error(`Invalid point: ${JSON.stringify(point)}`);
}

function samePoint(a, b) {
  const left = normalizePoint(a);
  const right = normalizePoint(b);
  return left.x === right.x && left.y === right.y;
}

module.exports = {
  DEFAULT_BRAIN_PATH,
  loadImperiumBehaviorKnowledge,
  validateImperiumBehaviorKnowledge,
  summarizeImperiumBehaviorKnowledge,
  listCapturedRoutes,
  findRoutesByEndpoint,
  getCapturedRouteById,
  listNpcInteractions,
  getNpcInteraction,
  buildNpcRequestSequence,
  buildNpcActionPlan,
  listQuestActions,
  getQuestAction,
  buildQuestRequestSequence,
  buildQuestActionPlan,
  listFightActions,
  getFightAction,
  buildFightAttackRequest,
  listLootActions,
  getLootAction,
  buildLootRequest,
  listQuestTracking,
  getQuestTracking,
  listQuestTargets,
  listQuestObservedQueues,
  getLatestQuestObservedQueue,
  getObservedQuestIds,
  normalizePoint,
  samePoint
};
