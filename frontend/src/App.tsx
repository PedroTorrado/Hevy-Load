import React, { useState, useEffect, useMemo } from 'react';
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
  Checkbox,
  FormControlLabel,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import axios from 'axios';

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

function App() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('All');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter'>('line');
  const [xAxis, setXAxis] = useState<string>('start_time');
  const [yAxis, setYAxis] = useState<string>('weight_kg');
  const [showTopSets, setShowTopSets] = useState<boolean>(false);
  const [evenDateSpacing, setEvenDateSpacing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [selectedExercise]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/exercises');
      setExercises(response.data);
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
      const response = await axios.get(`http://localhost:5000/api/workouts?exercise=${selectedExercise}`);
      console.log('Received workouts:', response.data);
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }
      setWorkouts(response.data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setError('Failed to fetch workouts. Please try again.');
      setWorkouts([]);
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
      const response = await axios.post('http://localhost:5000/api/upload', formData);
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

  const getChartData = useMemo(() => {
    if (!workouts.length) {
      return {
        labels: [],
        datasets: [{
          label: `${yAxis} vs ${xAxis}`,
          data: [],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
        }]
      };
    }

    let filteredWorkouts = [...workouts];
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
    filteredWorkouts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const labels = filteredWorkouts.map(w => w[xAxis as keyof Workout]);
    const data = filteredWorkouts.map(w => w[yAxis as keyof Workout]);
    return {
      labels,
      datasets: [{
        label: `${yAxis} vs ${xAxis}`,
        data,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
      }]
    };
  }, [workouts, showTopSets, xAxis, yAxis]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: true,
        text: `${yAxis} vs ${xAxis}`,
      },
    },
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ 
            textAlign: 'center',
            mb: 4,
            color: 'primary.main',
            textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
          }}>
            Workout Data Visualization
          </Typography>

          {error && (
            <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(12, 1fr)', 
            gap: 3, 
            mb: 4,
            '& .MuiFormControl-root': {
              backgroundColor: 'background.paper',
              borderRadius: 1,
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
                    },
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
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="All">All Exercises</MenuItem>
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

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showTopSets}
                    onChange={(e) => setShowTopSets(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Show only top sets"
              />
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={evenDateSpacing}
                    onChange={(e) => setEvenDateSpacing(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Show even date spacing"
              />
            </Box>
          </Box>

          <Paper 
            sx={{ 
              p: 3,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
            }}
          >
            <Box sx={{ height: 500, position: 'relative' }}>
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
                }}>
                  <Typography variant="h6">
                    No data available. Please upload a CSV file.
                  </Typography>
                </Box>
              ) : (
                <>
                  {chartType === 'line' && <Line data={getChartData} options={chartOptions} />}
                  {chartType === 'bar' && <Bar data={getChartData} options={chartOptions} />}
                  {chartType === 'scatter' && <Scatter data={getChartData} options={chartOptions} />}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
