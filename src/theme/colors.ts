export const colors = {
  bg: '#0a0a0a',
  surface: '#111111',
  card: '#161616',
  border: '#2c313a',
  borderDim: '#333333',
  green: '#00ff41',
  greenDim: '#004d13',
  cyan: '#00f0ff',
  amber: '#ffb000',
  red: '#ff3333',
  text: '#e5e5e5',
  textDim: '#666666',
  textMuted: '#4d5b5b',
  white: '#ffffff',
  black: '#000000',
} as const;
export type ColorKey = keyof typeof colors;
