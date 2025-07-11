import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Button,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Paper,
  CircularProgress,
  Grid,
  Alert,
  Snackbar,
  Slider,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import axios from 'axios';
import Navigation from './Navigation';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from './AuthContext';
import Home from './home';

// API URL configuration - automatically detect server address
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5001';
  
  // Log connection details for debugging
  console.log('Current hostname:', hostname);
  console.log('Current protocol:', protocol);
  console.log('Current full URL:', window.location.href);
  
  // If running locally, use localhost, otherwise use the current hostname
  const apiUrl = `${protocol}//${hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname}:${port}`;
  console.log('API URL:', apiUrl);
  return apiUrl;
};

const API_URL = getApiUrl();

// Reuse the same theme from App.tsx
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
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

interface Workout {
  start_time: string;
  exercise_title: string;
  weight_kg: number;
  reps: number;
}

// PowerliftingMetrics interface (no ipfPoints)
interface PowerliftingMetrics {
  dots: number;
  wilks: number;
}

// Add weight input interface
interface WeightInput {
  bench: number | null;
  squat: number | null;
  deadlift: number | null;
}

// Fix DOTS calculation function with correct official coefficients
const calculateDOTS = (total: number, bodyweight: number): number => {
  // Using the official OpenPowerlifting DOTS formula and coefficients (unisex)
  // Source: https://openpowerlifting.gitlab.io/opl-docs/background/scoring.html
  const a = 47.46178854;
  const b = 8.472061379;
  const c = 0.07369410346;
  const d = -0.002395190333;
  const e = 0.0000332659846;
  const f = -0.00000019333;

  const w = bodyweight;
  
  // The formula is a 6-term polynomial: a + b*w + c*w^2 + d*w^3 + e*w^4 + f*w^5
  const denominator = a + 
                     (b * w) + 
                     (c * Math.pow(w, 2)) + 
                     (d * Math.pow(w, 3)) + 
                     (e * Math.pow(w, 4)) + 
                     (f * Math.pow(w, 5));
                     
  if (denominator <= 0 || !isFinite(denominator)) {
    console.error('Invalid DOTS denominator:', denominator);
    return 0;
  }
  
  // Calculate DOTS score
  const dots = total * (500 / denominator);
  
  console.log('DOTS Calculation:', {
    total,
    bodyweight,
    denominator,
    dots
  });
  
  // Safety check for final result
  if (!isFinite(dots) || dots < 0) {
    console.error('Invalid DOTS score:', dots);
    return 0;
  }
  
  return Math.round(dots * 100) / 100; // Round to 2 decimal places
};

// Fix Wilks calculation with verified formula
const calculateWilks = (total: number, bodyweight: number, isMale: boolean): number => {
  // Coefficients for Wilks (2017)
  const coefficients = isMale ? {
    // Men's coefficients
    a: -216.0475144,
    b: 16.2606339,
    c: -0.002388645,
    d: -0.00113732,
    e: 7.01863E-06,
    f: -1.291E-08
  } : {
    // Women's coefficients
    a: 594.31747775582,
    b: -27.23842536447,
    c: 0.82112226871,
    d: -0.00930733913,
    e: 4.731582E-05,
    f: -9.054E-08
  };
  
  // Calculate denominator using kg values
  const bw = bodyweight;
  const denominator = coefficients.a + 
                     coefficients.b * bw + 
                     coefficients.c * Math.pow(bw, 2) + 
                     coefficients.d * Math.pow(bw, 3) + 
                     coefficients.e * Math.pow(bw, 4) + 
                     coefficients.f * Math.pow(bw, 5);
  
  // Safety check
  if (denominator <= 0 || !isFinite(denominator)) {
    console.error('Invalid Wilks denominator:', denominator);
    return 0;
  }
  
  // Calculate Wilks score using kg values
  const wilks = 500 / denominator;
  const score = total * wilks;
  
  console.log('Wilks Calculation:', {
    total,
    bodyweight,
    denominator,
    wilks,
    score
  });
  
  // Safety check for final result
  if (!isFinite(score) || score < 0) {
    console.error('Invalid Wilks score:', score);
    return 0;
  }
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
};

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Home />;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)',
        pb: 4,
      }}>
        <Navigation />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 4 }}>
            <img
              src="/512x512.svg"
              alt="Hevy Load Logo"
              style={{ width: '150px', height: 'auto', display: 'block', margin: '0 auto' }}
            />
          </Box>
          <Typography variant="h4" component="h1" sx={{
            textAlign: 'center',
            mb: 4,
            color: 'primary.main',
            textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            Hevy - Load
          </Typography>
          <Typography variant="h5" sx={{ mb: 6, color: 'text.secondary', textAlign: 'center' }}>
            Track and visualize your workout progress. Import your data from Hevy and get beautiful analytics!
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.open('https://hevy.com/settings?export', '_blank')}
              sx={{
                width: '300px',
                height: '60px',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.light',
                  backgroundColor: 'rgba(144, 202, 249, 0.1)',
                },
              }}
            >
              Export from Hevy
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                width: '300px',
                height: '60px',
                background: 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)',
                boxShadow: '0 3px 5px 2px rgba(144, 202, 249, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                width: '300px',
                height: '60px',
                background: 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)',
                boxShadow: '0 3px 5px 2px rgba(244, 143, 177, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #f06292 30%, #ec407a 90%)',
                },
              }}
            >
              Login
            </Button>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default LandingPage; 