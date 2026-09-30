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

        // Tiga bentuk path yang mungkin diterima:
        //  - content://  → URI siap pakai dari FileProvider (hasil Filesystem.writeFile
        //                  dengan Directory.Cache → authority {pkg}.fileprovider).
        //  - file://     → path absolut di sistem file.
        //  - path relatif → fallback ke penyimpanan eksternal + Cache/file dir.
        Uri apkUri;
        File file;
        if (path.startsWith("content://")) {
            apkUri = Uri.parse(path);
            file = resolveContentUriToFile(apkUri);
        } else {
            String fsPath = path.startsWith("file://") ? path.substring(7) : path;
            file = resolveFilePath(fsPath);
            if (file == null || !file.exists()) {
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

    /**
     * Petakan path absolut / relatif ke File yang benar. Path relatif dari
     * Filesystem plugin dapat berada di filesDir, cacheDir, atau storan
     * eksternal — coba semuanya agar pemanggil lama tetap berfungsi.
     */
    private File resolveFilePath(String fsPath) {
        if (fsPath == null || fsPath.isEmpty()) return null;
        File direct = new File(fsPath);
        if (direct.isAbsolute()) return direct;

        Context ctx = getContext();
        File[] candidates = new File[]{
                new File(ctx.getCacheDir(), fsPath),      // Directory.Cache
                new File(ctx.getFilesDir(), fsPath),      // Directory.Data
                new File(ctx.getExternalCacheDir(), fsPath),
                new File(android.os.Environment.getExternalStorageDirectory(), fsPath),
        };
        for (File c : candidates) {
            if (c != null && c.exists()) return c;
        }
        // Belum ada — kembalikan kandidat cache (paling mungkin) agar pesan
        // FILE_TIDAK_DITEMUKAN tetap akurat untuk alur tulis-terbaru.
        return candidates[0];
    }

    /**
     * Coba balikkan content:// URI ke File di direktori milik app. Dipakai
     * hanya untuk pesan galat yang lebih jelas; URI tetap dipakai langsung
     * saat memasang, jadi kegagalan di sini tidak fatal.
     */
    private File resolveContentUriToFile(Uri uri) {
        try {
            String last = uri.getLastPathSegment();
            if (last == null) return null;
            Context ctx = getContext();
            File[] candidates = new File[]{
                    new File(ctx.getCacheDir(), last),
                    new File(ctx.getFilesDir(), last),
            };
            for (File c : candidates) {
                if (c.exists()) return c;
            }
        } catch (Exception ignored) {
            // Bukan URI milik FileProvider kita — abaikan.
        }
        return null;
    }
}
