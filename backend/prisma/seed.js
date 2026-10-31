import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';
import { defaultPermissionsForRole } from '../src/config/permissions.js';

const prisma = new PrismaClient();
const DOMAIN = 'tripoday.com';

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ✅ Skip if already seeded
  const existingAdmin = await prisma.user.findFirst({
    where: { email: `admin@${DOMAIN}` },
  });

  if (existingAdmin) {
    console.log('⚠️ Seed already exists. Skipping...');
    return;
  }

  // 🌍 Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: {
      id: 'branch-main',
      name: 'Main Office',
      country: 'India',
      timezone: 'Asia/Kolkata',
      isActive: true,
      isMain: true,
      currency: 'INR',
      email: `admin@${DOMAIN}`,
      phone: '+91 7006087880',
      address: 'Srinagar, Jammu & Kashmir, India',
      companyName: 'Claids Travel',
      contactPerson: 'Branch Manager',
      workingHours: [],
    },
  });

  // 👤 Users
  const admin = await prisma.user.upsert({
    where: { email: `admin@${DOMAIN}` },
    update: {},
    create: {
      id: 'user-admin',
      branchId: branch.id,
      name: 'Admin',
      email: `admin@${DOMAIN}`,
      phone: '+91 7000000001',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      permissions: defaultPermissionsForRole('ADMIN'),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: `manager@${DOMAIN}` },
    update: {},
    create: {
      id: 'user-manager',
      branchId: branch.id,
      name: 'Manager',
      email: `manager@${DOMAIN}`,
      phone: '+91 7000000002',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: 'MANAGER',
      permissions: defaultPermissionsForRole('MANAGER'),
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: `staff@${DOMAIN}` },
    update: {},
    create: {
      id: 'user-staff',
      branchId: branch.id,
      name: 'Staff',
      email: `staff@${DOMAIN}`,
      phone: '+91 7000000003',
      passwordHash: await bcrypt.hash('staff123', 10),
      role: 'STAFF',
      permissions: defaultPermissionsForRole('STAFF'),
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: `neha.staff@${DOMAIN}` },
    update: {},
    create: {
      id: 'user-staff-2',
      branchId: branch.id,
      name: 'Neha Kapoor',
      email: `neha.staff@${DOMAIN}`,
      phone: '+91 7000000004',
      passwordHash: await bcrypt.hash('staff123', 10),
      role: 'STAFF',
      permissions: defaultPermissionsForRole('STAFF'),
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { email: `rohit.staff@${DOMAIN}` },
    update: {},
    create: {
      id: 'user-staff-3',
      branchId: branch.id,
      name: 'Rohit Sharma',
      email: `rohit.staff@${DOMAIN}`,
      phone: '+91 7000000005',
      passwordHash: await bcrypt.hash('staff123', 10),
      role: 'STAFF',
      permissions: defaultPermissionsForRole('STAFF'),
    },
  });

  console.log('✓ Users created');

  // 📊 Leads (10)
  await prisma.lead.upsert({
    where: { id: 'lead-1' },
    update: {},
    create: {
      id: 'lead-1',
      branchId: branch.id,
      name: 'Aamir Khan',
      phone: '+919876543210',
      email: 'aamir@gmail.com',
      source: 'WEBSITE',
      status: 'HOT',
      destination: 'Kashmir',
      numberOfPax: '2 adults',
      budget: 40000,
      assignedTo: staff.id,
      createdBy: staff.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-2' },
    update: {},
    create: {
      id: 'lead-2',
      branchId: branch.id,
      name: 'Sara Ali',
      phone: '+919812345678',
      email: 'sara@gmail.com',
      source: 'WHATSAPP',
      status: 'WARM',
      destination: 'Gulmarg',
      numberOfPax: '4 adults',
      budget: 60000,
      assignedTo: staff.id,
      createdBy: staff.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-3' },
    update: {},
    create: {
      id: 'lead-3',
      branchId: branch.id,
      name: 'Imran Shah',
      phone: '+919999888777',
      email: 'imran@gmail.com',
      source: 'WALKIN',
      status: 'FRESH',
      destination: 'Pahalgam',
      numberOfPax: '2 adults 1 child',
      budget: 35000,
      assignedTo: staff.id,
      createdBy: staff.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-4' },
    update: {},
    create: {
      id: 'lead-4',
      branchId: branch.id,
      name: 'Priya Menon',
      phone: '+919845123456',
      email: 'priya.menon@gmail.com',
      source: 'SOCIAL',
      status: 'FOLLOWUP',
      destination: 'Sonmarg',
      numberOfPax: '2 adults',
      budget: 45000,
      tripType: 'DOMESTIC',
      hotelCategory: 'PREMIUM',
      assignedTo: staff2.id,
      createdBy: staff2.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-5' },
    update: {},
    create: {
      id: 'lead-5',
      branchId: branch.id,
      name: 'Vikram Desai',
      phone: '+919812309876',
      email: 'vikram.desai@gmail.com',
      source: 'META_ADS',
      status: 'WON',
      destination: 'Kashmir',
      numberOfPax: '2 adults 2 children',
      budget: 90000,
      tripType: 'DOMESTIC',
      hotelCategory: 'LUXURY',
      assignedTo: staff2.id,
      createdBy: manager.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-6' },
    update: {},
    create: {
      id: 'lead-6',
      branchId: branch.id,
      name: 'Fatima Noor',
      phone: '+919900112233',
      email: 'fatima.noor@gmail.com',
      source: 'WEBSITE',
      status: 'NOT_ANSWERING',
      destination: 'Dubai',
      numberOfPax: '1 adult',
      budget: 120000,
      tripType: 'INTERNATIONAL',
      assignedTo: staff3.id,
      createdBy: staff3.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-7' },
    update: {},
    create: {
      id: 'lead-7',
      branchId: branch.id,
      name: 'Karan Malhotra',
      phone: '+919871122334',
      email: 'karan.malhotra@gmail.com',
      source: 'WHATSAPP',
      status: 'QUOTE_SENT',
      destination: 'Gulmarg',
      numberOfPax: '4 adults',
      budget: 70000,
      tripType: 'DOMESTIC',
      hotelCategory: 'STANDARD',
      assignedTo: staff3.id,
      createdBy: staff3.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-8' },
    update: {},
    create: {
      id: 'lead-8',
      branchId: branch.id,
      name: 'Ayesha Siddiqui',
      phone: '+919988776655',
      email: 'ayesha.s@gmail.com',
      source: 'BULK_IMPORT',
      status: 'NOT_INTERESTED',
      destination: 'Srinagar',
      numberOfPax: '2 adults',
      budget: 25000,
      assignedTo: staff.id,
      createdBy: manager.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-9' },
    update: {},
    create: {
      id: 'lead-9',
      branchId: branch.id,
      name: 'Rahul Verma',
      phone: '+919776655443',
      email: 'rahul.verma@gmail.com',
      source: 'WEBSITE',
      status: 'CALL_BACK_SCHEDULED',
      destination: 'Kashmir',
      numberOfPax: '3 adults',
      budget: 55000,
      assignedTo: staff2.id,
      createdBy: staff2.id,
    },
  });

  await prisma.lead.upsert({
    where: { id: 'lead-10' },
    update: {},
    create: {
      id: 'lead-10',
      branchId: branch.id,
      name: 'Meera Pillai',
      phone: '+919665544332',
      email: 'meera.pillai@gmail.com',
      source: 'SOCIAL',
      status: 'JUNK',
      destination: 'Gulmarg',
      numberOfPax: '1 adult',
      budget: 15000,
      assignedTo: staff.id,
      createdBy: staff.id,
    },
  });

  // 📊 Leads (40 more, auto-generated — lead-11 to lead-50, 50 total)
  const firstNames = [
    'Zara', 'Arjun', 'Neha', 'Farhan', 'Divya', 'Sameer', 'Anjali', 'Ibrahim', 'Pooja', 'Rajat',
    'Sana', 'Vivek', 'Nadia', 'Kunal', 'Ritu', 'Aditya', 'Naina', 'Zubair', 'Simran', 'Harsh',
    'Aisha', 'Manoj', 'Tanya', 'Yusuf', 'Kavya', 'Rohan', 'Alia', 'Suresh', 'Meher', 'Deepak',
    'Sneha', 'Waseem', 'Isha', 'Gaurav', 'Rukhsar', 'Nikhil', 'Bushra', 'Pranav', 'Shazia', 'Amit',
  ];
  const lastNames = [
    'Bhatt', 'Reddy', 'Qureshi', 'Nair', 'Kapoor', 'Iyer', 'Sheikh', 'Chopra', 'Rana', 'Joshi',
    'Wani', 'Bose', 'Mir', 'Rathore', 'Dar', 'Sinha', 'Baig', 'Gupta', 'Lone', 'Pandey',
  ];
  const genDestinations = [
    'Kashmir', 'Gulmarg', 'Pahalgam', 'Sonmarg', 'Srinagar', 'Leh Ladakh', 'Manali', 'Goa',
    'Kerala', 'Dubai', 'Singapore', 'Thailand', 'Bali', 'Andaman',
  ];
  const genSources = ['WEBSITE', 'WHATSAPP', 'WALKIN', 'SOCIAL', 'BULK_IMPORT', 'META_ADS', 'GOOGLE_ADS'];
  const genStatuses = [
    'NEW', 'FRESH', 'FOLLOWUP', 'HOT', 'WARM', 'NOT_ANSWERING', 'WON', 'NOT_INTERESTED', 'JUNK',
    'SENT_VOICEMAIL', 'CALL_DECLINED', 'CALL_BACK_SCHEDULED', 'CONNECTED', 'CLOSED', 'QUOTE_SENT',
  ];
  const genPax = [
    '1 adult', '2 adults', '2 adults 1 child', '3 adults', '4 adults', '2 adults 2 children',
  ];
  const staffPool = [staff, staff2, staff3];
  const creatorPool = [staff, staff2, staff3, manager];

  for (let i = 0; i < 40; i++) {
    const leadNum = i + 11;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const destination = genDestinations[i % genDestinations.length];
    const tripType = ['Dubai', 'Singapore', 'Thailand', 'Bali'].includes(destination)
      ? 'INTERNATIONAL'
      : 'DOMESTIC';

    await prisma.lead.upsert({
      where: { id: `lead-${leadNum}` },
      update: {},
      create: {
        id: `lead-${leadNum}`,
        branchId: branch.id,
        name: `${firstName} ${lastName}`,
        phone: `+9198${String(10000000 + leadNum * 137).padStart(8, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${leadNum}@gmail.com`,
        source: genSources[i % genSources.length],
        status: genStatuses[i % genStatuses.length],
        destination,
        tripType,
        numberOfPax: genPax[i % genPax.length],
        budget: 15000 + (i % 12) * 7500,
        assignedTo: staffPool[i % staffPool.length].id,
        createdBy: creatorPool[i % creatorPool.length].id,
        createdAt: new Date(Date.now() - (i + 1) * 6 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✓ Leads created (50 total)');

  // 🏷️ Lead Tags
  const hotTag = await prisma.leadTag.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Hot Lead' } },
    update: {},
    create: { branchId: branch.id, name: 'Hot Lead', color: '#ef4444' },
  });

  const repeatTag = await prisma.leadTag.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Repeat Customer' } },
    update: {},
    create: { branchId: branch.id, name: 'Repeat Customer', color: '#22c55e' },
  });

  const corporateTag = await prisma.leadTag.upsert({
    where: { branchId_name: { branchId: branch.id, name: 'Corporate' } },
    update: {},
    create: { branchId: branch.id, name: 'Corporate', color: '#6366f1' },
  });

  await prisma.leadToTag.upsert({
    where: { leadId_tagId: { leadId: 'lead-1', tagId: hotTag.id } },
    update: {},
    create: { leadId: 'lead-1', tagId: hotTag.id },
  });

  await prisma.leadToTag.upsert({
    where: { leadId_tagId: { leadId: 'lead-5', tagId: repeatTag.id } },
    update: {},
    create: { leadId: 'lead-5', tagId: repeatTag.id },
  });

  await prisma.leadToTag.upsert({
    where: { leadId_tagId: { leadId: 'lead-6', tagId: corporateTag.id } },
    update: {},
    create: { leadId: 'lead-6', tagId: corporateTag.id },
  });

  console.log('✓ Lead tags created');

  // 📝 Lead Activities
  await prisma.leadActivity.create({
    data: {
      leadId: 'lead-1',
      userId: staff.id,
      type: 'CALL',
      description: 'Called guest to discuss Kashmir package options.',
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: 'lead-5',
      userId: staff2.id,
      type: 'STATUS_CHANGE',
      description: 'Lead marked as WON after final payment confirmation.',
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: 'lead-7',
      userId: staff3.id,
      type: 'WHATSAPP',
      description: 'Sent quote PDF via WhatsApp for Gulmarg trip.',
    },
  });

  console.log('✓ Lead activities created');

  // 📅 Follow-ups
  await prisma.followUp.upsert({
    where: { id: 'followup-1' },
    update: {},
    create: {
      id: 'followup-1',
      leadId: 'lead-2',
      assignedTo: staff.id,
      createdBy: staff.id,
      type: 'CALL',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      notes: 'Follow up on Gulmarg package pricing.',
    },
  });

  await prisma.followUp.upsert({
    where: { id: 'followup-2' },
    update: {},
    create: {
      id: 'followup-2',
      leadId: 'lead-9',
      assignedTo: staff2.id,
      createdBy: staff2.id,
      type: 'WHATSAPP',
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      notes: 'Send Kashmir itinerary draft.',
    },
  });

  await prisma.followUp.upsert({
    where: { id: 'followup-3' },
    update: {},
    create: {
      id: 'followup-3',
      leadId: 'lead-5',
      assignedTo: staff2.id,
      createdBy: manager.id,
      type: 'CALL',
      scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
      status: 'DONE',
      outcome: 'WON',
      notes: 'Confirmed booking and collected advance payment.',
    },
  });

  console.log('✓ Follow-ups created');

  // 🏨 Hotels (3)
  await prisma.hotel.upsert({
    where: { id: 'hotel-1' },
    update: {},
    create: {
      id: 'hotel-1',
      name: 'Hotel Grand Srinagar',
      category: 'PREMIUM',
      stars: 4,
      location: 'Srinagar',
      city: 'Srinagar',
      state: 'Jammu & Kashmir',
      country: 'India',
      pricePerNight: 4500,
      amenities: ['WiFi', 'Restaurant'],
      roomTypes: [{ name: 'Deluxe', bedType: 'Double', basePrice: 4500 }],
      mealPlans: [{ type: 'CP', label: 'Breakfast', pricePerNight: 300 }],
    },
  });

  await prisma.hotel.upsert({
    where: { id: 'hotel-2' },
    update: {},
    create: {
      id: 'hotel-2',
      name: 'Pahalgam Resort',
      category: 'LUXURY',
      stars: 5,
      location: 'Pahalgam',
      pricePerNight: 8000,
      amenities: ['Spa', 'View'],
      roomTypes: [{ name: 'Suite', bedType: 'King', basePrice: 8000 }],
      mealPlans: [{ type: 'MAP', label: 'Breakfast+Dinner', pricePerNight: 800 }],
    },
  });

  await prisma.hotel.upsert({
    where: { id: 'hotel-3' },
    update: {},
    create: {
      id: 'hotel-3',
      name: 'Gulmarg Inn',
      category: 'STANDARD',
      stars: 3,
      location: 'Gulmarg',
      pricePerNight: 3000,
      amenities: ['Heater'],
      roomTypes: [{ name: 'Standard', bedType: 'Double', basePrice: 3000 }],
      mealPlans: [{ type: 'EP', label: 'Room Only', pricePerNight: 0 }],
    },
  });

  console.log('✓ Hotels created');

  // 🚗 Vehicles (3)
  await prisma.vehicle.upsert({
    where: { id: 'vehicle-1' },
    update: {},
    create: {
      id: 'vehicle-1',
      name: 'Innova Crysta',
      vehicleType: 'SUV',
      category: 'STANDARD',
      registrationNumber: 'JK01AB1234',
      seatingCapacity: 6,
      isAc: true,
      driverName: 'Yasir',
      driverPhone: '+919876111111',
      ratePerDay: 3500,
      baseLocation: 'Srinagar',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: 'vehicle-2' },
    update: {},
    create: {
      id: 'vehicle-2',
      name: 'Swift Dzire',
      vehicleType: 'SEDAN',
      category: 'ECONOMY',
      registrationNumber: 'JK01CD5678',
      seatingCapacity: 4,
      isAc: true,
      driverName: 'Bilal',
      driverPhone: '+919876222222',
      ratePerDay: 2500,
      baseLocation: 'Srinagar',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: 'vehicle-3' },
    update: {},
    create: {
      id: 'vehicle-3',
      name: 'Tempo Traveller',
      vehicleType: 'TEMPO_TRAVELLER',
      category: 'PREMIUM',
      registrationNumber: 'JK01GH2222',
      seatingCapacity: 12,
      isAc: true,
      driverName: 'Rashid',
      driverPhone: '+919876333333',
      ratePerDay: 6000,
      baseLocation: 'Srinagar',
    },
  });

  console.log('✓ Vehicles created');

  // 📍 Destinations — masters first, then the ones inside them
  const kashmir = await prisma.destination.upsert({
    where: { id: 'destination-kashmir' },
    update: {},
    create: {
      id: 'destination-kashmir',
      name: 'Kashmir',
      country: 'India',
      placeType: 'MOUNTAIN',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-delhi' },
    update: {},
    create: {
      id: 'destination-delhi',
      name: 'Delhi',
      country: 'India',
      placeType: 'CITY',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-srinagar' },
    update: {},
    create: {
      id: 'destination-srinagar',
      name: 'Srinagar',
      address: 'Srinagar, Jammu & Kashmir, India',
      placeType: 'CITY',
      parentId: kashmir.id,
      shortDescription: 'Summer capital, built around Dal Lake.',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-sonmarg' },
    update: {},
    create: {
      id: 'destination-sonmarg',
      name: 'Sonmarg',
      address: 'Ganderbal, Jammu & Kashmir, India',
      placeType: 'MOUNTAIN',
      parentId: kashmir.id,
      shortDescription: 'Meadow of gold, gateway to the Zoji La pass.',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-1' },
    update: {},
    create: {
      id: 'destination-1',
      name: 'Dal Lake',
      address: 'Srinagar, Jammu & Kashmir, India',
      placeType: 'CITY',
      parentId: kashmir.id,
      shortDescription: 'Iconic lake known for houseboats and shikara rides.',
      highlights: ['Shikara rides', 'Houseboat stay', 'Mughal gardens nearby'],
      amenities: ['Shikara rides', 'Photography', 'Local market'],
      bestTimeToVisit: 'April to October',
      language: 'Kashmiri, Urdu',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-2' },
    update: {},
    create: {
      id: 'destination-2',
      name: 'Gulmarg',
      address: 'Baramulla, Jammu & Kashmir, India',
      placeType: 'MOUNTAIN',
      parentId: kashmir.id,
      shortDescription: 'Hill station famous for skiing and the Gondola cable car.',
      highlights: ['Gondola ride', 'Skiing in winter', 'Golf course in summer'],
      amenities: ['Gondola cable car', 'Ski rentals', 'Pony rides'],
      bestTimeToVisit: 'December to March for snow, April to June for meadows',
      language: 'Kashmiri, Urdu',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  await prisma.destination.upsert({
    where: { id: 'destination-3' },
    update: {},
    create: {
      id: 'destination-3',
      name: 'Pahalgam',
      address: 'Anantnag, Jammu & Kashmir, India',
      placeType: 'MOUNTAIN',
      parentId: kashmir.id,
      shortDescription: 'Valley town known as the gateway to Amarnath Yatra.',
      highlights: ['Betaab Valley', 'Aru Valley day trip', 'Lidder River'],
      amenities: ['Horse riding', 'Trekking', 'River rafting'],
      bestTimeToVisit: 'March to October',
      language: 'Kashmiri, Urdu',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      altNames: ['Payar', 'Pahli Gam'],
      branchId: branch.id,
      createdBy: admin.id,
    },
  });

  console.log('✓ Destinations created');

  // Hotels are seeded before destinations exist, so file them in afterwards.
  // `location` is the label derived from the destination it now points at.
  const hotelPlacements = [
    { id: 'hotel-1', destinationId: 'destination-srinagar', location: 'Srinagar, Kashmir' },
    { id: 'hotel-2', destinationId: 'destination-3', location: 'Pahalgam, Kashmir' },
    { id: 'hotel-3', destinationId: 'destination-2', location: 'Gulmarg, Kashmir' },
  ];

  for (const placement of hotelPlacements) {
    await prisma.hotel.update({
      where: { id: placement.id },
      data: { destinationId: placement.destinationId, location: placement.location },
    });
  }

  console.log('✓ Hotels filed under destinations');

  // 📣 Ad Campaign
  const campaign = await prisma.adCampaign.upsert({
    where: { id: 'campaign-1' },
    update: {},
    create: {
      id: 'campaign-1',
      branchId: branch.id,
      name: 'Kashmir Summer Special',
      platform: 'META',
      status: 'ACTIVE',
      budget: 50000,
      spent: 18500,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notes: 'Meta lead-gen campaign targeting Kashmir honeymoon packages.',
    },
  });

  await prisma.adCampaignLead.upsert({
    where: { leadId_campaignId: { leadId: 'lead-5', campaignId: campaign.id } },
    update: {},
    create: { leadId: 'lead-5', campaignId: campaign.id },
  });

  console.log('✓ Ad campaign created');

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
