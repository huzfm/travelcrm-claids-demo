import { format, addDays } from 'date-fns';

/** Everything `groupHotelStays` reads off a day — satisfied structurally by
 *  both the itinerary-builder's `DayBuilderData` and the saved itinerary's
 *  `ItineraryDay` (via a small field-mapping adapter at the call site). */
export interface HotelStayInput {
  dayNumber: number;
  date: string;
  hotelId?: string;
  hotelName: string;
  hotelAddress?: string;
  hotelStars?: number;
  roomType: string;
  bedType: string;
  roomCount: number;
  basePrice: number;
  mealPlan?: string;
  mealPlanPrice?: number;
  extraBedCount?: number;
  extraBedPrice?: number;
  childCount?: number;
  childPrice?: number;
}

/** One contiguous run of days booked at the same hotel — a single "stay". */
export interface HotelStayGroup {
  /** dayNumber of the first night — the card that shows the copy button. */
  firstDayNumber: number;
  hotelName: string;
  hotelAddress?: string;
  hotelStars?: number;
  roomType: string;
  bedType: string;
  roomCount: number;
  /** Per-room, per-night rate (room + meal plan), taken from the first night. */
  ratePerRoomPerNight: number;
  nights: { date: string; mealPlan: string }[];
  checkIn: string;
  checkOut: string;
  totalCost: number;
}

/** Groups consecutive days sharing the same hotel into stays, in date order. */
export function groupHotelStays(days: HotelStayInput[]): HotelStayGroup[] {
  const groups: HotelStayGroup[] = [];
  let i = 0;
  while (i < days.length) {
    const day = days[i];
    if (!day.hotelId) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < days.length && days[j + 1].hotelId === day.hotelId) {
      j++;
    }
    const stayDays = days.slice(i, j + 1);
    const totalCost = stayDays.reduce((sum, d) => {
      const roomCost = d.basePrice * (d.roomCount || 1);
      const mealCost = (d.mealPlanPrice || 0) * (d.roomCount || 1);
      const extraBedCost = (d.extraBedCount || 0) * (d.extraBedPrice || 0);
      const childCost = (d.childCount || 0) * (d.childPrice || 0);
      return sum + roomCost + mealCost + extraBedCost + childCost;
    }, 0);
    const lastDay = stayDays[stayDays.length - 1];
    const checkOut = lastDay.date
      ? format(addDays(new Date(lastDay.date), 1), 'yyyy-MM-dd')
      : '';

    groups.push({
      firstDayNumber: day.dayNumber,
      hotelName: day.hotelName,
      hotelAddress: day.hotelAddress,
      hotelStars: day.hotelStars,
      roomType: day.roomType,
      bedType: day.bedType,
      roomCount: day.roomCount || 1,
      ratePerRoomPerNight: (day.basePrice || 0) + (day.mealPlanPrice || 0),
      nights: stayDays.map(d => ({ date: d.date, mealPlan: d.mealPlan || '' })),
      checkIn: day.date,
      checkOut,
      totalCost,
    });
    i = j + 1;
  }
  return groups;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export interface ReservationGuest {
  salutation?: string;
  clientName?: string;
  adults?: number;
  children?: number;
}

export interface ReservationCompany {
  brandName?: string;
  legalName?: string;
  address?: string;
  gst?: string;
}

interface ReservationFields {
  tripId?: string;
  currency: string;
  brandLine: string;
  legalName: string;
  address: string;
  gst?: string;
  hotelName: string;
  hotelAddressLine: string;
  guestLine: string;
  paxLine: string;
  totalPax: number;
  checkInFmt: string;
  checkOutFmt: string;
  nightsCount: number;
  nightLines: string[];
  roomLine: string;
  rate: number;
  basis: string;
  roomCount: number;
  total: number;
}

function computeReservationFields(params: {
  tripId?: string;
  currency: string;
  guest: ReservationGuest;
  company: ReservationCompany;
  stay: HotelStayGroup;
}): ReservationFields {
  const { tripId, currency, guest, company, stay } = params;

  const brandName = company.brandName || 'Our Team';
  const legalName = company.legalName || brandName;
  const brandLine = legalName && legalName !== brandName ? `${brandName} (${legalName})` : brandName;

  const paxLine = [
    guest.adults ? `${guest.adults} Adults` : null,
    guest.children ? `${guest.children} Children` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const totalPax = (guest.adults || 0) + (guest.children || 0);

  const checkInFmt = stay.checkIn ? format(new Date(stay.checkIn), 'do MMM, yyyy') : '';
  const checkOutFmt = stay.checkOut ? format(new Date(stay.checkOut), 'do MMM, yyyy') : '';

  const nightLines = stay.nights.map((n, idx) => {
    const dateLabel = n.date ? format(new Date(n.date), 'd MMM') : '';
    const mealSuffix = n.mealPlan ? ` - ${n.mealPlan}` : '';
    return `${ordinal(idx + 1)} N (${dateLabel})${mealSuffix}`;
  });

  return {
    tripId,
    currency,
    brandLine,
    legalName,
    address: company.address || '',
    gst: company.gst,
    hotelName: stay.hotelName,
    hotelAddressLine: [stay.hotelAddress, stay.hotelStars ? `(${stay.hotelStars} star)` : '']
      .filter(Boolean)
      .join(' '),
    guestLine: [guest.salutation, guest.clientName].filter(Boolean).join('. '),
    paxLine,
    totalPax,
    checkInFmt,
    checkOutFmt,
    nightsCount: stay.nights.length,
    nightLines,
    roomLine: `${stay.roomCount} ${stay.roomType}`,
    rate: stay.ratePerRoomPerNight,
    basis: stay.bedType ? `${stay.bedType} Sharing` : 'Double Sharing',
    roomCount: stay.roomCount,
    total: stay.totalCost,
  };
}

/** Builds the plain-text hotel reservation request — used as the text/plain
 *  clipboard fallback for targets that don't accept rich HTML. */
export function buildHotelReservationEmail(params: {
  tripId?: string;
  currency: string;
  guest: ReservationGuest;
  company: ReservationCompany;
  stay: HotelStayGroup;
}): string {
  const f = computeReservationFields(params);

  const lines = [
    'Dear Sir/Madam,',
    '',
    `Greetings from ${f.brandLine} !!!`,
    '',
    'We are pleased to share the below booking, Would request you to please BOOK & CONFIRM the same.',
    '',
    ...(f.tripId ? [`Trip ID: ${f.tripId}`] : []),
    'Hotel\tGuest Details',
    f.hotelName,
    f.hotelAddressLine,
    f.guestLine,
    f.paxLine,
    `Check-in\t${f.checkInFmt}\tCheck-out\t${f.checkOutFmt} ( ${f.nightsCount} Nights )`,
    `Night and Meals\tRoom Type\tRate (${f.currency})`,
    f.nightLines.join('\n'),
    f.roomLine,
    `${f.totalPax} Pax`,
    `${f.rate.toLocaleString()}\t/-\tPer Room on ${f.basis} basis x ${f.roomCount} Room`,
    `Total\t:\t${f.rate.toLocaleString()} x ${f.nightsCount}N = ${f.total.toLocaleString()}`,
    '',
    `Total Booking Price (${f.currency}): ${f.total.toLocaleString()} /-`,
    '',
    `Payment Mode\tBill to "${f.legalName}". All Extras on Direct Basis.`,
    'Billing Instructions',
    `Name\t${f.legalName}`,
    `Address\t${f.address}`,
    `Details\tGSTIN${f.gst ? `: ${f.gst}` : ''}`,
    '',
    'Kindly send confirmation at your earliest.',
  ];

  return lines.join('\n');
}

const YELLOW = '#ECC9C6';
const YELLOW_BORDER = '#f79694';
const PINK = '#F5B7B1';
const PINK_BORDER = '#E0958D';
const BORDER = '#D0D0D0';
const CELL = 'border:1px solid ' + BORDER + ';padding:10px 12px;';
const FONT = "font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;";

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Builds the styled HTML table version of the reservation request — copied
 *  to the clipboard as text/html so pasting into Gmail/Outlook keeps the
 *  colored header table, not plain text. */
export function buildHotelReservationEmailHtml(params: {
  tripId?: string;
  currency: string;
  guest: ReservationGuest;
  company: ReservationCompany;
  stay: HotelStayGroup;
}): string {
  const f = computeReservationFields(params);
  const nightsHtml = f.nightLines.map(esc).join('<br/>');

  return `
<div style="${FONT}max-width:700px;">
  <p>Dear Sir/Madam,</p>
  <p>Greetings from <b>${esc(f.brandLine)}</b> !!!</p>
  <p>We are pleased to share the below booking, Would request you to please <b>BOOK &amp; CONFIRM</b> the same.</p>

  <table style="border-collapse:collapse;width:100%;${FONT}" cellpadding="0" cellspacing="0">
    ${
      f.tripId
        ? `<tr><td colspan="2" style="${CELL}background:${YELLOW};border-color:${YELLOW_BORDER};font-weight:bold;">Trip ID: ${esc(f.tripId)}</td></tr>`
        : ''
    }
    <tr>
      <td style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;width:50%;">Hotel</td>
      <td style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;width:50%;">Guest Details</td>
    </tr>
    <tr>
      <td style="${CELL}vertical-align:top;">
        <b>${esc(f.hotelName)}</b><br/>${esc(f.hotelAddressLine)}
      </td>
      <td style="${CELL}vertical-align:top;">
        <b>${esc(f.guestLine)}</b><br/>${esc(f.paxLine)}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:0;border:1px solid ${BORDER};">
        <table style="border-collapse:collapse;width:100%;${FONT}" cellpadding="0" cellspacing="0">
          <tr>
            <td style="${CELL}background:${YELLOW};border-color:${YELLOW_BORDER};font-weight:bold;width:15%;">Check-in</td>
            <td style="${CELL}width:35%;">${esc(f.checkInFmt)}</td>
            <td style="${CELL}background:${YELLOW};border-color:${YELLOW_BORDER};font-weight:bold;width:15%;">Check-out</td>
            <td style="${CELL}width:35%;">${esc(f.checkOutFmt)} ( ${f.nightsCount} Nights )</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:0;border:1px solid ${BORDER};">
        <table style="border-collapse:collapse;width:100%;${FONT}" cellpadding="0" cellspacing="0">
          <tr>
            <td style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;width:35%;">Night and Meals</td>
            <td style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;width:25%;">Room Type</td>
            <td style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;width:40%;">Rate (${esc(f.currency)})</td>
          </tr>
          <tr>
            <td style="${CELL}vertical-align:top;">${nightsHtml}</td>
            <td style="${CELL}vertical-align:top;">${esc(f.roomLine)}<br/>${f.totalPax} Pax</td>
            <td style="${CELL}vertical-align:top;">
              ${f.rate.toLocaleString()}/- Per Room on ${esc(f.basis)} basis x ${f.roomCount} Room<br/>
              Total&nbsp;:&nbsp;${f.rate.toLocaleString()} x ${f.nightsCount}N = ${f.total.toLocaleString()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="${CELL}background:${YELLOW};border-color:${YELLOW_BORDER};font-weight:bold;">
        Total Booking Price (${esc(f.currency)}): ${f.total.toLocaleString()} /-
      </td>
    </tr>
  </table>

  <br/>

  <table style="border-collapse:collapse;width:100%;${FONT}" cellpadding="0" cellspacing="0">
    <tr>
      <td style="${CELL}font-weight:bold;width:25%;">Payment Mode</td>
      <td style="${CELL}">Bill to &quot;${esc(f.legalName)}&quot;. All Extras on Direct Basis.</td>
    </tr>
    <tr>
      <td colspan="2" style="${CELL}background:${PINK};border-color:${PINK_BORDER};font-weight:bold;text-align:center;">Billing Instructions</td>
    </tr>
    <tr>
      <td style="${CELL}font-weight:bold;">Name</td>
      <td style="${CELL}"><b>${esc(f.legalName)}</b></td>
    </tr>
    <tr>
      <td style="${CELL}font-weight:bold;">Address</td>
      <td style="${CELL}">${esc(f.address).replace(/\n/g, '<br/>')}</td>
    </tr>
    <tr>
      <td style="${CELL}font-weight:bold;">Details</td>
      <td style="${CELL}">GSTIN${f.gst ? `: ${esc(f.gst)}` : ''}</td>
    </tr>
  </table>

  <p>Kindly send confirmation at your earliest.</p>
</div>`.trim();
}
