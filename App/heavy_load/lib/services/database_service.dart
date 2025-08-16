import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:heavy_load/models/todo.dart';
import 'package:heavy_load/models/workout.dart';

class DatabaseService {
  static late final Isar db;

  static Future<void> setup() async {
    final appDir = await getApplicationDocumentsDirectory();
    db = await Isar.open(
      [TodoSchema, WorkoutSchema],
      directory: appDir.path,
    );
  }

  // Helper to get all workouts
  static Future<List<Workout>> getAllWorkouts() async {
    return await db.workouts.where().findAll();
  }
}
