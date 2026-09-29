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
});
