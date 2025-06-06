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
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [isMale, setIsMale] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<PowerliftingMetrics | null>(null);
  const [prs, setPrs] = useState<{
    bench: { weight: number; reps: number; date: string; firstAchieved: string } | null;
    squat: { weight: number; reps: number; date: string; firstAchieved: string } | null;
    deadlift: { weight: number; reps: number; date: string; firstAchieved: string } | null;
  }>({
    bench: null,
    squat: null,
    deadlift: null
  });

  // getClassification only accepts 'dots' or 'wilks'
  const getClassification = (score: number, metric: 'dots' | 'wilks'): string => {
    switch (metric) {
      case 'dots':
        if (score >= 500) return 'Elite';
        if (score >= 400) return 'Advanced';
        if (score >= 275) return 'Intermediate';
        if (score >= 200) return 'Novice';
        return 'Beginner';
      case 'wilks':
        if (score >= 400) return 'Elite';
        if (score >= 325) return 'Advanced';
        if (score >= 250) return 'Intermediate';
        if (score >= 175) return 'Novice';
        return 'Beginner';
      default:
        return 'Beginner';
    }
  };

  const fetchPRs = async () => {
    try {
      console.log('Attempting to fetch workouts from:', `${API_URL}/api/workouts`);
      const response = await axios.get(`${API_URL}/api/workouts`);
      const workouts = response.data;
      console.log('Successfully fetched workouts:', workouts.length);

      // Helper function to find PR and first achievement for an exercise
      const findPR = (exerciseName: string, workouts: Workout[]) => {
        const exerciseWorkouts = workouts.filter((w: Workout) => 
          w.exercise_title.toLowerCase().includes(exerciseName.toLowerCase())
        );
        
        if (!exerciseWorkouts.length) return null;
        
        // Sort by date to find first achievement
        const sortedWorkouts = [...exerciseWorkouts].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        
        // Find the workout with the highest weight
        const pr = exerciseWorkouts.reduce((max: Workout, current: Workout) => 
          current.weight_kg > max.weight_kg ? current : max
        );
        
        // Find when this weight was first achieved
        const firstAchievement = sortedWorkouts.find(w => w.weight_kg >= pr.weight_kg);
        
        return {
          weight: pr.weight_kg,
          reps: pr.reps,
          date: pr.start_time,
          firstAchieved: firstAchievement?.start_time || pr.start_time
        };
      };

      setPrs({
        bench: findPR('bench press', workouts),
        squat: findPR('squat', workouts),
        deadlift: findPR('deadlift', workouts)
      });
    } catch (error) {
      console.error('Error fetching PRs:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          response: error.response,
          request: error.request
        });
        if (!error.response) {
          setError(`Cannot connect to server at ${API_URL}. Please check if the server is running and accessible.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  // In useEffect, only calculate and set dots and wilks
  useEffect(() => {
    if (bodyweight && prs.bench && prs.squat && prs.deadlift) {
      const total = prs.bench.weight + prs.squat.weight + prs.deadlift.weight;
      const dots = calculateDOTS(total, bodyweight);
      const wilks = calculateWilks(total, bodyweight, isMale);
      setMetrics({
        dots,
        wilks
      });
    } else {
      setMetrics(null);
    }
  }, [bodyweight, isMale, prs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const PRCard = ({ title, pr, color }: { 
    title: string; 
    pr: { 
      weight: number; 
      reps: number; 
      date: string;
      firstAchieved: string;
    } | null; 
    color: string 
  }) => {
    const navigate = useNavigate();

    const handleDateClick = (date: string) => {
      navigate(`/workout/${date}`);
    };

    return (
      <Paper 
        sx={{ 
          p: 4,
          borderRadius: 2,
          background: `linear-gradient(145deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
          },
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 24px ${color}20`,
          },
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2,
            color: `${color}`,
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </Typography>
        
        {pr ? (
          <>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                color: 'white',
                textShadow: `0 0 20px ${color}40`,
                mb: 1,
              }}
            >
              {pr.weight} kg
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary',
                mb: 2,
              }}
            >
              {pr.reps} reps
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 0.5,
              borderTop: `1px solid ${color}20`,
              pt: 2,
              mt: 2
            }}>
              <Box 
                onClick={() => handleDateClick(pr.firstAchieved)}
                sx={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    '& .date-text': {
                      color: `${color}`,
                    },
                    '& .date-icon': {
                      opacity: 1,
                    }
                  }
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    opacity: 0.8,
                  }}
                >
                  First achieved:
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  transition: 'all 0.2s ease-in-out',
                }}>
                  <Typography 
                    variant="body2" 
                    className="date-text"
                    sx={{ 
                      color: 'text.secondary',
                      opacity: 0.8,
                      transition: 'color 0.2s ease-in-out',
                    }}
                  >
                    {formatDate(pr.firstAchieved)}
                  </Typography>
                  <Box 
                    className="date-icon"
                    sx={{ 
                      opacity: 0,
                      transition: 'opacity 0.2s ease-in-out',
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    →
                  </Box>
                </Box>
              </Box>
              {pr.firstAchieved !== pr.date && (
                <Box 
                  onClick={() => handleDateClick(pr.date)}
                  sx={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      '& .date-text': {
                        color: `${color}`,
                      },
                      '& .date-icon': {
                        opacity: 1,
                      }
                    }
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      opacity: 0.8,
                    }}
                  >
                    Latest PR:
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    transition: 'all 0.2s ease-in-out',
                  }}>
                    <Typography 
                      variant="body2" 
                      className="date-text"
                      sx={{ 
                        color: 'text.secondary',
                        opacity: 0.8,
                        transition: 'color 0.2s ease-in-out',
                      }}
                    >
                      {formatDate(pr.date)}
                    </Typography>
                    <Box 
                      className="date-icon"
                      sx={{ 
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      →
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            No PR yet
          </Typography>
        )}
      </Paper>
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadLoading(true);
      setError(null);
      setUploadSuccess(false);
      
      console.log('Attempting to upload file to:', `${API_URL}/api/upload`);
      // Add timeout to the request
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Clear the file input
      event.target.value = '';
      
      // Wait for PRs to be fetched
      await fetchPRs();
      
      // Add a small delay to ensure data is properly processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message instead of navigating
      setUploadSuccess(true);
    } catch (error) {
      console.error('Error uploading file:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          response: error.response,
          request: error.request
        });
        if (error.code === 'ECONNABORTED') {
          setError('Upload timed out. Please try again.');
        } else if (error.response) {
          setError(error.response.data.error || 'Failed to upload file. Please try again.');
        } else if (error.request) {
          setError(`Cannot connect to server at ${API_URL}. Please check if the server is running and accessible.`);
        } else {
          setError('Failed to upload file. Please try again.');
        }
      } else {
        setError('Failed to upload file. Please try again.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // Update PowerliftingMetricsCard to only show DOTS and Wilks
  const PowerliftingMetricsCard = () => {
    if (!metrics) return null;
    return (
      <Paper 
        sx={{ 
          p: 4,
          borderRadius: 2,
          background: 'linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          mt: 3,
          width: '100%',
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, color: 'primary.main' }}>
          Powerlifting Metrics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>DOTS Score</Typography>
              <Typography variant="h4" sx={{ color: '#90caf9' }}>{metrics.dots}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {getClassification(metrics.dots, 'dots')}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>Wilks Score</Typography>
              <Typography variant="h4" sx={{ color: '#f48fb1' }}>{metrics.wilks}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {getClassification(metrics.wilks, 'wilks')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3, textAlign: 'center' }}>
          Note: These scores are calculated using your total (bench + squat + deadlift) and bodyweight.
          DOTS and Wilks points are relative strength scores that help compare lifters of different bodyweights.
        </Typography>
      </Paper>
    );
  };

  // Update the WeightInputCard component
  const WeightInputCard = () => {
    const [localWeight, setLocalWeight] = useState<string>(bodyweight?.toString() || '');
    const [touched, setTouched] = useState(false);
    // Handle weight changes
    const handleWeightChange = (newValue: number | string) => {
      const numValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
      if (!isNaN(numValue) && numValue >= 30 && numValue <= 200) {
        setBodyweight(numValue);
        setLocalWeight(numValue.toString());
      } else if (newValue === '') {
        setBodyweight(null);
        setLocalWeight('');
      }
    };

    // Handle text input changes
    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setLocalWeight(value);
      if (value === '') {
        setBodyweight(null);
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 30 && numValue <= 200) {
          setBodyweight(numValue);
        }
      }
    };

    // Handle increment/decrement
    const handleIncrement = (amount: number) => {
      const currentValue = bodyweight || 0;
      const newValue = Math.min(Math.max(currentValue + amount, 30), 200);
      handleWeightChange(newValue);
    };

    const isInvalid = localWeight !== '' && (parseFloat(localWeight) < 30 || parseFloat(localWeight) > 200);

    return (
      <Paper 
        sx={{ 
          p: 4,
          borderRadius: 2,
          background: 'linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          mt: 3,
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #90caf9 0%, #64b5f6 100%)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: 'primary.main', flex: 1 }}>
            Enter Your Bodyweight
          </Typography>
        </Box>

        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'auto', height: '44px' }}>
          <TextField
            value={localWeight}
            onChange={handleTextChange}
            type="number"
            label=" "
            placeholder=" "
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            onBlur={() => setTouched(true)}
            InputProps={{
              inputProps: { 
                min: 30, 
                max: 200,
                step: 0.5,
                style: { textAlign: 'center', fontSize: '1.2rem', width: '100px', padding: 0, MozAppearance: 'textfield', borderRadius: '999px', height: '44px', boxSizing: 'border-box' }
              },
              endAdornment: (
                <InputAdornment position="end" sx={{ ml: 1 }}>
                  <Box sx={{
                    px: 2.5,
                    py: 0,
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #90caf9 0%, #64b5f6 100%)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    letterSpacing: 1,
                    minWidth: '36px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '44px',
                    lineHeight: '44px',
                  }}>
                    kg
                  </Box>
                </InputAdornment>
              )
            }}
            FormHelperTextProps={{ sx: { minHeight: '24px', textAlign: 'center', width: '100%' } }}
            sx={{
              width: '170px',
              height: '44px',
              '& input[type=number]': {
                MozAppearance: 'textfield', // Firefox
                textAlign: 'center',
              },
              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: '999px',
                boxShadow: '0 2px 12px 0 rgba(144,202,249,0.10)',
                background: 'rgba(255,255,255,0.06)',
                fontSize: '1.2rem',
                paddingRight: '0px',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid',
                borderColor: 'primary.light',
                '&:hover, &.Mui-focused': {
                  boxShadow: '0 4px 16px 0 rgba(144,202,249,0.18)',
                  borderColor: 'primary.main',
                },
                '& fieldset': {
                  border: 'none',
                },
                justifyContent: 'center',
              },
              '& .MuiInputLabel-root': {
                fontSize: '1rem',
                color: 'primary.light',
                fontWeight: 500,
                letterSpacing: 1,
                background: 'rgba(30,30,30,0.85)',
                px: 0.5,
                borderRadius: '8px',
                left: '18px',
                top: '-10px',
                zIndex: 2,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
                background: 'rgba(30,30,30,1)',
              },
              '& input::placeholder': {
                color: '#b0c4d8',
                opacity: 1,
                fontSize: '1.1rem',
              },
              textAlign: 'center',
            }}
            error={touched && isInvalid}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => handleIncrement(-1)}
            sx={{
              minWidth: '36px',
              minHeight: '36px',
              width: '36px',
              height: '36px',
              fontSize: '1.3rem',
              borderRadius: '50%',
              borderColor: 'primary.main',
              color: 'primary.main',
              background: 'rgba(144,202,249,0.03)',
              boxShadow: 'none',
              p: 0,
              transition: 'background 0.2s, border-color 0.2s',
              '&:hover': {
                background: 'rgba(144,202,249,0.10)',
                borderColor: 'primary.light',
              },
            }}
          >
            –
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleIncrement(1)}
            sx={{
              minWidth: '36px',
              minHeight: '36px',
              width: '36px',
              height: '36px',
              fontSize: '1.3rem',
              borderRadius: '50%',
              borderColor: 'primary.main',
              color: 'primary.main',
              background: 'rgba(144,202,249,0.03)',
              boxShadow: 'none',
              p: 0,
              transition: 'background 0.2s, border-color 0.2s',
              '&:hover': {
                background: 'rgba(144,202,249,0.10)',
                borderColor: 'primary.light',
              },
            }}
          >
            +
          </Button>
        </Box>

        {/* Gender selection */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
          <Button
            variant={isMale ? "contained" : "outlined"}
            onClick={() => setIsMale(true)}
            sx={{
              minWidth: '100px',
              background: isMale ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)' : 'transparent',
              '&:hover': {
                background: isMale ? 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)' : 'rgba(144, 202, 249, 0.1)',
              },
            }}
          >
            Male
          </Button>
          <Button
            variant={!isMale ? "contained" : "outlined"}
            onClick={() => setIsMale(false)}
            sx={{
              minWidth: '100px',
              background: !isMale ? 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)' : 'transparent',
              '&:hover': {
                background: !isMale ? 'linear-gradient(45deg, #f06292 30%, #ec407a 90%)' : 'rgba(244, 143, 177, 0.1)',
              },
            }}
          >
            Female
          </Button>
        </Box>

        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary', 
            mt: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: 'center',
            '& .MuiSvgIcon-root': {
              fontSize: '1rem'
            }
          }}
        >
          <InfoIcon />
          All calculations use kilograms (kg) for both bodyweight and lifts.
          Enter a weight between 30kg and 200kg.
        </Typography>
      </Paper>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)',
        pb: 4,
      }}>
        <Navigation />

        <Container maxWidth="lg">
          <Box sx={{ 
            my: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center'
          }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ 
              color: 'primary.main',
              textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
              mb: 4
            }}>
              Hevy - Load
            </Typography>
            
            <Typography variant="h5" sx={{ mb: 6, color: 'text.secondary' }}>
              Track and visualize your workout progress
            </Typography>

            {/* PRs Section */}
            <Box sx={{ width: '100%', maxWidth: '1000px', mb: 6 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  mb: 4, 
                  color: 'primary.main',
                  textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                  fontWeight: 600,
                }}
              >
                Personal Records
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              ) : (
                <>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <PRCard 
                        title="Bench Press" 
                        pr={prs.bench} 
                        color="#90caf9"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <PRCard 
                        title="Squat" 
                        pr={prs.squat} 
                        color="#f48fb1"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <PRCard 
                        title="Deadlift" 
                        pr={prs.deadlift} 
                        color="#66bb6a"
                      />
                    </Grid>
                  </Grid>
                  <WeightInputCard />
                  <PowerliftingMetricsCard />
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="upload-button-file"
                type="file"
                onChange={handleFileUpload}
                capture="environment"
              />

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

              <label htmlFor="upload-button-file">
                <Button
                  variant="contained"
                  size="large"
                  component="span"
                  disabled={uploadLoading}
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
                  {uploadLoading ? 'Uploading...' : 'Import Workout Data'}
                </Button>
              </label>

              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{
                  width: '300px',
                  height: '60px',
                  background: uploadSuccess 
                    ? 'linear-gradient(45deg, #4caf50 30%, #45a049 90%)'
                    : 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)',
                  boxShadow: uploadSuccess
                    ? '0 3px 5px 2px rgba(76, 175, 80, .3)'
                    : '0 3px 5px 2px rgba(144, 202, 249, .3)',
                  animation: uploadSuccess ? 'pulse 2s infinite' : 'none',
                  '&:hover': {
                    background: uploadSuccess
                      ? 'linear-gradient(45deg, #45a049 30%, #3d8b40 90%)'
                      : 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)',
                  },
                }}
              >
                {uploadSuccess ? 'View Your Data →' : 'Go to Dashboard'}
              </Button>
            </Box>

            <Box 
              sx={{ 
                display: 'flex', 
                gap: 3, 
                flexWrap: 'wrap', 
                justifyContent: 'center',
                mt: 4
              }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/workouts')}
                >
                  View Workouts
                </Button>
            </Box>

            <Snackbar 
              open={!!error} 
              autoHideDuration={6000} 
              onClose={() => setError(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            </Snackbar>

            <Snackbar 
              open={uploadSuccess} 
              autoHideDuration={6000} 
              onClose={() => setUploadSuccess(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert onClose={() => setUploadSuccess(false)} severity="success" sx={{ width: '100%' }}>
                Data uploaded successfully! Click the dashboard button to view your progress.
              </Alert>
            </Snackbar>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default LandingPage; 