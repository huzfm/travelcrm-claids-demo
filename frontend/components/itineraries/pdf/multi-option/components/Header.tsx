// Multi-Option Header Component - Duplicated for full isolation

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
          <Text style={styles.headerPhone}>Contact no: {branchNumber || phone}</Text>
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

export const PDFHeaderSmall = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.header}>
    <Text style={styles.mainTitleSmall}>{title}</Text>
    {subtitle && <Text style={styles.mainSubtitle}>{subtitle}</Text>}
  </View>
);

export const PDFHeaderCompact = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.headerCompact}>
    <Text style={styles.mainTitleSmall}>{title}</Text>
    {subtitle && <Text style={styles.mainSubtitle}>{subtitle}</Text>}
  </View>
);
