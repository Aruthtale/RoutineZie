export interface WorkoutSetLog {
  setIndex: number;
  target: string;
  tipeTarget: 'reps' | 'durasi';
  actualDone?: number | string;
  completed: boolean;
}

export interface ExerciseSessionLog {
  exerciseName: string;
  tipe: 'reps' | 'durasi';
  sets: WorkoutSetLog[];
}

export interface WorkoutSessionState {
  dayName: string;
  workoutName: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  isResting: boolean;
  restEndTime: number | null; // Timestamp in milliseconds
  logs: ExerciseSessionLog[];
  startedAt: number;
  isFinished: boolean;
  // T8.6 — rating energi pasca-workout (1–5, opsional). Boleh kosong.
  energyRating?: 1 | 2 | 3 | 4 | 5;
}

const WORKOUT_STORAGE_KEY = 'routinezie_active_workout_session';

export function saveActiveWorkoutSession(session: WorkoutSessionState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(session));
}

export function loadActiveWorkoutSession(): WorkoutSessionState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = localStorage.getItem(WORKOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveWorkoutSession() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(WORKOUT_STORAGE_KEY);
}
