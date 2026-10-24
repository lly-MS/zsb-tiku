package com.zsbtiku.app;

import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static boolean webViewDirInitialized = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // WebView 数据目录只需初始化一次，且必须在创建 WebView 之前
        if (!webViewDirInitialized) {
            try {
                WebView.setDataDirectorySuffix("zsbtiku");
                webViewDirInitialized = true;
            } catch (Throwable ignored) {
                // 已初始化或系统不支持：忽略
            }
        }

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();

        // 题库网站依赖 JavaScript、localStorage 与 IndexedDB（离线缓存/更新）
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            // 现代 WebView 已内置数据库目录，无需手动设置路径
        } else {
            try {
                webView.getSettings().setDatabasePath(
                        getApplicationContext().getDir("database", MODE_PRIVATE).getPath());
            } catch (Throwable ignored) {
            }
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // 站内链接继续在 WebView 内打开
                return false;
            }

            @Override
            public void onReceivedError(android.webkit.WebView view, int errorCode,
                                       String description, String failingUrl) {
                Toast.makeText(MainActivity.this,
                        "加载失败，请检查网络后刷新", Toast.LENGTH_LONG).show();
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        String url = getString(R.string.app_url);
        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
