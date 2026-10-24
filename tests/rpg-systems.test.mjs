import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_LEVEL,
  requiredCharacterXP,
  totalCharacterXPForLevel,
  levelFromCharacterXP,
  getLevelProgression,
  createDefaultAttributes,
  getCharacterClass
} from '../src/rpg/characterData.js';
import { calculateDerivedStats, calculateDamage } from '../src/rpg/combatData.js';
import { createInventory, addItem, removeItem } from '../src/rpg/inventoryData.js';
import { canEquip, emptyEquipment, EQUIPMENT_SLOTS } from '../src/rpg/equipmentData.js';
import { rollRarity, rollAffixes, generateLoot, RARITIES } from '../src/rpg/lootSystem.js';
import { WORLD_BIOMES, WORLD_ZONES, DUNGEONS, RAIDS, TOWER_FLOORS, getZoneForLevel } from '../src/rpg/worldData.js';
import { createTalentState, spendTalentPoint, getTalentTree } from '../src/rpg/talentData.js';

test('character progression validates levels and caps at the configured maximum', () => {
  assert.equal(MAX_LEVEL, 720);
  assert.ok(requiredCharacterXP(1) > 0);
  assert.equal(requiredCharacterXP(MAX_LEVEL), 0);
  assert.throws(() => requiredCharacterXP(0), RangeError);
  assert.equal(levelFromCharacterXP(0), 1);
  assert.equal(levelFromCharacterXP(totalCharacterXPForLevel(2)), 2);
  assert.equal(levelFromCharacterXP(totalCharacterXPForLevel(MAX_LEVEL)), MAX_LEVEL);
  assert.equal(getLevelProgression(61).bracket, 2);
  assert.equal(getLevelProgression(MAX_LEVEL).isCap, true);
});

test('class catalog and default attributes are internally consistent', () => {
  assert.equal(getCharacterClass('knight').id, 'knight');
  assert.equal(getCharacterClass('not-a-class'), null);
  const attributes = createDefaultAttributes();
  assert.ok(attributes.STR === 10 && attributes.CHA === 10);
  assert.equal(Object.keys(attributes).length, 10);
});

test('derived combat stats scale with attributes and damage never falls below one', () => {
  const low = calculateDerivedStats({});
  const high = calculateDerivedStats({ STR: 10, VIT: 10, CON: 10, DEX: 10, LCK: 10 });
  assert.ok(high.maxHP > low.maxHP);
  assert.ok(high.attackPower > low.attackPower);
  assert.equal(calculateDamage(0), 1);
  assert.equal(calculateDamage(10, 2), 20);
  assert.equal(calculateDamage(10, 2, true, 1.5), 30);
});

test('inventory stacking respects stack limit and removals', () => {
  const inventory = createInventory(2);
  assert.deepEqual(addItem(inventory, { itemId: 'herb', stackable: true, stackMax: 5, quantity: 3 }), { ok: true, stacked: false });
  assert.deepEqual(addItem(inventory, { itemId: 'herb', stackable: true, stackMax: 5, quantity: 4 }), { ok: true, stacked: true });
  assert.equal(inventory.items[0].quantity, 5);
  assert.equal(removeItem(inventory, 'herb', 2), true);
  assert.equal(inventory.items[0].quantity, 3);
  assert.equal(removeItem(inventory, 'missing'), false);
  assert.equal(addItem(inventory, null).reason, 'invalid-input');
});

test('equipment rejects invalid slots, low levels, and class mismatches', () => {
  assert.equal(canEquip({ slot: 'MainHand', level: 5 }, { level: 4 }), false);
  assert.equal(canEquip({ slot: 'MainHand', requiredClass: 'mage' }, { classId: 'knight' }), false);
  assert.equal(canEquip({ slot: 'MainHand', level: 2 }, { level: 2 }), true);
  assert.equal(canEquip({ slot: 'NotASlot' }, { level: 99 }), false);
  assert.equal(Object.keys(emptyEquipment()).length, EQUIPMENT_SLOTS.length);
});

test('loot rolls are deterministic at fixed seeds and affix counts are bounded', () => {
  assert.equal(rollRarity(0), 'Unique');
  assert.equal(rollRarity(0.99), 'Common');
  assert.equal(rollRarity(-10), 'Unique');
  assert.equal(rollRarity(1), 'Common');
  assert.equal(rollAffixes('Common', 10).length, 0);
  assert.equal(rollAffixes('Unique', 10, 100).length, 8);
  const a = generateLoot({ level: 10, difficulty: 2, seed: 0.4 });
  const b = generateLoot({ level: 10, difficulty: 2, seed: 0.4 });
  assert.equal(a.rarity, b.rarity);
  assert.equal(a.itemLevel, b.itemLevel);
  assert.ok(a.power > 0);
  assert.ok(RARITIES.includes(a.rarity));
});

test('world catalogs cover progression and endgame content', () => {
  assert.equal(WORLD_BIOMES.length, 9);
  assert.equal(WORLD_ZONES.length, 9);
  assert.equal(DUNGEONS.length, 7);
  assert.equal(RAIDS.length, 3);
  assert.equal(TOWER_FLOORS.length, 100);
  assert.equal(TOWER_FLOORS[9].type, 'boss');
  assert.equal(TOWER_FLOORS[4].type, 'elite');
  assert.equal(getZoneForLevel(1).id, 'thornwatch');
  assert.equal(getZoneForLevel(720).id, 'voidscar');
});

test('talent spending increments known talents and refuses unknown or capped talents', () => {
  const state = createTalentState('knight');
  const talent = getTalentTree('knight')[0];
  const next = spendTalentPoint(state, talent.id);
  assert.equal(next[talent.id], 1);
  assert.equal(state[talent.id], 0);
  assert.equal(spendTalentPoint(state, 'missing-talent'), state);
  const capped = { [talent.id]: talent.maxRank };
  assert.equal(spendTalentPoint(capped, talent.id), capped);
});
