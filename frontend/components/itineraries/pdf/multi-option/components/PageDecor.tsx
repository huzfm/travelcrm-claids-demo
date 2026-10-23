// Multi-option copy (duplicated for full isolation) — shared page decoration for the document-style pages (Quote, Hotels):
// a faint diagonal "Branch • Trip# N" watermark and the red section banner.

import { Text, View } from '@react-pdf/renderer';

export const decorColors = {
  pageBg: '#fafaf9',
  text: '#1A1918',
  label: '#57534f',
  divider: '#e8e6e4',
  watermark: '#e8e6e4',
  bannerBg: '#fecaca',
  bannerAccent: '#db0201',
  bannerText: '#b00201',
  cardBorder: '#e8e6e4',
};

export const watermarkText = (branchName?: string, tripId?: string | null): string => {
  const company = branchName || '';
  if (company && tripId) return `${company} • Trip# ${tripId}`;
  return company || (tripId ? `Trip# ${tripId}` : '');
};

// Faint diagonal text repeated across the whole page, drawn behind the content.
// Render it first inside <Page> so everything else paints on top.
export const PageWatermark = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: -250,
        left: -250,
        width: 1100,
        height: 1350,
        transform: 'rotate(-25deg)',
      }}
    >
      {Array.from({ length: 22 }).map((_, rowIdx) => (
        // One wide absolutely-positioned line per row — laying the repeats out
        // as flex siblings made react-pdf overlap them.
        <Text
          key={rowIdx}
          style={{
            position: 'absolute',
            top: rowIdx * 62,
            left: rowIdx % 2 === 0 ? 0 : -140,
            width: 2400,
            fontSize: 20,
            color: decorColors.watermark,
          }}
        >
          {Array.from({ length: 6 }).fill(`${text}  •  `).join('')}
        </Text>
      ))}
    </View>
  );
};

// Light-red bar with a darker left accent, e.g. "Quote Price".
export const SectionBanner = ({ title, marginTop = 0 }: { title: string; marginTop?: number }) => (
  <View
    style={{
      marginTop,
      backgroundColor: decorColors.bannerBg,
      borderLeftWidth: 5,
      borderLeftColor: decorColors.bannerAccent,
      borderTopRightRadius: 6,
      borderBottomRightRadius: 6,
      paddingVertical: 9,
      paddingHorizontal: 20,
    }}
  >
    <Text style={{ fontSize: 15, fontWeight: 'bold', color: decorColors.bannerText }}>{title}</Text>
  </View>
);
