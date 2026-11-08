import { query, transaction } from '../database/connection.js';

export const workoutRepository = {
  /**
   * Creates a structured workout program with multiple exercise details atomically
   */
  async createPlan({ uuid, trainerId, memberId, title, goalDescription, startDate, endDate, exercises = [] }) {
    return transaction(async (conn) => {
      // 1. Insert master workout plan
      const [pRes] = await conn.execute(
        `INSERT INTO workout_plans (uuid, trainer_id, member_id, title, goal_description, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE');`,
        [uuid, trainerId, memberId, title, goalDescription, startDate, endDate]
      );
      const planId = pRes.insertId;

      // 2. Insert exercises details
      for (const ex of exercises) {
        await conn.execute(
          `INSERT INTO workout_details (workout_plan_id, day_of_week, exercise_name, sets, reps, duration_minutes, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            planId,
            ex.dayOfWeek || 'MONDAY',
            ex.exerciseName,
            ex.sets || 3,
            ex.reps || 12,
            ex.durationMinutes || 15,
            ex.restSeconds || 60,
            ex.notes || ''
          ]
        );
      }

      return planId;
    });
  },

  /**
   * Retrieves all workout plans for a member with their exercise details
   */
  async findByMemberId(memberId) {
    const plans = await query(
      `SELECT wp.*, t.full_name AS trainer_name 
       FROM workout_plans wp
       JOIN trainers t ON wp.trainer_id = t.id
       WHERE wp.member_id = ?
       ORDER BY wp.created_at DESC;`,
      [memberId]
    );

    for (const plan of plans) {
      plan.details = await query(
        `SELECT * FROM workout_details WHERE workout_plan_id = ? ORDER BY id ASC;`,
        [plan.id]
      );
    }

    return plans;
  },

  /**
   * Retrieves all workout plans managed by a trainer
   */
  async findByTrainerId(trainerId) {
    return query(
      `SELECT wp.*, m.full_name AS member_name, m.member_code
       FROM workout_plans wp
       JOIN members m ON wp.member_id = m.id
       WHERE wp.trainer_id = ?
       ORDER BY wp.created_at DESC;`,
      [trainerId]
    );
  }
};
