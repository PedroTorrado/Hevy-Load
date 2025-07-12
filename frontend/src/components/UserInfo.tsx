import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, TextField, Button, CircularProgress, Alert, Avatar, ThemeProvider, CssBaseline, createTheme, IconButton, InputAdornment } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Navigation from './Navigation';
import axios from 'axios';

const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5001';
  
  // If running in Docker (nginx proxy), use relative URLs
  if (hostname === 'localhost' && window.location.port === '1234') {
    return ''; // Use relative URLs for Docker deployment
  }
  
  // Otherwise use the dynamic URL construction
  return `${protocol}//${hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname}:${port}`;
};
const API_URL = getApiUrl();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default function UserInfo() {
  const [user, setUser] = useState<{ email: string; hevy_username: string; gemini_api_key?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/user`, { withCredentials: true });
        setUser(res.data);
        setGeminiKey(res.data.gemini_api_key || '');
      } catch (err: any) {
        setError('Failed to fetch user info.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSaveGeminiKey = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await axios.post(`${API_URL}/api/set_gemini_key`, { gemini_api_key: geminiKey }, { withCredentials: true });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('Failed to update Gemini API key.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)' }}>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    </ThemeProvider>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)', pb: 4 }}>
        <Navigation />
        <Container maxWidth="sm" sx={{ mt: 10, mb: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Paper elevation={4} sx={{ p: 5, borderRadius: 4, width: '100%', maxWidth: 500, background: 'linear-gradient(135deg, #1e1e1e 0%, #23272f 100%)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 72, height: 72, mb: 2 }}>
                <AccountCircleIcon sx={{ fontSize: 56 }} />
              </Avatar>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.5px', mb: 1 }}>
                User Info
              </Typography>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>Gemini API key updated!</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField label="Email" value={user?.email || ''} InputProps={{ readOnly: true }} fullWidth sx={{ input: { color: 'white' } }} />
              <TextField label="Hevy Username" value={user?.hevy_username || ''} InputProps={{ readOnly: true }} fullWidth sx={{ input: { color: 'white' } }} />
              <TextField
                label="Gemini API Key"
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                fullWidth
                sx={{ input: { color: 'white' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowKey(!showKey)} edge="end" tabIndex={-1}>
                        {showKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button variant="contained" color="primary" onClick={handleSaveGeminiKey} disabled={saving} sx={{ mt: 2, fontWeight: 600, fontSize: '1.1rem', py: 1.5 }}>
                {saving ? <CircularProgress size={24} /> : 'Save Gemini API Key'}
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
} 