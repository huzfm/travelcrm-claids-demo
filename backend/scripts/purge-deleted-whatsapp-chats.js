/**
 * Purge WhatsApp chats that were "deleted" before deleting became permanent.
 *
 * Deleting a chat used to only hide it (isActive = false), leaving the chat
 * and all of its messages in the database. Deleting now removes them; this
 * clears out the ones hidden under the old behaviour, the same way
 * deleteChat in whatsapp.controller.js does.
 *
 * Usage:  node scripts/purge-deleted-whatsapp-chats.js [--dry-run]
 *   --dry-run  report what would be deleted without writing
 */

import prisma from '../src/config/prisma.js';
import {
  extractPublicId,
  deleteMultipleFromCloudinary,
} from '../src/services/cloudinary.service.js';

const dryRun = process.argv.includes('--dry-run');

const hidden = await prisma.whatsAppContact.findMany({
  where: { isActive: false },
  select: { id: true, userId: true, remoteJid: true },
});

let totalMessages = 0;
const mediaPublicIds = [];

for (const contact of hidden) {
  const messageFilter = {
    OR: [
      { contactId: contact.id },
      { contactId: null, userId: contact.userId, remoteJid: contact.remoteJid },
    ],
  };

  const messages = await prisma.whatsAppMessage.findMany({
    where: messageFilter,
    select: { mediaUrl: true },
  });
  totalMessages += messages.length;
  mediaPublicIds.push(
    ...messages
      .map(m => extractPublicId(m.mediaUrl))
      .filter(id => id?.startsWith('travel-crm/whatsapp/'))
  );

  if (!dryRun) {
    await prisma.$transaction([
      prisma.whatsAppMessage.deleteMany({ where: messageFilter }),
      prisma.whatsAppContact.delete({ where: { id: contact.id } }),
    ]);
  }
}

console.log(
  `${dryRun ? '[dry run] Would delete' : 'Deleted'} ${hidden.length} hidden chat(s), ` +
    `${totalMessages} message(s), ${mediaPublicIds.length} media file(s).`
);

if (!dryRun && mediaPublicIds.length) {
  try {
    await deleteMultipleFromCloudinary(mediaPublicIds);
  } catch (error) {
    console.error('Some media could not be removed from Cloudinary:', error.message);
  }
}

await prisma.$disconnect();
