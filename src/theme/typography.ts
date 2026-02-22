import {TextStyle} from 'react-native';

export const fontFamily = {
  mono: 'JetBrainsMono-Regular',
  monoBold: 'JetBrainsMono-Bold',
  monoMedium: 'JetBrainsMono-Medium',
  monoLight: 'JetBrainsMono-Light',
} as const;

export const fontSize = {
  /** 9px — micro labels (SHA hash, ICCID) */
  micro: 9,
  /** 10px — dim labels, version strings, module descriptions */
  label: 10,
  /** 12px — body text, table content, log output */
  body: 12,
  /** 14px — section headings, input text, card titles */
  heading: 14,
  /** 16px — screen subtitles */
  subtitle: 16,
  /** 20px — screen titles, hero text */
  title: 20,
  /** 24px — large hero indicators */
  hero: 24,
} as const;

export const textStyles: Record<string, TextStyle> = {
  title: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.title,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.heading,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.label,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  micro: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
  },
};
