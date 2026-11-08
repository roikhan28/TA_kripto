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

  // Biometrics
  async verifyBiometric(userId, faceCaptureBase64) {
    return this.invoke('auth:biometric-verify', { userId, faceCaptureBase64 });
  },

  async enrollBiometric(sessionToken, userId, faceCaptureBase64) {
    return this.invoke('auth:biometric-enroll', { sessionToken, userId, faceCaptureBase64 });
  },

  // USB Security Dongle
  async getDongleChallenge(userId, deviceHardwareId) {
    return this.invoke('auth:dongle-challenge', { userId, deviceHardwareId });
  },

  async verifyDongle(challengeToken, responseHmac) {
    return this.invoke('auth:dongle-verify', { challengeToken, responseHmac });
  },

  async getDongleStatus() {
    return this.invoke('auth:dongle-status');
  }
};
