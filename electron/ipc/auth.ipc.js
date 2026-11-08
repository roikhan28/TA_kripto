import { ipcMain } from 'electron';
import { z } from 'zod';
import { createValidatedHandler } from '../security/ipc_validation.js';
import { authService } from '../../backend/src/services/authService.js';
import { verifyFaceBiometric, enrollFaceBiometric } from '../../security/biometric.js';
import { createDongleChallenge, verifyDongleResponse, registerDongle } from '../../security/dongle.js';
import { authorize } from '../../security/authorization.js';

export function registerAuthIPC() {
  // 1. auth:login
  const loginSchema = z.object({
    username: z.string().min(3).max(60),
    password: z.string().min(1)
  });

  ipcMain.handle(
    'auth:login',
    createValidatedHandler('auth:login', loginSchema, async (payload) => {
      return authService.login(payload);
    })
  );

  // 2. auth:register
  const registerSchema = z.object({
    username: z.string().min(3).max(60),
    password: z.string().min(6),
    fullName: z.string().min(2),
    roleName: z.enum(['ADMIN', 'TRAINER', 'MEMBER']).default('MEMBER'),
    email: z.string().email().optional(),
    phone: z.string().optional()
  });

  ipcMain.handle(
    'auth:register',
    createValidatedHandler('auth:register', registerSchema, async (payload) => {
      return authService.register(payload);
    })
  );

  // 3. auth:logout
  const logoutSchema = z.object({
    sessionToken: z.string()
  });

  ipcMain.handle(
    'auth:logout',
    createValidatedHandler('auth:logout', logoutSchema, async (payload) => {
      const ok = await authService.logout(payload.sessionToken);
      return { success: ok };
    })
  );

  // 4. auth:check-session
  const checkSessionSchema = z.object({
    sessionToken: z.string()
  });

  ipcMain.handle(
    'auth:check-session',
    createValidatedHandler('auth:check-session', checkSessionSchema, async (payload) => {
      return authService.checkSession(payload.sessionToken);
    })
  );

  // 5. auth:biometric-verify
  const bioVerifySchema = z.object({
    userId: z.number().int().positive(),
    faceCaptureBase64: z.string().min(10)
  });

  ipcMain.handle(
    'auth:biometric-verify',
    createValidatedHandler('auth:biometric-verify', bioVerifySchema, async (payload) => {
      return verifyFaceBiometric(payload.userId, payload.faceCaptureBase64);
    })
  );

  // 6. auth:biometric-enroll
  const bioEnrollSchema = z.object({
    sessionToken: z.string(),
    userId: z.number().int().positive(),
    faceCaptureBase64: z.string().min(10)
  });

  ipcMain.handle(
    'auth:biometric-enroll',
    createValidatedHandler('auth:biometric-enroll', bioEnrollSchema, async (payload) => {
      // Must have security or user management permission, or be self
      const auth = await authorize(payload.sessionToken, 'security:monitor');
      if (!auth.authorized && auth.user?.id !== payload.userId) {
        throw new Error('Akses ditolak: Anda tidak memiliki wewenang mendaftarkan biometrik ini');
      }

      return enrollFaceBiometric(payload.userId, payload.faceCaptureBase64);
    })
  );

  // 7. auth:dongle-challenge
  const dongleChallengeSchema = z.object({
    userId: z.number().int().positive(),
    deviceHardwareId: z.string().min(3)
  });

  ipcMain.handle(
    'auth:dongle-challenge',
    createValidatedHandler('auth:dongle-challenge', dongleChallengeSchema, async (payload) => {
      return createDongleChallenge(payload.userId, payload.deviceHardwareId);
    })
  );

  // 8. auth:dongle-verify
  const dongleVerifySchema = z.object({
    challengeToken: z.string().min(10),
    responseHmac: z.string().min(64)
  });

  ipcMain.handle(
    'auth:dongle-verify',
    createValidatedHandler('auth:dongle-verify', dongleVerifySchema, async (payload) => {
      return verifyDongleResponse(payload.challengeToken, payload.responseHmac);
    })
  );

  // 9. auth:dongle-status
  ipcMain.handle(
    'auth:dongle-status',
    createValidatedHandler('auth:dongle-status', null, async () => {
      return {
        serviceAvailable: true,
        protocol: 'HMAC-SHA256 Challenge-Response',
        status: 'Monitoring USB hardware events'
      };
    })
  );
}
