package com.relayo.service

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import com.relayo.db.RelayoDatabase
import java.util.concurrent.Executors

class ServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ServiceModule"

    private val executor = Executors.newSingleThreadExecutor()

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = Intent(reactContext, RelayoForegroundService::class.java)
            reactContext.startForegroundService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactContext, RelayoForegroundService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            val running = RelayoForegroundService.isRunning(reactContext)
            promise.resolve(running)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getLastStatus(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val status = kotlinx.coroutines.runBlocking { db.appStatusDao().get() }
                if (status == null) {
                    promise.resolve(null)
                    return@execute
                }
                val map = WritableNativeMap().apply {
                    putDouble("lastAttemptAt", status.lastAttemptAt.toDouble())
                    putString("lastResult", status.lastResult)
                    putString("lastErrorShort", status.lastErrorShort)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("STATUS_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getOutboxCount(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val count = kotlinx.coroutines.runBlocking { db.outboxDao().getPendingCount() }
                promise.resolve(count)
            } catch (e: Exception) {
                promise.reject("COUNT_ERROR", e.message)
            }
        }
    }
}
