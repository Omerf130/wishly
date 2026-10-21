export const colors = {
  background: '#FFF7EC',
  primary: '#7656E8',
  mint: '#50C8B3',
  peach: '#F6AD66',
  pink: '#ED86A5',
  text: '#26334B',
  textMuted: 'rgba(38, 51, 75, 0.72)',
  white: '#FFFFFF',
  primaryPressed: '#6244D4',
  shadow: 'rgba(38, 51, 75, 0.12)',
} as const;

export type AppColors = typeof colors;
