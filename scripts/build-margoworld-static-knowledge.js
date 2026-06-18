#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function normalizeMapKey(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function readJsonOrJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  if (raw[0] === '[' || raw[0] === '{') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      if (path.extname(filePath).toLowerCase() !== '.jsonl') throw error;
    }
  }
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function firstExisting(inputDir, names) {
  for (const name of names) {
    const full = path.join(inputDir, name);
    if (fs.existsSync(full)) return full;
  }
  return path.join(inputDir, names[0]);
}

function compactEntity(entity) {
  return {
    name: entity.name || '',
    type: entity.entity_type || '',
    level: entity.level ?? null,
    rank: entity.rank ?? null,
    x: Number.isFinite(Number(entity.x)) ? Number(entity.x) : null,
    y: Number.isFinite(Number(entity.y)) ? Number(entity.y) : null
  };
}

function inferMapType(map, entityCounts = {}) {
  const name = String(map.name || '').toLowerCase();
  const image = String(map.image_url || map.imageUrl || map.image_relative_path || map.imageRelativePath || '').toLowerCase();
  if (/miasta|city|town/.test(image) || /^(ithan|torneg|werbin|karka-han|tuzmer|thuzal|eder|nithal|mythar)$/.test(name)) return 'town';
  if (/dom|chata|sklep|zajazd|karczma|magazyn|zbrojownia|sala|komnata|p\.\d|pi[eę]tro/.test(name)) return 'building/interior';
  if (/jaskinia|pieczara|grota|krypta|grobowiec|lochy|kopalnia|podziemia|tunel|korytarz|katakumby/.test(name)) return 'dungeon/cave';
  if (Number(entityCounts.monster || 0) > 0) return 'outdoor';
  return 'unknown';
}

function looksLikeGatewayEntity(entity) {
  const text = `${entity.name || ''} ${entity.icon || ''} ${entity.icon_url || ''} ${entity.metadata?.tip_html || ''}`.toLowerCase();
  if (entity.entity_type === 'interactive') return true;
  return /portal|brama|wej|wyj|przej|drzwi|schody|trapdoor|dziura|wrota/.test(text);
}

function buildKnowledge(inputDir) {
  const maps = readJsonOrJsonl(firstExisting(inputDir, ['margoworld_maps.json', 'margoworld_maps.jsonl', 'maps.json']));
  const entities = readJsonOrJsonl(firstExisting(inputDir, ['margoworld_map_entities.json', 'margoworld_map_entities.jsonl', 'map_entities.json']));
  const expSpots = readJsonOrJsonl(firstExisting(inputDir, ['margoworld_exp_spots.json', 'margoworld_exp_spots.jsonl', 'exp_spots.json']));
  const npcs = readJsonOrJsonl(firstExisting(inputDir, ['margoworld_npcs.json', 'margoworld_npcs.jsonl', 'npcs.json']));

  const byMap = {};
  const mapNameByKey = {};
  for (const map of maps) {
    const mapName = String(map.name || map.title || '').replace(/\s+/g, ' ').trim();
    const key = normalizeMapKey(mapName);
    if (!key) continue;
    mapNameByKey[key] = mapName;
    byMap[key] = byMap[key] || {
      mapName,
      normalizedKey: key,
      externalId: map.external_id || map.map_external_id || null,
      imageUrl: map.image_url || '',
      imageRelativePath: map.image_relative_path || '',
      type: 'unknown',
      widthTiles: Number(map.width_tiles || 0) || null,
      heightTiles: Number(map.height_tiles || 0) || null,
      entityCounts: map.metadata?.entity_counts_by_type || {},
      mobs: [],
      npcs: [],
      possibleGateways: [],
      expSpots: []
    };
  }

  const addMapIfMissing = (mapName) => {
    const clean = String(mapName || '').replace(/\s+/g, ' ').trim();
    const key = normalizeMapKey(clean);
    if (!key) return null;
    if (!byMap[key]) {
      mapNameByKey[key] = clean;
      byMap[key] = {
        mapName: clean,
        normalizedKey: key,
        externalId: null,
        type: 'unknown',
        widthTiles: null,
        heightTiles: null,
        entityCounts: {},
        mobs: [],
        npcs: [],
        possibleGateways: [],
        expSpots: []
      };
    }
    return byMap[key];
  };

  for (const entity of entities) {
    const target = addMapIfMissing(entity.map_name);
    if (!target) continue;
    const compact = compactEntity(entity);
    if (entity.entity_type === 'monster') target.mobs.push(compact);
    else if (entity.entity_type === 'npc') target.npcs.push(compact);
    if (looksLikeGatewayEntity(entity)) {
      const entityName = String(entity.name || '').replace(/\s+/g, ' ').trim();
      const targetKey = normalizeMapKey(entityName);
      target.possibleGateways.push({
        name: entityName,
        x: compact.x,
        y: compact.y,
        targetMap: mapNameByKey[targetKey] || '',
        targetKey: mapNameByKey[targetKey] ? targetKey : '',
        source: 'margoworld-entity',
        confidence: mapNameByKey[targetKey] ? 0.35 : 0.15
      });
    }
  }

  for (const npc of npcs) {
    const target = addMapIfMissing(npc.map_name || npc.location || npc.map);
    if (target) target.npcs.push(compactEntity(npc));
  }

  for (const spot of expSpots) {
    const spotName = spot.name || spot.title || spot.exp_spot_name || '';
    const spotMaps = Array.isArray(spot.maps) ? spot.maps : [spot.map_name, spot.location].filter(Boolean);
    for (const mapName of spotMaps) {
      const target = addMapIfMissing(mapName);
      if (target && spotName && !target.expSpots.includes(spotName)) target.expSpots.push(spotName);
    }
  }

  for (const map of Object.values(byMap)) {
    map.mobs = map.mobs.slice(0, 80);
    map.npcs = map.npcs.slice(0, 80);
    map.possibleGateways = map.possibleGateways.slice(0, 80);
    map.type = inferMapType(map, map.entityCounts);
  }

  const transitions = [];
  for (const map of Object.values(byMap)) {
    for (const gw of map.possibleGateways) {
      if (!gw.targetKey) continue;
      transitions.push({
        fromMap: map.mapName,
        fromMapKey: map.normalizedKey,
        toMap: gw.targetMap,
        toMapKey: gw.targetKey,
        x: gw.x,
        y: gw.y,
        source: 'margoworld-static',
        confidence: gw.confidence
      });
    }
  }

  return {
    version: 1,
    source: 'margoworld-static-knowledge',
    generatedAt: new Date().toISOString(),
    mapCount: Object.keys(byMap).length,
    transitionCount: transitions.length,
    maps: byMap,
    transitions
  };
}

function main() {
  const inputDir = path.resolve(process.argv[2] || process.env.MARGOWORLD_DATA_DIR || path.join(process.cwd(), 'data', 'margoworld'));
  const outputFile = path.resolve(process.argv[3] || path.join(process.cwd(), 'data', 'margoworld_static_knowledge.json'));
  const knowledge = buildKnowledge(inputDir);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(knowledge, null, 2));
  console.log(`[margoworld] wrote ${outputFile}`);
  console.log(`[margoworld] maps=${knowledge.mapCount}, staticTransitions=${knowledge.transitionCount}`);
}

if (require.main === module) main();
