import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:heavy_load/models/todo.dart';
import 'package:heavy_load/models/workout.dart';

class DatabaseService {

  static late final Isar db;

  static Future<void> setup() async {
    // Initialize the database connection here
    final appDir = await getApplicationDocumentsDirectory();
    db = await Isar.open(
      [
        TodoSchema,
        WorkoutSchema,
      ],
      directory: appDir.path,
    );

  }
}