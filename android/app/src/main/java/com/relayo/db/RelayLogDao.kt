package com.relayo.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface RelayLogDao {

    @Insert
    suspend fun insert(entity: RelayLogEntity): Long

    @Query("SELECT * FROM relay_log ORDER BY relayedAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(limit: Int, offset: Int): List<RelayLogEntity>

    @Query("SELECT * FROM relay_log ORDER BY relayedAt DESC LIMIT 1")
    suspend fun getLatest(): RelayLogEntity?

    @Query("SELECT COUNT(*) FROM relay_log")
    suspend fun getCount(): Int

    @Query("DELETE FROM relay_log WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM relay_log")
    suspend fun deleteAll()
}
