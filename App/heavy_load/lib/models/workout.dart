import 'dart:convert';
import 'package:isar/isar.dart';

part 'workout.g.dart';

@collection
class Workout {
  Id id = Isar.autoIncrement;

  String? exercise;
  int? sets;
  int? reps;
  double? weight;
  String? notes;
  DateTime? date;

  // Store extraData as JSON
  String extraDataJson = "{}";

  @ignore
  Map<String, String> get extraData =>
      Map<String, String>.from(jsonDecode(extraDataJson));

  @ignore
  set extraData(Map<String, String> value) {
    extraDataJson = jsonEncode(value);
  }
}
