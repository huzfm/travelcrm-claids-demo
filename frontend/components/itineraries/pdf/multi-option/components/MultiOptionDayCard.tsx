// Multi-Option Day Card Component
// Compact per-day content — several of these flow onto one page (see
// MultiOptionDaySection) instead of giving every day its own full A4 page.

import { Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import { getDayOrdinalSuffix, stripBullets, formatShortDate } from '../utils';
import { activitiesNotInDescription } from '@/lib/activities-in-description';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

// Day entry colors — dark body text and the deep red used for titles/badges.
const DAY_TEXT = '#1A1918';
const DAY_ACCENT = '#db0201';

// "Friday 5th June, 2026" — weekday, ordinal day, month, year.
function formatDayHeaderDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  const day = date.getDate();
  return `${weekday} ${day}${getDayOrdinalSuffix(day).toLowerCase()} ${month}, ${date.getFullYear()}`;
}

// "5–6 June, 2026" for a merged card spanning several days — falls back to
// the single-day format (with weekday) when there's just the one day.
function formatDayHeaderDateRange(days: ItineraryDay[]): string {
  if (days.length === 1) return formatDayHeaderDate(days[0].date);

  const startStr = days[0].date;
  const endStr = days[days.length - 1].date;
  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;
  const startValid = !!start && !Number.isNaN(start.getTime());
  const endValid = !!end && !Number.isNaN(end.getTime());

  if (!startValid) return endValid ? formatDayHeaderDate(endStr) : '';
  if (!endValid) return formatDayHeaderDate(startStr);

  const sameMonth = start!.getMonth() === end!.getMonth() && start!.getFullYear() === end!.getFullYear();
  if (sameMonth) {
    const month = end!.toLocaleDateString('en-IN', { month: 'long' });
    return `${start!.getDate()}–${end!.getDate()} ${month}, ${end!.getFullYear()}`;
  }
  return `${formatShortDate(startStr!)} – ${formatShortDate(endStr!)}, ${end!.getFullYear()}`;
}

// Each non-empty line of the (bullet-marker-stripped) description becomes its
// own bullet row, matching how agents type these one sentence per line.
// Kept tight on purpose — this drives how many days fit per page (see
// DAY_CARD_BULLET_HEIGHT in utils.ts, which must stay ≥ this real size).
// accentColor kept for call-site compatibility; entries use the shared red/dark palette.
function DescriptionBullets({ text }: { text: string; accentColor?: string }) {
  const lines = stripBullets(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <View style={{ marginTop: 9, paddingLeft: 6 }}>
      {lines.map((line, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
          <View
            style={{
              width: 3.5,
              height: 3.5,
              borderRadius: 1.75,
              backgroundColor: DAY_TEXT,
              marginTop: 4.5,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 9.5, color: DAY_TEXT, flex: 1, lineHeight: 1.4 }}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

// Day-number badge — a light-red outlined box with "1st" over a small "Day".
function DayBadge({ dayNumbers }: { dayNumbers: number[]; accentColor?: string }) {
  const isGroup = dayNumbers.length > 1;
  const label = !isGroup
    ? `${dayNumbers[0]}${getDayOrdinalSuffix(dayNumbers[0]).toLowerCase()}`
    : `${dayNumbers[0]}-${dayNumbers[dayNumbers.length - 1]}`;

  return (
    <View
      style={{
        width: 46,
        alignSelf: 'flex-start',
        paddingTop: 4,
        paddingBottom: 5,
        backgroundColor: '#fde2e2',
        borderWidth: 1,
        borderColor: '#e57373',
        borderRadius: 2,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Times-Roman', fontSize: 13, color: DAY_ACCENT }}>{label}</Text>
      <Text style={{ fontSize: 7, color: DAY_ACCENT, marginTop: 1 }}>{isGroup ? 'Days' : 'Day'}</Text>
    </View>
  );
}

// Shared shell: day badge on the left; date, red title and the day's content
// (bullets/activities/notes) stacked to its right. No card border or fill.
function DayCardShell({
  dayNumbers,
  date,
  title,
  children,
}: {
  dayNumbers: number[];
  date?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
      <DayBadge dayNumbers={dayNumbers} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        {date ? (
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: DAY_TEXT, marginTop: 1 }}>
            {date}
          </Text>
        ) : null}
        <Text style={{ fontSize: 14.5, fontWeight: 'bold', color: DAY_ACCENT, marginTop: 3 }}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

interface MultiOptionDayCardProps {
  /** One card, one or more consecutive days at the same destination merged into it. */
  days: ItineraryDay[];
  option: ItineraryOption;
  optColor: { bg: string; border: string; text: string };
}

// One day's activities/notes block — used standalone for a single-day card,
// and once per merged day (with a "Day N" sub-label) inside a grouped one.
function DayContentBlock({
  day,
  option,
  optColor,
  showDayLabel,
}: {
  day: ItineraryDay;
  option: ItineraryOption;
  optColor: { bg: string; border: string; text: string };
  showDayLabel: boolean;
}) {
  const optionActivities = option?.activities?.filter(a => a.dayNumber === day.dayNumber) || [];
  const dayActivities = activitiesNotInDescription(
    day.activities && day.activities.length > 0 ? day.activities : optionActivities,
    day.description
  );

  return (
    <View>
      {showDayLabel && (
        <Text
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: optColor.border,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginBottom: 4,
          }}
        >
          Day {day.dayNumber}
        </Text>
      )}

      {day.description && <DescriptionBullets text={day.description} accentColor={optColor.border} />}

      {dayActivities && dayActivities.length > 0 && (
        <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {dayActivities.map((activity, actIdx) => (
            <View
              key={activity.id || `act-${actIdx}`}
              style={{
                backgroundColor: optColor.border,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              {activity.time && (
                <Text style={{ fontSize: 8, color: colors.white, fontWeight: 'bold' }}>
                  {activity.time}{' '}
                </Text>
              )}
              <Text style={{ fontSize: 9, color: colors.white, fontWeight: '600' }}>
                {activity.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {day.notes && (
        <View style={[styles.dayNotesSection, { padding: 6, marginTop: 6 }]}>
          <Text style={[styles.dayNotesLabel, { fontSize: 8 }]}>Notes</Text>
          <Text style={[styles.dayNotesText, { fontSize: 9 }]}>{day.notes}</Text>
        </View>
      )}
    </View>
  );
}

export const MultiOptionDayCard = ({ days, option, optColor }: MultiOptionDayCardProps) => {
  const first = days[0];
  const isGroup = days.length > 1;
  const dayNumbers = days.map(d => d.dayNumber);

  // Leisure days never merge (see groupConsecutiveDaysByDestination), so this
  // is always a single day when true.
  const isLeisureDay = first.dayType === 'leisure';

  // Leisure Day — same card shell as a normal day, just with a fallback line
  // when the agent hasn't entered guidelines yet, instead of a full-page block.
  if (isLeisureDay) {
    const customDescription = first.description?.trim() || first.leisureGuidelines?.trim();

    return (
      <DayCardShell
        dayNumbers={dayNumbers}
        date={formatDayHeaderDate(first.date)}
        title="Leisure Day"
      >
        {customDescription ? (
          <DescriptionBullets text={customDescription} accentColor={optColor.border} />
        ) : (
          <Text style={{ fontSize: 10, color: colors.muted, fontStyle: 'italic' }}>
            Enjoy your free day at leisure.
          </Text>
        )}
      </DayCardShell>
    );
  }

  return (
    <DayCardShell
      dayNumbers={dayNumbers}
      date={formatDayHeaderDateRange(days)}
      // A merged card is anchored to the shared destination; a lone day keeps
      // its own title first, same as before this ever merged.
      title={
        isGroup
          ? first.destination || first.title || `Day ${first.dayNumber}`
          : first.title || first.destination || `Day ${first.dayNumber}`
      }
    >
      {/* Destination Description — stored on the destination record, shared by
          every merged day, so it's shown once rather than once per day. */}
      {first.destinationDescription && (
        <DescriptionBullets text={first.destinationDescription} accentColor={optColor.border} />
      )}

      {days.map((day, idx) => (
        <View key={day.dayNumber ?? idx} style={idx > 0 ? { marginTop: 10 } : undefined}>
          <DayContentBlock day={day} option={option} optColor={optColor} showDayLabel={isGroup} />
        </View>
      ))}
    </DayCardShell>
  );
};
