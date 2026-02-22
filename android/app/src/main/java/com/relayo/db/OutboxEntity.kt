package com.relayo.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "outbox", indices = [Index(value = ["fingerprint"], unique = true)])
data class OutboxEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val fingerprint: String,
    val senderNumber: String,
    val receiverNumberResolved: String,
    val messageBody: String,
    val receivedAt: Long,
    val status: String,
    val retryCount: Int = 0,
    val nextRetryAt: Long = 0,
    val lastErrorCode: String? = null,
    val lastErrorMessageShort: String? = null
)
