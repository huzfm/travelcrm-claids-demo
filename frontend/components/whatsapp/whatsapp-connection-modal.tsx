'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  useWhatsAppConnect,
  useWhatsAppDisconnect,
  useWhatsAppRestart,
  useWhatsAppBranchStatus,
  useWhatsAppAllBranchesStatus,
} from '@/hooks/useWhatsApp';
import { useBranches } from '@/hooks/useBranches';
import {
  Loader2,
  WifiOff,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MessageCircle,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface WhatsAppConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  isConnected: boolean;
  connectionState: string;
}

interface BranchWhatsAppStatus {
  id: string;
  name: string;
  country: string;
  instanceName: string | null;
  connected: boolean;
  whatsappNumber: string | null;
  connectionState: string;
}

export function WhatsAppConnectionModal({
  open,
  onOpenChange,
  branchId: initialBranchId,
  isConnected: initialIsConnected,
}: WhatsAppConnectionModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'connect'>('all');

  const { data: branchesData } = useBranches();
  const branches = branchesData || [];

  const connectMutation = useWhatsAppConnect();
  const disconnectMutation = useWhatsAppDisconnect();
  const restartMutation = useWhatsAppRestart();

  // Fetch WhatsApp status for all branches
  const { data: allBranchStatuses, refetch: refetchAllStatuses } = useWhatsAppAllBranchesStatus();

  // Refetch status when modal opens or branch changes
  const { data: branchStatus, refetch: refetchStatus } = useWhatsAppBranchStatus(
    selectedBranchId || null
  );

  // Track if we've already notified about connection
  const hasNotifiedConnection = useRef(false);

  // Reset notification flag when modal opens or QR is set
  useEffect(() => {
    if (open) {
      hasNotifiedConnection.current = false;
    }
  }, [open, qrCode]);

  // Poll for connection status when showing QR - use direct API call for real-time status
  useEffect(() => {
    if (!open || !qrCode) return;

    let isMounted = true;

    const checkStatus = async () => {
      if (!isMounted || hasNotifiedConnection.current) return;

      try {
        // Directly fetch status for this branch
        const response = await api.get(`/whatsapp/branch/${selectedBranchId}/status`);
        const status = response.data?.data;

        if (status?.isConnected || status?.connectionState === 'open') {
          hasNotifiedConnection.current = true;

          if (isMounted) {
            setQrCode(null);
            setIsQrExpired(false);
            setActiveTab('all');
            toast.success('WhatsApp connected successfully!');
            // Refetch all statuses to update the table
            refetchAllStatuses();
          }
        }
      } catch {}
    };

    // Check immediately, then every 2 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    // QR code expiration timer (60 seconds)
    const expirationTimer = setTimeout(() => {
      if (isMounted) {
        setIsQrExpired(true);
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(expirationTimer);
    };
  }, [open, qrCode, selectedBranchId, refetchAllStatuses]);

  // Reset QR when modal closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets QR state when the modal closes
      setQrCode(null);
      setIsQrExpired(false);
      setActiveTab('all');
    }
  }, [open]);

  // Update selected branch when props change
  const [prevBranchId, setPrevBranchId] = useState(initialBranchId);
  if (initialBranchId !== prevBranchId) {
    setPrevBranchId(initialBranchId);
    setSelectedBranchId(initialBranchId);
  }

  const handleConnect = async (branchIdToConnect: string) => {
    if (!branchIdToConnect) {
      toast.error('Please select a branch');
      return;
    }

    try {
      setSelectedBranchId(branchIdToConnect);
      const branchToConnect = branches.find((b: any) => b.id === branchIdToConnect);
      const result = await connectMutation.mutateAsync({ branchId: branchIdToConnect });

      if (result.alreadyConnected) {
        toast.success(`${branchToConnect?.name || 'WhatsApp'} is already connected!`);
        setQrCode(null);
        refetchAllStatuses();
      } else if (result.qrCode) {
        setQrCode(result.qrCode);
        setIsQrExpired(false);
        toast.success('QR code generated! Scan with your WhatsApp app.');
        setActiveTab('connect');
      } else {
        toast.error('No QR code received. Please try again.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate QR code');
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false);
    try {
      await disconnectMutation.mutateAsync({ branchId: selectedBranchId });
      setQrCode(null);
      toast.success('WhatsApp disconnected successfully');
      refetchStatus();
      refetchAllStatuses();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to disconnect WhatsApp');
    }
  };

  const handleRestart = async () => {
    try {
      await restartMutation.mutateAsync({ branchId: selectedBranchId });
      toast.success('WhatsApp instance restarted');
      refetchStatus();
      refetchAllStatuses();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to restart WhatsApp');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQrCode(null);
      setIsQrExpired(false);
    }
    onOpenChange(newOpen);
  };

  const currentConnected = branchStatus?.isConnected ?? initialIsConnected;

  const getBranchStatus = (branchId: string) => {
    return allBranchStatuses?.find((s: BranchWhatsAppStatus) => s.id === branchId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-wa-green/10">
                <Phone className="h-5 w-5 text-wa-green" />
              </div>
              WhatsApp Configuration
            </DialogTitle>
            <DialogDescription>
              Connect WhatsApp for each branch to send and receive messages from customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Branches Table */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b">
                <h3 className="font-semibold text-sm text-foreground">Branch WhatsApp Status</h3>
              </div>
              <div className="divide-y">
                {branches.map((branch: any) => {
                  const status = getBranchStatus(branch.id);
                  const isConnected = status?.connected || false;
                  const isSelected = selectedBranchId === branch.id;

                  return (
                    <div
                      key={branch.id}
                      className={cn(
                        'px-4 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors',
                        isSelected && 'bg-muted/30'
                      )}
                    >
                      {/* Branch Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {branch.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{branch.country}</p>
                      </div>

                      {/* Status */}
                      <div className="text-right min-w-[140px]">
                        <div className="flex items-center gap-2 justify-end">
                          {isConnected ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-success" />
                              <span className="text-sm text-success font-medium">
                                {status?.whatsappNumber || 'Connected'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Not connected</span>
                            </>
                          )}
                        </div>
                        {status?.instanceName && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Instance: {status.instanceName}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBranchId(branch.id);
                                setActiveTab('connect');
                                setQrCode('restart');
                              }}
                              className="gap-1.5 text-xs"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Restart
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBranchId(branch.id);
                                setShowDisconnectConfirm(true);
                              }}
                              className="gap-1.5 text-xs text-destructive hover:text-destructive"
                            >
                              <WifiOff className="h-3 w-3" />
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(branch.id)}
                            disabled={connectMutation.isPending}
                            className="gap-1.5 text-xs bg-wa-green/10 text-wa-green border-wa-green/20 hover:bg-wa-green/20 hover:text-wa-green"
                          >
                            {connectMutation.isPending && selectedBranchId === branch.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <QrCode className="h-3 w-3" />
                            )}
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Code / Connection Panel for Selected Branch */}
            {(qrCode || activeTab === 'connect') && (
              <div className="border rounded-xl p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Connect WhatsApp — {branches.find((b: any) => b.id === selectedBranchId)?.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQrCode(null);
                      setActiveTab('all');
                    }}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>

                {qrCode && qrCode !== 'restart' ? (
                  // QR Code Display
                  <div className="space-y-4">
                    <div className="text-center">
                      {/* QR Code Container */}
                      <div className="relative inline-block">
                        <div className="bg-white rounded-2xl p-6 border-2 border-border shadow-brand-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCode}
                            alt="WhatsApp QR Code"
                            className="w-56 h-56 object-contain"
                          />
                        </div>
                        {isQrExpired && (
                          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                            <div className="text-center p-4">
                              <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                              <p className="text-sm font-medium text-foreground">QR Code Expired</p>
                              <p className="text-xs text-muted-foreground">
                                Tap refresh to get a new code
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <h4 className="font-bold text-foreground">Scan QR Code</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          Open WhatsApp on your phone, tap Menu or Settings, and select Linked
                          Devices. Then tap Link a Device and scan the QR code.
                        </p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-white rounded-xl p-3 space-y-2">
                      <h5 className="text-xs font-semibold text-foreground">How to connect:</h5>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-primary">1</span>
                          </div>
                          <p className="text-muted-foreground">Open WhatsApp</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-primary">2</span>
                          </div>
                          <p className="text-muted-foreground">Tap ⋮ Menu</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-xs font-bold text-primary">3</span>
                          </div>
                          <p className="text-muted-foreground">Scan Code</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handleConnect(selectedBranchId)}
                      disabled={connectMutation.isPending}
                      className="w-full gap-2"
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {isQrExpired ? 'Get New QR' : 'Refresh QR'}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      QR code expires in 60 seconds. Refresh if expired.
                    </p>
                  </div>
                ) : (
                  // Not Connected - Show Connect Button
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <QrCode className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h4 className="font-bold text-foreground mb-1">WhatsApp Not Connected</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Generate a QR code to link your WhatsApp to this branch.
                      </p>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <MessageCircle className="h-4 w-4 text-wa-green shrink-0" />
                        <p className="text-xs text-foreground">Receive messages</p>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <Send className="h-4 w-4 text-accent shrink-0" />
                        <p className="text-xs text-foreground">Send replies</p>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        <p className="text-xs text-foreground">Auto leads</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleConnect(selectedBranchId)}
                      disabled={connectMutation.isPending || !selectedBranchId}
                      className="w-full gap-2 bg-wa-green hover:bg-wa-green-dark"
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      Generate QR Code
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Connected State Details */}
            {currentConnected && (
              <div className="space-y-3">
                <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-semibold text-success">WhatsApp Connected</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your WhatsApp is linked and ready to send and receive messages.
                  </p>
                  {branchStatus?.whatsappPhoneNumber && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Connected Number:{' '}
                      <span className="font-medium text-foreground">
                        {branchStatus.whatsappPhoneNumber}
                      </span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    disabled={restartMutation.isPending}
                    className="gap-2"
                  >
                    {restartMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <WifiOff className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
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
              <div className="p-3 bg-destructive/10 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will log out the WhatsApp instance from this device. You will need to scan the QR
              code again to reconnect. Existing conversations and messages will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
