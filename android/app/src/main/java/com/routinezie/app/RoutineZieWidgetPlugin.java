package com.routinezie.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * RoutineZieWidgetBridge — jembatan web app → widget layar utama.
 *
 * Web app menghitung state widget (kegiatan berikutnya, jam pulang, dll),
 * menulisnya lewat @capacitor/preferences (SharedPreferences "CapacitorStorage"),
 * lalu memanggil refresh() agar widget langsung diperbarui tanpa menunggu
 * updatePeriodMillis.
 */
@CapacitorPlugin(name = "RoutineZieWidget")
public class RoutineZieWidgetPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        try {
            RoutineZieWidget.refreshAll(getContext());
            JSObject result = new JSObject();
            result.put("refreshed", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("GAGAL_REFRESH_WIDGET", e);
        }
    }
}
