import 'package:flutter/material.dart';
import 'package:heavy_load/services/database_service.dart';
import 'package:heavy_load/models/workout.dart';
import 'package:table_calendar/table_calendar.dart';

class WorkoutsPage extends StatefulWidget {
  const WorkoutsPage({Key? key}) : super(key: key);

  @override
  State<WorkoutsPage> createState() => _WorkoutsPageState();
}

class _WorkoutsPageState extends State<WorkoutsPage> {
  List<Workout> allWorkouts = [];
  Map<DateTime, List<Workout>> _events = {};
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadWorkouts();
  }

  Future<void> _loadWorkouts() async {
    final data = await DatabaseService.getAllWorkouts();

    Map<DateTime, List<Workout>> grouped = {};
    for (var w in data) {
      if (w.date == null) continue;

      // Only keep year/month/day to avoid time issues
      final day = DateTime(w.date!.year, w.date!.month, w.date!.day);
      grouped.putIfAbsent(day, () => []);
      grouped[day]!.add(w);
    }

    setState(() {
      allWorkouts = data;
      _events = grouped;
    });
  }

  List<Workout> _workoutsForSelectedDate() {
    final day = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day);
    return _events[day] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Workouts')),
      body: Column(
        children: [
          // Calendar
          TableCalendar(
            firstDay: DateTime.utc(2020, 1, 1),
            lastDay: DateTime.utc(2030, 12, 31),
            focusedDay: _selectedDate,
            selectedDayPredicate: (day) => isSameDay(day, _selectedDate),
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDate = selectedDay;
              });
            },
            calendarStyle: CalendarStyle(
              todayDecoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              selectedDecoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
              markerDecoration: BoxDecoration(
                color: theme.colorScheme.secondary,
                shape: BoxShape.circle,
              ),
            ),
            eventLoader: (day) {
              // Return workouts for the day to display a dot
              final key = DateTime(day.year, day.month, day.day);
              return _events[key] ?? [];
            },
          ),

          const SizedBox(height: 8),

          // Workouts for selected date
          Expanded(
            child: _workoutsForSelectedDate().isEmpty
                ? const Center(child: Text("No workouts found"))
                : ListView(
                    padding: const EdgeInsets.all(8),
                    children: _groupWorkoutsByExercise(_workoutsForSelectedDate(), theme),
                  ),
          ),
        ],
      ),
    );
  }

  List<Widget> _groupWorkoutsByExercise(List<Workout> workouts, ThemeData theme) {
    final Map<String, List<Workout>> grouped = {};
    for (var w in workouts) {
      final name = w.exercise ?? "Unnamed";
      grouped.putIfAbsent(name, () => []);
      grouped[name]!.add(w);
    }

    return grouped.entries.map((entry) {
      return Card(
        margin: const EdgeInsets.symmetric(vertical: 6),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.key,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              ...entry.value.map((w) => Text(
                    w.weight == null
                        ? "${w.reps ?? 0} reps"
                        : "${w.weight} kg x ${w.reps ?? 0} reps",
                    style: theme.textTheme.bodySmall,
                  )),
            ],
          ),
        ),
      );
    }).toList();
  }
}
