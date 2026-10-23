'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null | undefined;
  contactNumber?: string;
  contactName?: string | null;
  onCreated: (leadId: string) => void;
}

export function CreateLeadModal({
  open,
  onOpenChange,
  contactId,
  contactNumber,
  contactName,
  onCreated,
}: CreateLeadModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form when the modal opens
      setName(contactName || '');
      setPhone(contactNumber || '');
      setEmail('');
      setNotes('');
    }
  }, [open, contactName, contactNumber]);

  const createMutation = useMutation({
    mutationFn: async ({
      contactId,
      name,
      email,
      phone,
      notes,
    }: {
      contactId: string;
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) => {
      const response = await api.post(`/whatsapp/contacts/${contactId}/create-lead`, {
        name,
        email,
        phone,
        notes,
      });
      return response.data.data;
    },
    onSuccess: data => {
      toast.success('Lead created successfully');
      onCreated(data.lead?.id || '');
    },
    onError: () => {
      toast.error('Failed to create lead');
    },
  });

  const handleCreate = () => {
    if (!contactId) return;
    createMutation.mutate({ contactId, name, email, phone, notes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <UserPlus className="h-5 w-5 text-success" />
            </div>
            Create Lead from Contact
          </DialogTitle>
          <DialogDescription>
            Create a new lead in your CRM from this WhatsApp conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium">Phone Number</Label>
            <PhoneInput value={phone} onChange={setPhone} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Name</Label>
            <Input
              placeholder="Lead name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              placeholder="Email address (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Initial notes about this lead..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="bg-success hover:bg-success/90"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
