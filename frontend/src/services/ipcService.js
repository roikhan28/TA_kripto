/**
 * Secure IPC Bridge client wrapper
 */
export const ipcService = {
  /**
   * Invokes an IPC channel via window.gymVaultAPI exposed by preload.js
   */
  async invoke(channel, payload = {}) {
    if (!window.gymVaultAPI) {
      console.warn(`[IPC Mock] window.gymVaultAPI not found (browser preview mode). Channel: ${channel}`);
      return { success: false, error: { message: 'Electron IPC unavailable' } };
    }

    try {
      const response = await window.gymVaultAPI.invoke(channel, payload);
      return response;
    } catch (err) {
      console.error(`[IPC Service Error] Channel: ${channel}`, err);
      return {
        success: false,
        error: {
          code: 'IPC_ERROR',
          message: err.message
        }
      };
    }
  },

  // System Diagnostics
  async getSystemStatus() {
    return this.invoke('system:get-status');
  },

  async ping() {
    return this.invoke('system:ping');
  },

  // Authentication & Security
  async login(username, password) {
    return this.invoke('auth:login', { username, password });
  },

  async register(data) {
    return this.invoke('auth:register', data);
  },

  async logout(sessionToken) {
    return this.invoke('auth:logout', { sessionToken });
  },

  async checkSession(sessionToken) {
    return this.invoke('auth:check-session', { sessionToken });
  },

  // Biometrics & Dongle
  async verifyBiometric(userId, faceCaptureBase64) {
    return this.invoke('auth:biometric-verify', { userId, faceCaptureBase64 });
  },

  async enrollBiometric(sessionToken, userId, faceCaptureBase64) {
    return this.invoke('auth:biometric-enroll', { sessionToken, userId, faceCaptureBase64 });
  },

  async getDongleChallenge(userId, deviceHardwareId) {
    return this.invoke('auth:dongle-challenge', { userId, deviceHardwareId });
  },

  async verifyDongle(challengeToken, responseHmac) {
    return this.invoke('auth:dongle-verify', { challengeToken, responseHmac });
  },

  async getDongleStatus() {
    return this.invoke('auth:dongle-status');
  },

  // Gym Operational Management
  async getDashboardMetrics() {
    return this.invoke('gym:dashboard:stats');
  },

  async getMemberList(search = '', limit = 50, offset = 0) {
    return this.invoke('gym:member:list', { search, limit, offset });
  },

  async getMemberDetail(id) {
    return this.invoke('gym:member:get', { id });
  },

  async createMember(data) {
    return this.invoke('gym:member:create', data);
  },

  async deleteMember(sessionToken, id) {
    return this.invoke('gym:member:delete', { sessionToken, id });
  },

  async getPlanList() {
    return this.invoke('gym:plan:list');
  },

  async createPayment(data) {
    return this.invoke('gym:payment:create', data);
  },

  async getPaymentList(limit = 50, offset = 0, memberId = null) {
    return this.invoke('gym:payment:list', { limit, offset, memberId });
  },

  async getTrainerList() {
    return this.invoke('gym:trainer:list');
  },

  async getScheduleList(filters = {}) {
    return this.invoke('gym:schedule:list', filters);
  },

  async createSchedule(data) {
    return this.invoke('gym:schedule:create', data);
  },

  async updateScheduleStatus(sessionToken, id, status) {
    return this.invoke('gym:schedule:update-status', { sessionToken, id, status });
  },

  async getWorkoutList(memberId = null, trainerId = null) {
    return this.invoke('gym:workout:list', { memberId, trainerId });
  },

  async createWorkout(data) {
    return this.invoke('gym:workout:create', data);
  }
};
