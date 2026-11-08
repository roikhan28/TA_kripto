import { ipcMain } from 'electron';
import { z } from 'zod';
import { createValidatedHandler } from '../security/ipc_validation.js';
import { testConnection, query } from '../../backend/src/database/connection.js';
import { logger } from '../../backend/src/utils/logger.js';

export function registerSystemIPC() {
  // system:ping
  ipcMain.handle(
    'system:ping',
    createValidatedHandler('system:ping', null, async () => {
      return { message: 'pong', serverTime: new Date().toISOString() };
    })
  );

  // system:get-status
  ipcMain.handle(
    'system:get-status',
    createValidatedHandler('system:get-status', null, async () => {
      const dbStatus = await testConnection();
      let tableCount = 0;
      let memberCount = 0;

      if (dbStatus.ok) {
        try {
          const tables = await query('SHOW TABLES FROM gymvault;');
          tableCount = tables.length;
          const [mCount] = await query('SELECT COUNT(*) AS total FROM members WHERE is_deleted = 0;');
          memberCount = mCount?.total || 0;
        } catch (e) {
          logger.warn('Failed to query tables for system status:', e.message);
        }
      }

      return {
        appName: 'GYMVAULT V2.0',
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        database: {
          connected: dbStatus.ok,
          dbName: 'gymvault',
          totalTables: tableCount,
          activeMembers: memberCount,
          error: dbStatus.error || null
        },
        cryptography: {
          argon2id: true,
          aes256gcm: true,
          chacha20poly1305: true,
          vigenere: true,
          sha256blockchain: true,
          lsbSteganography: true
        },
        systemMemory: {
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      };
    })
  );
}
