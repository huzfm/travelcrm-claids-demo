/**
 * User Evolution Service - Per-User WhatsApp Instance Management
 *
 * Each user gets their own WhatsApp instance via Evolution API.
 * This service handles creating, connecting, and managing these instances.
 *
 * IMPORTANT: This is for user personal WhatsApp instances.
 * The central instance (CENTRAL_WA_INSTANCE_NAME) is for OTP/2FA - DO NOT TOUCH.
 */

import prisma from '../config/prisma.js';
import { assertNotCentralInstance, isCentralInstance } from '../utils/instanceGuard.js';

// Evolution API Configuration - Global API key for instance management
// Trimmed: a stray space or newline pasted into the host's env panel turns
// every request into a 401 (or a bad URL) with nothing else to show for it.
const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL?.trim() || 'https://whatsapp-api-evolution-api.tbztrf.easypanel.host/'
).replace(/\/+$/, '');
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || '').trim();
const WEBHOOK_BASE_URL = (process.env.WEBHOOK_BASE_URL || '').trim();
const REQUEST_TIMEOUT = 30000;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getHeaders = () => ({
  apikey: EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
});

/**
 * Make a request to Evolution API with timeout and error handling
 */
const evolutionRequest = async (endpoint, options = {}) => {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      const errorMessage =
        data?.response?.message || data?.message || `Evolution API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout', { cause: error });
    }
    console.error(`Evolution API request failed for ${endpoint}:`, error.message);
    throw error;
  }
};

// Everything the CRM needs from a user's number: messages in and out, ticks,
// deletes, and connection/QR changes.
const USER_WEBHOOK_EVENTS = [
  'MESSAGES_UPSERT',
  'CONNECTION_UPDATE',
  'MESSAGES_UPDATE',
  'MESSAGES_DELETE',
  'QRCODE_UPDATED',
];

const userWebhookUrl = () =>
  WEBHOOK_BASE_URL ? `${WEBHOOK_BASE_URL.replace(/\/+$/, '')}/api/v1/whatsapp/user-webhook` : null;

// Instances already checked by this process, so status polling stays one request.
const webhookEnsured = new Set();

/**
 * Make sure an instance reports to this backend. The webhook is otherwise only
 * set at creation, so an instance created while WEBHOOK_BASE_URL was missing
 * (or pointing elsewhere) would never deliver incoming messages, ticks or
 * deletes. Safe to call often: it checks once per instance per process.
 */
export const ensureInstanceWebhook = async instanceName => {
  const url = userWebhookUrl();
  if (!url || !instanceName || webhookEnsured.has(instanceName)) return;
  if (isCentralInstance(instanceName)) return;

  try {
    const current = await evolutionRequest(`/webhook/find/${instanceName}`);
    const upToDate =
      current?.enabled &&
      current?.url === url &&
      USER_WEBHOOK_EVENTS.every(event => current.events?.includes(event));

    if (!upToDate) {
      await evolutionRequest(`/webhook/set/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          webhook: { enabled: true, url, byEvents: false, base64: false, events: USER_WEBHOOK_EVENTS },
        }),
      });
      console.log(`Webhook set for ${instanceName} -> ${url}`);
    }
    webhookEnsured.add(instanceName);
  } catch (error) {
    console.error(`Failed to ensure webhook for ${instanceName}:`, error.message);
  }
};

/**
 * Generate instance name for a user
 * Format: crm_branch{branchId}_user{userId}
 */
export const generateInstanceName = (userId, branchId) => {
  const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanBranchId = branchId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `crm_branch${cleanBranchId}_user${cleanUserId}`;
};

// ============================================================
// INSTANCE MANAGEMENT
// ============================================================

/**
 * Create a new Evolution API instance for a user
 * @param {Object} user - User object with id, branchId
 * @returns {Object} { success, instanceName, token }
 */
export const createInstance = async user => {
  try {
    const instanceName = generateInstanceName(user.id, user.branchId);

    // GUARD: Never create the central instance
    if (isCentralInstance(instanceName)) {
      return { success: false, error: 'Cannot create central instance via user route' };
    }

    // Check if instance already exists
    const existingStatus = await getInstanceStatus(instanceName);
    if (existingStatus.success && existingStatus.state !== 'NOT_FOUND') {
      console.log(`Instance ${instanceName} already exists`);
      return {
        success: true,
        instanceName,
        alreadyExists: true,
        state: existingStatus.state,
      };
    }

    const webhookUrl = userWebhookUrl();

    const data = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: webhookUrl
          ? { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: USER_WEBHOOK_EVENTS }
          : undefined,
      }),
    });

    // Extract the per-instance API token from response
    const instanceToken = data?.hash?.apikey || data?.response?.hash?.apikey || null;

    if (!instanceToken) {
      console.warn(`No instance token returned for ${instanceName}, will use global key`);
    }

    return {
      success: true,
      instanceName,
      token: instanceToken,
      data,
    };
  } catch (error) {
    console.error(`Failed to create instance for user:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get instance connection status
 */
export const getInstanceStatus = async instanceName => {
  try {
    // GUARD: Check if this is the central instance
    assertNotCentralInstance(instanceName);

    const data = await evolutionRequest(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });

    return {
      success: true,
      instanceName,
      state: data?.instance?.state || data?.state || 'UNKNOWN',
      phone: data?.instance?.phoneNumber || data?.phone || null,
      data,
    };
  } catch (error) {
    if (error.message.includes('Forbidden')) {
      throw error; // Re-throw central instance protection errors
    }
    if (error.message.includes('404') || error.message.includes('not found')) {
      return {
        success: false,
        instanceName,
        state: 'NOT_FOUND',
        error: 'Instance does not exist',
      };
    }
    return {
      success: false,
      instanceName,
      state: 'ERROR',
      error: error.message,
    };
  }
};

/**
 * Get QR code for connecting WhatsApp to user instance
 */
export const getQRCode = async (instanceName, _instanceToken = null) => {
  try {
    // GUARD: Check if this is the central instance
    assertNotCentralInstance(instanceName);

    // First check if already connected
    const status = await getInstanceStatus(instanceName);
    if (status.success && status.state === 'open') {
      return {
        success: true,
        qrCode: null,
        pairingCode: null,
        message: 'Already connected',
        alreadyConnected: true,
        phone: status.phone,
      };
    }

    // Request connection (returns QR code)
    const data = await evolutionRequest(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });

    // Handle different QR code formats from Evolution API v2
    let qrCode = null;
    if (data?.base64) {
      qrCode = data.base64;
    } else if (data?.code) {
      qrCode = Array.isArray(data.code) ? data.code.join(',') : data.code;
    } else if (data?.qrcode) {
      qrCode = data.qrcode;
    }

    return {
      success: true,
      qrCode,
      pairingCode: data?.pairingCode,
      data,
    };
  } catch (error) {
    if (error.message.includes('Forbidden')) {
      throw error;
    }
    console.error('Get QR code error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a WhatsApp instance
 */
export const deleteInstance = async instanceName => {
  // GUARD: Never delete central instance
  assertNotCentralInstance(instanceName);

  try {
    const data = await evolutionRequest(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Delete instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restart a WhatsApp instance
 */
export const restartInstance = async instanceName => {
  // GUARD: Never restart central instance
  assertNotCentralInstance(instanceName);

  try {
    const data = await evolutionRequest(`/instance/restart/${instanceName}`, {
      method: 'PUT',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Restart instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Disconnect/logout WhatsApp instance
 */
export const logoutInstance = async instanceName => {
  // GUARD: Never logout central instance
  assertNotCentralInstance(instanceName);

  try {
    const data = await evolutionRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Logout instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all user instances (for admin monitoring)
 * FILTERS OUT CENTRAL INSTANCE
 */
export const getAllInstances = async () => {
  try {
    const data = await evolutionRequest('/instance/fetchInstances', {
      method: 'GET',
    });

    // Filter out central instance from results
    const instances = (data?.instances || []).filter(
      instance => !isCentralInstance(instance.instanceName || instance)
    );

    return {
      success: true,
      instances,
      data,
    };
  } catch (error) {
    console.error('Get all instances error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================
// USER INSTANCE MANAGEMENT
// ============================================================

/**
 * Setup WhatsApp instance for a user
 * Creates instance in Evolution API and saves to user record
 */
export const setupUserInstance = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, branchId: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Check if user already has an instance
  if (user.evolutionInstanceName) {
    const status = await getInstanceStatus(user.evolutionInstanceName);
    return {
      success: true,
      instanceName: user.evolutionInstanceName,
      state: status.state,
      alreadySetup: true,
    };
  }

  // Create new instance
  const result = await createInstance(user);
  if (!result.success) {
    return result;
  }
  // Covers an instance that already existed on the Evolution side.
  await ensureInstanceWebhook(result.instanceName);

  // Save to user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      evolutionInstanceName: result.instanceName,
      evolutionInstanceToken: result.token,
      evolutionStatus: 'created',
      evolutionCreatedAt: new Date(),
    },
  });

  return {
    success: true,
    instanceName: result.instanceName,
    state: 'created',
  };
};

/**
 * Get user's WhatsApp connection status
 */
export const getUserInstanceStatus = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, evolutionInstanceName: true, evolutionStatus: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.evolutionInstanceName) {
    return {
      success: true,
      instanceName: null,
      state: 'NOT_SETUP',
      phone: null,
    };
  }

  const status = await getInstanceStatus(user.evolutionInstanceName);

  // Update user record with current status
  if (status.success) {
    await ensureInstanceWebhook(user.evolutionInstanceName);
    await prisma.user.update({
      where: { id: userId },
      data: {
        evolutionStatus: status.state,
        evolutionPhoneNumber: status.phone,
      },
    });
  }

  return {
    success: true,
    instanceName: user.evolutionInstanceName,
    state: status.state,
    phone: status.phone,
    status: user.evolutionStatus,
  };
};

/**
 * Get QR code for user's WhatsApp instance
 */
export const getUserQRCode = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, branchId: true, evolutionInstanceName: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.evolutionInstanceName) {
    const setupResult = await setupUserInstance(userId);
    if (!setupResult.success) {
      return setupResult;
    }
    return getQRCode(setupResult.instanceName);
  }

  const status = await getInstanceStatus(user.evolutionInstanceName);
  if (status.state === 'NOT_FOUND') {
    const createResult = await createInstance(user);
    if (!createResult.success) {
      return createResult;
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        evolutionInstanceName: createResult.instanceName,
        evolutionInstanceToken: createResult.token,
        evolutionStatus: 'created',
        evolutionCreatedAt: new Date(),
      },
    });
    return getQRCode(createResult.instanceName);
  }

  return getQRCode(user.evolutionInstanceName);
};

/**
 * Disconnect user's WhatsApp instance
 */
export const disconnectUserInstance = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, evolutionInstanceName: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.evolutionInstanceName) {
    return { success: false, error: 'No instance to disconnect' };
  }

  const result = await logoutInstance(user.evolutionInstanceName);

  if (result.success) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        evolutionStatus: 'disconnected',
        evolutionPhoneNumber: null,
        evolutionQrCode: null,
      },
    });
  }

  return result;
};

/**
 * Delete user's WhatsApp instance
 */
export const deleteUserInstance = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, evolutionInstanceName: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.evolutionInstanceName) {
    return { success: true, message: 'No instance to delete' };
  }

  const result = await deleteInstance(user.evolutionInstanceName);

  if (result.success) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceToken: null,
        evolutionStatus: 'disconnected',
        evolutionPhoneNumber: null,
        evolutionQrCode: null,
        evolutionCreatedAt: null,
      },
    });
  }

  return result;
};

/**
 * Refresh QR code for user's instance
 */
export const refreshUserQRCode = async userId => {
  return getUserQRCode(userId);
};

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

/**
 * Restart a user's WhatsApp instance (ADMIN only)
 */
export const restartUserInstance = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, evolutionInstanceName: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!user.evolutionInstanceName) {
    return { success: false, error: 'No instance to restart' };
  }

  const result = await restartInstance(user.evolutionInstanceName);
  return result;
};

/**
 * Get detailed user instance info (for admin)
 */
export const getUserInstanceDetails = async userId => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      branchId: true,
      evolutionInstanceName: true,
      evolutionInstanceToken: true,
      evolutionPhoneNumber: true,
      evolutionStatus: true,
      evolutionQrCode: true,
      evolutionCreatedAt: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  let currentStatus = null;
  let currentPhone = null;

  if (user.evolutionInstanceName) {
    try {
      const status = await getInstanceStatus(user.evolutionInstanceName);
      if (status.success) {
        currentStatus = status.state;
        currentPhone = status.phone;
      }
    } catch (e) {
      // Instance may not exist in Evolution API
      console.warn(`Could not get status for instance ${user.evolutionInstanceName}:`, e.message);
    }
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branch: user.branch,
      instance: {
        name: user.evolutionInstanceName,
        token: user.evolutionInstanceToken ? '[saved]' : null,
        phone: currentPhone || user.evolutionPhoneNumber,
        status: currentStatus || user.evolutionStatus,
        qrCode: user.evolutionQrCode,
        createdAt: user.evolutionCreatedAt,
      },
    },
  };
};

/**
 * Bulk create missing instances for users without one (ADMIN only)
 */
export const bulkCreateMissingInstances = async () => {
  // Find all users without an evolution instance
  const usersWithoutInstance = await prisma.user.findMany({
    where: {
      evolutionInstanceName: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      branchId: true,
    },
  });

  const results = [];
  for (const user of usersWithoutInstance) {
    try {
      const result = await createInstance(user);
      if (result.success) {
        // Save to user record
        await prisma.user.update({
          where: { id: user.id },
          data: {
            evolutionInstanceName: result.instanceName,
            evolutionInstanceToken: result.token,
            evolutionStatus: 'created',
            evolutionCreatedAt: new Date(),
          },
        });
        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          instanceName: result.instanceName,
        });
      } else {
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      results.push({
        userId: user.id,
        email: user.email,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    total: usersWithoutInstance.length,
    created: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
};
