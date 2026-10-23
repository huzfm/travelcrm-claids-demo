'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthContext } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { phoneSchema } from '@/lib/validators';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, ArrowRight, Mail, Lock, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { firstAccessibleRoute } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { OTPInputWithTimer } from '@/components/ui/otp-input';
import type { User } from '@/types';

// Response data type (axios response.data)
interface AuthResponseData {
  success: boolean;
  requiresOTP?: boolean;
  message?: string;
  data?: {
    accessToken: string;
    user: User;
  };
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, setAuthFromToken } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // OTP verification state
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [, setOtpMessage] = useState('');
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const {
    handleSubmit: handleSubmitForgot,
    control: controlForgot,
    formState: { errors: errorsForgot },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    // Not every user has the Dashboard feature, so land them on the first page
    // their permissions actually allow.
    if (!authLoading && isAuthenticated) router.replace(firstAccessibleRoute(user));
  }, [isAuthenticated, authLoading, router, user]);

  useEffect(() => {
    // Arriving here from a forced logout: say why, once, then drop the marker so
    // a reload does not repeat it.
    const reason = new URLSearchParams(window.location.search).get('session');
    if (!reason) return;

    toast.error(
      reason === 'revoked'
        ? 'Your access was revoked. Please sign in again.'
        : 'Your session has expired. Please sign in again.'
    );
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const onSubmit = async (formData: LoginForm) => {
    setIsSubmitting(true);
    try {
      const response = await api.post<AuthResponseData>('/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      const result = response.data;

      if (result.requiresOTP) {
        // Credentials valid, OTP required
        setOtpEmail(formData.email);
        setRequiresOTP(true);
        setOtpMessage(result.message || 'OTP sent to your phone');
        setRemainingTime(300);
        toast.success(result.message || 'OTP sent successfully');
      } else if (result.success && result.data) {
        // Direct login (no OTP)
        setAuthFromToken(result.data.accessToken, result.data.user);
        toast.success('Logged in successfully');
        router.push(firstAccessibleRoute(result.data.user));
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      if (
        msg?.toLowerCase().includes('email') ||
        msg?.toLowerCase().includes('not found') ||
        msg?.toLowerCase().includes('no user') ||
        msg?.toLowerCase().includes('invalid credentials')
      ) {
        toast.error('Invalid email or password');
      } else if (msg?.toLowerCase().includes('password') || msg?.toLowerCase().includes('wrong')) {
        toast.error('Incorrect password. Please try again');
      } else if (
        msg?.toLowerCase().includes('deactivated') ||
        msg?.toLowerCase().includes('inactive')
      ) {
        toast.error('Your account has been deactivated. Contact your manager.');
      } else {
        toast.error(msg || 'Login failed. Please try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPChange = (value: string) => {
    setOtpValue(value);
    setOtpError(false);
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      setOtpError(true);
      return;
    }

    setIsVerifyingOTP(true);
    setOtpError(false);

    try {
      const response = await api.post<AuthResponseData>('/auth/verify-login-otp', {
        email: otpEmail,
        otp: otpValue,
      });
      const data = response.data;

      if (data.success && data.data) {
        // Update auth context
        setAuthFromToken(data.data.accessToken, data.data.user);
        toast.success('Verification successful!');
        router.push(firstAccessibleRoute(data.data.user));
      } else if (data.message) {
        toast.error(data.message);
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string; code?: string } };
      };
      const msg = err.response?.data?.message || 'Verification failed';
      const code = err.response?.data?.code;

      if (
        code === 'OTP_EXPIRED' ||
        code === 'PENDING_LOGIN_NOT_FOUND' ||
        code === 'MAX_ATTEMPTS_EXCEEDED'
      ) {
        // These errors require re-login
        setRequiresOTP(false);
        setOtpValue('');
        toast.error(msg);
      } else {
        setOtpError(true);
        toast.error(msg);
      }
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const { resendLoginOTP } = await import('@/lib/auth');
      await resendLoginOTP(otpEmail);
      setOtpValue('');
      setOtpError(false);
      setRemainingTime(300);
      toast.success('New OTP sent successfully');
    } catch {
      toast.error('Failed to resend OTP');
    }
  };

  const handleBackToLogin = () => {
    setRequiresOTP(false);
    setOtpValue('');
    setOtpError(false);
    setOtpEmail('');
  };

  const handleSendResetCode = async (data: ForgotPasswordForm) => {
    setIsSendingCode(true);
    try {
      const response = await api.post('/auth/forgot-password', { phone: data.phone });
      if (response.data.success) {
        toast.success('OTP sent to your WhatsApp! Redirecting...');
        // Close modal and navigate to verify page
        setShowForgotPassword(false);
        // Use a small delay to allow toast to show
        setTimeout(() => {
          router.push(`/forgot-password/verify-otp?phone=${encodeURIComponent(data.phone)}`);
        }, 1000);
      } else {
        toast.error(response.data.error || 'Failed to send OTP');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Remove old handleResetPassword and handleCloseForgotPassword from modal (no longer needed)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/95 to-accent/80" />

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-gold/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="relative w-80 aspect-16/5 mx-auto mb-8 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
            <Image
              src="/login.PNG"
              alt="Tripoday Holidays"
              fill
              sizes="320px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            One Team. One Platform
          </h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Designed to help Tripoday Holidays work smarter, collaborate better, and deliver
            exceptional travel experiences.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Logo for mobile */}
          <div className="lg:hidden relative w-64 aspect-16/5 mx-auto mb-8 rounded-xl overflow-hidden shadow-brand">
            <Image
              src="/login.PNG"
              alt="Tripoday Holidays"
              fill
              sizes="256px"
              className="object-cover"
              priority
            />
          </div>

          {/* OTP Verification Screen */}
          {requiresOTP ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Verify Identity
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the code sent to your phone
                  </p>
                </div>
              </div>

              <OTPInputWithTimer
                length={6}
                value={otpValue}
                onChange={handleOTPChange}
                disabled={isVerifyingOTP}
                error={otpError}
                onResend={handleResendOTP}
                remainingTime={remainingTime}
                isResending={isVerifyingOTP}
              />

              {otpError && (
                <p className="text-sm text-destructive text-center">
                  Invalid OTP. Please try again.
                </p>
              )}

              <Button
                type="button"
                onClick={handleVerifyOTP}
                disabled={otpValue.length !== 6 || isVerifyingOTP}
                className="w-full h-12 shadow-brand hover:shadow-brand-lg transition-all"
              >
                {isVerifyingOTP ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Verify & Sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome back</h2>
                <p className="mt-2 text-muted-foreground">Sign in to access your account</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      className={cn(
                        'h-12 pl-11 rounded-lg',
                        errors.email && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={cn(
                        'h-12 pl-11 pr-11 rounded-lg',
                        errors.password && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 shadow-brand hover:shadow-brand-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                © 2026 Tripoday Holidays CRM
              </p>
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              Forgot Password
            </DialogTitle>
            <DialogDescription>
              Enter your phone number to receive a password reset code via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForgot(handleSendResetCode)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-phone">Phone Number</Label>
              <PhoneInput
                control={controlForgot}
                name="phone"
                id="forgot-phone"
                error={errorsForgot.phone?.message}
                placeholder="9876543210"
                className="h-12"
              />
              {errorsForgot.phone && (
                <p className="text-sm text-destructive">{errorsForgot.phone.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSendingCode} className="w-full">
              {isSendingCode ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Send Reset Code
                </span>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
