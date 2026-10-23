// Multi-Option PDF Image Component - Duplicated for full isolation

import { Image, View, Text } from '@react-pdf/renderer';

interface PDFImageProps {
  src: string;
  style: any;
  placeholder?: string;
}

export const PDFImage: React.FC<PDFImageProps> = ({ src, style, placeholder = '?' }) => {
  // Accept https://, http://, data: (base64), and blob: URLs (will be preloaded to data:)
  const isValidUrl =
    src &&
    typeof src === 'string' &&
    src.trim() !== '' &&
    (src.startsWith('https://') ||
      src.startsWith('http://') ||
      src.startsWith('data:') ||
      src.startsWith('blob:'));

  if (!isValidUrl) {
    return (
      <View
        style={{
          ...style,
          backgroundColor: '#e5e5e5',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, color: '#999', fontWeight: 'bold' }}>{placeholder}</Text>
      </View>
    );
  }

  return <Image src={src} style={style} cache={true} />;
};
