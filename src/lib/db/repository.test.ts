import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { RoutineDatabase } from './index';
import { RoutineRepository } from './repository';

// Set global indexedDB before creating DB instance
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

describe('RoutineRepository Dexie DB Tests', () => {
  beforeEach(async () => {
    // Reset db tables
    const { db } = await import('./index');
    await db.workoutLogs.clear();
    await db.weightLogs.clear();
    await db.sleepLogs.clear();
    await db.mealChecks.clear();
  });

  it('should save and fetch workout logs correctly', async () => {
    const logId = await RoutineRepository.saveWorkoutLog({
      id: 'workout_2026-09-28_PushCore',
      dateISO: '2026-09-28',
      hari: 'Senin',
      workoutNama: 'Push + Core',
      exercises: [
        {
          latihan: 'Push-up',
          tipe: 'reps',
          sets: [{ reps: 12, done: true }],
        },
      ],
      energyRating: 4,
    });

    expect(logId).toBe('workout_2026-09-28_PushCore');
    const logs = await RoutineRepository.getWorkoutLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].workoutNama).toBe('Push + Core');
  });

  it('should save and evaluate sleep logs for sleptBefore22', async () => {
    await RoutineRepository.saveSleepLog('2026-09-28', '21:15', '04:50', 5);
    await RoutineRepository.saveSleepLog('2026-09-29', '23:00', '05:00', 3);

    const sleeps = await RoutineRepository.getSleepLogs();
    expect(sleeps.length).toBe(2);

    const day1 = sleeps.find((s) => s.dateISO === '2026-09-28');
    const day2 = sleeps.find((s) => s.dateISO === '2026-09-29');

    expect(day1?.sleptBefore22).toBe(true);
    expect(day2?.sleptBefore22).toBe(false);
  });

  it('should toggle meal checklist properly', async () => {
    const check1 = await RoutineRepository.toggleMealCheck('2026-09-28', '06.30', 'Sarapan');
    expect(check1).toBe(true);

    const checks = await RoutineRepository.getMealChecksByDate('2026-09-28');
    expect(checks.length).toBe(1);
    expect(checks[0].done).toBe(true);

    const check2 = await RoutineRepository.toggleMealCheck('2026-09-28', '06.30', 'Sarapan');
    expect(check2).toBe(false);
  });

  it('should export and import data seamlessly', async () => {
    const { db } = await import('./index');
    await RoutineRepository.saveWeightLog('2026-09-28', 55.4);
    const jsonStr = await RoutineRepository.exportAllData();
    expect(jsonStr).toContain('55.4');

    await db.weightLogs.clear();
    expect((await RoutineRepository.getWeightLogs()).length).toBe(0);

    const result = await RoutineRepository.importData(jsonStr);
    expect(result.success).toBe(true);
    const reloaded = await RoutineRepository.getWeightLogs();
    expect(reloaded.length).toBe(1);
    expect(reloaded[0].kg).toBe(55.4);
  });

  it('round-trip: all 12 tables survive export → clear → import', async () => {
    const { db } = await import('./index');

    // Seed all 12 tables with at least one row
    await RoutineRepository.saveWorkoutLog({
      id: 'rt_workout', dateISO: '2026-10-03', hari: 'Sabtu', workoutNama: 'Test',
      exercises: [], energyRating: 3,
    });
    await RoutineRepository.saveWeightLog('2026-10-03', 60.0);
    await RoutineRepository.saveSleepLog('2026-10-03', '22:00', '05:00', 4);
    await RoutineRepository.toggleMealCheck('2026-10-03', '07.00', 'Sarapan');
    await db.settings.put({ id: 'current_settings', key: 'theme', value: 'dark' } as any);
    await db.chatHistory.put({ id: 'rt_chat', dateISO: '2026-10-03', role: 'user' as any, text: 'hi', createdAt: String(Date.now()) } as any);
    await db.scheduleOverrides.put({ id: 'rt_override', dateISO: '2026-10-03', reason: 'lainnya' as any } as any);
    await db.waterLogs.put({ id: 'rt_water', dateISO: '2026-10-03', glasses: 5, schemaVersion: 1 } as any);
    await db.hungerLogs.put({ id: 'rt_hunger', dateISO: '2026-10-03', timestamp: String(Date.now()), schemaVersion: 1 } as any);
    await db.abilityTests.put({ id: 'rt_ability', dateISO: '2026-10-03', cycle: '4-week' as any, schemaVersion: 1 } as any);
    await db.weeklyNotes.put({ id: 'rt_weekly', weekStartISO: '2026-09-29', note: 'test', schemaVersion: 1 } as any);
    await db.milestones.put({ id: 'rt_ms', kode: 'RT1', label: 'Test', achievedAt: '2026-10-03', schemaVersion: 1 } as any);

    // Export
    const jsonStr = await RoutineRepository.exportAllData();

    // Verify all 12 keys present in backup
    const parsed = JSON.parse(jsonStr);
    const expectedKeys = ['workouts','weights','sleeps','meals','settings','chatHistory','scheduleOverrides','water','hunger','abilityTests','weeklyNotes','milestones'];
    for (const key of expectedKeys) {
      expect(parsed.data[key], `backup should contain "${key}"`).toBeDefined();
      expect(parsed.data[key].length, `"${key}" should have at least 1 row`).toBeGreaterThanOrEqual(1);
    }

    // Clear all tables
    for (const table of [db.workoutLogs, db.weightLogs, db.sleepLogs, db.mealChecks, db.settings, db.chatHistory, db.scheduleOverrides, db.waterLogs, db.hungerLogs, db.abilityTests, db.weeklyNotes, db.milestones]) {
      await table.clear();
    }

    // Import
    const result = await RoutineRepository.importData(jsonStr);
    expect(result.success).toBe(true);

    // Verify all 12 tables restored
    expect((await db.workoutLogs.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.weightLogs.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.sleepLogs.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.mealChecks.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.settings.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.chatHistory.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.scheduleOverrides.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.waterLogs.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.hungerLogs.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.abilityTests.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.weeklyNotes.toArray()).length).toBeGreaterThanOrEqual(1);
    expect((await db.milestones.toArray()).length).toBeGreaterThanOrEqual(1);
  });

  it('import rejects invalid JSON without crashing', async () => {
    const result = await RoutineRepository.importData('not valid json {{{');
    expect(result.success).toBe(false);
    expect(result.message).toContain('parsing');
  });

  it('import rejects empty data gracefully', async () => {
    const result = await RoutineRepository.importData(JSON.stringify({ app: 'CloverzRoutine', data: {} }));
    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain('tidak ada data');
  });

  it('import skips rows without id (does not crash on malformed rows)', async () => {
    const malicious = JSON.stringify({
      app: 'CloverzRoutine',
      data: {
        workouts: [{ noId: true }, { id: 'legit', dateISO: '2026-10-03', hari: 'Sabtu', workoutNama: 'OK' }],
      },
    });
    const result = await RoutineRepository.importData(malicious);
    expect(result.success).toBe(true);
    // Only the row with id should be in DB
    const { db } = await import('./index');
    const all = await db.workoutLogs.toArray();
    expect(all.find((w) => w.id === 'legit')).toBeTruthy();
    expect(all.find((w) => (w as any).noId)).toBeUndefined();
  });
});
