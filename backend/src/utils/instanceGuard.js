/**
 * Instance Guard - Protects central WhatsApp instance from accidental modifications
 *
 * The central instance is used for OTP/2FA and password reset.
 * It must NEVER be touched by any user-facing routes.
 */

const CENTRAL_WA_INSTANCE_NAME = process.env.CENTRAL_WA_INSTANCE_NAME || 'centralclaidsstance';

/**
 * Assert that an instance name is NOT the central instance
 * @param {string} instanceName - The instance name to check
 * @throws {Error} If the instance is the central instance
 */
export const assertNotCentralInstance = instanceName => {
  if (!instanceName) return;

  const normalizedInstanceName = instanceName.toLowerCase();
  const normalizedCentralName = CENTRAL_WA_INSTANCE_NAME.toLowerCase();

  if (normalizedInstanceName === normalizedCentralName) {
    throw new Error('Forbidden: Cannot perform this action on the central WhatsApp instance');
  }
};

/**
 * Check if an instance name is the central instance
 * @param {string} instanceName - The instance name to check
 * @returns {boolean} True if it is the central instance
 */
export const isCentralInstance = instanceName => {
  if (!instanceName) return false;
  return instanceName.toLowerCase() === CENTRAL_WA_INSTANCE_NAME.toLowerCase();
};

/**
 * Get the central instance name
 * @returns {string} The central instance name
 */
export const getCentralInstanceName = () => {
  return CENTRAL_WA_INSTANCE_NAME;
};

/**
 * Generate instance name for a user
 * Format: crm_{cleanBranchId}_{cleanUserId}
 * @param {string} userId - The user's ID
 * @param {string} branchId - The branch's ID
 * @returns {string} The generated instance name
 */
export const generateUserInstanceName = (userId, branchId) => {
  const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanBranchId = branchId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `crm_${cleanBranchId}_${cleanUserId}`;
};
