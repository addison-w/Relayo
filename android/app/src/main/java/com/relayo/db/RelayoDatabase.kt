package com.relayo.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [OutboxEntity::class, AppStatusEntity::class], version = 1, exportSchema = false)
abstract class RelayoDatabase : RoomDatabase() {

    abstract fun outboxDao(): OutboxDao
    abstract fun appStatusDao(): AppStatusDao

    companion object {
        @Volatile
        private var INSTANCE: RelayoDatabase? = null

        fun getInstance(context: Context): RelayoDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    RelayoDatabase::class.java,
                    "relayo_db"
                ).build().also { INSTANCE = it }
            }
    }
}
