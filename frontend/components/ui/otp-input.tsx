'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  error?: boolean;
}

export function OTPInput({
  length = 6,
  value = '',
  onChange,
  disabled = false,
  autoFocus = true,
  className,
  inputClassName,
  error = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(value.split('').slice(0, length));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize array with empty strings
  useEffect(() => {
    const newOtp = Array(length)
      .fill('')
      .map((_, i) => otp[i] || '');
    if (newOtp.join('') !== otp.join('')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resizes the digit array when length changes
      setOtp(newOtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  // Call onChange when OTP changes
  useEffect(() => {
    if (onChange) {
      onChange(otp.join(''));
    }
  }, [otp, onChange]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Only allow digits - take only the last character
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input with setTimeout to ensure value is set first
    if (digit && index < length - 1) {
      setTimeout(() => {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.select(); // Select text so user can overwrite
        }
      }, 10);
    }

    // Check if complete - but don't blur if we're still editing the last field
    if (newOtp.every(d => d !== '') && index !== length - 1) {
      inputRefs.current[length - 1]?.blur();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      const newOtp = [...otp];

      if (otp[index] === '' && index > 0) {
        // Move to previous input and clear it
        newOtp[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      } else {
        newOtp[index] = '';
      }

      setOtp(newOtp);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData) {
      const newOtp = Array(length)
        .fill('')
        .map((_, i) => pastedData[i] || '');
      setOtp(newOtp);

      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    if (disabled) return;

    // Select all text on focus
    inputRefs.current[index]?.select();
  };

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={otp[index] || ''}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e as unknown as KeyboardEvent<HTMLInputElement>)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          className={cn(
            'w-12 h-14 text-center text-xl font-bold rounded-lg border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'bg-background',
            error
              ? 'border-destructive focus:ring-destructive'
              : otp[index]
                ? 'border-primary focus:ring-primary'
                : 'border-input focus:ring-ring',
            disabled && 'opacity-50 cursor-not-allowed',
            inputClassName
          )}
        />
      ))}
    </div>
  );
}

interface OTPInputWithTimerProps extends OTPInputProps {
  onResend?: () => void;
  remainingTime?: number;
  isResending?: boolean;
}

export function OTPInputWithTimer({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  className,
  inputClassName,
  error = false,
  onResend,
  remainingTime = 60,
  isResending = false,
}: OTPInputWithTimerProps) {
  const [timeLeft, setTimeLeft] = useState(remainingTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [prevRemainingTime, setPrevRemainingTime] = useState(remainingTime);
  if (remainingTime !== prevRemainingTime) {
    setPrevRemainingTime(remainingTime);
    if (remainingTime > 0) setTimeLeft(remainingTime);
  }

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <OTPInput
        length={length}
        value={value}
        onChange={onChange}
        disabled={disabled || isResending}
        autoFocus={autoFocus}
        className={className}
        inputClassName={inputClassName}
        error={error}
      />

      <div className="text-center">
        {timeLeft > 0 ? (
          <p className="text-sm text-muted-foreground">
            Code expires in{' '}
            <span className={cn('font-mono font-medium', timeLeft <= 10 && 'text-destructive')}>
              {formatTime(timeLeft)}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={isResending}
            className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
          >
            {isResending ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Resend OTP'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default OTPInput;
