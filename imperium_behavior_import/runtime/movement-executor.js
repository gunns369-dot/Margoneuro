"use strict";

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function trimReached(points, hero) {
  if (!points.length) return points;
  if (points[0].x === hero.x && points[0].y === hero.y) return points.slice(1);
  return points;
}

function findNearestReachableIndex(points, hero) {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = distance(hero, points[i]);
    if (d <= 2 && d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx > 0) return "d";
  if (dx < 0) return "a";
  if (dy > 0) return "s";
  if (dy < 0) return "w";
  return null;
}

async function executeRoute(route, adapter, options = {}) {
  const wait = options.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const delayMs = options.delayMs ?? 25;
  let points = [...route.points];
  const startedOnMap = adapter.getMapId ? adapter.getMapId() : null;

  while (points.length) {
    if (adapter.getMapId && startedOnMap !== adapter.getMapId()) return { status: "map-changed" };

    const hero = adapter.getHeroPosition();
    points = trimReached(points, hero);
    if (!points.length) return { status: "done" };

    const nearestIndex = findNearestReachableIndex(points, hero);
    const target = nearestIndex >= 0 ? points[nearestIndex] : points[0];
    const direction = directionTo(hero, target);
    if (!direction) {
      points = points.slice(1);
      continue;
    }

    await adapter.sendKey(direction);
    await wait(delayMs);
  }

  return { status: "done" };
}

module.exports = {
  distance,
  trimReached,
  findNearestReachableIndex,
  directionTo,
  executeRoute,
};
