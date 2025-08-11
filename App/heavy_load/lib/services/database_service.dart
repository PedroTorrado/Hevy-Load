import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:heavy_load/models/todo.dart';

class DatabaseService {

  static late final Isar db;

  static Future<void> setup() async {
    // Initialize the database connection here
    final appDir = await getApplicationDocumentsDirectory();
    db = await Isar.open(
      [
        TodoSchema,
      ],
      directory: appDir.path,
    );

  }
}