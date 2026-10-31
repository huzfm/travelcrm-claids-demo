import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/jwt.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import { sendOTP } from '../services/central-whatsapp.service.js';
import { toE164, phoneConflictWhere } from '../utils/phone.js';
import { extractPublicId, deleteFromCloudinary } from '../services/cloudinary.service.js';
import prisma from '../config/prisma.js';

// TEMP: Set to true to skip OTP (for dev/testing). Set false or unset for production.
const DISABLE_OTP = process.env.DISABLE_OTP === 'true';

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const email = (req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your manager.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check if user has phone number for OTP
    if (!user.phone || DISABLE_OTP) {
      // User has no phone OR OTP is disabled - login directly without OTP (fallback)
      if (DISABLE_OTP) {
        console.log(`[BYPASS] OTP skipped for ${user.email} (DISABLE_OTP=true)`);
      }
      return completeLogin(req, res, user);
    }

    // Generate OTP for 2FA
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Normalize phone for lookup
    const normalizedPhone = user.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

    // Delete any existing pending logins for this user
    await prisma.pendingLogin.deleteMany({
      where: { userId: user.id },
    });

    // Create pending login record
    await prisma.pendingLogin.create({
      data: {
        userId: user.id,
        email: user.email,
        phone: normalizedPhone,
        otpHash,
        expiresAt,
      },
    });

    // Send OTP via WhatsApp
    let messageSent = false;
    let errorMessage = null;
    try {
      const result = await sendOTP(normalizedPhone, otp, 'login');
      messageSent = result.success;
    } catch (whatsappError) {
      console.error('WhatsApp OTP delivery failed:', whatsappError.message);
      errorMessage = whatsappError.message;
    }

    if (!messageSent) {
      return res.status(500).json({
        success: false,
        requiresOTP: true,
        error: `Failed to send OTP via WhatsApp: ${errorMessage || 'unknown error'}`,
      });
    }

    res.json({
      success: true,
      requiresOTP: true,
      message: 'OTP sent to your registered phone number',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Helper function to complete login after OTP verification
const completeLogin = async (req, res, user) => {
  const refreshToken = generateRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshTokenHash },
  });

  const accessToken = generateAccessToken(user);

  setRefreshTokenCookie(res, refreshToken);

  // Create audit log for login
  await createAuditLog({
    action: AuditAction.LOGIN,
    entity: AuditEntity.USER,
    entityId: user.id,
    userId: user.id,
    branchId: user.branchId,
    description: `User logged in: ${user.email}`,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        permissions: user.role === 'ADMIN' ? null : user.permissions || [],
        branchId: user.branchId,
        branch: user.branch,
      },
    },
  });
};

// ============================================
// VERIFY LOGIN OTP - Complete login after OTP verification
// ============================================
export const verifyLoginOTP = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required',
        code: 'MISSING_PARAMS',
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be 6 digits',
        code: 'INVALID_OTP_FORMAT',
      });
    }

    // Find pending login record
    const pendingLogin = await prisma.pendingLogin.findFirst({
      where: {
        email,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingLogin) {
      return res.status(400).json({
        success: false,
        error: 'Session expired. Please login again.',
        code: 'PENDING_LOGIN_NOT_FOUND',
      });
    }

    // Check if expired
    if (new Date() > new Date(pendingLogin.expiresAt)) {
      // Clean up expired pending login
      await prisma.pendingLogin.delete({ where: { id: pendingLogin.id } });
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please login again.',
        code: 'OTP_EXPIRED',
      });
    }

    // Check max attempts
    if (pendingLogin.attempts >= pendingLogin.maxAttempts) {
      // Clean up
      await prisma.pendingLogin.delete({ where: { id: pendingLogin.id } });
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Please login again.',
        code: 'MAX_ATTEMPTS_EXCEEDED',
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, pendingLogin.otpHash);

    if (!isValid) {
      // Increment attempts
      await prisma.pendingLogin.update({
        where: { id: pendingLogin.id },
        data: { attempts: pendingLogin.attempts + 1 },
      });

      const remainingAttempts = pendingLogin.maxAttempts - pendingLogin.attempts - 1;
      return res.status(400).json({
        success: false,
        error:
          remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
            : 'Invalid OTP. Please login again.',
        code: 'INVALID_OTP',
        remainingAttempts,
      });
    }

    // OTP is valid - mark as used
    await prisma.pendingLogin.update({
      where: { id: pendingLogin.id },
      data: { used: true },
    });

    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: pendingLogin.userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Complete the login
    const refreshToken = generateRefreshToken(user);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshTokenHash },
    });

    const accessToken = generateAccessToken(user);

    setRefreshTokenCookie(res, refreshToken);

    // Create audit log for login
    await createAuditLog({
      action: AuditAction.LOGIN,
      entity: AuditEntity.USER,
      entityId: user.id,
      userId: user.id,
      branchId: user.branchId,
      description: `User logged in (2FA): ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Clean up pending login
    await prisma.pendingLogin.delete({ where: { id: pendingLogin.id } });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions: user.role === 'ADMIN' ? null : user.permissions || [],
          branchId: user.branchId,
          branch: user.branch,
        },
      },
    });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// RESEND LOGIN OTP - Resend OTP for pending login
// ============================================
export const resendLoginOTP = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      // Return success anyway to not reveal if user exists
      return res.json({
        success: true,
        message: 'If your account exists, a new OTP has been sent',
      });
    }

    if (!user.phone) {
      return res.status(400).json({
        success: false,
        error: 'No phone number registered for this account',
        code: 'NO_PHONE',
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Normalize phone
    const normalizedPhone = user.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

    // Delete existing pending logins
    await prisma.pendingLogin.deleteMany({
      where: { userId: user.id },
    });

    // Create new pending login
    await prisma.pendingLogin.create({
      data: {
        userId: user.id,
        email: user.email,
        phone: normalizedPhone,
        otpHash,
        expiresAt,
      },
    });

    // Send OTP via WhatsApp
    let messageSent = false;
    let errorMessage = null;
    try {
      const result = await sendOTP(normalizedPhone, otp, 'login');
      messageSent = result.success;
    } catch (whatsappError) {
      console.error('WhatsApp OTP delivery failed:', whatsappError.message);
      errorMessage = whatsappError.message;
    }

    if (!messageSent) {
      return res.status(500).json({
        success: false,
        error: `Failed to send OTP via WhatsApp: ${errorMessage || 'unknown error'}`,
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your registered phone number',
    });
  } catch (error) {
    console.error('Resend login OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided',
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
    });

    if (!user || !user.refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Session expired',
      });
    }

    const isValidToken = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });

      // Create audit log for logout
      await createAuditLog({
        action: AuditAction.LOGOUT,
        entity: AuditEntity.USER,
        entityId: req.user.id,
        userId: req.user.id,
        branchId: req.user.branchId,
        description: `User logged out: ${req.user.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearRefreshTokenCookie(res);
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
            timezone: true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Access tokens live 24h, so deactivating an account does not invalidate the
    // one already in the user's browser. This is the call the frontend makes to
    // validate a session, so answering 401 is what actually ends it.
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        permissions: user.role === 'ADMIN' ? null : user.permissions || [],
        branchId: user.branchId,
        branch: user.branch,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, avatarUrl } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    // Everyone may change their own photo; an empty string clears it.
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (phone !== undefined) {
      // Canonical form is E.164 (`+<digits>`); legacy rows without the `+`
      // still exist and the uniqueness check below covers both.
      updateData.phone = phone ? toE164(phone) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existing = await prisma.user.findFirst({
        where: {
          email,
          id: { not: req.user.id },
        },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use',
        });
      }
    }

    // Check if phone is already taken by another user
    if (updateData.phone) {
      const phoneWhere = phoneConflictWhere(updateData.phone);
      if (phoneWhere) {
        const existingPhone = await prisma.user.findFirst({
          where: { ...phoneWhere, id: { not: req.user.id } },
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            error: 'Phone number is already in use',
          });
        }
      }
    }

    // Read the outgoing photo before overwriting it, so the replaced asset can
    // be removed from Cloudinary afterwards.
    const previousAvatarUrl =
      updateData.avatarUrl !== undefined
        ? (
            await prisma.user.findUnique({
              where: { id: req.user.id },
              select: { avatarUrl: true },
            })
          )?.avatarUrl
        : undefined;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
            timezone: true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (previousAvatarUrl && previousAvatarUrl !== user.avatarUrl) {
      const publicId = extractPublicId(previousAvatarUrl);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
          // The profile is already saved; an orphaned asset is not worth failing on.
          console.error('[updateProfile] Failed to delete old avatar:', error.message);
        }
      }
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        permissions: user.role === 'ADMIN' ? null : user.permissions || [],
        branchId: user.branchId,
        branch: user.branch,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens (logout all sessions)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully. Please login again.',
      },
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// ADMIN - CHANGE ANY USER'S PASSWORD
// Admin can reset password without knowing old password
// ============================================
export const adminChangePassword = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can change other users passwords',
      });
    }

    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'User ID and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens for this user (force re-login)
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    res.json({
      success: true,
      data: {
        message: `Password for ${user.email} has been reset. They will need to login again.`,
      },
    });
  } catch (error) {
    console.error('Admin change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// FORGOT PASSWORD - Send OTP via WhatsApp
// ============================================

export const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Normalize phone number - keep only digits and leading +
    const normalizedPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: { endsWith: normalizedPhone.slice(-10) } },
          { phone: { endsWith: normalizedPhone } },
          // Also check without country code
          { phone: { endsWith: normalizedPhone.replace(/^92/, '0') } },
        ],
        isActive: true,
      },
      include: { branch: true },
    });

    // Return error if user not found
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this phone number',
        code: 'USER_NOT_FOUND',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // Set expiry: 10 minutes
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    await prisma.oTP.deleteMany({
      where: { phone: normalizedPhone },
    });

    // Store OTP in database with instance name log
    // NOTE: We use CENTRAL_WHATSAPP_INSTANCE which is our OTP instance
    await prisma.oTP.create({
      data: {
        phone: normalizedPhone,
        otpHash,
        otpExpiry,
        sentViaInstance: process.env.CENTRAL_WHATSAPP_INSTANCE || 'centralclaidsstance',
      },
    });

    // Send OTP via WhatsApp using OTP instance
    let messageSent = false;
    let errorMessage = null;

    try {
      // Use the centralized WhatsApp service which uses OTP instance
      const result = await sendOTP(normalizedPhone, otp, 'reset');
      messageSent = result.success;
      if (messageSent) {
        // OTP sent successfully
      }
    } catch (whatsappError) {
      console.error('WhatsApp OTP delivery failed:', whatsappError.message);
      errorMessage = whatsappError.message;
    }

    res.json({
      success: true,
      data: {
        message: messageSent
          ? 'OTP sent via WhatsApp'
          : `OTP generated (WhatsApp delivery: ${errorMessage ? 'failed - ' + errorMessage : 'pending'})`,
        // NOTE: OTP is sent via WhatsApp - never expose in response
        // In dev mode without WhatsApp, check server logs for OTP
      },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
    });
  }
};

// ============================================
// VERIFY OTP - Check if OTP is valid
// ============================================

export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required',
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be 6 digits',
      });
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

    // Find OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: { phone: normalizedPhone },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'No OTP found. Please request a new one.',
        code: 'OTP_NOT_FOUND',
      });
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.otpExpiry)) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    // Check max attempts (3)
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum attempts exceeded. Please request a new OTP.',
        code: 'OTP_MAX_ATTEMPTS',
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isValid) {
      // Increment attempts
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remainingAttempts = 3 - otpRecord.attempts - 1;
      return res.status(400).json({
        success: false,
        error:
          remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
            : 'Invalid OTP. Please request a new one.',
        code: 'OTP_INVALID',
        remainingAttempts,
      });
    }

    // OTP is valid - mark as verified
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { otpVerified: true },
    });

    // Generate reset token (JWT) for password reset
    const resetTokenPayload = {
      phone: normalizedPhone,
      type: 'password_reset',
    };

    const resetToken = jwt.sign(resetTokenPayload, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    res.json({
      success: true,
      data: {
        message: 'OTP verified successfully',
        resetToken,
        expiresIn: '15m',
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// RESET PASSWORD - Set new password using reset token
// ============================================

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Verify JWT reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired. Please request a new OTP.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token',
        code: 'TOKEN_INVALID',
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type',
      });
    }

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: decoded.phone }, { phone: { endsWith: decoded.phone.slice(-10) } }],
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        refreshToken: null, // Invalidate all sessions
      },
    });

    // Delete OTP record
    await prisma.oTP.deleteMany({
      where: { phone: decoded.phone },
    });

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      data: {
        message: 'Password reset successful. Please login with your new password.',
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
