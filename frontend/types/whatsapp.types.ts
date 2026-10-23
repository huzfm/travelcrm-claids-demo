// WhatsApp types
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'TEMPLATE'
  | 'VIDEO'
  | 'STICKER';

export interface WhatsAppMessage {
  id: string;
  branchId?: string;
  leadId?: string | null;
  userId?: string | null;
  remoteJid?: string;
  contactName?: string | null;
  contactNumber?: string;
  direction: MessageDirection;
  messageType: MessageType;
  content?: string | null;
  textContent?: string | null;
  mediaPath?: string | null;
  mediaUrl?: string | null;
  waMessageId?: string | null;
  sentAt?: string;
  timestamp?: string | null;
  status?: string;
  fileName?: string | null;
  caption?: string | null;
  quotedMessageId?: string | null;
  isForwarded?: boolean;
  user?: { id: string; name: string };
  mediaMimeType?: string | null;
}

export interface WhatsAppConversation {
  contactId: string;
  leadId?: string | null;
  leadName?: string;
  leadPhone?: string;
  contactName?: string | null;
  contactNumber: string;
  branchId?: string;
  branchName?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  profilePicUrl?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  lead?: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  contact?: {
    contactName: string;
    contactNumber: string;
    lead?: {
      id: string;
      name: string;
      phone: string;
      status: string;
    };
  };
  branch?: {
    name: string;
  };
}

export interface WhatsAppInbox {
  conversations: WhatsAppConversation[];
  totalUnread: number;
}

export interface WhatsAppConversationDetail {
  contact?: {
    contactName: string;
    contactNumber: string;
    lead?: {
      id: string;
      name: string;
      phone: string;
      status: string;
    };
  };
  lead?: {
    name: string;
    phone: string;
  };
  branch?: {
    name: string;
  };
  messages: WhatsAppMessage[];
}
