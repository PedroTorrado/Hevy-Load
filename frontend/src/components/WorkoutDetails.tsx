import React from 'react';
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
  Divider
} from '@mui/material';
import { format } from 'date-fns';

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

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
            sx={{ mb: 4 }}
          >
            Back to Dashboard
          </Button>

          <Typography variant="h5" sx={{ mb: 1, color: 'primary.main' }}>
            {format(new Date(date!), 'MMMM d, yyyy')}
          </Typography>
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
    </ThemeProvider>
  );
}

export default WorkoutDetails; 