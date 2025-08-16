import 'package:flutter/material.dart';
import 'package:heavy_load/models/workout.dart';
import 'package:heavy_load/services/csv_importer.dart';
import 'package:heavy_load/services/database_service.dart';
import 'package:isar/isar.dart';

class SettingsPage extends StatelessWidget {
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onThemeChanged;

  const SettingsPage({
    Key? key,
    required this.themeMode,
    required this.onThemeChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final workoutCount = DatabaseService.db.workouts.count();
    print("🔍 Total workouts in database: $workoutCount");
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const ListTile(
            title: Text(
              'Appearance',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          RadioListTile<ThemeMode>(
            title: const Text('System'),
            value: ThemeMode.system,
            groupValue: themeMode,
            onChanged: (mode) {
              if (mode != null) onThemeChanged(mode);
            },
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Light'),
            value: ThemeMode.light,
            groupValue: themeMode,
            onChanged: (mode) {
              if (mode != null) onThemeChanged(mode);
            },
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Dark'),
            value: ThemeMode.dark,
            groupValue: themeMode,
            onChanged: (mode) {
              if (mode != null) onThemeChanged(mode);
            },
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                await importWorkoutsCsv(DatabaseService.db);

                // Verify what was imported
                final workoutCount = await DatabaseService.db.workouts.count();
                final sampleWorkouts = await DatabaseService.db.workouts
                    .where()
                    .limit(5)
                    .findAll();

                print("✅ Import verification:");
                print("✅ Total workouts imported: $workoutCount");
                print("✅ Sample workouts:");
                for (var i = 0; i < sampleWorkouts.length; i++) {
                  final w = sampleWorkouts[i];
                  print(
                    "  $i: exercise='${w.exercise}', weight=${w.weight}, reps=${w.reps}, date=${w.date}",
                  );
                }

                // Show success message
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('CSV imported: $workoutCount workouts'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                // Show error message
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error importing CSV: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.data_array),
            label: const Text('Import Data'),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                await DatabaseService.db.writeTxn(() async {
                  await DatabaseService.db.workouts.clear();
                });
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('All workout data cleared!'),
                      backgroundColor: Colors.orange,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error clearing data: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.clear_all),
            label: const Text('Clear Data'),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                // Test database access
                final workoutCount = await DatabaseService.db.workouts.count();
                final sampleWorkouts = await DatabaseService.db.workouts
                    .where()
                    .limit(3)
                    .findAll();

                print("🔍 Database test: $workoutCount total workouts");
                print(
                  "🔍 Sample workouts: ${sampleWorkouts.map((w) => '${w.exercise}: ${w.weight}kg x ${w.reps}').toList()}",
                );

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Database test: $workoutCount workouts found',
                      ),
                      backgroundColor: Colors.blue,
                    ),
                  );
                }
              } catch (e) {
                print("❌ Database test error: $e");
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Database test error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.search),
            label: const Text('Test Database'),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                // Show raw workout data
                final allWorkouts =
                    await DatabaseService.db.workouts.where().findAll();
                final bigThreeWorkouts = allWorkouts
                    .where(
                      (w) =>
                          w.exercise != null &&
                          (w.exercise!.toLowerCase().contains('bench') ||
                              w.exercise!.toLowerCase().contains('squat') ||
                              w.exercise!.toLowerCase().contains('deadlift')),
                    )
                    .toList();

                print("🔍 Raw workout data analysis:");
                print("🔍 Total workouts: ${allWorkouts.length}");
                print("🔍 Big 3 workouts: ${bigThreeWorkouts.length}");

                if (bigThreeWorkouts.isNotEmpty) {
                  print("🔍 Sample Big 3 workouts:");
                  for (var i = 0; i < bigThreeWorkouts.length && i < 10; i++) {
                    final w = bigThreeWorkouts[i];
                    print(
                      "  ${w.exercise}: ${w.weight}kg x ${w.reps} reps on ${w.date}",
                    );
                  }
                }

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Raw data analysis: ${bigThreeWorkouts.length} Big 3 workouts found',
                      ),
                      backgroundColor: Colors.purple,
                    ),
                  );
                }
              } catch (e) {
                print("❌ Raw data analysis error: $e");
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Raw data analysis error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.analytics),
            label: const Text('Show Raw Data'),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                // Show all unique exercise names
                final allWorkouts =
                    await DatabaseService.db.workouts.where().findAll();
                final exerciseNames = <String>{};

                for (final workout in allWorkouts) {
                  if (workout.exercise != null &&
                      workout.exercise!.trim().isNotEmpty) {
                    exerciseNames.add(workout.exercise!.trim());
                  }
                }

                final sortedNames = exerciseNames.toList()..sort();

                print("🔍 All unique exercise names in database:");
                print("🔍 Total unique exercises: ${sortedNames.length}");
                for (final name in sortedNames) {
                  print("  - $name");
                }

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Found ${sortedNames.length} unique exercises',
                      ),
                      backgroundColor: Colors.indigo,
                    ),
                  );
                }
              } catch (e) {
                print("❌ Exercise names error: $e");
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Exercise names error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.list),
            label: const Text('Show All Exercises'),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            onPressed: () async {
              try {
                // Show raw weight/rep data for Big 3 exercises
                final allWorkouts =
                    await DatabaseService.db.workouts.where().findAll();
                final bigThreeWorkouts = allWorkouts
                    .where(
                      (w) =>
                          w.exercise != null &&
                          (w.exercise!.toLowerCase().contains('bench') ||
                              w.exercise!.toLowerCase().contains('squat') ||
                              w.exercise!.toLowerCase().contains('deadlift')),
                    )
                    .toList();

                print("🔍 Raw Big 3 workout data:");
                print("🔍 Total Big 3 workouts: ${bigThreeWorkouts.length}");

                // Group by exercise
                final benchWorkouts = bigThreeWorkouts
                    .where(
                      (w) =>
                          w.exercise!.toLowerCase().contains('bench') ||
                          w.exercise!.toLowerCase().contains('press'),
                    )
                    .toList();
                final squatWorkouts = bigThreeWorkouts
                    .where((w) => w.exercise!.toLowerCase().contains('squat'))
                    .toList();
                final deadliftWorkouts = bigThreeWorkouts
                    .where(
                      (w) =>
                          w.exercise!.toLowerCase().contains('deadlift') ||
                          w.exercise!.toLowerCase().contains('dead'),
                    )
                    .toList();

                print("🔍 Bench Press workouts (${benchWorkouts.length}):");
                for (final w in benchWorkouts.take(10)) {
                  print(
                    "  ${w.exercise}: ${w.weight}kg x ${w.reps} reps on ${w.date}",
                  );
                }

                print("🔍 Squat workouts (${squatWorkouts.length}):");
                for (final w in squatWorkouts.take(10)) {
                  print(
                    "  ${w.exercise}: ${w.weight}kg x ${w.reps} reps on ${w.date}",
                  );
                }

                print("🔍 Deadlift workouts (${deadliftWorkouts.length}):");
                for (final w in deadliftWorkouts.take(10)) {
                  print(
                    "  ${w.exercise}: ${w.weight}kg x ${w.reps} reps on ${w.date}",
                  );
                }

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Big 3 data: ${bigThreeWorkouts.length} workouts',
                      ),
                      backgroundColor: Colors.teal,
                    ),
                  );
                }
              } catch (e) {
                print("❌ Big 3 data error: $e");
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Big 3 data error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.fitness_center),
            label: const Text('Show Big 3 Data'),
          ),
          const Divider(),
          ListTile(
            title: const Text('About'),
            subtitle: const Text('Hevy-Load v1.0.0\nA simple workout tracker.'),
            leading: const Icon(Icons.info_outline),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'Hevy-Load',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2025 Hevy-Load Team',
              );
            },
          ),
          TextField(
              decoration: const InputDecoration(
            labelText: 'Feedback or suggestions?',
            hintText: 'Type your message here...',
            border: OutlineInputBorder(),
          )),
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: () {
              // Handle feedback submission
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Feedback sent! Thank you!'),
                  backgroundColor: Colors.green,
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
