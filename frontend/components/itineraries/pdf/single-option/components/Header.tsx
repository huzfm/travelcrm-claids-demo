// Single-Option PDF Header Component

import { Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  phone?: string;
  email?: string;
  address?: string;
  branchNumber?: string;
}

export const PDFHeader = ({
  title,
  subtitle,
  phone,
  email,
  address,
  branchNumber,
}: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerTopRow}>
      <View style={styles.headerRight}>
        <Text style={styles.headerExpertLabel}>Your Travel Expert</Text>
        {(branchNumber || phone) && (
          <Text style={styles.headerPhone}>Contact No: {branchNumber || phone}</Text>
        )}
        {email && <Text style={styles.headerEmail}>{email}</Text>}
        {address && <Text style={styles.headerAddress}>{address}</Text>}
      </View>
    </View>
    <View style={styles.headerDivider} />
    {title && <Text style={styles.mainTitle}>{title}</Text>}
    {subtitle && <Text style={styles.mainSubtitle}>{subtitle}</Text>}
  </View>
);

// Small header for internal pages
export const PDFHeaderSmall = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.header}>
    <Text style={styles.mainTitleSmall}>{title}</Text>
    {subtitle && <Text style={styles.mainSubtitle}>{subtitle}</Text>}
  </View>
);

// Ultra-compact header for accommodation and transport pages (A4 full page)
export const PDFHeaderCompact = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.headerCompact}>
    <Text style={styles.mainTitleSmall}>{title}</Text>
    {subtitle && <Text style={styles.mainSubtitle}>{subtitle}</Text>}
  </View>
);
