import 'package:isar/isar.dart';
import 'package:heavy_load/models/enums.dart';

part 'todo.g.dart'; // ! necessary for Isar code generation
// ! after setting up your model, run `flutter pub run build_runner build` to generate the necessary code

@Collection()
class Todo {
  Id id = Isar.autoIncrement; // Use auto-increment for ID
  String? content; // Content of the todo item

  @enumerated
  Status status = Status.pending; // Status of the todo item

  DateTime createdAt = DateTime.now(); // Creation timestamp
  DateTime updatedAt = DateTime.now(); // Last update timestamp

  Todo copyWith({String? content, Status? status}) {
    return Todo()
      ..id = id
      ..content = content ?? this.content
      ..status = status ?? this.status
      ..createdAt = createdAt
      ..updatedAt = DateTime.now(); // Update timestamp on copy
  }
}
