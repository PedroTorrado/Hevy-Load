import 'dart:io';
import 'dart:convert';

import 'package:csv/csv.dart';
import 'package:isar/isar.dart';
import '../models/workout.dart';
import 'package:file_picker/file_picker.dart';

Future<void> importWorkoutsCsv(Isar isar) async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['csv'],
  );
  if (result == null) return;

  final file = File(result.files.single.path!);
  final csvData = await file.readAsString();

  print("📄 Raw CSV data preview (first 500 chars):");
  print(csvData.substring(0, csvData.length > 500 ? 500 : csvData.length));

  final rows = const CsvToListConverter(eol: '\n').convert(csvData);
  if (rows.isEmpty) return;

  final headers = rows.first.map((h) => h.toString().trim()).toList();
  print("📊 CSV Headers found: $headers");

  // Auto-detect column mappings
  final columnMap = _detectColumnMapping(headers);
  print("🔍 Detected column mapping: $columnMap");

  final workouts = <Workout>[];

  for (var i = 1; i < rows.length; i++) {
    final row = rows[i];
    if (i <= 10) { // Debug first 10 rows
      print("📊 Row $i: $row");
    }
    
    final workout = Workout();
    final extra = <String, String>{};

    // Map data based on detected columns
    for (var j = 0; j < headers.length; j++) {
      final header = headers[j];
      final value = (j < row.length && row[j] != null) ? row[j].toString().trim() : '';
      
      if (i <= 10) { // Debug first 10 rows
        print("  $header: '$value'");
      }

      // Use the detected column mapping
      final columnType = columnMap[header.toLowerCase()];
      switch (columnType) {
        case 'exercise':
          workout.exercise = value.isNotEmpty ? value : null;
          break;
        case 'sets':
          workout.sets = int.tryParse(value);
          break;
        case 'reps':
          workout.reps = int.tryParse(value);
          break;
        case 'weight':
          // Handle weight_kg specifically
          if (header.toLowerCase().contains('weight_kg')) {
            workout.weight = double.tryParse(value);
          } else {
            workout.weight = double.tryParse(value);
          }
          break;
        case 'notes':
          workout.notes = value.isNotEmpty ? value : null;
          break;
        case 'date':
  if (header.toLowerCase().contains('start_time') || header.toLowerCase().contains('end_time')) {
    workout.date = parseCustomDate(value);
    if (workout.date == null) {
      print("⚠️ Failed to parse date with custom parser: '$value'");
    }
  } else {
    workout.date = DateTime.tryParse(value);
  }
  break;

        default:
          if (value.isNotEmpty) extra[header] = value;
      }
    }

    workout.extraData = extra;
    
    if (i <= 10) { // Debug first 10 workouts
      print("🏋️ Created workout: exercise='${workout.exercise}', weight=${workout.weight}, reps=${workout.reps}, date=${workout.date}");
      print("🏋️ Extra data: $extra");
    }
    
    workouts.add(workout);
  }

  // Show summary of what was created
  print("📈 Summary of created workouts:");
  final exerciseCounts = <String, int>{};
  final weightRange = <double>[];
  final repsRange = <int>[];
  
  for (final workout in workouts) {
    if (workout.exercise != null) {
      exerciseCounts[workout.exercise!] = (exerciseCounts[workout.exercise!] ?? 0) + 1;
    }
    if (workout.weight != null) {
      weightRange.add(workout.weight!);
    }
    if (workout.reps != null) {
      repsRange.add(workout.reps!);
    }
  }
  
  print("📊 Exercise counts: $exerciseCounts");
  if (weightRange.isNotEmpty) {
    print("📊 Weight range: ${weightRange.reduce((a, b) => a < b ? a : b)} - ${weightRange.reduce((a, b) => a > b ? a : b)} kg");
  }
  if (repsRange.isNotEmpty) {
    print("📊 Reps range: ${repsRange.reduce((a, b) => a < b ? a : b)} - ${repsRange.reduce((a, b) => a > b ? a : b)}");
  }

  await isar.writeTxn(() async {
    await isar.workouts.putAll(workouts);
  });

  print("✅ Imported ${workouts.length} workouts into Isar with all columns preserved.");
}

Map<String, String> _detectColumnMapping(List<String> headers) {
  final mapping = <String, String>{};
  
  for (final header in headers) {
    final lowerHeader = header.toLowerCase();
    
    // Exact matches for the user's CSV structure
    if (lowerHeader == 'exercise_title') {
      mapping[header.toLowerCase()] = 'exercise';
    }
    else if (lowerHeader == 'weight_kg') {
      mapping[header.toLowerCase()] = 'weight';
    }
    else if (lowerHeader == 'reps') {
      mapping[header.toLowerCase()] = 'reps';
    }
    else if (lowerHeader == 'set_index') {
      mapping[header.toLowerCase()] = 'sets';
    }
    else if (lowerHeader == 'start_time') {
      mapping[header.toLowerCase()] = 'date';
    }
    else if (lowerHeader == 'exercise_notes') {
      mapping[header.toLowerCase()] = 'notes';
    }
    // Fallback for other columns
    else {
      mapping[header.toLowerCase()] = 'extra';
    }
  }
  
  return mapping;
}

DateTime? parseCustomDate(String value) {
  try {
    // Split date and time by comma
    final parts = value.split(',');
    if (parts.length != 2) return null;

    final datePart = parts[0].trim(); // "10 Aug 2025"
    final timePart = parts[1].trim(); // "10:51"

    // Split date by space
    final dateParts = datePart.split(' ');
    if (dateParts.length != 3) return null;

    final day = int.parse(dateParts[0]);
    final monthStr = dateParts[1].toLowerCase();
    final year = int.parse(dateParts[2]);

    // Map month short name to month number
    const months = {
      'jan': 1,
      'feb': 2,
      'mar': 3,
      'apr': 4,
      'may': 5,
      'jun': 6,
      'jul': 7,
      'aug': 8,
      'sep': 9,
      'oct': 10,
      'nov': 11,
      'dec': 12,
    };

    final month = months[monthStr];
    if (month == null) return null;

    // Parse time
    final timeParts = timePart.split(':');
    if (timeParts.length != 2) return null;

    final hour = int.parse(timeParts[0]);
    final minute = int.parse(timeParts[1]);

    return DateTime(year, month, day, hour, minute);
  } catch (e) {
    print("⚠️ Error parsing custom date '$value': $e");
    return null;
  }
}
