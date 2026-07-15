import assert from 'node:assert/strict';
import { resolveSeasonalInstruction } from '../src/lib/message-template-defaults';

const winterIncrease = resolveSeasonalInstruction('increase', null, '2026-01-15');
assert.equal(winterIncrease, 'In winter, use less heat.');

const winterDecrease = resolveSeasonalInstruction('decrease', null, '2026-01-15');
assert.equal(winterDecrease, 'In winter, use more heat.');

const summerIncrease = resolveSeasonalInstruction('increase', null, '2026-07-15');
assert.equal(summerIncrease, 'In summer, use more cooling.');

const summerDecrease = resolveSeasonalInstruction('decrease', null, '2026-07-15');
assert.equal(summerDecrease, 'In summer, use less cooling.');

const summerFromTempData = resolveSeasonalInstruction('increase', { currentTemp: 75, futureTemp: 80 });
assert.equal(summerFromTempData, 'In summer, use more cooling by 5°F.');

const winterWithDelta = resolveSeasonalInstruction('increase', { change: 3 }, '2026-01-15');
assert.equal(winterWithDelta, 'In winter, use less heat by 3°F.');

console.log('Seasonal template tests passed');

