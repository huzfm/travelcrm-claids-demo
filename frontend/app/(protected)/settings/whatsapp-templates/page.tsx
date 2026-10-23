'use client';

import { useState } from 'react';
import {
  PageWrapper,
  PageHeader,
  LoadingSkeleton,
  EmptyState,
} from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useWhatsAppTemplates,
  useCreateWhatsAppTemplate,
  useUpdateWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
} from '@/hooks/useWhatsAppTemplates';
import { useAuthContext } from '@/components/providers';
import { Plus, Pencil, Trash2, MessageSquare, Copy, Hash, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  greeting: 'Greeting',
  followup: 'Follow-up',
  quote: 'Quote',
  confirmation: 'Confirmation',
  itinerary: 'Itinerary',
  general: 'General',
};

const categoryColors: Record<string, string> = {
  greeting: 'bg-primary/10 text-primary border border-primary/20',
  followup: 'bg-warning/10 text-warning border border-warning/20',
  quote: 'bg-success/10 text-success border border-success/20',
  confirmation: 'bg-accent/10 text-accent border border-accent/20',
  itinerary: 'bg-gold/10 text-gold-dark border border-gold/20',
  general: 'bg-muted text-muted-foreground border border-border',
};

export default function WhatsAppTemplatesPage() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const { data: templates, isLoading } = useWhatsAppTemplates();
  const createTemplate = useCreateWhatsAppTemplate();
  const updateTemplate = useUpdateWhatsAppTemplate();
  const deleteTemplate = useDeleteWhatsAppTemplate();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const templatesArray = Array.isArray(templates) ? templates : [];
  const filteredTemplates =
    selectedCategory === 'all'
      ? templatesArray
      : templatesArray.filter(t => t.category === selectedCategory);

  const categories = [...new Set(templatesArray.map(t => t.category))];

  const resetCreateForm = () => {
    setNewName('');
    setNewContent('');
    setNewCategory('general');
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) {
      toast.error('Name and content are required');
      return;
    }
    try {
      await createTemplate.mutateAsync({
        name: newName.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      toast.success('Template created');
      setShowCreateDialog(false);
      resetCreateForm();
    } catch {
      toast.error('Failed to create template');
    }
  };

  interface WhatsAppTemplate {
    id: string;
    name: string;
    content: string;
    category: string;
    isActive: boolean;
    usageCount: number;
    variables?: string[];
  }
  const startEdit = (template: WhatsAppTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditContent(template.content);
    setEditCategory(template.category);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateTemplate.mutateAsync({
        id: editingId,
        data: {
          name: editName.trim(),
          content: editContent.trim(),
          category: editCategory,
        },
      });
      toast.success('Template updated');
      setEditingId(null);
    } catch {
      toast.error('Failed to update template');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Template deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateTemplate.mutateAsync({
        id,
        data: { isActive: !currentActive },
      });
      toast.success(`Template ${currentActive ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update template');
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const formatPreview = (content: string) => {
    return content.replace(
      /\{\{(\w+)\}\}/g,
      '<span class="bg-accent/20 text-accent px-1 rounded font-medium">$1</span>'
    );
  };

  if (isLoading)
    return (
      <PageWrapper>
        <LoadingSkeleton rows={10} />
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <PageHeader
        title="Message Templates"
        description="Manage message templates for WhatsApp communication"
        action={
          (isAdmin || isManager) && (
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Templates</p>
            <p className="text-2xl font-bold">{templatesArray.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-foreground">
              {templatesArray.filter(t => t.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Uses</p>
            <p className="text-2xl font-bold">
              {templatesArray.reduce((sum, t) => sum + t.usageCount, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4 sm:mb-6">
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All
          </TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
              {categoryLabels[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No templates found"
              description="Create your first WhatsApp message template"
              icon={MessageSquare}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    <CardTitle className="text-sm sm:text-base truncate">{template.name}</CardTitle>
                  </div>
                  <Badge
                    className={cn(
                      'text-[10px] shrink-0',
                      categoryColors[template.category] || categoryColors.general
                    )}
                  >
                    {categoryLabels[template.category] || template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div
                  className="p-2 sm:p-3 bg-muted/50 rounded-lg text-xs sm:text-sm min-h-16 sm:min-h-20 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
                >
                  {previewId === template.id ? (
                    <div dangerouslySetInnerHTML={{ __html: formatPreview(template.content) }} />
                  ) : (
                    <p className="line-clamp-2 sm:line-clamp-3">{template.content}</p>
                  )}
                </div>

                {previewId === template.id &&
                  template.variables &&
                  template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map(v => (
                        <Badge key={v} variant="outline" className="text-[10px]">
                          <Hash className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                          {v}
                        </Badge>
                      ))}
                    </div>
                  )}

                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="h-2 w-2 sm:h-3 sm:w-3" /> {template.usageCount} uses
                  </span>
                  <div className="flex items-center gap-1">
                    {isAdmin || isManager ? (
                      <>
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={() => toggleActive(template.id, template.isActive)}
                          className="scale-75 sm:scale-100"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(template)}
                          className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        >
                          <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(template.id)}
                          className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(template.content)}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Template Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greeting">Greeting</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                  <SelectItem value="itinerary">Itinerary</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Message Content
                <span className="text-muted-foreground font-normal ml-2">
                  Use {'{{variable}}'} for dynamic content
                </span>
              </label>
              <Textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Hello {{name}}, welcome to our travel agency..."
                className="min-h-36"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available variables: {'{{name}}'}, {'{{agent_name}}'}, {'{{destination}}'},{' '}
                {'{{date}}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Template Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greeting">Greeting</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="confirmation">Confirmation</SelectItem>
                  <SelectItem value="itinerary">Itinerary</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message Content</label>
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="min-h-36"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
