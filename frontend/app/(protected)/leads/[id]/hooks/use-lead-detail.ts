'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useLead,
  useLeadActivities,
  useLeadFollowUps,
  useUpdateLead,
  useAddActivity,
  useTransferLead,
  useBranchStaff,
  useDeleteLead,
} from '@/hooks/useLeads';
import { useCreateFollowUp, useUpdateFollowUp } from '@/hooks/useFollowUps';
import { useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuthContext } from '@/components/providers';
import { useWhatsAppConversationByLead, useSendWhatsAppMessage } from '@/hooks/useWhatsApp';
import { useLeadItineraries } from '@/hooks/useItineraries';
import type {
  ActivityType,
  Lead,
  LeadStatus,
  LeadSource,
  LeadQualification,
  FollowUpOutcome,
  FollowUpType,
} from '@/types';

export type ActiveTab = 'details' | 'whatsapp' | 'itineraries';

export interface TransferData {
  leadId: string;
  newAssigneeId: string;
  reason: string;
}

export function useLeadDetail(leadId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  // Data hooks
  const { data: lead, isLoading } = useLead(leadId) as {
    data: Lead | undefined;
    isLoading: boolean;
  };
  const { data: activities } = useLeadActivities(leadId);
  const { data: followUps } = useLeadFollowUps(leadId);
  const { data: allUsers } = useUsers();
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');

  const { data: branchStaff } = useBranchStaff(lead?.branchId);
  const { data: branches } = useBranches();
  const { data: whatsappConversation, isLoading: whatsappLoading } = useWhatsAppConversationByLead(
    leadId,
    activeTab === 'whatsapp'
  );

  // Fetch itineraries for this lead using the dedicated endpoint
  const { data: leadItineraries, isLoading: itinerariesLoading } = useLeadItineraries(leadId);
  const itinerariesArray = Array.isArray(leadItineraries) ? leadItineraries : [];

  // Mutation hooks
  const updateLead = useUpdateLead();
  const addActivity = useAddActivity();
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const transferLeadMutation = useTransferLead();
  const deleteLeadMutation = useDeleteLead();
  const sendWhatsappMessage = useSendWhatsAppMessage();

  // Normalized arrays
  const activitiesArray = Array.isArray(activities) ? activities : [];
  const followUpsArray = Array.isArray(followUps) ? followUps : [];
  // Deactivated users are hidden from all CRM dropdowns (lead-assign,
  // follow-up assign, edit, transfer) until reactivated.
  const usersArray = Array.isArray(allUsers)
    ? allUsers.filter((u: { isActive?: boolean }) => u.isActive !== false)
    : [];
  const branchStaffArray = Array.isArray(branchStaff) ? branchStaff : [];

  // Activity form state
  const [newActivityType, setNewActivityType] = useState<ActivityType>('NOTE');
  const [newActivityContent, setNewActivityContent] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Follow-up form state
  const [newFollowUpType, setNewFollowUpType] = useState('CALL');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpNotes, setNewFollowUpNotes] = useState('');
  const [newFollowUpAssignee, setNewFollowUpAssignee] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<string | null>(null);
  const [editFollowUpOutcome, setEditFollowUpOutcome] = useState<string>('');
  const [editFollowUpFeedback, setEditFollowUpFeedback] = useState('');

  // Lead edit state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadName, setEditLeadName] = useState('');
  const [editLeadPhone, setEditLeadPhone] = useState('');
  const [editLeadEmail, setEditLeadEmail] = useState('');
  const [editLeadSource, setEditLeadSource] = useState<string>('');
  const [editLeadStatus, setEditLeadStatus] = useState<string>('');
  const [editLeadAssignedTo, setEditLeadAssignedTo] = useState<string>('');
  const [editLeadNotes, setEditLeadNotes] = useState('');
  const [editLeadScore, setEditLeadScore] = useState<string>('0');
  const [editLeadQualification, setEditLeadQualification] = useState<string>('');
  const [editLeadTravelDateFrom, setEditLeadTravelDateFrom] = useState<string>('');
  const [editLeadTravelDateTo, setEditLeadTravelDateTo] = useState<string>('');
  const [editLeadDestination, setEditLeadDestination] = useState<string>('');
  const [editLeadNumberOfPax, setEditLeadNumberOfPax] = useState<string>('1');
  const [editLeadBudget, setEditLeadBudget] = useState<string>('');
  const [editLeadTripType, setEditLeadTripType] = useState<string>('');
  const [editLeadHotelCategory, setEditLeadHotelCategory] = useState<string>('');
  const [editLeadCustomHotelCategory, setEditLeadCustomHotelCategory] = useState<string>('');
  const [editLeadPickupPoint, setEditLeadPickupPoint] = useState<string>('');
  const [editLeadChildrenCount, setEditLeadChildrenCount] = useState<string>('0');
  const [editLeadPriority, setEditLeadPriority] = useState<string>('');
  const [editLeadBranchId, setEditLeadBranchId] = useState<string>('');

  // WhatsApp state
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Dialog state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Permission helpers
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';
  // Matches the backend's ownership rule for Staff (see updateLead): assigned
  // to them, or added by them — a lead they created can get auto-assigned to
  // someone else by the assignment rules, but they can still work it.
  const isLeadOwner = lead?.assignedTo === user?.id || lead?.createdBy === user?.id;
  const canAssignFollowUps = isAdmin || isManager;
  const canManageAllFollowUps = isAdmin || isManager || isLeadOwner;

  // Transferrable users — deactivated users are hidden from the CRM
  // until they are reactivated.
  const transferrableUsers = lead
    ? branchStaffArray.filter(
        u =>
          u.id !== user?.id &&
          u.id !== lead.assignedTo &&
          u.isActive !== false &&
          u.role !== 'ADMIN'
      )
    : [];

  // Lead actions
  const handleStatusChange = useCallback(
    async (status: LeadStatus) => {
      try {
        await updateLead.mutateAsync({ id: leadId, data: { status } });
        toast.success('Status updated');
      } catch {
        toast.error('Failed to update status');
      }
    },
    [leadId, updateLead]
  );

  const startEditingLead = useCallback(() => {
    setEditLeadName(lead?.name || '');
    setEditLeadPhone(lead?.phone || '');
    setEditLeadEmail(lead?.email || '');
    setEditLeadSource(lead?.source || '');
    setEditLeadStatus(lead?.status || '');
    setEditLeadAssignedTo(lead?.assignedTo || '');
    setEditLeadNotes(lead?.notes || '');
    setEditLeadScore(String(lead?.score || 0));
    setEditLeadQualification(lead?.qualification || '');
    setEditLeadTravelDateFrom(
      lead?.travelDateFrom ? new Date(lead.travelDateFrom).toISOString().split('T')[0] : ''
    );
    setEditLeadTravelDateTo(
      lead?.travelDateTo ? new Date(lead.travelDateTo).toISOString().split('T')[0] : ''
    );
    setEditLeadDestination(lead?.destination || '');
    setEditLeadNumberOfPax(String(lead?.numberOfPax || '1'));
    setEditLeadBudget(lead?.budget != null ? String(lead.budget) : '');
    setEditLeadTripType(lead?.tripType || '');
    setEditLeadHotelCategory(lead?.hotelCategory || '');
    setEditLeadCustomHotelCategory(lead?.hotelCategory || '');
    setEditLeadPickupPoint(lead?.pickupPoint || '');
    setEditLeadChildrenCount(String(lead?.childrenCount || 0));
    setEditLeadPriority(lead?.priority || '');
    setEditLeadBranchId(lead?.branchId || '');
    setIsEditingLead(true);
  }, [lead]);

  const cancelEditingLead = useCallback(() => setIsEditingLead(false), []);

  const saveLeadDetails = useCallback(async () => {
    if (!editLeadName.trim() || !editLeadPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    const hotelCategoryValue =
      editLeadHotelCategory === 'CUSTOM' ? editLeadCustomHotelCategory : editLeadHotelCategory;
    try {
      await updateLead.mutateAsync({
        id: leadId,
        data: {
          name: editLeadName.trim(),
          phone: editLeadPhone.trim(),
          email: editLeadEmail.trim() || null,
          // Source and assignment stay Admin/Manager-only — Staff never see these
          // fields in the form, but the state still carries the lead's existing
          // values, so they must be left out of the payload entirely rather than
          // sent unchanged (the server rejects the whole request from Staff if
          // any field outside their allowed set is present at all).
          source:
            isAdmin || isManager
              ? ((editLeadSource || undefined) as LeadSource | undefined)
              : undefined,
          status: (editLeadStatus || undefined) as LeadStatus | undefined,
          assignedTo: isAdmin || isManager ? editLeadAssignedTo || null : undefined,
          notes: editLeadNotes || null,
          score: parseInt(editLeadScore) || 0,
          qualification: (editLeadQualification || undefined) as LeadQualification | undefined,
          travelDateFrom: editLeadTravelDateFrom || null,
          travelDateTo: editLeadTravelDateTo || null,
          destination: editLeadDestination || null,
          numberOfPax: editLeadNumberOfPax || '1',
          budget: editLeadBudget ? parseFloat(editLeadBudget) : null,
          tripType: editLeadTripType || null,
          hotelCategory: hotelCategoryValue || null,
          pickupPoint: editLeadPickupPoint || null,
          childrenCount: parseInt(editLeadChildrenCount) || 0,
          priority: editLeadPriority || null,
          branchId: isAdmin ? editLeadBranchId || null : undefined,
        },
      });
      toast.success('Lead updated successfully');
      setIsEditingLead(false);
    } catch {
      toast.error('Failed to update lead');
    }
  }, [
    leadId,
    editLeadName,
    editLeadPhone,
    editLeadEmail,
    editLeadSource,
    editLeadStatus,
    editLeadAssignedTo,
    editLeadNotes,
    editLeadScore,
    editLeadQualification,
    editLeadTravelDateFrom,
    editLeadTravelDateTo,
    editLeadDestination,
    editLeadNumberOfPax,
    editLeadBudget,
    editLeadTripType,
    editLeadHotelCategory,
    editLeadCustomHotelCategory,
    editLeadPickupPoint,
    editLeadChildrenCount,
    editLeadPriority,
    editLeadBranchId,
    isAdmin,
    isManager,
    updateLead,
  ]);

  const handleAssign = useCallback(
    async (userId: string) => {
      try {
        await updateLead.mutateAsync({ id: leadId, data: { assignedTo: userId } });
        await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        toast.success('Lead assigned');
      } catch {
        toast.error('Failed to assign');
      }
    },
    [leadId, updateLead, queryClient]
  );

  const handleBranchChange = useCallback(
    async (branchId: string) => {
      try {
        await updateLead.mutateAsync({ id: leadId, data: { branchId } });
        await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        toast.success('Lead transferred to different branch');
      } catch {
        toast.error('Failed to transfer lead');
      }
    },
    [leadId, updateLead, queryClient]
  );

  // Activity actions
  const handleAddActivity = useCallback(async () => {
    if (!newActivityContent.trim()) return;
    try {
      await addActivity.mutateAsync({
        leadId,
        data: { type: newActivityType, description: newActivityContent },
      });
      toast.success('Activity added');
      setNewActivityContent('');
      setShowActivityForm(false);
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
    } catch {
      toast.error('Failed to add activity');
    }
  }, [leadId, newActivityType, newActivityContent, addActivity, queryClient]);

  // Follow-up actions
  const handleCreateFollowUp = useCallback(async () => {
    if (!newFollowUpDate) return;
    const assignee = newFollowUpAssignee || user?.id;
    if (!assignee) {
      toast.error('Please select an assignee');
      return;
    }
    try {
      const scheduledAt = new Date(newFollowUpDate).toISOString();
      await createFollowUp.mutateAsync({
        leadId,
        type: newFollowUpType as FollowUpType,
        scheduledAt,
        notes: newFollowUpNotes,
        status: 'PENDING',
        assignedTo: assignee,
      });
      toast.success('Follow-up scheduled');
      setNewFollowUpDate('');
      setNewFollowUpNotes('');
      setNewFollowUpAssignee('');
      setShowFollowUpForm(false);
      queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    } catch {
      toast.error('Failed to create follow-up');
    }
  }, [
    leadId,
    newFollowUpType,
    newFollowUpDate,
    newFollowUpNotes,
    newFollowUpAssignee,
    user,
    createFollowUp,
    queryClient,
  ]);

  const handleMarkFollowUpDone = useCallback((followUpId: string) => {
    setEditingFollowUp(followUpId);
  }, []);

  const handleSaveFollowUpDone = useCallback(
    async (followUpId: string) => {
      try {
        await updateFollowUp.mutateAsync({
          id: followUpId,
          data: {
            status: 'DONE',
            outcome: (editFollowUpOutcome as FollowUpOutcome) || undefined,
            feedback: editFollowUpFeedback || undefined,
          },
        });
        toast.success('Follow-up marked as done');
        setEditingFollowUp(null);
        setEditFollowUpOutcome('');
        setEditFollowUpFeedback('');
        queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] });
        queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
        queryClient.invalidateQueries({ queryKey: ['followups'] });
      } catch {
        toast.error('Failed to update follow-up');
      }
    },
    [leadId, editFollowUpOutcome, editFollowUpFeedback, updateFollowUp, queryClient]
  );

  const cancelFollowUpEdit = useCallback(() => {
    setEditingFollowUp(null);
    setEditFollowUpOutcome('');
    setEditFollowUpFeedback('');
  }, []);

  // WhatsApp actions
  const handleSendWhatsAppMessage = useCallback(async () => {
    if (!whatsappMessage.trim()) return;
    try {
      await sendWhatsappMessage.mutateAsync({ leadId, message: whatsappMessage });
      toast.success('Message sent via WhatsApp');
      setWhatsappMessage('');
    } catch {
      toast.error('Failed to send WhatsApp message');
    }
  }, [leadId, whatsappMessage, sendWhatsappMessage]);

  // Transfer action
  const handleTransferLead = useCallback(async () => {
    if (!transferToUserId) {
      toast.error('Please select a user to transfer to');
      return;
    }
    try {
      await transferLeadMutation.mutateAsync({
        leadId,
        newAssigneeId: transferToUserId,
        reason: transferReason,
      });
      toast.success('Lead transferred successfully');
      setShowTransferDialog(false);
      setTransferToUserId('');
      setTransferReason('');
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    } catch {
      toast.error('Failed to transfer lead');
    }
  }, [leadId, transferToUserId, transferReason, transferLeadMutation, queryClient]);

  // Delete action
  const handleDeleteLead = useCallback(async () => {
    try {
      await deleteLeadMutation.mutateAsync(leadId);
      toast.success('Lead deleted successfully');
      router.push('/leads');
    } catch {
      toast.error('Failed to delete lead');
    }
  }, [leadId, deleteLeadMutation, router]);

  return {
    // Data
    lead,
    isLoading,
    currentUserId: user?.id,
    activitiesArray,
    followUpsArray,
    usersArray,
    branchesArray: Array.isArray(branches) ? branches : [],
    transferrableUsers,
    whatsappConversation,
    whatsappLoading,
    itinerariesArray,
    itinerariesLoading,
    // State
    activeTab,
    setActiveTab,
    newActivityType,
    setNewActivityType,
    newActivityContent,
    setNewActivityContent,
    showActivityForm,
    setShowActivityForm,
    newFollowUpType,
    setNewFollowUpType,
    newFollowUpDate,
    setNewFollowUpDate,
    newFollowUpNotes,
    setNewFollowUpNotes,
    newFollowUpAssignee,
    setNewFollowUpAssignee,
    showFollowUpForm,
    setShowFollowUpForm,
    editingFollowUp,
    setEditingFollowUp,
    editFollowUpOutcome,
    setEditFollowUpOutcome,
    editFollowUpFeedback,
    setEditFollowUpFeedback,
    isEditingLead,
    setIsEditingLead,
    editLeadName,
    setEditLeadName,
    editLeadPhone,
    setEditLeadPhone,
    editLeadEmail,
    setEditLeadEmail,
    editLeadSource,
    setEditLeadSource,
    editLeadStatus,
    setEditLeadStatus,
    editLeadAssignedTo,
    setEditLeadAssignedTo,
    editLeadNotes,
    setEditLeadNotes,
    editLeadScore,
    setEditLeadScore,
    editLeadQualification,
    setEditLeadQualification,
    editLeadTravelDateFrom,
    setEditLeadTravelDateFrom,
    editLeadTravelDateTo,
    setEditLeadTravelDateTo,
    editLeadDestination,
    setEditLeadDestination,
    editLeadNumberOfPax,
    setEditLeadNumberOfPax,
    editLeadBudget,
    setEditLeadBudget,
    editLeadTripType,
    setEditLeadTripType,
    editLeadHotelCategory,
    setEditLeadHotelCategory,
    editLeadCustomHotelCategory,
    setEditLeadCustomHotelCategory,
    editLeadPickupPoint,
    setEditLeadPickupPoint,
    editLeadChildrenCount,
    setEditLeadChildrenCount,
    editLeadPriority,
    setEditLeadPriority,
    editLeadBranchId,
    setEditLeadBranchId,
    whatsappMessage,
    setWhatsappMessage,
    showTransferDialog,
    setShowTransferDialog,
    transferToUserId,
    setTransferToUserId,
    transferReason,
    setTransferReason,
    showDeleteDialog,
    setShowDeleteDialog,
    // Permissions
    isAdmin,
    isManager,
    isStaff,
    isLeadOwner,
    canAssignFollowUps,
    canManageAllFollowUps,
    // Mutations
    updateLead,
    addActivity,
    createFollowUp,
    updateFollowUp,
    sendWhatsappMessage,
    deleteLeadMutation,
    transferLeadMutation,
    // Actions
    handleStatusChange,
    startEditingLead,
    cancelEditingLead,
    saveLeadDetails,
    handleAssign,
    handleBranchChange,
    handleAddActivity,
    handleCreateFollowUp,
    handleMarkFollowUpDone,
    handleSaveFollowUpDone,
    cancelFollowUpEdit,
    handleSendWhatsAppMessage,
    handleTransferLead,
    handleDeleteLead,
  };
}
