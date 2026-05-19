import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isFrozenNonMvpPath,
  isNonMvpFreezeEnabled,
} from '../lib/non-mvp-freeze.js';

test('non-MVP freeze flag is explicit and defaults off', () => {
  assert.equal(isNonMvpFreezeEnabled({ AIRPORTFASTER_FREEZE_NON_MVP: 'true' }), true);
  assert.equal(isNonMvpFreezeEnabled({ AIRPORTFASTER_FREEZE_NON_MVP: 'false' }), false);
  assert.equal(isNonMvpFreezeEnabled({}), false);
});

test('frozen routes are detected with and without locale prefixes', () => {
  for (const path of [
    '/account/login',
    '/account/register',
    '/developers',
    '/supplier-portal',
    '/admin/corporate',
    '/en/account/login',
    '/en/account/register',
    '/en/developers',
    '/en/supplier-portal',
    '/en/admin/corporate',
    '/ar/account/login',
    '/ar/account/register',
    '/ar/developers',
    '/ar/supplier-portal',
    '/ar/admin/corporate',
  ]) {
    assert.equal(isFrozenNonMvpPath(path), true, path);
  }
});

test('MVP routes are not treated as frozen', () => {
  for (const path of [
    '/',
    '/en',
    '/ar',
    '/en/admin',
    '/en/admin/bookings',
    '/en/airports',
    '/ar/search',
    '/en/manage',
  ]) {
    assert.equal(isFrozenNonMvpPath(path), false, path);
  }
});
