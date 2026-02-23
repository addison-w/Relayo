package com.relayo.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [OutboxEntity::class, AppStatusEntity::class, RelayLogEntity::class],
    version = 2,
    exportSchema = false
)
abstract class RelayoDatabase : RoomDatabase() {

    abstract fun outboxDao(): OutboxDao
    abstract fun appStatusDao(): AppStatusDao
    abstract fun relayLogDao(): RelayLogDao

    companion object {
        @Volatile
        private var INSTANCE: RelayoDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS relay_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        senderNumber TEXT NOT NULL,
                        receiverNumber TEXT NOT NULL,
                        messagePreview TEXT NOT NULL,
                        receivedAt INTEGER NOT NULL,
                        relayedAt INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        errorCode TEXT,
                        errorMessage TEXT
                    )
                """.trimIndent())
            }
        }

        fun getInstance(context: Context): RelayoDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    RelayoDatabase::class.java,
                    "relayo_db"
                )
                .addMigrations(MIGRATION_1_2)
                .build().also { INSTANCE = it }
            }
    }
}
