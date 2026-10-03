'use client';

import React, { useState, useEffect } from 'react';
import {
  WorkoutSessionState,
  loadActiveWorkoutSession,
  saveActiveWorkoutSession,
  clearActiveWorkoutSession,
} from '@/lib/workout/session';
import { NormalizedWorkout, NormalizedExercise } from '@/lib/schedule/parser';
import { Play, RotateCcw, HelpCircle, ArrowLeft, Info } from 'lucide-react';
import { InkStamp } from './icons/InkIcons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { RoutineRepository } from '@/lib/db/repository';

interface WorkoutModeModalProps {
  dayName: string;
  workoutData: NormalizedWorkout;
  onClose: () => void;
}

export default function WorkoutModeModal({ dayName, workoutData, onClose }: WorkoutModeModalProps) {
  const [session, setSession] = useState<WorkoutSessionState | null>(null);
  const [showCaraModal, setShowCaraModal] = useState<boolean>(false);
  const [restRemainingSec, setRestRemainingSec] = useState<number>(0);
  const [repsInputValue, setRepsInputValue] = useState<string>('');
  const [energyRating, setEnergyRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  const exercises = workoutData.latihan || [];

  // 1. Initialize or Recover Session
  useEffect(() => {
    const existing = loadActiveWorkoutSession();
    if (existing && existing.dayName === dayName && !existing.isFinished) {
      setSession(existing);
    } else {
      // Create new session from normalized workoutData
      const initialLogs = exercises.map((ex) => ({
        exerciseName: ex.nama,
        tipe: ex.tipe,
        sets: ex.sets.map((s) => ({
          setIndex: s.setIndex,
          target: s.target,
          tipeTarget: s.tipeTarget,
          completed: false,
        })),
      }));

      const newSession: WorkoutSessionState = {
        dayName,
        workoutName: workoutData.nama || 'Workout',
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        isResting: false,
        restEndTime: null,
        logs: initialLogs,
        startedAt: Date.now(),
        isFinished: false,
      };

      setSession(newSession);
      saveActiveWorkoutSession(newSession);
    }
  }, [dayName, workoutData]);

  // 2. Rest Timer Countdown Effect (Timestamp-based)
  useEffect(() => {
    if (!session || !session.isResting || !session.restEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((session.restEndTime! - now) / 1000));
      setRestRemainingSec(diff);

      if (diff <= 0) {
        // Rest finished!
        clearInterval(interval);
        try {
          Haptics.impact({ style: ImpactStyle.Heavy });
        } catch {
          // Fallback if haptics unavailable
        }

        const updated = { ...session, isResting: false, restEndTime: null };
        setSession(updated);
        saveActiveWorkoutSession(updated);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  const currentExercise: NormalizedExercise | undefined = exercises[session.currentExerciseIndex];
  const currentLog = session.logs[session.currentExerciseIndex];
  const currentSetLog = currentLog?.sets[session.currentSetIndex];

  const triggerHaptic = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Ignored in non-Capacitor environment
    }
  };

  // Handle Set Completed
  const handleSetDone = () => {
    triggerHaptic();

    const newLogs = [...session.logs];
    const isDuration = currentExercise?.tipe === 'durasi';
    const defaultReps = currentSetLog?.target || '10';
    const actualReps = repsInputValue ? repsInputValue : defaultReps;

    newLogs[session.currentExerciseIndex].sets[session.currentSetIndex] = {
      ...currentSetLog,
      actualDone: actualReps,
      completed: true,
    };

    setRepsInputValue('');

    const hasNextSet = session.currentSetIndex + 1 < (currentLog?.sets?.length || 1);
    const hasNextExercise = session.currentExerciseIndex + 1 < exercises.length;

    let nextExIndex = session.currentExerciseIndex;
    let nextSetIdx = session.currentSetIndex;
    let isFinished = false;

    if (hasNextSet) {
      nextSetIdx = session.currentSetIndex + 1;
    } else if (hasNextExercise) {
      nextExIndex = session.currentExerciseIndex + 1;
      nextSetIdx = 0;
    } else {
      isFinished = true;
    }

    // Durasi exercise has 15s transition rest, standard sets have 60s
    const restDurationSec = isDuration ? 15 : 60;
    const restEnd = isFinished ? null : Date.now() + restDurationSec * 1000;

    const updatedSession: WorkoutSessionState = {
      ...session,
      currentExerciseIndex: nextExIndex,
      currentSetIndex: nextSetIdx,
      isResting: !isFinished,
      restEndTime: restEnd,
      logs: newLogs,
      isFinished,
    };

    setSession(updatedSession);
    saveActiveWorkoutSession(updatedSession);
  };

  // Skip Rest
  const handleSkipRest = () => {
    triggerHaptic();
    const updated = { ...session, isResting: false, restEndTime: null };
    setSession(updated);
    saveActiveWorkoutSession(updated);
  };

  // Finish Workout
  const handleFinishWorkout = async () => {
    triggerHaptic();
    if (session) {
      let saveFailed = false;
      try {
        const todayISO = new Date().toISOString().split('T')[0];
        await RoutineRepository.saveWorkoutLog({
          id: `workout_${todayISO}_${session.dayName}`,
          dateISO: todayISO,
          hari: session.dayName,
          workoutNama: session.workoutName,
          exercises: session.logs.map((log) => ({
            latihan: log.exerciseName,
            tipe: log.tipe,
            sets: log.sets.map((s) => ({
              target: s.target,
              actualDone: s.actualDone,
              done: s.completed,
              reps: s.tipeTarget === 'reps' && typeof s.actualDone === 'number' ? s.actualDone : undefined,
              seconds: s.tipeTarget === 'durasi' && typeof s.actualDone === 'number' ? s.actualDone : undefined,
            })),
          })),
          energyRating: energyRating ?? undefined,
        });
      } catch (err) {
        console.error('Failed to save workout log to database:', err);
        saveFailed = true;
        // Tampilkan pesan error ke user, JANGAN hapus sesi
        alert('Gagal menyimpan workout! Data sesi tersimpan sementara. Coba lagi atau cek penyimpanan perangkat.');
      }
      // Hanya hapus sesi jika save berhasil
      if (!saveFailed) {
        clearActiveWorkoutSession();
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#09090b]/80 z-50 flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="bg-[#ffffff] text-[#09090b] w-full max-w-md h-full sm:h-[90vh] sm:max-h-[850px] neo-box-thick flex flex-col overflow-hidden relative">
        {/* Header Bar */}
        <header className="neo-box border-t-0 border-x-0 bg-[#ffffff] p-4 flex items-center justify-between z-10 shrink-0">
          <button 
            onClick={onClose} 
            className="neo-btn bg-[#ffffff] hover:bg-[#09090b]/5 p-2 flex items-center justify-center"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-[#09090b]" />
          </button>
          <div className="text-center px-2">
            <span className="text-[11px] font-black uppercase text-[#09090b]/60 block tracking-wider">MODE WORKOUT</span>
            <h2 className="text-sm font-black uppercase text-[#09090b] truncate">{session.workoutName}</h2>
          </div>
          <button
            onClick={() => setShowCaraModal(true)}
            className="neo-btn bg-[#ffffff] hover:bg-[#09090b]/5 px-3 py-1.5 text-xs font-black flex items-center gap-1.5 text-[#09090b]"
          >
            <HelpCircle className="w-4 h-4 text-[#09090b]" /> CARA
          </button>
        </header>

        {/* Main Content Area */}
        {session.isFinished ? (
          <main className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            <div className="neo-box-thick bg-[#09090b] text-[#ffffff] p-8 w-full">
              <InkStamp className="w-16 h-16 mx-auto mb-3 text-[#ffffff]" />
              <h1 className="text-2xl font-black uppercase tracking-tight">WORKOUT SELESAI!</h1>
              <p className="text-xs font-bold text-[#ffffff]/80 mt-2 leading-relaxed">
                Tubuhmu berkembang bertahap hari ini. Disiplin adalah kunci!
              </p>
            </div>

            {/* T8.6 — rating energi pasca-workout. Opsional, boleh dilewati. */}
            <div className="neo-box bg-[#ffffff] p-5 w-full space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#09090b]">
                Bagaimana energimu sekarang?
              </h3>
              <p className="text-[11px] font-bold text-[#09090b]/60">
                Opsional — dipakai untuk lihat pola energi mingguan, bukan penilaian.
              </p>
              <div className="flex justify-between gap-2" role="radiogroup" aria-label="Rating energi 1 sampai 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergyRating(n as 1 | 2 | 3 | 4 | 5)}
                    role="radio"
                    aria-checked={energyRating === n}
                    aria-label={`Energi ${n}`}
                    className={`neo-box-sm flex-1 h-12 flex items-center justify-center text-sm font-black transition-transform active:scale-95 ${
                      energyRating === n ? 'bg-[#09090b] text-[#ffffff]' : 'bg-[#ffffff] text-[#09090b] hover:bg-[#09090b]/5'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleFinishWorkout} className="neo-btn-black w-full py-4 text-sm uppercase tracking-wide">
              SIMPAN & KEMBALI
            </button>
          </main>
        ) : session.isResting ? (
          /* Rest Timer Screen */
          <main className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 screentone-dot overflow-y-auto">
            <div className="neo-box-thick bg-[#ffffff] p-8 w-full max-w-xs space-y-4">
              <span className="neo-box-sm bg-[#09090b] text-[#ffffff] px-3 py-1 text-xs font-black uppercase tracking-wider inline-block">
                ISTIRAHAT ANTARESET
              </span>
              <div className="text-6xl font-black font-mono text-[#09090b] tracking-tighter">
                {restRemainingSec}s
              </div>
              <p className="text-xs font-bold text-[#09090b]/70">Ambil napas dalam & atur posisi untuk set selanjutnya.</p>
            </div>
            <button onClick={handleSkipRest} className="neo-btn bg-[#ffffff] hover:bg-[#09090b]/5 px-6 py-3 text-xs font-black uppercase text-[#09090b]">
              LEWATI ISTIRAHAT ➔
            </button>
          </main>
        ) : (
          /* Active Exercise Screen */
          <main className="flex-1 p-4 flex flex-col justify-between overflow-y-auto w-full space-y-4">
            {/* Progress bar / Exercise Header */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#09090b]/70 bg-[#09090b]/5 px-3 py-1.5 neo-box-sm">
                <span>GERAKAN {session.currentExerciseIndex + 1} / {exercises.length}</span>
                <span>
                  {currentExercise?.tipe === 'durasi' 
                    ? 'SESI DURASI' 
                    : `SET ${session.currentSetIndex + 1} / ${currentLog?.sets?.length || 1}`}
                </span>
              </div>
              
              <div className="neo-box bg-[#ffffff] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="neo-box-sm bg-[#09090b] text-[#ffffff] px-2.5 py-0.5 text-[11px] font-black uppercase">
                    {currentExercise?.peralatan || 'TANPA ALAT'}
                  </span>
                  {currentExercise?.tipe === 'durasi' && (
                    <span className="neo-box-sm bg-[#ffffff] text-[#09090b] px-2 py-0.5 text-[11px] font-mono font-black uppercase">
                      KARDIO / WAKTU
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black uppercase text-[#09090b] leading-tight">
                  {currentExercise?.nama || 'Latihan'}
                </h1>
                {currentExercise?.ototTarget && (
                  <p className="text-xs font-bold text-[#09090b]/70">
                    Target: <span className="text-[#09090b] font-black">{currentExercise.ototTarget}</span>
                  </p>
                )}
                {currentExercise?.catatan && (
                  <p className="text-xs font-medium text-[#09090b]/80 border-l-2 border-[#09090b] pl-2.5 py-0.5 bg-[#09090b]/5">
                    {currentExercise.catatan}
                  </p>
                )}
              </div>
            </div>

            {/* Current Set / Duration Execution Card */}
            <div className="neo-box-thick bg-[#ffffff] p-5 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-2">
                <span className="text-xs font-black uppercase text-[#09090b]">
                  {currentExercise?.tipe === 'durasi' ? 'TARGET WAKTU' : 'TARGET REPETISI'}
                </span>
                <span className="text-xl font-black font-mono text-[#09090b]">
                  {currentSetLog?.target || (currentExercise?.tipe === 'durasi' ? 'Waktu Selesai' : '8-12')}
                </span>
              </div>

              {currentExercise?.tipe === 'reps' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-[#09090b]/70 block">
                    REPETISI AKTUAL (OPSIONAL)
                  </label>
                  <input
                    type="number"
                    placeholder={currentSetLog?.target || '10'}
                    value={repsInputValue}
                    onChange={(e) => setRepsInputValue(e.target.value)}
                    className="neo-box bg-[#ffffff] w-full p-2.5 text-base font-black font-mono text-[#09090b] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="p-3 bg-[#09090b]/5 border-2 border-dashed border-[#09090b] text-center">
                  <p className="text-xs font-bold text-[#09090b]">
                    Lakukan gerakan sesuai target waktu. Tekan tombol di bawah jika selesai!
                  </p>
                </div>
              )}

              <button 
                onClick={handleSetDone} 
                className="neo-btn-black w-full py-4 text-base uppercase font-black tracking-wide"
              >
                {currentExercise?.tipe === 'durasi' ? 'SELESAIKAN GERAKAN ✓' : 'SET BERES ✓'}
              </button>
            </div>
          </main>
        )}

        {/* Panel CARA Modal */}
        {showCaraModal && currentExercise && (
          <div className="fixed inset-0 bg-[#09090b]/80 z-60 flex items-center justify-center p-4">
            <div className="neo-box-thick bg-[#ffffff] text-[#09090b] w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-[#09090b] pb-2">
                <span className="text-xs font-black uppercase text-[#09090b]">PETUNJUK GERAKAN</span>
                <button
                  onClick={() => setShowCaraModal(false)}
                  className="neo-btn bg-[#ffffff] hover:bg-[#09090b]/5 px-2.5 py-1 text-xs font-black text-[#09090b]"
                >
                  TUTUP
                </button>
              </div>
              <h3 className="text-lg font-black uppercase text-[#09090b]">{currentExercise.nama}</h3>
              
              {currentExercise.cara && currentExercise.cara.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black uppercase text-[#09090b]">CARA MELAKUKAN:</h4>
                  <ul className="space-y-1 text-xs font-medium text-[#09090b]/90 bg-[#09090b]/5 p-3 neo-box-sm list-disc list-inside">
                    {currentExercise.cara.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentExercise.tipsForm && (
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-[#09090b]">TIPS TEKNIK:</h4>
                  <p className="text-xs font-medium text-[#09090b]/90 leading-relaxed bg-[#09090b]/5 p-2.5 neo-box-sm">
                    {currentExercise.tipsForm}
                  </p>
                </div>
              )}

              {currentExercise.kesalahanUmum && (
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-[#09090b]">KESALAHAN UMUM:</h4>
                  <p className="text-xs font-medium text-[#09090b]/90 leading-relaxed bg-[#09090b]/5 p-2.5 neo-box-sm">
                    {currentExercise.kesalahanUmum}
                  </p>
                </div>
              )}

              {currentExercise.versiMudah && currentExercise.versiMudah !== '-' && (
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-[#09090b]">VERSI LEBIH MUDAH:</h4>
                  <p className="text-xs font-medium text-[#09090b]/90 leading-relaxed bg-[#09090b]/5 p-2.5 neo-box-sm">
                    {currentExercise.versiMudah}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
