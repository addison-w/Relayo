package com.relayo.log

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.relayo.db.RelayLogEntity
import com.relayo.db.RelayoDatabase
import java.util.concurrent.Executors

class LogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LogModule"

    private val executor = Executors.newSingleThreadExecutor()

    @ReactMethod
    fun getLogs(limit: Int, offset: Int, promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val logs = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getPage(limit, offset)
                }
                val array = WritableNativeArray()
                for (log in logs) {
                    array.pushMap(logToMap(log))
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getLatestLog(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val log = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getLatest()
                }
                if (log == null) {
                    promise.resolve(null)
                    return@execute
                }
                promise.resolve(logToMap(log))
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getLogCount(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                val count = kotlinx.coroutines.runBlocking {
                    db.relayLogDao().getCount()
                }
                promise.resolve(count)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun deleteLog(id: Double, promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                kotlinx.coroutines.runBlocking {
                    db.relayLogDao().deleteById(id.toLong())
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun clearAllLogs(promise: Promise) {
        executor.execute {
            try {
                val db = RelayoDatabase.getInstance(reactContext)
                kotlinx.coroutines.runBlocking {
                    db.relayLogDao().deleteAll()
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("LOG_ERROR", e.message)
            }
        }
    }

    private fun logToMap(log: RelayLogEntity): WritableNativeMap {
        return WritableNativeMap().apply {
            putDouble("id", log.id.toDouble())
            putString("senderNumber", log.senderNumber)
            putString("receiverNumber", log.receiverNumber)
            putString("messagePreview", log.messagePreview)
            putDouble("receivedAt", log.receivedAt.toDouble())
            putDouble("relayedAt", log.relayedAt.toDouble())
            putString("status", log.status)
            putString("errorCode", log.errorCode)
            putString("errorMessage", log.errorMessage)
        }
    }
}
