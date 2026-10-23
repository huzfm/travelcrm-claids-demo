'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/components/providers';
import { useRealtimeWhatsApp } from '@/hooks/useRealtimeWhatsApp';
import { useAdminWhatsAppInbox } from '@/hooks/useWhatsApp';
import { AdminConversationList } from '@/components/whatsapp/admin-conversation-list';
import { AdminChatPanel } from '@/components/whatsapp/admin-chat-panel';
import { AdminUsersList, summarizeUsersByUserId } from './_components/admin-users-list';

export default function AllWhatsAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuthContext();
  useRealtimeWhatsApp();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Hydrate from URL on mount and whenever searchParams changes (back/forward).
  useEffect(() => {
    const u = searchParams.get('userId');
    const c = searchParams.get('contactId');
    const b = searchParams.get('branchId');
    const s = searchParams.get('search');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors URL search params into editable state
    setSelectedUserId(u);
    setSelectedContactId(c);
    if (b) setSelectedBranchId(b);
    if (s !== null) setSearchInput(s);
  }, [searchParams]);

  // Redirect non-admins.
  useEffect(() => {
    if (!isLoading && user && user.role !== 'ADMIN') {
      router.replace('/whatsapp');
    }
  }, [user, isLoading, router]);

  // Push state -> URL (debounced for search, immediate for clicks).
  const urlSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncUrl = useCallback(
    (next: {
      userId?: string | null;
      contactId?: string | null;
      branchId?: string;
      search?: string;
    }) => {
      if (urlSyncTimer.current) clearTimeout(urlSyncTimer.current);
      urlSyncTimer.current = setTimeout(() => {
        const params = new URLSearchParams();
        const u = next.userId !== undefined ? next.userId : selectedUserId;
        const c = next.contactId !== undefined ? next.contactId : selectedContactId;
        const b = next.branchId !== undefined ? next.branchId : selectedBranchId;
        const s = next.search !== undefined ? next.search : searchInput;
        if (u) params.set('userId', u);
        if (c) params.set('contactId', c);
        if (b && b !== 'all') params.set('branchId', b);
        if (s) params.set('search', s);
        const qs = params.toString();
        router.replace(`/admin/all-whatsapp${qs ? `?${qs}` : ''}`, { scroll: false });
      }, 200);
    },
    [router, selectedUserId, selectedContactId, selectedBranchId, searchInput]
  );

  // Drive the user list from the unfiltered inbox (also feeds the conversation
  // list when a user is selected — same hook, different userId param).
  const { data: allInbox, isLoading: allLoading } = useAdminWhatsAppInbox({
    branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
  });

  const users = useMemo(() => summarizeUsersByUserId(allInbox?.conversations ?? []), [allInbox]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedContactId(null);
    syncUrl({ userId, contactId: null });
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    syncUrl({ contactId });
  };

  const handleBackToUsers = () => {
    setSelectedUserId(null);
    setSelectedContactId(null);
    syncUrl({ userId: null, contactId: null });
  };

  const handleBackToConversations = () => {
    setSelectedContactId(null);
    syncUrl({ contactId: null });
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    // Branch change invalidates the user list selection.
    setSelectedUserId(null);
    setSelectedContactId(null);
    syncUrl({ branchId, userId: null, contactId: null });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    syncUrl({ search: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">Loading…</div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#f5f4f3]">
      {/* Sidebar */}
      <div className="w-full sm:w-80 lg:w-105 bg-[#121111] border-r border-[#363432] shrink-0 flex flex-col h-full">
        {selectedUserId ? (
          <AdminConversationList
            key={selectedUserId}
            selectedContactId={selectedContactId}
            onSelectContact={handleSelectContact}
            selectedBranchId={selectedBranchId}
            onBranchChange={handleBranchChange}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            userId={selectedUserId}
            onBack={handleBackToUsers}
          />
        ) : (
          <AdminUsersList
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            selectedBranchId={selectedBranchId}
            onBranchChange={handleBranchChange}
            isLoading={allLoading}
          />
        )}
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#e8e6e4] h-full">
        {selectedContactId ? (
          <AdminChatPanel contactId={selectedContactId} onBack={handleBackToConversations} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#e8e6e4]">
            <div className="text-center p-4 sm:p-8">
              <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-[#db0201]/10 flex items-center justify-center">
                <svg className="w-24 h-24 text-[#db0201]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.834-1.42.075-.704-.356-1.033-.71-1.429z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.036.509 3.95 1.407 5.574L0 24l6.626-1.405C8.034 23.489 9.962 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.63-.544-5.15-1.49l-.37-.21-3.635.768.778-3.68-.24-.39C2.498 15.478 2 13.785 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-[#121111] mb-2">
                {selectedUserId ? 'Pick a conversation' : 'All WhatsApp'}
              </h2>
              <p className="text-sm text-[#78736F] max-w-xs mx-auto">
                {selectedUserId
                  ? 'Select a conversation to view it. Each chat shows its branch and assigned user.'
                  : 'Pick a staff member to view their WhatsApp conversations.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
