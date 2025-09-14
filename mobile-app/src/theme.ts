// Crafdy Mobile Modern Theme tokens (Big Tech tone)
export const THEME = {
  colors: {
    brand: '#146C43',
    ink:   '#E9F7EF',
    text:  '#111827',
    sub:   '#6B7280',
    border:'#E5E7EB',
    bg:    '#F7F8FA',
    white: '#FFFFFF',
  },
  radii:  { sm: 12, md: 16, lg: 20, pill: 999 },
  shadow: {
    ios:     { shadowColor:'#000', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:6} },
    android: { elevation: 4 }
  },
  duration: 200,
} as const

export default THEME
