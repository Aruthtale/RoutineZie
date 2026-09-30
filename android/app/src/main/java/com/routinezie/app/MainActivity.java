package com.routinezie.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Daftarkan plugin tulisan tangan — cap sync TIDAK otomatis
        // mendaftarkan plugin native non-npm ini.
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
