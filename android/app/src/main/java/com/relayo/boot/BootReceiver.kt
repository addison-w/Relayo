package com.relayo.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.relayo.service.RelayoForegroundService

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, RelayoForegroundService::class.java)
            context.startForegroundService(serviceIntent)
        }
    }
}
