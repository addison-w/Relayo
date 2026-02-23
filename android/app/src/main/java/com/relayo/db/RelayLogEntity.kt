package com.relayo.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "relay_log")
data class RelayLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val senderNumber: String,
    val receiverNumber: String,
    val messagePreview: String,
    val receivedAt: Long,
    val relayedAt: Long,
    val status: String,           // "sent" | "failed"
    val errorCode: String? = null,
    val errorMessage: String? = null
)
