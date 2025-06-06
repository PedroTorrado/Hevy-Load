import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Divider,
  IconButton
} from '@mui/material';
import { format, addDays, subDays } from 'date-fns';
import Navigation from './Navigation';

interface Workout {
  start_time: string;
  exercise_title: string;
  weight_kg: number;
  reps: number;
  distance_km?: number;
  duration_seconds?: number;
  rpe?: number;
}

interface WorkoutDetailsProps {
  workouts: Workout[];
}

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

function WorkoutDetails({ workouts }: WorkoutDetailsProps) {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  // Get all unique workout dates
  const workoutDates = useMemo(() => {
    const dates = workouts.map(w => {
      const d = new Date(w.start_time);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    });
    return Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [workouts]);

  // Find the next and previous workout dates
  const { prevDate, nextDate } = useMemo(() => {
    const currentDate = new Date(date!);
    const currentDateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    ).toISOString();

    const currentIndex = workoutDates.findIndex(d => d === currentDateStr);
    
    if (currentIndex === -1) {
      return { prevDate: null, nextDate: null };
    }

    return {
      prevDate: currentIndex > 0 ? workoutDates[currentIndex - 1] : null,
      nextDate: currentIndex < workoutDates.length - 1 ? workoutDates[currentIndex + 1] : null
    };
  }, [workoutDates, date]);

  // Filter workouts for the selected date and sort by start_time
  const dateWorkouts = workouts
    .filter(workout => {
      const workoutDate = new Date(workout.start_time);
      const selectedDate = new Date(date!);
      // Compare only the date part (year, month, day) ignoring time
      return workoutDate.getFullYear() === selectedDate.getFullYear() &&
             workoutDate.getMonth() === selectedDate.getMonth() &&
             workoutDate.getDate() === selectedDate.getDate();
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Group workouts by exercise while maintaining chronological order
  const groupedWorkouts = dateWorkouts.reduce((acc, workout) => {
    if (!acc[workout.exercise_title]) {
      acc[workout.exercise_title] = [];
    }
    acc[workout.exercise_title].push(workout);
    return acc;
  }, {} as Record<string, Workout[]>);

  // Get the workout start time for the day
  const workoutStartTime = dateWorkouts.length > 0 
    ? format(new Date(dateWorkouts[0].start_time), 'h:mm a')
    : null;

  // Debug logging
  console.log('Selected date:', date);
  console.log('All workouts:', workouts);
  console.log('Filtered workouts for date:', dateWorkouts);
  console.log('Grouped workouts:', groupedWorkouts);

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
          <Box sx={{ my: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              textAlign: 'center',
              mb: 4,
              color: 'primary.main',
              textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
            }}>
              Workout Details
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 4 
            }}>
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                alignItems: 'center',
                background: 'linear-gradient(145deg, rgba(144, 202, 249, 0.1) 0%, rgba(144, 202, 249, 0.05) 100%)',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(144, 202, 249, 0.2)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              }}>
                <Button
                  onClick={() => prevDate && navigate(`/workout/${prevDate}`)}
                  disabled={!prevDate}
                  sx={{
                    minWidth: '40px',
                    height: '40px',
                    color: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(144, 202, 249, 0.2)',
                      transform: 'translateX(-2px)',
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  ←
                </Button>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                    minWidth: '200px',
                    textAlign: 'center',
                    display: 'block',
                  }}
                >
                  {format(new Date(date!), 'MMMM d, yyyy')}
                </Typography>
                <Button
                  onClick={() => nextDate && navigate(`/workout/${nextDate}`)}
                  disabled={!nextDate}
                  sx={{
                    minWidth: '40px',
                    height: '40px',
                    color: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(144, 202, 249, 0.2)',
                      transform: 'translateX(2px)',
                    },
                    '&.Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  →
                </Button>
              </Box>
            </Box>

            {workoutStartTime && (
              <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
                Workout started at {workoutStartTime}
              </Typography>
            )}

            {Object.entries(groupedWorkouts).map(([exercise, sets]) => (
              <Paper
                key={exercise}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  {exercise}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {sets.map((set, index) => (
                    <React.Fragment key={`${set.start_time}-${index}`}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: 'rgba(144, 202, 249, 0.1)',
                        }}
                      >
                        <Typography sx={{ 
                          fontWeight: 'bold',
                          color: 'primary.main',
                          minWidth: '60px',
                          mr: 2
                        }}>
                          Set {index + 1}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {set.weight_kg > 0 && (
                            <Typography sx={{ fontWeight: 'medium' }}>
                              {set.weight_kg} kg
                            </Typography>
                          )}
                          {set.reps > 0 && (
                            <Typography sx={{ fontWeight: 'medium' }}>
                              × {set.reps} reps
                            </Typography>
                          )}
                          {set.distance_km && (
                            <Typography sx={{ color: 'text.secondary', ml: 2 }}>
                              {set.distance_km} km
                            </Typography>
                          )}
                          {set.duration_seconds && (
                            <Typography sx={{ color: 'text.secondary', ml: 2 }}>
                              {Math.floor(set.duration_seconds / 60)}:{(set.duration_seconds % 60).toString().padStart(2, '0')}
                            </Typography>
                          )}
                          {set.rpe && (
                            <Typography sx={{ color: 'text.secondary', ml: 2 }}>
                              RPE: {set.rpe}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {index < sets.length - 1 && (
                        <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                      )}
                    </React.Fragment>
                  ))}
                </Box>
              </Paper>
            ))}

            {dateWorkouts.length === 0 && (
              <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                No workouts found for this date.
              </Typography>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default WorkoutDetails; 