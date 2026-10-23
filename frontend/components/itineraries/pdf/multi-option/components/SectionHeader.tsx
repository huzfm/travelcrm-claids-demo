// Multi-Option Section Header - Duplicated for full isolation

import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>}
  </View>
);
