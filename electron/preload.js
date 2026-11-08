import { contextBridge, ipcRenderer } from 'electron';

// Explicit whitelist of permitted IPC channels
const ALLOWED_CHANNELS = new Set([
  // System & Diagnostics
  'system:ping',
  'system:get-status',

  // Authentication & Session
  'auth:login',
  'auth:logout',
  'auth:check-session',
  'auth:biometric-verify',
  'auth:dongle-status',

  // Gym Management
  'gym:dashboard:stats',
  'gym:member:list',
  'gym:member:get',
  'gym:member:create',
  'gym:member:update',
  'gym:member:delete',
  'gym:plan:list',
  'gym:payment:list',
  'gym:payment:create',
  'gym:trainer:list',
  'gym:workout:list',
  'gym:schedule:list',

  // Cryptography
  'crypto:message:send',
  'crypto:message:list',
  'crypto:message:decrypt',
  'crypto:file:encrypt',
  'crypto:file:decrypt',
  'crypto:file:list',

  // Steganography
  'stego:encode',
  'stego:decode',

  // Blockchain Ledger
  'blockchain:inspect',
  'blockchain:tamper-check'
]);

contextBridge.exposeInMainWorld('gymVaultAPI', {
  /**
   * Invokes an allowed IPC channel safely with an enveloped payload.
   * 
   * @param {string} channel 
   * @param {any} payload 
   * @returns {Promise<any>}
   */
  invoke: async (channel, payload = {}) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.error(`[Preload Security] Denied access to unauthorized channel: ${channel}`);
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    }

    const envelope = {
      channel,
      payload,
      requestId: 'req_' + Math.random().toString(36).substring(2, 10),
      timestamp: Date.now()
    };

    return ipcRenderer.invoke(channel, envelope);
  },

  /**
   * Subscribes to events from the main process (e.g., USB dongle disconnect alert)
   */
  on: (channel, callback) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.error(`[Preload Security] Denied subscription to channel: ${channel}`);
      return;
    }
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});
