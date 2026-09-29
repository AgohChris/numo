import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, FontSizes } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'secondary';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorKey = type === 'secondary' ? 'textSecondary' : 'text';
  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorKey);
  const linkColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color: type === 'link' ? linkColor : color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'secondary' ? styles.secondary : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSizes.base,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: FontSizes.base,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontFamily: Fonts?.title,
    fontSize: FontSizes.display,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: Fonts?.title,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    lineHeight: 28,
  },
  link: {
    lineHeight: 24,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  secondary: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
