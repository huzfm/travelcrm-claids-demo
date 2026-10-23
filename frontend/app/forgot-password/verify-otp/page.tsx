'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { OTPInputWithTimer } from '@/components/ui/otp-input';
import { formatE164ForDisplay } from '@/components/ui/phone-input';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

export default function VerifyOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Get phone from session storage
    const storedPhone = sessionStorage.getItem('resetPhone');
    if (!storedPhone) {
      toast.error('Phone number not found. Please start over.');
      router.push('/forgot-password');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
    setPhone(storedPhone);
  }, [router]);

  // Handle OTP input change
  const handleOTPChange = useCallback(
    (value: string) => {
      setOtp(value);
      if (error) setError(false);
    },
    [error]
  );

  // Handle verification
  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(false);

    try {
      const response = await api.post('/auth/verify-otp', {
        phone,
        otp,
      });

      if (response.data.success) {
        // Store reset token
        const resetToken = response.data.data?.resetToken;
        if (resetToken) {
          sessionStorage.setItem('resetToken', resetToken);
        }
        toast.success('OTP verified successfully!');
        router.push('/forgot-password/reset-password');
      } else {
        setError(true);
        if (response.data.remainingAttempts !== undefined) {
          setRemainingAttempts(response.data.remainingAttempts);
        }
        toast.error(response.data.error || 'Invalid OTP');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string; remainingAttempts?: number } };
      };
      setError(true);
      if (err.response?.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.response.data.remainingAttempts);
      }
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Verification failed'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const response = await api.post('/auth/forgot-password', { phone });
      if (response.data.success) {
        toast.success('New OTP sent to your WhatsApp!');
        setOtp('');
        setError(false);
        setRemainingAttempts(null);
        setResendCooldown(60);
      } else {
        toast.error(response.data.error || 'Failed to resend OTP');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string } } };
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Failed to resend OTP'
      );
    } finally {
      setIsResending(false);
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6 && !isVerifying) {
      const timeout = setTimeout(() => {
        handleVerify();
      }, 300); // Small delay to let user finish typing
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, isVerifying]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <button
          type="button"
          onClick={() => router.push('/forgot-password')}
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
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Verify OTP</h1>
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to
              <br />
              <span className="font-medium text-foreground">{formatE164ForDisplay(phone)}</span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp" className="sr-only">
                OTP Code
              </Label>
              <OTPInputWithTimer
                value={otp}
                onChange={handleOTPChange}
                error={error}
                disabled={isVerifying}
                remainingTime={resendCooldown || 60}
                onResend={handleResend}
                isResending={isResending}
              />
            </div>

            {/* Error message */}
            {error && remainingAttempts !== null && remainingAttempts > 0 && (
              <p className="text-center text-sm text-destructive">
                Invalid code. {remainingAttempts} attempt(s) remaining.
              </p>
            )}

            {/* Verify button */}
            <Button
              onClick={handleVerify}
              disabled={otp.length !== 6 || isVerifying}
              className="w-full h-12"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </Button>
          </div>

          {/* Help text */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Didn&apos;t receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-primary hover:text-primary/80 font-medium disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
