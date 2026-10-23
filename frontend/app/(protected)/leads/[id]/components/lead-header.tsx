'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, MessageCircle, ArrowRightLeft, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types';
import type { ActiveTab } from '../hooks/use-lead-detail';

interface LeadHeaderProps {
  lead: Lead;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onStartEditing: () => void;
  onTransfer: () => void;
  onDelete: () => void;
  isEditingLead: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isLeadOwner: boolean;
  whatsappCount: number;
  itineraryCount?: number;
}

export function LeadHeader({
  lead,
  activeTab,
  onTabChange,
  onStartEditing,
  onTransfer,
  onDelete,
  isEditingLead,
  isAdmin,
  isManager,
  isStaff,
  isLeadOwner,
  whatsappCount,
  itineraryCount = 0,
}: LeadHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Back button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground -ml-2 sm:ml-0"
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Leads</span>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{lead.name}</h1>
          <p className="text-sm text-muted-foreground font-mono truncate">{lead.phone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'whatsapp' ? 'default' : 'outline'}
            onClick={() => onTabChange('whatsapp')}
            className="w-full sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
            {whatsappCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5">
                {whatsappCount}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'itineraries' ? 'default' : 'outline'}
            onClick={() => onTabChange('itineraries')}
            className="w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 mr-1" />
            Itineraries
            {itineraryCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5">
                {itineraryCount}
              </Badge>
            )}
          </Button>
          {!isEditingLead && (isAdmin || isManager || isLeadOwner) && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStartEditing}
              className="w-full sm:w-auto"
            >
              <Pencil className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Edit Lead</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          )}
          {isStaff && isLeadOwner && (
            <Button size="sm" variant="secondary" onClick={onTransfer} className="w-full sm:w-auto">
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Transfer Lead</span>
              <span className="sm:hidden">Transfer</span>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
