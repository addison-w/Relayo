package com.relayo.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_status")
data class AppStatusEntity(
    @PrimaryKey val id: Int = 1,
    val lastAttemptAt: Long,
    val lastResult: String,
    val lastErrorShort: String? = null
)
