package com.relayo.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface AppStatusDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AppStatusEntity)

    @Query("SELECT * FROM app_status WHERE id = 1")
    suspend fun get(): AppStatusEntity?
}
