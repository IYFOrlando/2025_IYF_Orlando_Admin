import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: { mode: 'light' },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 12 } } },
  },
})

export default theme