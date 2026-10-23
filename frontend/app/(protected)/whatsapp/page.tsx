'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppInbox } from '@/hooks/useWhatsApp';
import { useRealtimeWhatsApp } from '@/hooks/useRealtimeWhatsApp';
import { MyWhatsAppModal, ConversationList, ChatPanel } from '@/components/whatsapp';
import { LinkLeadModal } from '@/components/whatsapp/modals/link-lead-modal';
import { CreateLeadModal } from '@/components/whatsapp/modals/create-lead-modal';
import { NewChatModal } from '@/components/whatsapp/modals/new-chat-modal';
import { cn } from '@/lib/utils';

export default function WhatsAppPage() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [myWhatsAppModalOpen, setMyWhatsAppModalOpen] = useState(false);
  const [linkLeadModalOpen, setLinkLeadModalOpen] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    contactId?: string;
    contactNumber?: string;
    contactName?: string | null;
  }>({});
  const queryClient = useQueryClient();
  useRealtimeWhatsApp();

  const effectiveBranchId = selectedBranchId === 'all' ? undefined : selectedBranchId;
  const { data: inbox, refetch: refetchInbox } = useWhatsAppInbox(effectiveBranchId);

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    const conv = inbox?.conversations?.find(c => c.contactId === contactId);
    setContactInfo({
      contactId,
      contactNumber: conv?.contactNumber,
      contactName: conv?.leadName || conv?.contactName,
    });
  };

  const handleBack = () => {
    setSelectedContactId(null);
    setContactInfo({});
  };

  const handleRefetchConversation = () => {
    if (selectedContactId) {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', selectedContactId] });
    }
  };

  const handleRefetchInbox = () => {
    refetchInbox();
  };

  return (
    <>
      <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-[#d6d3d1] bg-[#f5f4f3] shadow-sm">
        {/* Sidebar - Conversation List (on phones it gives way to the open chat) */}
        <div
          className={cn(
            'w-full sm:w-80 lg:w-96 bg-[#121111] border-r border-[#2a2826] shrink-0 flex-col h-full min-h-0',
            selectedContactId ? 'hidden sm:flex' : 'flex'
          )}
        >
          <ConversationList
            selectedContactId={selectedContactId}
            onSelectContact={handleSelectContact}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            onOpenConnectionModal={() => setMyWhatsAppModalOpen(true)}
            onNewChat={() => setNewChatModalOpen(true)}
          />
        </div>

        {/* Chat Panel */}
        <div
          className={cn(
            'flex-1 flex-col min-w-0 min-h-0 bg-[#e8e6e4] h-full',
            selectedContactId ? 'flex' : 'hidden sm:flex'
          )}
        >
          {selectedContactId ? (
            <ChatPanel
              contactId={selectedContactId}
              onBack={handleBack}
              onRefetchConversation={handleRefetchConversation}
              onRefetchInbox={handleRefetchInbox}
              onOpenLinkLeadModal={() => setLinkLeadModalOpen(true)}
              onOpenCreateLeadModal={() => setCreateLeadModalOpen(true)}
              hasLinkedLead={
                !!inbox?.conversations?.find(c => c.contactId === selectedContactId)?.lead
              }
              onOpenMyWhatsApp={() => setMyWhatsAppModalOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#e8e6e4]">
              <div className="text-center p-4 sm:p-8">
                <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-[#db0201]/10 flex items-center justify-center">
                  <svg className="w-24 h-24 text-[#db0201]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.834-1.42.075-.704-.356-1.033-.71-1.429z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.036.509 3.95 1.407 5.574L0 24l6.626-1.405C8.034 23.489 9.962 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.63-.544-5.15-1.49l-.37-.21-3.635.768.778-3.68-.24-.39C2.498 15.478 2 13.785 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-[#121111] mb-2">WhatsApp Web</h2>
                <p className="text-sm text-[#78736F] max-w-xs mx-auto">
                  Select a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <MyWhatsAppModal open={myWhatsAppModalOpen} onOpenChange={setMyWhatsAppModalOpen} />

      <LinkLeadModal
        open={linkLeadModalOpen}
        onOpenChange={setLinkLeadModalOpen}
        contactId={contactInfo.contactId}
        onLinked={() => {
          setLinkLeadModalOpen(false);
          handleRefetchConversation();
          handleRefetchInbox();
        }}
      />

      <CreateLeadModal
        open={createLeadModalOpen}
        onOpenChange={setCreateLeadModalOpen}
        contactId={contactInfo.contactId}
        contactNumber={contactInfo.contactNumber}
        contactName={contactInfo.contactName}
        onCreated={() => {
          setCreateLeadModalOpen(false);
          handleRefetchConversation();
          handleRefetchInbox();
        }}
      />

      <NewChatModal
        open={newChatModalOpen}
        onOpenChange={setNewChatModalOpen}
        onChatCreated={contactId => {
          setNewChatModalOpen(false);
          handleSelectContact(contactId);
        }}
      />
    </>
  );
}
