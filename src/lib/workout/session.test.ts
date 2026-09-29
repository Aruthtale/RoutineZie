import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WorkoutSessionState,
  saveActiveWorkoutSession,
  loadActiveWorkoutSession,
  clearActiveWorkoutSession,
} from './session';

describe('Workout Session Storage Unit Tests', () => {
  const dummySession: WorkoutSessionState = {
    dayName: 'Senin',
    workoutName: 'Push + Core',
    currentExerciseIndex: 0,
    currentSetIndex: 1,
    isResting: true,
    restEndTime: Date.now() + 60000,
    logs: [
      {
        exerciseName: 'Push-Up',
        tipe: 'reps',
        sets: [
          { setIndex: 0, target: '12', tipeTarget: 'reps', actualDone: 12, completed: true },
          { setIndex: 1, target: '10', tipeTarget: 'reps', completed: false },
        ],
      },
    ],
    startedAt: Date.now() - 300000,
    isFinished: false,
  };

  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const localStorageMock = {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: string) => {
        memoryStore[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete memoryStore[key];
      },
      clear: () => {
        memoryStore = {};
      },
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save and reload active workout session accurately', () => {
    saveActiveWorkoutSession(dummySession);
    const reloaded = loadActiveWorkoutSession();
    expect(reloaded).not.toBeNull();
    expect(reloaded?.dayName).toBe('Senin');
    expect(reloaded?.workoutName).toBe('Push + Core');
    expect(reloaded?.isResting).toBe(true);
    expect(reloaded?.logs[0].sets[0].actualDone).toBe(12);
  });

  it('should clear session correctly', () => {
    saveActiveWorkoutSession(dummySession);
    clearActiveWorkoutSession();
    expect(loadActiveWorkoutSession()).toBeNull();
  });
});
