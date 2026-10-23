'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhoneInput, formatE164ForDisplay } from '@/components/ui/phone-input';
import { Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSendWhatsAppToNumber } from '@/hooks/useWhatsApp';
import { useQueryClient } from '@tanstack/react-query';
import { e164Regex } from '@/lib/validators';

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (contactId: string) => void;
}

export function NewChatModal({ open, onOpenChange, onChatCreated }: NewChatModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'phone' | 'message'>('phone');
  const sendMessage = useSendWhatsAppToNumber();
  const queryClient = useQueryClient();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!e164Regex.test(phoneNumber)) {
      toast.error('Please enter a valid phone number with country code');
      return;
    }
    setStep('message');
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const result = await sendMessage.mutateAsync({
        phoneNumber,
        message: message.trim(),
      });

      toast.success('Message sent!');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });

      // If we have a contactId from the result, navigate to the chat
      if (result?.contactId) {
        onChatCreated(result.contactId);
      } else {
        handleClose();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to send message');
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setMessage('');
    setStep('phone');
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep('phone');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#db0201]/10">
              <MessageCircle className="h-5 w-5 text-[#db0201]" />
            </div>
            New Chat
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#57534f] mb-2 block">
                  Enter phone number
                </label>
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="9876543210"
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#db0201] hover:bg-[#db0201]/90"
                disabled={!e164Regex.test(phoneNumber)}
              >
                Next
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#f5f4f3] rounded-lg p-3">
                <p className="text-xs text-[#78736F]">Sending to</p>
                <p className="font-medium text-[#121111]">{formatE164ForDisplay(phoneNumber)}</p>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs text-[#db0201] mt-1 hover:underline"
                >
                  Change number
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-[#57534f] mb-2 block">
                  Your message
                </label>
                <textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full min-h-[120px] p-3 border border-[#d6d3d1] rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#db0201] focus:ring-offset-0 focus:outline-none"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessage.isPending}
                className="w-full bg-[#db0201] hover:bg-[#db0201]/90"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
