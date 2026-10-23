'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, XCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Check if we have a reset token
    const resetToken = sessionStorage.getItem('resetToken');
    if (!resetToken) {
      toast.error('Session expired. Please start the password reset process again.');
      router.push('/forgot-password');
    }
  }, [router]);

  // Password strength checker
  const passwordStrength = useMemo(() => {
    const password = newPassword;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    const levels = [
      { score: 0, label: '', color: '' },
      { score: 1, label: 'Very Weak', color: 'bg-destructive' },
      { score: 2, label: 'Weak', color: 'bg-red-500' },
      { score: 3, label: 'Fair', color: 'bg-red-500' },
      { score: 4, label: 'Strong', color: 'bg-neutral-500' },
      { score: 5, label: 'Very Strong', color: 'bg-neutral-600' },
    ];

    return levels[Math.min(score, 5)];
  }, [newPassword]);

  const handleReset = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const resetToken = sessionStorage.getItem('resetToken');
    if (!resetToken) {
      toast.error('Session expired. Please start over.');
      router.push('/forgot-password');
      return;
    }

    setIsResetting(true);
    try {
      const response = await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });

      if (response.data.success) {
        // Clear session storage
        sessionStorage.removeItem('resetPhone');
        sessionStorage.removeItem('resetToken');

        toast.success('Password reset successful!');
        router.push('/login?reset=success');
      } else {
        toast.error(response.data.error || 'Failed to reset password');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string; code?: string } };
      };
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Failed to reset password'
      );

      // If token expired, redirect to forgot password
      if (
        err.response?.data?.code === 'TOKEN_EXPIRED' ||
        err.response?.data?.code === 'TOKEN_INVALID'
      ) {
        sessionStorage.removeItem('resetPhone');
        sessionStorage.removeItem('resetToken');
        router.push('/forgot-password');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground">Enter your new password below</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-12 pl-4 pr-11 rounded-lg"
                  disabled={isResetting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          passwordStrength.score >= level
                            ? passwordStrength.color || 'bg-primary'
                            : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <p
                    className={cn(
                      'text-xs',
                      passwordStrength.color?.replace('bg-', 'text-') || 'text-muted-foreground'
                    )}
                  >
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={cn(
                    'h-12 pl-4 pr-11 rounded-lg',
                    passwordsMatch && 'border-neutral-500 focus-visible:ring-neutral-500',
                    passwordsDontMatch && 'border-destructive focus-visible:ring-destructive'
                  )}
                  disabled={isResetting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-neutral-500" />
                      <span className="text-xs text-neutral-500">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-destructive">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Reset Button */}
            <Button
              onClick={handleReset}
              disabled={
                isResetting || newPassword.length < 6 || !passwordsMatch || passwordsDontMatch
              }
              className="w-full h-12"
            >
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>

          {/* Help text */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            After resetting, you&apos;ll need to login with your new password
          </p>
        </div>
      </main>
    </div>
  );
}
