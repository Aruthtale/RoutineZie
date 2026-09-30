package com.routinezie.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * ApkInstaller — buka installer paket Android untuk file APK yang sudah diunduh.
 *
 * Capacitor tidak menyediakan API pemasangan APK, jadi plugin ini memakai
 * FileProvider + Intent.ACTION_VIEW. Di MIUI/HyperOS juga memberikan izin URI
 * ke package installer Xiaomi karena intent bisa mati diam-diam tanpanya.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("PATH_KOSONG");
            return;
        }

        // Bisa berupa content:// (siap pakai), file:// (strip skema), atau
        // path relatif terhadap penyimpanan eksternal (hasil Filesystem.writeFile).
        Uri apkUri;
        File file;
        if (path.startsWith("content://")) {
            apkUri = Uri.parse(path);
            file = null; // tidak bisa diperiksa langsung
        } else {
            String fsPath = path.startsWith("file://") ? path.substring(7) : path;
            file = fsPath.startsWith("/")
                    ? new File(fsPath)
                    : new File(android.os.Environment.getExternalStorageDirectory(), fsPath);
            if (!file.exists()) {
                call.reject("FILE_TIDAK_DITEMUKAN");
                return;
            }
            try {
                Context ctx = getContext();
                apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            } catch (Exception e) {
                call.reject("GAGAL_URI", e);
                return;
            }
        }

        // Android 8+ (API 26) wajib minta izin memasang dari sumber tak dikenal.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                permIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(permIntent);
            } catch (Exception e) {
                // Gagal membuka pengaturan — tetap lanjut ke installer.
            }
            JSObject permResult = new JSObject();
            permResult.put("openedSettings", true);
            call.resolve(permResult);
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // Berikan izin URI ke installer paket Xiaomi (MIUI/HyperOS) —
        // tanpa ini intent bisa mati diam-diam di perangkat Redmi.
        try {
            getContext().grantUriPermission("com.miui.packageinstaller", apkUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
            // Bukan perangkat Xiaomi — abaikan.
        }
        for (String installerPkg : new String[]{
                "com.google.android.packageinstaller",
                "com.android.packageinstaller"}) {
            try {
                getContext().grantUriPermission(installerPkg, apkUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
                // Paket installer tak ada di perangkat ini — abaikan.
            }
        }

        try {
            if (getActivity() != null) {
                getActivity().startActivity(intent);
            } else {
                getContext().startActivity(intent);
            }
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("GAGAL_BUKA_INSTALLER", e);
        }
    }
}
