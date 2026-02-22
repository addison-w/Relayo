package com.relayo.smtp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import java.util.concurrent.Executors

class SmtpModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SmtpModule"

    private val executor = Executors.newSingleThreadExecutor()
    private val store by lazy { SmtpConfigStore(reactContext) }

    @ReactMethod
    fun saveConfig(map: ReadableMap, promise: Promise) {
        executor.execute {
            try {
                val config = SmtpConfig(
                    host = map.getString("host") ?: "",
                    port = if (map.hasKey("port")) map.getInt("port") else 465,
                    username = map.getString("username") ?: "",
                    password = map.getString("password") ?: "",
                    fromEmail = map.getString("fromEmail") ?: "",
                    toEmail = map.getString("toEmail") ?: "",
                    useSsl = !map.hasKey("useSsl") || map.getBoolean("useSsl"),
                    useStartTls = map.hasKey("useStartTls") && map.getBoolean("useStartTls")
                )
                store.save(config)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SAVE_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun loadConfig(promise: Promise) {
        executor.execute {
            try {
                val config = store.load()
                if (config == null) {
                    promise.resolve(null)
                    return@execute
                }
                val map = WritableNativeMap().apply {
                    putString("host", config.host)
                    putInt("port", config.port)
                    putString("username", config.username)
                    putBoolean("hasPassword", config.password.isNotEmpty())
                    putString("fromEmail", config.fromEmail)
                    putString("toEmail", config.toEmail)
                    putBoolean("useSsl", config.useSsl)
                    putBoolean("useStartTls", config.useStartTls)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("LOAD_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun sendTestEmail(promise: Promise) {
        executor.execute {
            try {
                val config = store.load()
                if (config == null) {
                    promise.reject("NO_CONFIG", "SMTP configuration not found")
                    return@execute
                }
                val result = SmtpSender.send(config, "Relayo Test Email", "Your SMTP configuration is working correctly.")
                when (result) {
                    is SmtpResult.Success -> promise.resolve(true)
                    is SmtpResult.Failure -> promise.reject(result.errorCode, result.message)
                }
            } catch (e: Exception) {
                promise.reject("unknown", e.message)
            }
        }
    }

    @ReactMethod
    fun sendEmail(subject: String, body: String, promise: Promise) {
        executor.execute {
            try {
                val config = store.load()
                if (config == null) {
                    promise.reject("NO_CONFIG", "SMTP configuration not found")
                    return@execute
                }
                val result = SmtpSender.send(config, subject, body)
                when (result) {
                    is SmtpResult.Success -> promise.resolve(true)
                    is SmtpResult.Failure -> promise.reject(result.errorCode, result.message)
                }
            } catch (e: Exception) {
                promise.reject("unknown", e.message)
            }
        }
    }
}
