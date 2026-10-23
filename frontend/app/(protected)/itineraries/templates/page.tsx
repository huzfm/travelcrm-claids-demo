'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper, PageHeader, EmptyState } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useItineraryTemplates,
  useDeleteItineraryTemplate,
  useRemoveTemplateStatus,
  useBulkCreateFromTemplate,
} from '@/hooks/useItineraries';
import { useLeads } from '@/hooks/useLeads';
import api from '@/lib/axios';
import { useAuthContext } from '@/components/providers';
import type { Lead } from '@/types/index';
import {
  FileText,
  MapPin,
  Calendar,
  Users,
  Loader2,
  Globe,
  ExternalLink,
  Copy,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [titlePrefix, setTitlePrefix] = useState('');

  const { data: templatesData, isLoading } = useItineraryTemplates();
  const deleteTemplate = useDeleteItineraryTemplate();
  const removeTemplateStatus = useRemoveTemplateStatus();
  const bulkCreate = useBulkCreateFromTemplate();

  const { data: leadsData } = useLeads({ limit: 100 });

  const openBulkDialog = (template: any) => {
    setSelectedTemplate(template);
    setSelectedLeadIds([]);
    setTitlePrefix('');
    setBulkDialogOpen(true);
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleBulkCreate = async () => {
    if (!selectedTemplate || selectedLeadIds.length === 0) return;
    try {
      const result = await bulkCreate.mutateAsync({
        templateId: selectedTemplate.id,
        leadIds: selectedLeadIds,
        titlePrefix,
      });
      toast.success(
        `Created ${result.totalCreated} itinerary${result.totalCreated !== 1 ? 'ies' : ''} for selected clients`
      );
      setBulkDialogOpen(false);
    } catch {
      toast.error('Failed to create itineraries');
    }
  };
  const legacyTemplates = Array.isArray(templatesData)
    ? templatesData
    : templatesData?.templates || [];
  const templateItineraries = templatesData?.templateItineraries || [];
  const allTemplates = [...templateItineraries, ...legacyTemplates];

  const handleUseTemplate = (templateId: string) => {
    // Navigate to new itinerary page with template pre-filled
    router.push(`/itineraries/new?templateId=${templateId}`);
  };

  const handleViewTemplate = (templateId: string) => {
    // Navigate to itinerary editor with template
    router.push(`/itineraries/${templateId}`);
  };

  const handleDelete = async (template: any) => {
    try {
      if (template.isTemplate || template._type === 'itinerary') {
        await removeTemplateStatus.mutateAsync(template.id);
      } else {
        await deleteTemplate.mutateAsync(template.id);
      }
      toast.success('Template removed');
    } catch {
      toast.error('Failed to remove template');
    }
  };

  const handleCopyTemplate = async (template: any) => {
    try {
      // The list only carries summary fields, so copy the full itinerary.
      const full = template.isTemplate
        ? (await api.get(`/itineraries/${template.id}`)).data.data.itinerary
        : template;
      await navigator.clipboard.writeText(JSON.stringify(full, null, 2));
      toast.success('Template data copied to clipboard');
    } catch {
      toast.error('Could not copy template data');
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader
          title="Templates"
          description="Browse and manage your saved itinerary templates"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 sm:h-64 rounded-xl border bg-card shadow-brand animate-pulse"
            />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Templates"
        description="Browse and manage your saved itinerary templates"
        action={
          <Button onClick={() => router.push('/itineraries/new')}>
            <FileText className="mr-2 h-4 w-4" />
            Create New
          </Button>
        }
      />

      {allTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Templates Yet"
          description="Save an itinerary as a template to quickly create new trips with pre-configured activities."
          action={
            <Button onClick={() => router.push('/itineraries/new')}>
              <FileText className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {allTemplates.map(template => {
            const daysCount = Array.isArray(template.daysJson)
              ? template.daysJson.length
              : template.days?.length || 0;

            return (
              <Card
                key={template.id}
                className="group overflow-hidden hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/30"
              >
                {/* Card Header - Colored gradient */}
                <div className="bg-gradient-to-br from-primary/90 to-primary p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-base sm:text-lg">
                        {template.templateName || template.title || template.name || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs sm:text-sm mt-1">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{template.destination || 'No destination'}</span>
                      </div>
                    </div>
                    {template.isGlobal && (
                      <Badge className="bg-white/20 text-white border-0 shrink-0">
                        <Globe className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Global</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="p-3 sm:p-4">
                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{daysCount} days</span>
                    </div>
                    {template.totalTravelers && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{template.totalTravelers} travelers</span>
                      </div>
                    )}
                  </div>

                  {/* Trip type & dates */}
                  <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                    {template.tripType && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                        {template.tripType}
                      </div>
                    )}
                    {(template.startDate || template.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(template.startDate)}
                        {template.startDate && template.endDate && ' - '}
                        {formatDate(template.endDate)}
                      </p>
                    )}
                    {template.updatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(template.updatedAt)}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2 min-h-[2rem]">
                    {template.notes ||
                      `Use this template to quickly create a ${daysCount}-day ${template.tripType?.toLowerCase() || 'trip'} itinerary.`}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 pt-2 sm:pt-3 border-t flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Use Template</span>
                      <span className="sm:hidden">Use</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewTemplate(template.id)}
                      title="View Details"
                    >
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyTemplate(template)}
                      title="Copy Template"
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {(isAdmin || user?.role === 'MANAGER') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(template)}
                        title="Delete Template"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openBulkDialog(template)}
                      title="Bulk Create for Clients"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Bulk Create for Clients</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1 block">Template</label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedTemplate?.templateName || selectedTemplate?.title || 'Selected Template'}
              </p>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">
                Title Prefix (optional)
              </label>
              <Input
                value={titlePrefix}
                onChange={e => setTitlePrefix(e.target.value)}
                placeholder="e.g., Exclusive "
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">
                Select Clients ({selectedLeadIds.length} selected)
              </label>
              <div className="border rounded-lg max-h-52 sm:max-h-64 overflow-y-auto divide-y">
                {(leadsData?.leads || []).map((lead: Lead) => (
                  <label
                    key={lead.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => toggleLead(lead.id)}
                      className="rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                    </div>
                  </label>
                ))}
                {(!leadsData?.leads || leadsData.leads.length === 0) && (
                  <p className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">
                    No clients available
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={selectedLeadIds.length === 0 || bulkCreate.isPending}
              className="w-full sm:w-auto text-sm"
            >
              {bulkCreate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create {selectedLeadIds.length} Itinerar
                  {selectedLeadIds.length === 1 ? 'y' : 'ies'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
