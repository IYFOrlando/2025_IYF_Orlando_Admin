import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: { mode: 'light' },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 12 } } },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          zIndex: 1200,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          zIndex: 1201,
        },
      },
    },
  },
})

export default theme