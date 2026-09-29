import { db, WorkoutLog, WeightLog, SleepLog, MealCheck, AppSettings, ChatHistoryEntry, ScheduleOverride } from './index';

export class RoutineRepository {
  // --- Workout ---
  static async saveWorkoutLog(log: Omit<WorkoutLog, 'schemaVersion'>): Promise<string> {
    const fullLog: WorkoutLog = { ...log, schemaVersion: 1 };
    await db.workoutLogs.put(fullLog);
    return fullLog.id;
  }

  static async getWorkoutLogs(): Promise<WorkoutLog[]> {
    return await db.workoutLogs.orderBy('dateISO').reverse().toArray();
  }

  static async getWorkoutLogByDate(dateISO: string): Promise<WorkoutLog | undefined> {
    return await db.workoutLogs.where('dateISO').equals(dateISO).first();
  }

  // --- Weight ---
  static async saveWeightLog(dateISO: string, kg: number, note?: string): Promise<string> {
    const id = `weight_${dateISO}`;
    const entry: WeightLog = { id, dateISO, kg, note, schemaVersion: 1 };
    await db.weightLogs.put(entry);
    return id;
  }

  static async getWeightLogs(): Promise<WeightLog[]> {
    return await db.weightLogs.orderBy('dateISO').toArray();
  }

  static async getLatestWeightLogs(limit = 10): Promise<WeightLog[]> {
    return await db.weightLogs.orderBy('dateISO').reverse().limit(limit).toArray();
  }

  // --- Sleep ---
  static async saveSleepLog(
    dateISO: string,
    sleptAt: string,
    wokeAt: string,
    qualityRating?: 1 | 2 | 3 | 4 | 5
  ): Promise<string> {
    const id = `sleep_${dateISO}`;
    
    // Check if slept before or at 22:00
    let sleptBefore22 = false;
    const match = sleptAt.match(/(\d{1,2})[\\.:](\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const totalMins = h * 60 + m;
      // 22:00 is 1320 mins. Consider slept from 18:00 to 22:00 as before 22.
      if (totalMins <= 1320 && totalMins >= 1080) {
        sleptBefore22 = true;
      }
    }

    const entry: SleepLog = {
      id,
      dateISO,
      sleptAt,
      wokeAt,
      sleptBefore22,
      qualityRating,
      schemaVersion: 1,
    };
    await db.sleepLogs.put(entry);
    return id;
  }

  static async getSleepLogs(): Promise<SleepLog[]> {
    return await db.sleepLogs.orderBy('dateISO').reverse().toArray();
  }

  // --- Meal Check ---
  static async toggleMealCheck(dateISO: string, waktu: string, menu: string): Promise<boolean> {
    const id = `meal_${dateISO}_${waktu.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existing = await db.mealChecks.get(id);
    const newStatus = existing ? !existing.done : true;

    await db.mealChecks.put({
      id,
      dateISO,
      waktu,
      menu,
      done: newStatus,
      schemaVersion: 1,
    });

    return newStatus;
  }

  static async getMealChecksByDate(dateISO: string): Promise<MealCheck[]> {
    return await db.mealChecks.where('dateISO').equals(dateISO).toArray();
  }

  // --- Chat History (Fase 5) ---
  static async saveChatHistory(entry: Omit<ChatHistoryEntry, 'schemaVersion'>): Promise<string> {
    const fullEntry: ChatHistoryEntry = { ...entry, schemaVersion: 1 };
    await db.chatHistory.put(fullEntry);
    return fullEntry.id;
  }

  static async getChatHistory(): Promise<ChatHistoryEntry[]> {
    return await db.chatHistory.orderBy('dateISO').reverse().toArray();
  }

  static async getChatHistoryByDate(dateISO: string): Promise<ChatHistoryEntry[]> {
    return await db.chatHistory.where('dateISO').equals(dateISO).toArray();
  }

  static async clearChatHistory(): Promise<void> {
    await db.chatHistory.clear();
  }

  // --- Schedule Overrides (Fase 7) ---
  static async saveOverride(override: ScheduleOverride): Promise<string> {
    await db.scheduleOverrides.put(override);
    return override.id;
  }

  static async getOverrideForDate(dateISO: string): Promise<ScheduleOverride | undefined> {
    return await db.scheduleOverrides.where('dateISO').equals(dateISO).first();
  }

  static async removeOverride(dateISO: string): Promise<void> {
    await db.scheduleOverrides.where('dateISO').equals(dateISO).delete();
  }

  static async listOverrides(): Promise<ScheduleOverride[]> {
    return await db.scheduleOverrides.orderBy('dateISO').reverse().toArray();
  }

  // --- Settings ---
  static async getSettings(): Promise<AppSettings> {
    const s = await db.settings.get('current_settings');
    if (s) return s;

    const defaultSettings: AppSettings = {
      id: 'current_settings',
      theme: 'auto',
      reminders: {},
      aiEnabled: true,
      schemaVersion: 1,
    };
    await db.settings.put(defaultSettings);
    return defaultSettings;
  }

  static async updateSettings(updates: Partial<Omit<AppSettings, 'id' | 'schemaVersion'>>): Promise<void> {
    const current = await this.getSettings();
    await db.settings.put({
      ...current,
      ...updates,
      schemaVersion: 1,
    });
  }

  // --- Export All Data ---
  static async exportAllData(): Promise<string> {
    const [workouts, weights, sleeps, meals, settings, chatHistory] = await Promise.all([
      db.workoutLogs.toArray(),
      db.weightLogs.toArray(),
      db.sleepLogs.toArray(),
      db.mealChecks.toArray(),
      db.settings.toArray(),
      db.chatHistory.toArray(),
    ]);

    const backup = {
      app: 'CloverzRoutine',
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
      data: {
        workouts,
        weights,
        sleeps,
        meals,
        settings,
        chatHistory,
      },
    };

    return JSON.stringify(backup, null, 2);
  }

  // --- Import Data ---
  static async importData(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: 'Format file tidak valid (data hilang).' };
      }

      const { workouts, weights, sleeps, meals, settings, chatHistory } = parsed.data;

      await db.transaction('rw', [db.workoutLogs, db.weightLogs, db.sleepLogs, db.mealChecks, db.settings, db.chatHistory], async () => {
        if (Array.isArray(workouts) && workouts.length > 0) {
          await db.workoutLogs.bulkPut(workouts);
        }
        if (Array.isArray(weights) && weights.length > 0) {
          await db.weightLogs.bulkPut(weights);
        }
        if (Array.isArray(sleeps) && sleeps.length > 0) {
          await db.sleepLogs.bulkPut(sleeps);
        }
        if (Array.isArray(meals) && meals.length > 0) {
          await db.mealChecks.bulkPut(meals);
        }
        if (Array.isArray(settings) && settings.length > 0) {
          await db.settings.bulkPut(settings);
        }
        if (Array.isArray(chatHistory) && chatHistory.length > 0) {
          await db.chatHistory.bulkPut(chatHistory);
        }
      });

      return { success: true, message: 'Impor data berhasil dipulihkan!' };
    } catch (e: any) {
      return { success: false, message: `Gagal impor: ${e?.message || 'Error parsing JSON'}` };
    }
  }
}