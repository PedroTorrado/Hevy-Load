import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Alert, CircularProgress, ThemeProvider, CssBaseline } from '@mui/material';
import Navigation from './Navigation';
import axios from 'axios';
import { createTheme } from '@mui/material/styles';
import { useAuth } from './AuthContext';

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

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hevyUsername, setHevyUsername] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await axios.post(`${API_URL}/api/register`, {
        email,
        password,
        hevy_username: hevyUsername,
        gemini_api_key: geminiApiKey || undefined
      });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)', pb: 4 }}>
        <Navigation />
        <Container maxWidth="sm" sx={{ mt: 8, mb: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 4 }}>
            <img
              src="/512x512.svg"
              alt="Hevy Load Logo"
              style={{ width: '120px', height: 'auto', display: 'block', margin: '0 auto' }}
            />
          </Box>
          <Paper sx={{ p: 4, borderRadius: 2, width: '100%', maxWidth: 480 }}>
            <Typography variant="h4" align="center" gutterBottom sx={{ color: 'primary.main', textShadow: '0 0 10px rgba(144, 202, 249, 0.3)', fontWeight: 700, letterSpacing: '0.5px' }}>
              Register
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required fullWidth />
              <TextField label="Hevy Username" value={hevyUsername} onChange={e => setHevyUsername(e.target.value)} required fullWidth />
              <TextField label="Gemini API Key (optional)" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} fullWidth />
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">Registration successful! Redirecting...</Alert>}
              <Button type="submit" variant="contained" color="primary" disabled={loading} fullWidth sx={{ fontWeight: 600, fontSize: '1.1rem', py: 1.5 }}>
                {loading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
              <Button color="secondary" onClick={() => navigate('/')} fullWidth sx={{ mt: 1 }}>Back to Home</Button>
              <Button color="secondary" component={Link} to="/login" fullWidth sx={{ mt: 1 }}>Already have an account? Login</Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
} 