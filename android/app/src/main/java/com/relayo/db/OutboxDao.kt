package com.relayo.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface OutboxDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: OutboxEntity): Long

    @Query("SELECT * FROM outbox WHERE status = 'pending' ORDER BY receivedAt ASC")
    suspend fun getPending(): List<OutboxEntity>

    @Query("SELECT * FROM outbox WHERE status = 'failed' AND nextRetryAt <= :currentTime ORDER BY nextRetryAt ASC")
    suspend fun getNextRetryItems(currentTime: Long): List<OutboxEntity>

    @Query("UPDATE outbox SET status = 'sending' WHERE id = :id")
    suspend fun markSending(id: Long)

    @Query("UPDATE outbox SET status = 'failed', retryCount = retryCount + 1, lastErrorCode = :errorCode, lastErrorMessageShort = :errorMsg, nextRetryAt = :nextRetry WHERE id = :id")
    suspend fun markFailed(id: Long, errorCode: String, errorMsg: String, nextRetry: Long)

    @Query("UPDATE outbox SET status = 'sent' WHERE id = :id")
    suspend fun markSent(id: Long)

    @Query("DELETE FROM outbox WHERE receivedAt < :timestamp")
    suspend fun deleteOlderThan(timestamp: Long)

    @Query("SELECT COUNT(*) FROM outbox WHERE status IN ('pending', 'failed', 'sending')")
    suspend fun getPendingCount(): Int
}
