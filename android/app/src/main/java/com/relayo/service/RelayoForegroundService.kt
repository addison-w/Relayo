package com.relayo.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.relayo.network.NetworkMonitor
import com.relayo.pipeline.RetryManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class RelayoForegroundService : Service() {

    private val channelId = "relayo_service_channel"
    private val notificationId = 1001
    private var networkMonitor: NetworkMonitor? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    private var outboxJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("SMS Forwarder running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                notificationId,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(notificationId, notification)
        }

        networkMonitor = NetworkMonitor(this).also { it.register() }
        startOutboxProcessingLoop()

        return START_STICKY
    }

    override fun onDestroy() {
        networkMonitor?.unregister()
        outboxJob?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "SMS Forwarder Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun startOutboxProcessingLoop() {
        outboxJob = scope.launch {
            while (true) {
                try {
                    RetryManager.getInstance(this@RelayoForegroundService).processOutbox()
                } catch (_: Exception) {
                }
                delay(60_000L)
            }
        }
    }

    companion object {
        fun isRunning(context: android.content.Context): Boolean {
            val manager = context.getSystemService(android.app.ActivityManager::class.java)
            return manager.getRunningServices(Int.MAX_VALUE)
                .any { it.service.className == RelayoForegroundService::class.java.name }
        }
    }
}
