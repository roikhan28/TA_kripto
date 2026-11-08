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
      // Fallback for browser testing outside electron
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
  }
};
