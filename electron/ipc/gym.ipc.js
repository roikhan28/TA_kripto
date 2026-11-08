import { ipcMain } from 'electron';
import { z } from 'zod';
import { createValidatedHandler } from '../security/ipc_validation.js';
import { gymService } from '../../backend/src/services/gymService.js';
import { memberRepository } from '../../backend/src/repositories/memberRepository.js';
import { membershipRepository } from '../../backend/src/repositories/membershipRepository.js';
import { paymentRepository } from '../../backend/src/repositories/paymentRepository.js';
import { trainerRepository } from '../../backend/src/repositories/trainerRepository.js';
import { workoutRepository } from '../../backend/src/repositories/workoutRepository.js';
import { scheduleRepository } from '../../backend/src/repositories/scheduleRepository.js';
import { authService } from '../../backend/src/services/authService.js';
import { authorize } from '../../security/authorization.js';
import { generateUUID } from '../../crypto/hashing.js';

export function registerGymIPC() {
  // 1. gym:dashboard:stats
  ipcMain.handle(
    'gym:dashboard:stats',
    createValidatedHandler('gym:dashboard:stats', null, async () => {
      return gymService.getDashboardMetrics();
    })
  );

  // 2. gym:member:list
  const memberListSchema = z.object({
    sessionToken: z.string().optional(),
    search: z.string().optional().default(''),
    limit: z.number().int().positive().optional().default(50),
    offset: z.number().int().min(0).optional().default(0)
  });

  ipcMain.handle(
    'gym:member:list',
    createValidatedHandler('gym:member:list', memberListSchema, async (payload) => {
      const rawList = await memberRepository.findAll(payload);
      return rawList.map(m => gymService.decryptMemberPII(m));
    })
  );

  // 3. gym:member:get
  const memberGetSchema = z.object({
    sessionToken: z.string().optional(),
    id: z.number().int().positive()
  });

  ipcMain.handle(
    'gym:member:get',
    createValidatedHandler('gym:member:get', memberGetSchema, async (payload) => {
      const member = await memberRepository.findById(payload.id);
      if (!member) throw new Error('Member tidak ditemukan');
      const decrypted = gymService.decryptMemberPII(member);
      decrypted.membershipHistory = await memberRepository.getMembershipHistory(payload.id);
      decrypted.paymentHistory = await memberRepository.getPaymentHistory(payload.id);
      return decrypted;
    })
  );

  // 4. gym:member:create
  const memberCreateSchema = z.object({
    sessionToken: z.string(),
    username: z.string().min(3),
    password: z.string().min(6),
    fullName: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().optional()
  });

  ipcMain.handle(
    'gym:member:create',
    createValidatedHandler('gym:member:create', memberCreateSchema, async (payload) => {
      const auth = await authorize(payload.sessionToken, 'member:manage');
      if (!auth.authorized) throw new Error('Akses ditolak: Anda tidak memiliki izin mengelola member');

      return authService.register({
        username: payload.username,
        password: payload.password,
        roleName: 'MEMBER',
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone
      });
    })
  );

  // 5. gym:member:delete (Soft Delete)
  const memberDeleteSchema = z.object({
    sessionToken: z.string(),
    id: z.number().int().positive()
  });

  ipcMain.handle(
    'gym:member:delete',
    createValidatedHandler('gym:member:delete', memberDeleteSchema, async (payload) => {
      const auth = await authorize(payload.sessionToken, 'member:manage');
      if (!auth.authorized) throw new Error('Akses ditolak: Anda tidak memiliki izin menghapus member');

      const ok = await memberRepository.softDelete(payload.id);
      return { success: ok };
    })
  );

  // 6. gym:plan:list
  ipcMain.handle(
    'gym:plan:list',
    createValidatedHandler('gym:plan:list', null, async () => {
      return membershipRepository.findAllPlans();
    })
  );

  // 7. gym:payment:create (Process Subscription Payment)
  const paymentCreateSchema = z.object({
    sessionToken: z.string(),
    memberId: z.number().int().positive(),
    planId: z.number().int().positive(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'CREDIT_CARD']).default('TRANSFER'),
    notes: z.string().optional().default('')
  });

  ipcMain.handle(
    'gym:payment:create',
    createValidatedHandler('gym:payment:create', paymentCreateSchema, async (payload) => {
      const auth = await authorize(payload.sessionToken, 'payment:process');
      if (!auth.authorized) throw new Error('Akses ditolak: Anda tidak memiliki izin memproses pembayaran');

      return gymService.processPayment({
        memberId: payload.memberId,
        planId: payload.planId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes,
        recordedByUserId: auth.user.id
      });
    })
  );

  // 8. gym:payment:list
  const paymentListSchema = z.object({
    sessionToken: z.string().optional(),
    memberId: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional().default(50),
    offset: z.number().int().min(0).optional().default(0)
  });

  ipcMain.handle(
    'gym:payment:list',
    createValidatedHandler('gym:payment:list', paymentListSchema, async (payload) => {
      return paymentRepository.findAll(payload);
    })
  );

  // 9. gym:trainer:list
  ipcMain.handle(
    'gym:trainer:list',
    createValidatedHandler('gym:trainer:list', null, async () => {
      return trainerRepository.findAll();
    })
  );

  // 10. gym:schedule:list
  const scheduleListSchema = z.object({
    trainerId: z.number().int().positive().optional(),
    memberId: z.number().int().positive().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  });

  ipcMain.handle(
    'gym:schedule:list',
    createValidatedHandler('gym:schedule:list', scheduleListSchema, async (payload) => {
      return scheduleRepository.findAll(payload);
    })
  );

  // 11. gym:schedule:create (with double booking check)
  const scheduleCreateSchema = z.object({
    sessionToken: z.string(),
    trainerId: z.number().int().positive(),
    memberId: z.number().int().positive(),
    sessionDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    notes: z.string().optional().default('')
  });

  ipcMain.handle(
    'gym:schedule:create',
    createValidatedHandler('gym:schedule:create', scheduleCreateSchema, async (payload) => {
      const auth = await authorize(payload.sessionToken, 'schedule:manage_trainer');
      if (!auth.authorized) throw new Error('Akses ditolak: Anda tidak memiliki izin membuat jadwal');

      return gymService.createSchedule({
        trainerId: payload.trainerId,
        memberId: payload.memberId,
        sessionDate: payload.sessionDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        notes: payload.notes,
        createdByUserId: auth.user.id
      });
    })
  );

  // 12. gym:schedule:update-status
  const scheduleStatusSchema = z.object({
    sessionToken: z.string(),
    id: z.number().int().positive(),
    status: z.enum(['SCHEDULED', 'ATTENDED', 'CANCELLED', 'RESCHEDULED'])
  });

  ipcMain.handle(
    'gym:schedule:update-status',
    createValidatedHandler('gym:schedule:update-status', scheduleStatusSchema, async (payload) => {
      await scheduleRepository.updateStatus(payload.id, payload.status);
      return { success: true };
    })
  );

  // 13. gym:workout:list
  const workoutListSchema = z.object({
    memberId: z.number().int().positive().optional(),
    trainerId: z.number().int().positive().optional()
  });

  ipcMain.handle(
    'gym:workout:list',
    createValidatedHandler('gym:workout:list', workoutListSchema, async (payload) => {
      if (payload.memberId) {
        return workoutRepository.findByMemberId(payload.memberId);
      }
      if (payload.trainerId) {
        return workoutRepository.findByTrainerId(payload.trainerId);
      }
      return [];
    })
  );

  // 14. gym:workout:create
  const workoutCreateSchema = z.object({
    sessionToken: z.string(),
    trainerId: z.number().int().positive(),
    memberId: z.number().int().positive(),
    title: z.string().min(2),
    goalDescription: z.string().optional().default(''),
    startDate: z.string(),
    endDate: z.string(),
    exercises: z.array(z.object({
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      exerciseName: z.string().min(2),
      sets: z.number().int().positive().default(3),
      reps: z.number().int().positive().default(12),
      durationMinutes: z.number().int().positive().default(15),
      restSeconds: z.number().int().min(0).default(60),
      notes: z.string().optional().default('')
    })).default([])
  });

  ipcMain.handle(
    'gym:workout:create',
    createValidatedHandler('gym:workout:create', workoutCreateSchema, async (payload) => {
      const auth = await authorize(payload.sessionToken, 'workout:manage_assigned');
      if (!auth.authorized) throw new Error('Akses ditolak: Anda tidak memiliki izin membuat program latihan');

      const uuid = generateUUID();
      const planId = await workoutRepository.createPlan({
        uuid,
        trainerId: payload.trainerId,
        memberId: payload.memberId,
        title: payload.title,
        goalDescription: payload.goalDescription,
        startDate: payload.startDate,
        endDate: payload.endDate,
        exercises: payload.exercises
      });

      return { workoutPlanId: planId, success: true };
    })
  );
}
