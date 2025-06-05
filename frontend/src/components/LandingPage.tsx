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
  Snackbar
} from '@mui/material';
import axios from 'axios';

// API URL configuration - automatically detect server address
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5000';
  
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

function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prs, setPrs] = useState<{
    bench: { weight: number; reps: number; date: string; firstAchieved: string } | null;
    squat: { weight: number; reps: number; date: string; firstAchieved: string } | null;
    deadlift: { weight: number; reps: number; date: string; firstAchieved: string } | null;
  }>({
    bench: null,
    squat: null,
    deadlift: null
  });

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
      
      await fetchPRs();
      navigate('/dashboard');
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
            <label htmlFor="upload-button-file">
              <Button
                variant="contained"
                size="large"
                component="span"
                disabled={uploadLoading}
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.2rem',
                  minWidth: '200px',
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
              variant="outlined"
              size="large"
              onClick={() => window.open('https://hevy.com/settings?export', '_blank')}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                minWidth: '200px',
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
              onClick={() => navigate('/dashboard')}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                minWidth: '200px',
                background: 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)',
                boxShadow: '0 3px 5px 2px rgba(144, 202, 249, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)',
                },
              }}
            >
              Go to Dashboard
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
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default LandingPage; 