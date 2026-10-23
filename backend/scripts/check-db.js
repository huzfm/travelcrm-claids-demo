import prisma from '../src/config/prisma.js';

const messages = await prisma.whatsAppMessage.findMany({ take: 10, orderBy: { sentAt: 'desc' } });
const contacts = await prisma.whatsAppContact.findMany({
  include: { _count: { select: { messages: true } } },
});

console.log('=== Messages ===');
console.log('Total:', messages.length);
messages.forEach(m =>
  console.log(`  ${m.direction}: ${m.textContent?.substring(0, 50)} | ${m.sentAt}`)
);

console.log('\n=== Contacts ===');
console.log('Total:', contacts.length);
contacts.forEach(c =>
  console.log(`  ${c.contactName} (${c.contactNumber}): ${c._count.messages} messages`)
);

await prisma.$disconnect();
