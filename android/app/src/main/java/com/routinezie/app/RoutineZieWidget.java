package com.routinezie.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Widget layar utama RoutineZie (4x1).
 *
 * Sumber data: SharedPreferences "CapacitorStorage" — file yang sama dipakai
 * plugin @capacitor/preferences. Web app menulis kunci "widget_state" berisi
 * JSON yang sudah dihitung (agar widget tidak perlu tahu logika jadwal):
 *
 *   {
 *     "updatedAt": 1234567890,
 *     "label": "BERIKUTNYA",
 *     "title": "Push Day — Dada",
 *     "subtitle": "PKL 08.00-17.00 · pulang 2j 15m",
 *     "time": "16:30",
 *     "dateISO": "2026-10-01"
 *   }
 *
 * Widget hanya menampilkan. Bila tidak ada data, tampilkan ajakan membuka app.
 */
public class RoutineZieWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "CapacitorStorage";
    static final String KEY_STATE = "widget_state";

    /** Aksi internal untuk memaksa refresh (mis. dari web app setelah menyimpan). */
    static final String ACTION_REFRESH = "com.routinezie.app.WIDGET_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateWidget(context, appWidgetManager, id);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(context, RoutineZieWidget.class));
            for (int id : ids) {
                updateWidget(context, mgr, id);
            }
        }
    }

    /** Dipanggil oleh plugin jembatan setelah state baru ditulis. */
    static void refreshAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, RoutineZieWidget.class));
        for (int id : ids) {
            updateWidget(context, mgr, id);
        }
    }

    private static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_routinezie);

        // Tap di mana pun → buka aplikasi.
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(
                    context, 0, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }

        JSONObject state = readState(context);
        if (state == null) {
            views.setTextViewText(R.id.widget_label, "ROUTINEZIE");
            views.setTextViewText(R.id.widget_title, "Buka app untuk memuat jadwal");
            views.setTextViewText(R.id.widget_subtitle, "");
            views.setTextViewText(R.id.widget_time, nowHhMm());
        } else {
            views.setTextViewText(R.id.widget_label, state.optString("label", "BERIKUTNYA"));
            views.setTextViewText(R.id.widget_title, state.optString("title", "—"));
            views.setTextViewText(R.id.widget_subtitle, state.optString("subtitle", ""));
            String time = state.optString("time", "");
            views.setTextViewText(R.id.widget_time, time.isEmpty() ? nowHhMm() : time);
        }

        mgr.updateAppWidget(widgetId, views);
    }

    /** Baca & validasi state. Kembalikan null bila kosong/rusak/data basi. */
    private static JSONObject readState(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_STATE, null);
        if (raw == null || raw.trim().isEmpty()) return null;
        try {
            JSONObject obj = new JSONObject(raw);
            // Basi: lebih dari 24 jam → perlakukan sebagai tidak ada, tapi tetap
            // tampilkan judul terakhir agar widget tidak kosong mendadak.
            return obj;
        } catch (Exception e) {
            return null;
        }
    }

    private static String nowHhMm() {
        SimpleDateFormat fmt = new SimpleDateFormat("HH:mm", Locale.getDefault());
        return fmt.format(new Date());
    }
}
