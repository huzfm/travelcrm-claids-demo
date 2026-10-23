'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Lead } from '@/types';

interface LinkLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null | undefined;
  onLinked: () => void;
}

export function LinkLeadModal({ open, onOpenChange, contactId, onLinked }: LinkLeadModalProps) {
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const searchQuery = useDebounce(search, 300);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const response = await api.get('/leads', { params: { search: searchQuery, limit: 20 } });
      return response.data.data?.leads || [];
    },
    enabled: !!searchQuery,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ contactId, leadId }: { contactId: string; leadId: string }) => {
      const response = await api.post(`/whatsapp/contacts/${contactId}/link-lead`, { leadId });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Lead linked successfully');
      onLinked();
    },
    onError: () => {
      toast.error('Failed to link lead');
    },
  });

  const handleLink = () => {
    if (!contactId || !selectedLeadId) return;
    linkMutation.mutate({ contactId, leadId: selectedLeadId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <UserPlus className="h-5 w-5 text-accent" />
            </div>
            Link to Existing Lead
          </DialogTitle>
          <DialogDescription>
            Search for a lead by name or phone number to link to this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))
              ) : leadsData && leadsData.length > 0 ? (
                leadsData.map((lead: Lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      'p-3 rounded-xl border cursor-pointer hover:bg-accent/5 transition-all',
                      selectedLeadId === lead.id ? 'border-accent bg-accent/10' : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {lead.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </div>
                      {selectedLeadId === lead.id && (
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    {lead.status && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {lead.status}
                      </Badge>
                    )}
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No leads found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start typing to search</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedLeadId || linkMutation.isPending}
              className="bg-accent hover:bg-accent-hover"
            >
              {linkMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Link Lead
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
