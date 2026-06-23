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

function normalizeRoutePoints(routeOrPoints) {
  const points = Array.isArray(routeOrPoints) ? routeOrPoints : routeOrPoints?.points;
  if (!Array.isArray(points)) throw new Error('Route must be an array of points or an object with points[]');
  return points.map(normalizePoint);
}

function manhattanDistance(a, b) {
  const left = normalizePoint(a);
  const right = normalizePoint(b);
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function samePoint(a, b) {
  const left = normalizePoint(a);
  const right = normalizePoint(b);
  return left.x === right.x && left.y === right.y;
}

function trimReachedPoints(points, hero) {
  const current = normalizePoint(hero);
  const normalized = points.map(normalizePoint);
  let index = 0;
  while (index < normalized.length && samePoint(normalized[index], current)) index += 1;
  return normalized.slice(index);
}

function findNearestReachableIndex(points, hero, maxDistance = 2) {
  const current = normalizePoint(hero);
  let bestIndex = -1;
  let bestDistance = Infinity;

  points.map(normalizePoint).forEach((point, index) => {
    const distance = manhattanDistance(current, point);
    if (distance <= maxDistance && distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });

  return bestIndex;
}

function directionTo(from, to) {
  const start = normalizePoint(from);
  const target = normalizePoint(to);
  const dx = target.x - start.x;
  const dy = target.y - start.y;

  if (dx > 0) return 'd';
  if (dx < 0) return 'a';
  if (dy > 0) return 's';
  if (dy < 0) return 'w';
  return null;
}

function createStepDecision(routeOrPoints, hero, { maxDistance = 2 } = {}) {
  let remainingPoints = trimReachedPoints(normalizeRoutePoints(routeOrPoints), hero);
  if (!remainingPoints.length) {
    return { status: 'done', direction: null, target: null, remainingPoints };
  }

  const nearestIndex = findNearestReachableIndex(remainingPoints, hero, maxDistance);
  if (nearestIndex > 0) remainingPoints = remainingPoints.slice(nearestIndex);

  const target = remainingPoints[0];
  const direction = directionTo(hero, target);
  if (!direction) {
    return { status: 'at-target', direction: null, target, remainingPoints: remainingPoints.slice(1) };
  }

  return { status: 'move', direction, target, remainingPoints };
}

async function executePointRoute(routeOrPoints, adapter, options = {}) {
  if (!adapter || typeof adapter.getHeroPosition !== 'function') {
    throw new Error('executePointRoute requires adapter.getHeroPosition()');
  }
  if (typeof adapter.sendKey !== 'function') {
    throw new Error('executePointRoute requires adapter.sendKey(direction)');
  }

  const wait = options.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const delayMs = options.delayMs ?? 25;
  const maxSteps = options.maxSteps ?? Math.max(20, normalizeRoutePoints(routeOrPoints).length * 8);
  const startedOnMap = typeof adapter.getMapId === 'function' ? adapter.getMapId() : null;
  let remainingPoints = normalizeRoutePoints(routeOrPoints);
  let steps = 0;

  while (remainingPoints.length) {
    if (typeof adapter.getMapId === 'function' && adapter.getMapId() !== startedOnMap) {
      return { status: 'map-changed', steps, remainingPoints };
    }
    if (steps >= maxSteps) {
      return { status: 'stalled', steps, remainingPoints };
    }

    const hero = normalizePoint(adapter.getHeroPosition());
    const decision = createStepDecision(remainingPoints, hero, options);
    remainingPoints = decision.remainingPoints;

    if (decision.status === 'done') return { status: 'done', steps, remainingPoints };
    if (decision.status === 'at-target') continue;

    await adapter.sendKey(decision.direction, decision.target, { step: steps, remainingPoints });
    steps += 1;
    await wait(delayMs);
  }

  return { status: 'done', steps, remainingPoints };
}

module.exports = {
  normalizePoint,
  normalizeRoutePoints,
  manhattanDistance,
  samePoint,
  trimReachedPoints,
  findNearestReachableIndex,
  directionTo,
  createStepDecision,
  executePointRoute
};
