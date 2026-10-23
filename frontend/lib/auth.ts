'use client';

import api, { getToken, setToken } from './axios';
import type { User } from '@/types';

export type { User };

export interface LoginResponse {
  data: {
    success: boolean;
    requiresOTP?: boolean;
    message?: string;
    data?: {
      accessToken: string;
      user: User & { phone?: string | null };
    };
  };
}

export function login(credentials: { email: string; password: string }) {
  return api.post<LoginResponse['data']>('/auth/login', credentials);
}

export function logout() {
  return api.post('/auth/logout');
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('crm_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function setCurrentUser(user: User | null) {
  if (user) localStorage.setItem('crm_user', JSON.stringify(user));
  else localStorage.removeItem('crm_user');
}

export function clearAuth() {
  setToken(null);
  setCurrentUser(null);
  localStorage.removeItem('crm_token');
}

export function getMe() {
  return api.get<{ success: true; data: User }>('/auth/me');
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return api.post('/auth/change-password', data);
}

export function verifyLoginOTP(email: string, otp: string) {
  return api.post<LoginResponse['data']>('/auth/verify-login-otp', { email, otp });
}

export function resendLoginOTP(email: string) {
  return api.post('/auth/resend-login-otp', { email });
}

export function updateProfile(data: { name?: string; email?: string }) {
  return api.patch('/auth/profile', data);
}

export { getToken, setToken };
