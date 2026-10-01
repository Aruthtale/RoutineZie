package com.routinezie.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Ganti tema splash (NoActionBarLaunch) ke tema layar utama
        // (AppTheme.NoActionBar) SEBELUM super.onCreate().
        //
        // Tanpa ini, tema splash tetap dipakai seumur Activity, sehingga atribut
        // status bar di AppTheme.NoActionBar tidak pernah berlaku:
        //   - windowLightStatusBar  -> ikon jam/baterai tetap terang
        //   - windowLayoutInDisplayCutoutMode -> konten bisa masuk area notch
        // Inilah sebabnya jam/baterai terlihat "tertutup" di Android 15
        // edge-to-edge: ikon terang menghilang di atas latar putih aplikasi.
        setTheme(R.style.AppTheme_NoActionBar);

        // Daftarkan plugin tulisan tangan — cap sync TIDAK otomatis
        // mendaftarkan plugin native non-npm ini.
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
