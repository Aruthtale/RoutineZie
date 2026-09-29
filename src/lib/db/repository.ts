import { db, WorkoutLog, WeightLog, SleepLog, MealCheck, AppSettings, ChatHistoryEntry, ScheduleOverride, WaterLog, HungerLog, AbilityTest, WeeklyNote, Milestone } from './index';

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

  // --- T8.1: Pelacak Air Minum (tally gelas) ---
  static async getWaterLog(dateISO: string): Promise<WaterLog | undefined> {
    return db.waterLogs.get(`water_${dateISO}`);
  }

  static async setWaterGlasses(dateISO: string, glasses: number): Promise<void> {
    await db.waterLogs.put({
      id: `water_${dateISO}`,
      dateISO,
      glasses: Math.max(0, glasses),
      schemaVersion: 1,
    });
  }

  static async addWaterGlass(dateISO: string, delta: number): Promise<number> {
    const current = (await db.waterLogs.get(`water_${dateISO}`))?.glasses ?? 0;
    const next = Math.max(0, current + delta);
    await db.waterLogs.put({ id: `water_${dateISO}`, dateISO, glasses: next, schemaVersion: 1 });
    return next;
  }

  // --- T8.1: Log Cepat "Kalau Lapar" (tanpa penilaian) ---
  static async addHungerLog(dateISO: string, note: string): Promise<void> {
    const noteTrim = note.trim();
    if (!noteTrim) return;
    await db.hungerLogs.put({
      id: `hunger_${dateISO}_${Date.now()}`,
      dateISO,
      timestamp: new Date().toISOString(),
      note: noteTrim,
      schemaVersion: 1,
    });
  }

  static async getHungerLogsByDate(dateISO: string): Promise<HungerLog[]> {
    return db.hungerLogs.where('dateISO').equals(dateISO).reverse().sortBy('timestamp');
  }

  static async getHungerLogs(limit = 20): Promise<HungerLog[]> {
    const all = await db.hungerLogs.reverse().sortBy('timestamp');
    return all.slice(0, limit);
  }

  // --- T8.2: Tes Kemampuan Berkala ---
  static async saveAbilityTest(
    dateISO: string,
    cycle: '4-week' | '8-week',
    results: { nama: string; nilai: number; satuan: string }[],
    note?: string
  ): Promise<AbilityTest> {
    const id = `ability_${dateISO}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: AbilityTest = { id, dateISO, cycle, results, note, schemaVersion: 1 };
    await db.abilityTests.put(entry);
    return entry;
  }

  static async getAbilityTests(limit = 10): Promise<AbilityTest[]> {
    const all = await db.abilityTests.reverse().sortBy('dateISO');
    return all.slice(0, limit);
  }

  static async getLatestAbilityTest(): Promise<AbilityTest | undefined> {
    const all = await db.abilityTests.reverse().sortBy('dateISO');
    return all[0];
  }

  // --- T8.2: Catatan Mingguan ---
  static async getWeeklyNote(weekStartISO: string): Promise<WeeklyNote | undefined> {
    return db.weeklyNotes.get(`wnote_${weekStartISO}`);
  }

  static async setWeeklyNote(weekStartISO: string, note: string): Promise<void> {
    const trimmed = note.trim();
    if (!trimmed) {
      await db.weeklyNotes.delete(`wnote_${weekStartISO}`);
      return;
    }
    await db.weeklyNotes.put({
      id: `wnote_${weekStartISO}`,
      weekStartISO,
      note: trimmed,
      schemaVersion: 1,
    });
  }

  static async getAllWeeklyNotes(): Promise<WeeklyNote[]> {
    return db.weeklyNotes.toArray();
  }

  // --- T8.2: Milestone ---
  static async getMilestones(): Promise<Milestone[]> {
    const all = await db.milestones.reverse().sortBy('achievedAt');
    return all;
  }

  static async hasMilestone(kode: string): Promise<boolean> {
    const hit = await db.milestones.where('kode').equals(kode).first();
    return !!hit;
  }

  static async awardMilestone(kode: string, label: string, achievedAt: string): Promise<void> {
    await db.milestones.put({ id: `ms_${kode}`, kode, label, achievedAt, schemaVersion: 1 });
  }

  // --- Export All Data ---
  static async exportAllData(): Promise<string> {
    const [workouts, weights, sleeps, meals, settings, chatHistory, water, hunger] = await Promise.all([
      db.workoutLogs.toArray(),
      db.weightLogs.toArray(),
      db.sleepLogs.toArray(),
      db.mealChecks.toArray(),
      db.settings.toArray(),
      db.chatHistory.toArray(),
      db.waterLogs.toArray(),
      db.hungerLogs.toArray(),
    ]);

    const backup = {
      app: 'CloverzRoutine',
      exportedAt: new Date().toISOString(),
      schemaVersion: 3,
      data: {
        workouts,
        weights,
        sleeps,
        meals,
        settings,
        chatHistory,
        water,
        hunger,
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

export type { WaterLog, HungerLog, AbilityTest, WeeklyNote, Milestone };
