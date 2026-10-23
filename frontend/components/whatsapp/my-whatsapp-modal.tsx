'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface MyWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyWhatsAppModal({ open, onOpenChange }: MyWhatsAppModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch current user WhatsApp status
  const fetchStatus = async () => {
    try {
      const response = await api.get('/whatsapp/my/status');
      const data = response.data?.data;
      if (data) {
        setIsConnected(data.status === 'connected' || data.status === 'open');
        setPhoneNumber(data.phone);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
      fetchStatus();
    }
  }, [open]);

  // Poll for connection when QR is shown
  useEffect(() => {
    if (!open || !qrCode) return;

    const checkStatus = async () => {
      try {
        const response = await api.get('/whatsapp/my/status');
        const data = response.data?.data;
        if (data?.status === 'connected' || data?.status === 'open') {
          setIsConnected(true);
          setPhoneNumber(data.phone);
          setQrCode(null);
          setIsQrExpired(false);
          toast.success('WhatsApp connected successfully!');
        }
      } catch {}
    };

    const interval = setInterval(checkStatus, 2000);
    const expirationTimer = setTimeout(() => setIsQrExpired(true), 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(expirationTimer);
    };
  }, [open, qrCode]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setIsQrExpired(false);
    try {
      const response = await api.post('/whatsapp/my/connect');
      const data = response.data?.data;

      if (data?.alreadyConnected) {
        toast.success('WhatsApp already connected!');
        setIsConnected(true);
        setPhoneNumber(data.phoneNumber);
        setQrCode(null);
      } else if (data?.qrCode) {
        setQrCode(data.qrCode);
        toast.success('QR code generated! Scan with your WhatsApp app.');
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to connect WhatsApp');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setShowDisconnectConfirm(false);
    try {
      await api.post('/whatsapp/my/disconnect');
      setIsConnected(false);
      setPhoneNumber(null);
      setQrCode(null);
      toast.success('WhatsApp disconnected');
      fetchStatus();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setQrCode(null);
    setIsQrExpired(false);
    await handleConnect();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets QR state when the modal closes
      setQrCode(null);
      setIsQrExpired(false);
      setShowDisconnectConfirm(false);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#db0201]/10">
                <svg className="h-5 w-5 text-[#db0201]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.834-1.42.075-.704-.356-1.033-.71-1.429z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.036.509 3.95 1.407 5.574L0 24l6.626-1.405C8.034 23.489 9.962 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.63-.544-5.15-1.49l-.37-.21-3.635.768.778-3.68-.24-.39C2.498 15.478 2 13.785 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                </svg>
              </div>
              My WhatsApp
            </DialogTitle>
            <DialogDescription>
              Connect your personal WhatsApp to send and receive messages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isConnected ? (
              // Connected State - Show popup/alert style
              <div className="space-y-4">
                <div className="bg-[#db0201]/10 rounded-xl p-6 text-center border border-[#db0201]/20">
                  <CheckCircle2 className="h-12 w-12 text-[#db0201] mx-auto mb-3" />
                  <p className="font-semibold text-lg text-[#121111]">WhatsApp Connected</p>
                  {phoneNumber && (
                    <p className="text-sm text-[#78736F] mt-1 flex items-center justify-center gap-1">
                      <Wifi className="h-3 w-3" />
                      {phoneNumber}
                    </p>
                  )}
                  <p className="text-xs text-[#78736F] mt-2">
                    Your WhatsApp is linked and ready to send/receive messages
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleRefresh}
                    disabled={isConnecting}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-red-500 hover:text-red-500 hover:bg-red-50 border-red-200"
                    onClick={() => setShowDisconnectConfirm(true)}
                  >
                    <WifiOff className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : qrCode ? (
              // QR Code Display
              <div className="space-y-4">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="bg-white rounded-2xl p-6 border-2 border-[#d6d3d1] shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                    {isQrExpired && (
                      <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                        <div className="text-center p-4">
                          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">QR Expired</p>
                          <p className="text-xs text-[#78736F]">Tap refresh to get new code</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#fff2f2] rounded-lg p-3 text-center">
                  <p className="text-sm text-[#b00201]">
                    <span className="font-medium">Scan this QR code</span>
                    <br />
                    <span className="text-xs">
                      Open WhatsApp → Settings → Linked Devices → Link a Device
                    </span>
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleRefresh}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isQrExpired ? 'Get New QR' : 'Refresh QR'}
                </Button>
              </div>
            ) : (
              // Not Connected - Initial state
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-[#f5f4f3] rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="h-10 w-10 text-[#78736F]" />
                  </div>
                  <p className="font-semibold text-lg text-[#121111]">Connect Your WhatsApp</p>
                  <p className="text-sm text-[#78736F] mt-1">
                    Link your personal WhatsApp to send and receive messages
                  </p>
                </div>

                <div className="bg-[#f5f4f3] rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-[#57534f] mb-2">What you can do:</p>
                  <div className="flex items-center gap-2 text-sm text-[#78736F]">
                    <CheckCircle2 className="h-4 w-4 text-[#db0201]" />
                    Send messages to customers
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#78736F]">
                    <CheckCircle2 className="h-4 w-4 text-[#db0201]" />
                    Receive customer replies
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#78736F]">
                    <CheckCircle2 className="h-4 w-4 text-[#db0201]" />
                    Auto-create leads from messages
                  </div>
                </div>

                <Button
                  className="w-full gap-2 bg-[#db0201] hover:bg-[#db0201]/90 text-white"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Generate QR Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-xl">
                <WifiOff className="h-6 w-6 text-red-500" />
              </div>
              <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will log out your WhatsApp from this device. You will need to scan the QR code
              again to reconnect. Your existing conversations and messages will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Status indicator component for the sidebar
export function WhatsAppStatusIndicator({ onClick }: { onClick: () => void }) {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    phoneNumber: string | null;
  }>({ isConnected: false, phoneNumber: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/whatsapp/my/status');
        const data = response.data?.data;
        if (data) {
          setStatus({
            isConnected: data.status === 'connected' || data.status === 'open',
            phoneNumber: data.phone,
          });
        }
      } catch (error) {
        console.error('Failed to fetch WhatsApp status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors w-full"
      >
        <div className="h-8 w-8 rounded-full bg-[#1c1b1a] flex items-center justify-center">
          <Settings2 className="h-4 w-4 text-neutral-400 animate-spin" />
        </div>
        <span className="text-sm text-neutral-400">Loading...</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors w-full"
    >
      <div className="h-8 w-8 rounded-full bg-[#1c1b1a] flex items-center justify-center">
        {status.isConnected ? (
          <Wifi className="h-4 w-4 text-[#db0201]" />
        ) : (
          <WifiOff className="h-4 w-4 text-neutral-500" />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm text-neutral-200 font-medium">
          {status.isConnected ? 'Connected' : 'Not Connected'}
        </p>
        {status.isConnected && status.phoneNumber && (
          <p className="text-xs text-neutral-400">{status.phoneNumber}</p>
        )}
      </div>
      <Settings2 className="h-4 w-4 text-neutral-500" />
    </button>
  );
}
