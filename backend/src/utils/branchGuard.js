/**
 * Branch Utilities - Helper functions for branch-related operations
 */

/**
 * Check if a user belongs to the main branch
 * Main branch users see database prices; non-main branch users can set custom prices
 * @param {Object} user - The user object from req.user
 * @param {Object} user.branchId - The branch ID
 * @param {string} [user.branchId] - branchId as string
 * @returns {boolean} True if user is in the main branch
 */
export const isMainBranch = user => {
  if (!user || !user.branchId) return false;
  // If the user object has branch data with isMain field, use that
  if (user.branch && typeof user.branch.isMain === 'boolean') {
    return user.branch.isMain;
  }
  // Otherwise check via branchId (requires DB lookup or cached value)
  // This will be used when branch relation is eager-loaded
  return false;
};

/**
 * Check if user is in main branch by branch ID
 * Requires branch.isMain to be set (via eager load or middleware)
 * @param {string} branchId - The branch ID
 * @param {boolean} [isMain] - Optional pre-fetched isMain value
 * @returns {boolean} True if this is the main branch
 */
export const isMainBranchById = (branchId, isMain) => {
  if (typeof isMain === 'boolean') return isMain;
  // Fallback: check common main branch IDs
  // This should be replaced with actual DB lookup in middleware
  return false;
};

/**
 * Get the main branch ID from environment or default
 * @returns {string} The main branch ID
 */
export const getMainBranchId = () => {
  return process.env.MAIN_BRANCH_ID || 'branch-main';
};
