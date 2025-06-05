import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
  TimeScale,
  ChartData
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import axios from 'axios';
import WorkoutDetails from './WorkoutDetails';

// API URL configuration - automatically detect server address
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5000';
  // If running locally, use localhost, otherwise use the current hostname
  const apiUrl = `${protocol}//${hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname}:${port}`;
  return apiUrl;
};

const API_URL = getApiUrl();

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

// Create a custom theme
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
  distance_km?: number;
  duration_seconds?: number;
  rpe?: number;
}

function Dashboard({ workouts, setWorkouts }: { workouts: Workout[], setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>> }) {
  const navigate = useNavigate();
  const isMobile = window.matchMedia('(max-width:600px)').matches;
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>(() => {
    return localStorage.getItem('selectedExercise') || 'Bench Press (Barbell)';
  });
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter'>('line');
  const [xAxis, setXAxis] = useState<string>('start_time');
  const [yAxis, setYAxis] = useState<string>('weight_kg');
  const [showTopSets, setShowTopSets] = useState<boolean>(true);
  const [evenDateSpacing, setEvenDateSpacing] = useState<boolean>(true);
  const [showOnlySingleReps, setShowOnlySingleReps] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutData, setWorkoutData] = useState<Workout[]>([]);

  useEffect(() => {
    fetchExercises();
    fetchWorkouts();
  }, [selectedExercise]);

  useEffect(() => {
    // Filter workouts for the selected exercise
    const filteredWorkouts = workouts.filter(w => w.exercise_title === selectedExercise);
    setWorkoutData(filteredWorkouts);
  }, [selectedExercise, workouts]);

  const calculatePRs = useMemo(() => {
    if (!workoutData.length) return [];
    
    // Get fresh data for the selected exercise
    const exerciseWorkouts = workoutData
      .filter(w => w.weight_kg > 0 && w.reps > 0)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    if (!exerciseWorkouts.length) return [];

    // Debug logging for squat data
    if (selectedExercise.toLowerCase().includes('squat')) {
      console.log('Squat workouts before filtering:', exerciseWorkouts);
    }
    
    // Filter for single reps if the toggle is on
    const filteredWorkouts = showOnlySingleReps 
      ? exerciseWorkouts.filter(w => w.reps === 1)
      : exerciseWorkouts;
    
    // Debug logging for squat data
    if (selectedExercise.toLowerCase().includes('squat')) {
      console.log('Squat workouts after filtering:', filteredWorkouts);
    }
    
    // Track PRs using a Map to prevent duplicates
    const prMap = new Map<number, { date: string; weight: number; reps: number }>();
    let currentMaxWeight = 0;
    
    filteredWorkouts.forEach(workout => {
      if (workout.weight_kg > currentMaxWeight) {
        currentMaxWeight = workout.weight_kg;
        prMap.set(workout.weight_kg, {
          date: workout.start_time,
          weight: workout.weight_kg,
          reps: workout.reps
        });
      }
    });
    
    // Debug logging for squat data
    if (selectedExercise.toLowerCase().includes('squat')) {
      console.log('Squat PRs before sorting:', Array.from(prMap.values()));
    }
    
    // Convert to array and sort by weight (highest first)
    const sortedPRs = Array.from(prMap.values())
      .sort((a, b) => b.weight - a.weight);

    // Debug logging for squat data
    if (selectedExercise.toLowerCase().includes('squat')) {
      console.log('Final sorted PRs:', sortedPRs);
    }

    return sortedPRs;
  }, [workoutData, selectedExercise, showOnlySingleReps]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/exercises`);
      const exercisesList = response.data;
      setExercises(exercisesList);
      // If the saved exercise exists in the list, use it, otherwise use Bench Press
      if (exercisesList.includes(selectedExercise)) {
        setSelectedExercise(selectedExercise);
      } else if (exercisesList.includes('Bench Press (Barbell)')) {
        setSelectedExercise('Bench Press (Barbell)');
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setError('Failed to fetch exercises. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching workouts for exercise:', selectedExercise);
      const response = await axios.get(`${API_URL}/api/workouts`);
      
      // Debug logging for squat data
      if (selectedExercise.toLowerCase().includes('squat')) {
        console.log('Raw squat data from API:', response.data);
      }
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }
      setWorkouts(response.data);
      // Filter workouts for the selected exercise
      const filteredWorkouts = response.data.filter(w => w.exercise_title === selectedExercise);
      setWorkoutData(filteredWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setError('Failed to fetch workouts. Please try again.');
      setWorkouts([]);
      setWorkoutData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${API_URL}/api/upload`, formData);
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      await fetchWorkouts();
      await fetchExercises();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please check the file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePointClick = (date: string) => {
    navigate(`/workout/${date}`);
  };

  const getChartData = useMemo(() => {
    if (!workoutData.length) {
      return {
        datasets: [{
          label: `${yAxis} vs ${xAxis}`,
          data: [],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
        }]
      };
    }

    let filteredWorkouts = [...workoutData];
    if (showTopSets) {
      const topSets = new Map<string, Workout>();
      filteredWorkouts.forEach(workout => {
        const key = `${workout.start_time}-${workout.exercise_title}`;
        if (!topSets.has(key) || workout.weight_kg > topSets.get(key)!.weight_kg) {
          topSets.set(key, workout);
        }
      });
      filteredWorkouts = Array.from(topSets.values());
    }

    // Sort workouts by date
    filteredWorkouts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // If even date spacing is enabled and x-axis is start_time
    if (evenDateSpacing && xAxis === 'start_time') {
      const dates = filteredWorkouts.map(w => new Date(w.start_time));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      // Create evenly spaced dates
      const numPoints = filteredWorkouts.length;
      const timeStep = (maxDate.getTime() - minDate.getTime()) / (numPoints - 1);
      
      // Create new array with evenly spaced dates
      const data = filteredWorkouts.map((workout, index) => ({
        x: new Date(minDate.getTime() + timeStep * index),
        y: Number(workout[yAxis as keyof Workout]) || 0,
        originalDate: workout.start_time
      }));

      return {
        datasets: [{
          label: `${yAxis} vs ${xAxis}`,
          data,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
        }]
      };
    }

    // For non-even date spacing or non-time x-axis
    const data = filteredWorkouts.map(w => {
      const xValue = w[xAxis as keyof Workout];
      const yValue = w[yAxis as keyof Workout];
      
      return {
        x: xAxis === 'start_time' ? new Date(xValue as string) : Number(xValue) || 0,
        y: Number(yValue) || 0,
        originalDate: w.start_time
      };
    });

    return {
      datasets: [{
        label: `${yAxis} vs ${xAxis}`,
        data,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
      }]
    };
  }, [workoutData, showTopSets, xAxis, yAxis, evenDateSpacing]);

  const getLineChartData = () => getChartData as ChartData<'line', { x: Date | number; y: number }[]>;
  const getBarChartData = () => getChartData as ChartData<'bar', { x: Date | number; y: number }[]>;
  const getScatterChartData = () => getChartData as ChartData<'scatter', { x: Date | number; y: number }[]>;

  const getAxisLabel = (axis: string) => {
    switch (axis) {
      case 'start_time':
        return 'Date';
      case 'weight_kg':
        return 'Weight (kg)';
      case 'reps':
        return 'Reps';
      case 'distance_km':
        return 'Distance (km)';
      case 'duration_seconds':
        return 'Duration (seconds)';
      case 'rpe':
        return 'RPE';
      default:
        return axis;
    }
  };

  const chartOptions: ChartOptions<'line' | 'bar' | 'scatter'> = {
    responsive: true,
    plugins: {
      legend: {
        display: !isMobile,
      },
      title: {
        display: true,
        text: `${getAxisLabel(yAxis)} vs ${getAxisLabel(xAxis)}`,
        font: { size: isMobile ? 14 : 18 }
      },
      tooltip: {
        bodyFont: { size: isMobile ? 10 : 14 },
        callbacks: {
          title: function(context: any) {
            // Always show the actual workout date in the tooltip
            const date = new Date(context[0].raw.originalDate);
            return format(date, 'MMM d, yyyy');
          },
          label: function(context: any) {
            return [
              `${getAxisLabel(yAxis)}: ${context.raw.y}`,
              'Click to view workout details'
            ];
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const data = getChartData.datasets[0].data[index];
        if (data && data.originalDate) {
          handlePointClick(data.originalDate);
        }
      }
    },
    scales: {
      x: xAxis === 'start_time' ? {
        type: 'time' as const,
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d, yyyy'
          },
          tooltipFormat: 'MMM d, yyyy'
        },
        title: {
          display: true,
          text: getAxisLabel(xAxis)
        },
        ticks: {
          source: 'auto',
          autoSkip: true,
          maxRotation: isMobile ? 0 : 45,
          minRotation: isMobile ? 0 : 45,
          font: { size: isMobile ? 10 : 14 }
        }
      } : {
        type: 'linear' as const,
        title: {
          display: true,
          text: getAxisLabel(xAxis)
        },
        ticks: { font: { size: isMobile ? 10 : 14 } }
      },
      y: {
        type: 'linear' as const,
        title: {
          display: true,
          text: getAxisLabel(yAxis)
        },
        ticks: { font: { size: isMobile ? 10 : 14 } }
      }
    },
    maintainAspectRatio: false,
  };

  // Add function to calculate one rep max PRs
  const calculateOneRepMaxPRs = useMemo(() => {
    if (!workoutData.length) return [];
    
    // Get fresh data from the database for the selected exercise
    const exerciseWorkouts = workoutData
      .map(w => ({
        date: w.start_time,
        weight: w.weight_kg,
        reps: w.reps
      }))
      .filter(w => w.weight > 0 && w.reps > 0); // Basic validation
    
    if (!exerciseWorkouts.length) return [];
    
    // Create a Map to track the first occurrence of each 1RM
    const firstOccurrence = new Map<number, { date: string; weight: number; reps: number; oneRepMax: number }>();
    
    // Sort by date (oldest first) to ensure we get the first occurrence
    exerciseWorkouts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(workout => {
        // Brzycki formula: 1RM = weight × (36 / (37 - reps))
        const calculatedOneRepMax = workout.weight * (36 / (37 - workout.reps));
        const oneRepMax = Math.max(calculatedOneRepMax, workout.weight);
        const roundedOneRepMax = Math.round(oneRepMax);
        
        if (!firstOccurrence.has(roundedOneRepMax)) {
          firstOccurrence.set(roundedOneRepMax, {
            ...workout,
            oneRepMax: roundedOneRepMax
          });
        }
      });
    
    // Convert to array and sort by 1RM (highest first)
    return Array.from(firstOccurrence.values())
      .sort((a, b) => b.oneRepMax - a.oneRepMax);
  }, [workoutData, selectedExercise]);

  // Update the checkbox handler
  const handleSingleRepToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOnlySingleReps(event.target.checked);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ 
            textAlign: 'center',
            mb: 4,
            color: 'primary.main',
            textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            Hevy - Load
          </Typography>

          {error && (
            <Typography color="error" sx={{ 
              mb: 2, 
              textAlign: 'center',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.2)',
            }}>
              {error}
            </Typography>
          )}

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(12, 1fr)', 
            gap: 3, 
            mb: 4,
            '& .MuiFormControl-root': {
              backgroundColor: 'rgba(144, 202, 249, 0.05)',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.08)',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiSelect-select': {
              color: 'white',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(144, 202, 249, 0.2)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(144, 202, 249, 0.4)',
            },
          }}>
            <Box sx={{ gridColumn: 'span 12', textAlign: 'center' }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="raised-button-file">
                <Button 
                  variant="contained" 
                  component="span" 
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)',
                    boxShadow: '0 3px 5px 2px rgba(144, 202, 249, .3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 5px 15px rgba(144, 202, 249, .4)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {loading ? 'Uploading...' : 'Upload Workout CSV'}
                </Button>
              </label>
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
              <FormControl fullWidth>
                <InputLabel>Exercise</InputLabel>
                <Select
                  value={selectedExercise}
                  label="Exercise"
                  onChange={(e) => {
                    const newExercise = e.target.value;
                    setSelectedExercise(newExercise);
                    localStorage.setItem('selectedExercise', newExercise);
                  }}
                  disabled={loading}
                >
                  {exercises.map((exercise) => (
                    <MenuItem key={exercise} value={exercise}>
                      {exercise}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
              <FormControl fullWidth>
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={chartType}
                  label="Chart Type"
                  onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'scatter')}
                  disabled={loading}
                >
                  <MenuItem value="line">Line</MenuItem>
                  <MenuItem value="bar">Bar</MenuItem>
                  <MenuItem value="scatter">Scatter</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
              <FormControl fullWidth>
                <InputLabel>X Axis</InputLabel>
                <Select
                  value={xAxis}
                  label="X Axis"
                  onChange={(e) => setXAxis(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="start_time">Date</MenuItem>
                  <MenuItem value="weight_kg">Weight</MenuItem>
                  <MenuItem value="reps">Reps</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
              <FormControl fullWidth>
                <InputLabel>Y Axis</InputLabel>
                <Select
                  value={yAxis}
                  label="Y Axis"
                  onChange={(e) => setYAxis(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="weight_kg">Weight</MenuItem>
                  <MenuItem value="reps">Reps</MenuItem>
                  <MenuItem value="distance_km">Distance</MenuItem>
                  <MenuItem value="duration_seconds">Duration</MenuItem>
                  <MenuItem value="rpe">RPE</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ 
              gridColumn: { xs: 'span 12', md: 'span 6' },
              display: 'flex',
              gap: 2,
              '& .MuiFormControlLabel-root': {
                flex: 1,
                backgroundColor: 'rgba(144, 202, 249, 0.05)',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(144, 202, 249, 0.08)',
                },
              },
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showTopSets}
                    onChange={(e) => setShowTopSets(e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label="Show only top sets"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={evenDateSpacing}
                    onChange={(e) => setEvenDateSpacing(e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label="Show even date spacing"
              />
            </Box>
          </Box>

          <Paper 
            sx={{ 
              p: isMobile ? 1 : 3,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
              border: '1px solid rgba(144, 202, 249, 0.1)',
              overflowX: isMobile ? 'auto' : 'unset',
            }}
          >
            <Box
              sx={{
                width: '100%',
                minHeight: { xs: 250, sm: 350, md: 400 },
                maxHeight: { xs: 350, sm: 500, md: 600 },
                mx: 'auto',
                position: 'relative',
                overflowX: isMobile ? 'auto' : 'unset',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              ) : workouts.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  color: 'text.secondary',
                  backgroundColor: 'rgba(144, 202, 249, 0.05)',
                  borderRadius: 2,
                }}>
                  <Typography variant="h6">
                    No data available. Please upload a CSV file.
                  </Typography>
                </Box>
              ) : (
                <>
                  {chartType === 'line' && <Line data={getLineChartData()} options={chartOptions} />}
                  {chartType === 'bar' && <Bar data={getBarChartData()} options={chartOptions} />}
                  {chartType === 'scatter' && <Scatter data={getScatterChartData()} options={chartOptions} />}
                </>
              )}
            </Box>
          </Paper>

          {/* Add PRs Section */}
          {workouts.length > 0 && (
            <Paper 
              sx={{ 
                p: isMobile ? 1 : 3,
                mt: 3,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                border: '1px solid rgba(144, 202, 249, 0.1)',
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: isMobile ? 'center' : 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                mb: 2,
                gap: isMobile ? 2 : 0,
                '& .MuiFormControlLabel-root': {
                  backgroundColor: 'rgba(144, 202, 249, 0.05)',
                  padding: isMobile ? '6px 8px' : '8px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(144, 202, 249, 0.08)',
                  },
                },
              }}>
                <Typography variant="h6" sx={{ 
                  color: 'primary.main',
                  fontWeight: 600,
                  textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                }}>
                  Personal Records
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlySingleReps}
                      onChange={handleSingleRepToggle}
                      disabled={loading}
                      color="primary"
                    />
                  }
                  label="Show only single-rep PRs"
                />
              </Box>
              {calculatePRs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {calculatePRs.map((pr) => (
                    <Box 
                      key={`${pr.date}-${pr.weight}-${pr.reps}`}
                      onClick={() => handlePointClick(pr.date)}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'rgba(144, 202, 249, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(144, 202, 249, 0.2)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Typography>
                        {format(new Date(pr.date), 'MMM d, yyyy')}
                      </Typography>
                      <Typography sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                      }}>
                        {pr.weight} kg × {pr.reps} reps
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No PRs found for this exercise.
                </Typography>
              )}
            </Paper>
          )}

          {/* Add One Rep Max PRs Section */}
          {workouts.length > 0 && (
            <Paper 
              sx={{ 
                p: 3,
                mt: 3,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                border: '1px solid rgba(144, 202, 249, 0.1)',
              }}
            >
              <Typography variant="h6" sx={{ 
                mb: 2, 
                color: 'primary.main',
                fontWeight: 600,
                textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
              }}>
                Calculated One Rep Max PRs
              </Typography>
              {calculateOneRepMaxPRs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {calculateOneRepMaxPRs.map((pr) => (
                    <Box 
                      key={pr.date}
                      onClick={() => handlePointClick(pr.date)}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'rgba(144, 202, 249, 0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(144, 202, 249, 0.2)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Typography>
                        {format(new Date(pr.date), 'MMM d, yyyy')}
                      </Typography>
                      <Typography sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                      }}>
                        {pr.weight} kg × {pr.reps} reps (1RM: {pr.oneRepMax} kg)
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No one rep max PRs found for this exercise.
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default Dashboard; 