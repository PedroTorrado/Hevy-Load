import 'package:isar/isar.dart';
import '../models/workout.dart';

class PRService {
  static Future<Map<String, Map<String, dynamic>>> calculatePRs(Isar isar) async {
    final workouts = await isar.workouts.where().findAll();
    //print("🔍 PR Service: Processing ${workouts.length} total workouts");
    
    // First, let's see ALL exercise names in the data
    final allExerciseNames = <String>{};
    for (final workout in workouts) {
      if (workout.exercise != null && workout.exercise!.trim().isNotEmpty) {
        allExerciseNames.add(workout.exercise!.trim());
      }
    }
    //print("🔍 All exercise names found in data: ${allExerciseNames.toList()}");
    
    final exercisePRs = <String, Map<String, dynamic>>{};
    int validWorkouts = 0;
    int skippedWorkouts = 0;
    int bigThreeWorkouts = 0;
    int unrealisticWorkouts = 0;
    
    for (final workout in workouts) {
      // Debug: Print workout details for Big 3 exercises
      if (workout.exercise != null && _isBigThreeExercise(_normalizeExerciseName(workout.exercise!.trim()))) {
        //print("🔍 Big 3 Workout: exercise='${workout.exercise}', weight=${workout.weight}, reps=${workout.reps}, date=${workout.date}");
      }
      
      // Skip workouts with missing critical data
      if (workout.exercise == null || workout.exercise!.trim().isEmpty) {
        skippedWorkouts++;
        continue;
      }
      
      if (workout.weight == null || workout.weight! <= 0) {
        skippedWorkouts++;
        continue;
      }
      
      if (workout.reps == null || workout.reps! <= 0) {
        skippedWorkouts++;
        continue;
      }
      
      // Validate for unrealistic values
      if (workout.weight! > 1000 || workout.reps! > 100) {
        //print("⚠️ Unrealistic workout detected: ${workout.exercise} - ${workout.weight}kg x ${workout.reps} reps");
        unrealisticWorkouts++;
        continue;
      }
      
      validWorkouts++;
      final exercise = _normalizeExerciseName(workout.exercise!.trim());
      final weight = workout.weight!;
      final reps = workout.reps!;
      final date = workout.date ?? DateTime.now();
      
      // Only process Big 3 exercises
      if (!_isBigThreeExercise(exercise)) {
        continue;
      }
      
      bigThreeWorkouts++;
      
      // Calculate 1RM using Epley formula: 1RM = weight × (1 + reps/30)
      final oneRM = weight * (1 + reps / 30);
      
      // Debug 1RM calculation for Big 3
      //print("🧮 1RM calculation: $exercise - ${weight}kg x ${reps} reps = ${oneRM.toStringAsFixed(1)}kg 1RM");
      
      // Initialize exercise if not exists
      if (!exercisePRs.containsKey(exercise)) {
        exercisePRs[exercise] = {
          'maxWeight': 0.0,           // Heaviest weight lifted
          'maxWeightReps': 0,         // Reps at heaviest weight
          'maxWeightDate': null,      // Date of heaviest weight
          'actualOneRM': 0.0,         // Actual 1 rep max (heaviest single rep)
          'actualOneRMDate': null,    // Date of actual 1 rep max
          'calculatedOneRM': 0.0,     // Calculated 1RM estimate
          'calculatedOneRMDate': null, // Date of best calculated 1RM
          'firstAchieved': null,      // First workout date
          'lastAchieved': null,       // Last workout date
        };
      }
      
      final currentPR = exercisePRs[exercise]!;
      
      // Check for max weight PR (heaviest weight lifted)
      if (weight > currentPR['maxWeight']) {
        currentPR['maxWeight'] = weight;
        currentPR['maxWeightReps'] = reps;
        currentPR['maxWeightDate'] = date;
      }
      
      // Check for actual 1 rep max (actual single rep lifts)
      if (reps == 1 && weight > currentPR['actualOneRM']) {
        currentPR['actualOneRM'] = weight;
        currentPR['actualOneRMDate'] = date;
        //print("🏆 New actual 1RM for $exercise: ${weight}kg x 1 rep");
      }
      
      // Check for best calculated 1RM (for reference)
      if (oneRM > currentPR['calculatedOneRM']) {
        currentPR['calculatedOneRM'] = oneRM;
        currentPR['calculatedOneRMDate'] = date;
        //print("🧮 New calculated 1RM for $exercise: ${oneRM.toStringAsFixed(1)}kg (from ${weight}kg x ${reps} reps)");
      }
      
      // Track first and last achievements
      if (currentPR['firstAchieved'] == null || date.isBefore(currentPR['firstAchieved'])) {
        currentPR['firstAchieved'] = date;
      }
      if (currentPR['lastAchieved'] == null || date.isAfter(currentPR['lastAchieved'])) {
        currentPR['lastAchieved'] = date;
      }
    }
    
    //print("🔍 PR Service: Valid workouts: $validWorkouts, Skipped: $skippedWorkouts, Unrealistic: $unrealisticWorkouts, Big 3 workouts: $bigThreeWorkouts, Big 3 exercises found: ${exercisePRs.length}");
    //print("🔍 PR Service: Exercise names: ${exercisePRs.keys.toList()}");
    
    // Show final PRs
    for (final entry in exercisePRs.entries) {
      //print("🏆 Final PR for ${entry.key}:");
      //print("  Actual 1RM: ${entry.value['actualOneRM']}kg x 1 rep");
      //print("  Calculated 1RM: ${entry.value['calculatedOneRM']?.toStringAsFixed(1)}kg (est.)");
      //print("  Max Weight: ${entry.value['maxWeight']}kg x ${entry.value['maxWeightReps']} reps");
    }
    
    return exercisePRs;
  }
  
  static String _normalizeExerciseName(String exerciseName) {
    final lowerName = exerciseName.toLowerCase().trim();
    
    // Keep equipment types separate - don't normalize them away
    if (lowerName.contains('bench press (barbell)')) {
      return 'Bench Press (Barbell)';
    }
    if (lowerName.contains('bench press (dumbbell)')) {
      return 'Bench Press (Dumbbell)';
    }
    if (lowerName.contains('bench press')) {
      return 'Bench Press';
    }
    
    if (lowerName.contains('squat (barbell)')) {
      return 'Squat (Barbell)';
    }
    if (lowerName.contains('squat')) {
      return 'Squat';
    }
    
    if (lowerName.contains('deadlift (barbell)')) {
      return 'Deadlift (Barbell)';
    }
    if (lowerName.contains('deadlift')) {
      return 'Deadlift';
    }
    
    // Return original if no match - this helps with debugging
    return exerciseName;
  }
  
  static bool _isBigThreeExercise(String exerciseName) {
    final normalized = _normalizeExerciseName(exerciseName);
    return ['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Bench Press', 
            'Squat (Barbell)', 'Squat',
            'Deadlift (Barbell)', 'Deadlift'].contains(normalized);
  }
  
  static String formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return '${date.day}/${date.month}/${date.year}';
  }
} 