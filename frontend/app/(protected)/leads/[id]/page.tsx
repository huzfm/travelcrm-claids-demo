'use client';

import { use } from 'react';
import { PageWrapper, LoadingSkeleton, EmptyState } from '@/components/layout/page-wrapper';
import { LeadHeader } from './components/lead-header';
import { WhatsAppPanel } from './components/whatsapp-panel';
import { LeadDetailsTab } from './components/tabs/lead-details-tab';
import { LeadEditForm } from './components/tabs/lead-edit-form';
import { ActivityLogTab } from './components/tabs/activity-log-tab';
import { FollowupsTab } from './components/tabs/followups-tab';
import { TransferDialog } from './components/dialogs/transfer-dialog';
import { DeleteDialog } from './components/dialogs/delete-dialog';
import { CreateItineraryCard } from './components/create-itinerary-card';
import { LeadItinerariesTab } from './components/lead-itineraries-tab';
import { useLeadDetail } from './hooks/use-lead-detail';

export default function LeadDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const id = params.id;

  const {
    lead,
    isLoading,
    activitiesArray,
    followUpsArray,
    usersArray,
    branchesArray,
    transferrableUsers,
    whatsappConversation,
    whatsappLoading,
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
    editFollowUpOutcome,
    setEditFollowUpOutcome,
    editFollowUpFeedback,
    setEditFollowUpFeedback,
    isEditingLead,
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
    isAdmin,
    isManager,
    isStaff,
    isLeadOwner,
    canAssignFollowUps,
    canManageAllFollowUps,
    currentUserId,
    updateLead,
    addActivity,
    createFollowUp,
    sendWhatsappMessage,
    deleteLeadMutation,
    transferLeadMutation,
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
    itinerariesArray,
    itinerariesLoading,
  } = useLeadDetail(id);

  if (isLoading) {
    return (
      <PageWrapper>
        <LoadingSkeleton rows={10} />
      </PageWrapper>
    );
  }

  if (!lead) {
    return (
      <PageWrapper>
        <EmptyState title="Lead not found" />
      </PageWrapper>
    );
  }

  const itineraryCount = itinerariesArray?.length || 0;

  return (
    <PageWrapper>
      <LeadHeader
        lead={lead}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStartEditing={startEditingLead}
        onTransfer={() => setShowTransferDialog(true)}
        onDelete={() => setShowDeleteDialog(true)}
        isEditingLead={isEditingLead}
        isAdmin={isAdmin}
        isManager={isManager}
        isStaff={isStaff}
        isLeadOwner={isLeadOwner}
        whatsappCount={whatsappConversation?.messages?.length ?? 0}
        itineraryCount={itineraryCount}
      />

      {activeTab === 'whatsapp' && (
        <WhatsAppPanel
          lead={lead}
          conversation={whatsappConversation}
          isLoading={whatsappLoading}
          message={whatsappMessage}
          onMessageChange={setWhatsappMessage}
          onSend={handleSendWhatsAppMessage}
          sendMutation={sendWhatsappMessage}
        />
      )}

      {activeTab === 'itineraries' && (
        <LeadItinerariesTab
          itineraries={itinerariesArray}
          leadId={lead.id}
          isLoading={itinerariesLoading}
        />
      )}

      {activeTab === 'details' && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {isEditingLead ? (
              <LeadEditForm
                lead={lead}
                isAdmin={isAdmin}
                isManager={isManager}
                users={usersArray}
                branches={branchesArray}
                editState={{
                  name: editLeadName,
                  phone: editLeadPhone,
                  email: editLeadEmail,
                  source: editLeadSource,
                  status: editLeadStatus,
                  assignedTo: editLeadAssignedTo,
                  notes: editLeadNotes,
                  score: editLeadScore,
                  qualification: editLeadQualification,
                  travelDateFrom: editLeadTravelDateFrom,
                  travelDateTo: editLeadTravelDateTo,
                  destination: editLeadDestination,
                  numberOfPax: editLeadNumberOfPax,
                  budget: editLeadBudget,
                  tripType: editLeadTripType,
                  hotelCategory: editLeadHotelCategory,
                  customHotelCategory: editLeadCustomHotelCategory,
                  pickupPoint: editLeadPickupPoint,
                  childrenCount: editLeadChildrenCount,
                  priority: editLeadPriority,
                  branchId: editLeadBranchId,
                }}
                onChange={{
                  setName: setEditLeadName,
                  setPhone: setEditLeadPhone,
                  setEmail: setEditLeadEmail,
                  setSource: setEditLeadSource,
                  setStatus: setEditLeadStatus,
                  setAssignedTo: setEditLeadAssignedTo,
                  setNotes: setEditLeadNotes,
                  setScore: setEditLeadScore,
                  setQualification: setEditLeadQualification,
                  setTravelDateFrom: setEditLeadTravelDateFrom,
                  setTravelDateTo: setEditLeadTravelDateTo,
                  setDestination: setEditLeadDestination,
                  setNumberOfPax: setEditLeadNumberOfPax,
                  setBudget: setEditLeadBudget,
                  setTripType: setEditLeadTripType,
                  setHotelCategory: setEditLeadHotelCategory,
                  setCustomHotelCategory: setEditLeadCustomHotelCategory,
                  setPickupPoint: setEditLeadPickupPoint,
                  setChildrenCount: setEditLeadChildrenCount,
                  setPriority: setEditLeadPriority,
                  setBranchId: setEditLeadBranchId,
                }}
                onSave={saveLeadDetails}
                onCancel={cancelEditingLead}
                isPending={updateLead.isPending}
              />
            ) : (
              <LeadDetailsTab
                lead={lead}
                isEditing={isEditingLead}
                isAdmin={isAdmin}
                isManager={isManager}
                isStaff={isStaff}
                isLeadOwner={isLeadOwner}
                users={usersArray}
                branches={branchesArray}
                onStatusChange={handleStatusChange}
                onAssign={handleAssign}
                onBranchChange={handleBranchChange}
                onSourceChange={source => updateLead.mutate({ id, data: { source } })}
                onQualificationChange={q => updateLead.mutate({ id, data: { qualification: q } })}
              />
            )}
            <ActivityLogTab
              activities={activitiesArray}
              isAdmin={isAdmin}
              isManager={isManager}
              isLeadOwner={isLeadOwner}
              showForm={showActivityForm}
              activityType={newActivityType}
              activityContent={newActivityContent}
              onTypeChange={setNewActivityType}
              onContentChange={setNewActivityContent}
              onToggleForm={() => setShowActivityForm(!showActivityForm)}
              onAdd={handleAddActivity}
              onCancel={() => {
                setShowActivityForm(false);
                setNewActivityContent('');
              }}
              isAdding={addActivity.isPending}
            />
          </div>
          <div className="space-y-4 sm:space-y-6">
            <FollowupsTab
              followUps={followUpsArray}
              users={usersArray}
              canAssign={canAssignFollowUps}
              canManage={canManageAllFollowUps}
              isStaff={isStaff}
              currentUserId={currentUserId}
              showForm={showFollowUpForm}
              newType={newFollowUpType}
              newDate={newFollowUpDate}
              newNotes={newFollowUpNotes}
              newAssignee={newFollowUpAssignee}
              editingId={editingFollowUp}
              editOutcome={editFollowUpOutcome}
              editFeedback={editFollowUpFeedback}
              onToggleForm={() => setShowFollowUpForm(!showFollowUpForm)}
              onTypeChange={setNewFollowUpType}
              onDateChange={setNewFollowUpDate}
              onNotesChange={setNewFollowUpNotes}
              onAssigneeChange={setNewFollowUpAssignee}
              onCreate={handleCreateFollowUp}
              onMarkDone={handleMarkFollowUpDone}
              onSaveDone={handleSaveFollowUpDone}
              onCancelEdit={cancelFollowUpEdit}
              onOutcomeChange={setEditFollowUpOutcome}
              onFeedbackChange={setEditFollowUpFeedback}
              isCreating={createFollowUp.isPending}
            />
            <CreateItineraryCard leadId={lead.id} />
          </div>
        </div>
      )}

      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        userId={transferToUserId}
        reason={transferReason}
        onUserIdChange={setTransferToUserId}
        onReasonChange={setTransferReason}
        onTransfer={handleTransferLead}
        isPending={transferLeadMutation.isPending}
        branchStaff={transferrableUsers}
        currentAssigneeId={lead.assignedTo}
        currentUserId={currentUserId}
      />

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        lead={lead}
        onDelete={handleDeleteLead}
        isPending={deleteLeadMutation.isPending}
      />
    </PageWrapper>
  );
}
