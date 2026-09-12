const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_PATH = 'com/nexusai';

const SERVICE_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100" />
`;

const KOTLIN_SERVICE = `package com.nexusai

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

class CopilotAccessibilityService : AccessibilityService() {

    companion object {
        var instance: CopilotAccessibilityService? = null
        const val TAG = "CopilotAccessibility"
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.d(TAG, "Servico de acessibilidade conectado")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Eventos de tela chegam aqui. Por enquanto nao fazemos nada
        // automaticamente - a leitura da tela e feita sob demanda via dumpScreen().
    }

    override fun onInterrupt() {
        Log.d(TAG, "Servico interrompido")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    fun dumpScreen(): String {
        val root = rootInActiveWindow ?: return JSONArray().toString()
        val result = JSONArray()
        collectNodes(root, result)
        return result.toString()
    }

    private fun collectNodes(node: AccessibilityNodeInfo, out: JSONArray) {
        if (node.text != null || node.contentDescription != null || node.isClickable) {
            val obj = JSONObject()
            val bounds = android.graphics.Rect()
            node.getBoundsInScreen(bounds)
            obj.put("text", node.text?.toString() ?: "")
            obj.put("desc", node.contentDescription?.toString() ?: "")
            obj.put("className", node.className?.toString() ?: "")
            obj.put("clickable", node.isClickable)
            obj.put("x", bounds.centerX())
            obj.put("y", bounds.centerY())
            out.put(obj)
        }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { collectNodes(it, out) }
        }
    }

    fun tap(x: Int, y: Int): Boolean {
        val path = Path()
        path.moveTo(x.toFloat(), y.toFloat())
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun goHome(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_HOME)
    }

    fun goBack(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }
}
`;

const KOTLIN_MODULE = `package com.nexusai

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AccessibilityModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AccessibilityModule"

    @ReactMethod
    fun isServiceEnabled(promise: Promise) {
        promise.resolve(CopilotAccessibilityService.instance != null)
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun dumpScreen(promise: Promise) {
        val service = CopilotAccessibilityService.instance
        if (service == null) {
            promise.reject("NO_SERVICE", "Servico de acessibilidade nao esta ativo")
            return
        }
        promise.resolve(service.dumpScreen())
    }

    @ReactMethod
    fun tap(x: Int, y: Int, promise: Promise) {
        val service = CopilotAccessibilityService.instance
        if (service == null) {
            promise.reject("NO_SERVICE", "Servico de acessibilidade nao esta ativo")
            return
        }
        promise.resolve(service.tap(x, y))
    }

    @ReactMethod
    fun goHome(promise: Promise) {
        val service = CopilotAccessibilityService.instance
        if (service == null) {
            promise.reject("NO_SERVICE", "Servico de acessibilidade nao esta ativo")
            return
        }
        promise.resolve(service.goHome())
    }

    @ReactMethod
    fun goBack(promise: Promise) {
        val service = CopilotAccessibilityService.instance
        if (service == null) {
            promise.reject("NO_SERVICE", "Servico de acessibilidade nao esta ativo")
            return
        }
        promise.resolve(service.goBack())
    }
}
`;

const KOTLIN_PACKAGE = `package com.nexusai

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AccessibilityPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AccessibilityModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

function withAccessibilityServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    if (!app.service) app.service = [];

    const alreadyExists = app.service.some(
      (s) => s['$']['android:name'] === '.CopilotAccessibilityService'
    );

    if (!alreadyExists) {
      app.service.push({
        $: {
          'android:name': '.CopilotAccessibilityService',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    return config;
  });
}

function withAccessibilityServiceFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      const javaDir = path.join(projectRoot, 'app/src/main/java', PACKAGE_PATH);
      const xmlDir = path.join(projectRoot, 'app/src/main/res/xml');
      const valuesDir = path.join(projectRoot, 'app/src/main/res/values');

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, 'CopilotAccessibilityService.kt'), KOTLIN_SERVICE);
      fs.writeFileSync(path.join(javaDir, 'AccessibilityModule.kt'), KOTLIN_MODULE);
      fs.writeFileSync(path.join(javaDir, 'AccessibilityPackage.kt'), KOTLIN_PACKAGE);
      fs.writeFileSync(path.join(xmlDir, 'accessibility_service_config.xml'), SERVICE_CONFIG_XML);

      const stringsPath = path.join(valuesDir, 'strings.xml');
      let strings = fs.existsSync(stringsPath)
        ? fs.readFileSync(stringsPath, 'utf-8')
        : '<resources></resources>';

      if (!strings.includes('accessibility_service_description')) {
        strings = strings.replace(
          '</resources>',
          '  <string name="accessibility_service_description">Permite que o Copiloto AI execute acoes na tela a seu pedido.</string>\\n</resources>'
        );
        fs.writeFileSync(stringsPath, strings);
      }

      return config;
    },
  ]);
}

function withAccessibilityServicePackageRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const mainAppPath = path.join(
        projectRoot,
        'app/src/main/java',
        PACKAGE_PATH,
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainAppPath)) {
        return config;
      }

      let content = fs.readFileSync(mainAppPath, 'utf-8');

      if (!content.includes('AccessibilityPackage()')) {
        if (content.includes('.packages.apply {')) {
          content = content.replace(
            '.packages.apply {',
            '.packages.apply {\n              add(AccessibilityPackage())'
          );
        } else if (content.includes('return PackageList(this).packages')) {
          content = content.replace(
            'return PackageList(this).packages',
            'val packages = PackageList(this).packages\n              packages.add(AccessibilityPackage())\n              return packages'
          );
        }

        fs.writeFileSync(mainAppPath, content);
      }

      return config;
    },
  ]);
}

module.exports = function withAccessibilityService(config) {
  config = withAccessibilityServiceManifest(config);
  config = withAccessibilityServiceFiles(config);
  config = withAccessibilityServicePackageRegistration(config);
  return config;
};
