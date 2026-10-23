'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { phoneSchema } from '@/lib/validators';

const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSending(true);
    try {
      const response = await api.post('/auth/forgot-password', { phone: data.phone });

      if (response.data.success) {
        // Store phone for verification step
        sessionStorage.setItem('resetPhone', data.phone);
        toast.success('OTP sent to your WhatsApp!');
        router.push('/forgot-password/verify-otp');
      } else {
        toast.error(response.data.error || 'Failed to send OTP');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send OTP. Please check if the backend server is running.';
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

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
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your phone number to receive a password reset code via WhatsApp
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                control={control}
                name="phone"
                id="phone"
                error={errors.phone?.message}
                disabled={isSending}
                placeholder="9876543210"
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <Button type="submit" disabled={isSending} className="w-full h-12">
              {isSending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Send Reset Code
                </span>
              )}
            </Button>
          </form>

          {/* Help text */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Make sure your WhatsApp is registered with this number
          </p>
        </div>
      </main>
    </div>
  );
}
