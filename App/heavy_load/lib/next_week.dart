import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:heavy_load/models/workout.dart';
import 'package:heavy_load/services/database_service.dart';
import 'package:path_provider/path_provider.dart';

/// A page that builds a next-week workout plan based on the last few weeks
/// of workouts. Shows a dumbbell icon on top, displays the plan as a table,
/// and prompts the user to add a suggestion when the page opens. Suggestions
/// are persisted locally to the app documents directory in `suggestions.json`.

class NextWeekPage extends StatefulWidget {
  const NextWeekPage({Key? key}) : super(key: key);

  @override
  State<NextWeekPage> createState() => _NextWeekPageState();
}

class _NextWeekPageState extends State<NextWeekPage> {
  List<Workout> _recent = [];
  List<Map<String, Object>> _planRows = [];
  List<String> _suggestions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<File> _suggestionsFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/suggestions.json');
  }

  Future<void> _loadSuggestions() async {
    try {
      final f = await _suggestionsFile();
      if (await f.exists()) {
        final text = await f.readAsString();
        final jsonList = json.decode(text) as List<dynamic>;
        _suggestions = jsonList.cast<String>();
      }
    } catch (_) {
      _suggestions = [];
    }
  }

  Future<void> _saveSuggestions() async {
    try {
      final f = await _suggestionsFile();
      await f.writeAsString(json.encode(_suggestions));
    } catch (_) {}
  }

  Future<void> _init() async {
    setState(() => _loading = true);
    await _loadSuggestions();

    final all = await DatabaseService.getAllWorkouts();
    // Use last 4 weeks of data (28 days)
    final cutoff = DateTime.now().subtract(const Duration(days: 28));
    final recent = all.where((w) => w.date != null && w.date!.isAfter(cutoff)).toList();
    _recent = recent;

    _planRows = _buildNextWeekPlan(_recent);

    setState(() => _loading = false);

    // Prompt to add a suggestion once when the page opens.
    WidgetsBinding.instance.addPostFrameCallback((_) => _promptAddSuggestion());
  }

  List<Map<String, Object>> _buildNextWeekPlan(List<Workout> recent) {
    // Group workouts by session (date without time)
    final Map<String, List<Workout>> sessions = {};
    for (final w in recent) {
      if (w.date == null) continue;
      final key = '${w.date!.year}-${w.date!.month}-${w.date!.day}';
      sessions.putIfAbsent(key, () => []).add(w);
    }

    // Build an ordered list of session exercise patterns (most recent first)
    final sessionKeys = sessions.keys.toList();
    sessionKeys.sort((a, b) {
      // keys are 'YYYY-M-D' or similar; parse ints safely
      final ap = a.split('-');
      final bp = b.split('-');
      try {
        final aDate = DateTime(int.parse(ap[0]), int.parse(ap[1]), int.parse(ap[2]));
        final bDate = DateTime(int.parse(bp[0]), int.parse(bp[1]), int.parse(bp[2]));
        return bDate.compareTo(aDate); // most recent first
      } catch (_) {
        return b.compareTo(a);
      }
    });

    final List<List<String>> sessionPatterns = [];
    final Map<String, double> maxWeight = {};

    for (final key in sessionKeys) {
      final entry = MapEntry(key, sessions[key]!);
      final exCounts = <String, int>{};
      for (final w in entry.value) {
        final ex = (w.exercise ?? 'Unknown').trim();
        if (ex.isEmpty) continue;
        exCounts[ex] = (exCounts[ex] ?? 0) + 1;
        if (w.weight != null) {
          maxWeight[ex] = mathMax(maxWeight[ex] ?? 0.0, w.weight!.toDouble());
        }
      }
      // Order exercises in the session by frequency (descending)
      final sorted = exCounts.keys.toList()..sort((a, b) => exCounts[b]!.compareTo(exCounts[a]!));
      if (sorted.isNotEmpty) sessionPatterns.add(sorted);
    }

    // If we have no session patterns, fall back to a generic plan
    if (sessionPatterns.isEmpty) {
      return [
        {
          'day': '${DateFormat.E().format(DateTime.now().add(const Duration(days: 1)))} ${DateFormat.yMd().format(DateTime.now().add(const Duration(days: 1)))}',
          'exercise': 'General Conditioning',
          'sets': 3,
          'reps': 12,
          'weight': 0.0,
        }
      ];
    }

    // Map session patterns onto the next 7 calendar days.
    final List<Map<String, Object>> rows = [];
    final start = DateTime.now().add(const Duration(days: 1));
    for (int d = 0; d < 7; d++) {
      final date = start.add(Duration(days: d));
      final dayName = DateFormat.E().format(date);
      // Choose a session pattern by cycling through the recent sessionPatterns
      final pattern = sessionPatterns[d % sessionPatterns.length];
      // For each exercise in the pattern, create a row preserving order
      for (final ex in pattern) {
        final mw = maxWeight[ex] ?? 0.0;
        final suggested = (mw > 0) ? (mw * 0.9) : 0.0;
        rows.add({
          'day': '$dayName ${DateFormat.yMd().format(date)}',
          'exercise': ex,
          'sets': 4,
          'reps': 6,
          'weight': suggested,
        });
      }
    }

    return rows;
  }

  double mathMax(double a, double b) => a > b ? a : b;

  Future<void> _promptAddSuggestion() async {
    // Show a dialog that allows user to add a suggestion for next workout.
    final TextEditingController ctl = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(children: const [Icon(Icons.fitness_center), SizedBox(width: 8), Text('Add suggestion')]),
        content: TextField(
          controller: ctl,
          decoration: const InputDecoration(hintText: 'E.g. "Add pause squats 3x5 @ 80kg"'),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final text = ctl.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _suggestions.insert(0, text);
                });
                _saveSuggestions();
              }
              Navigator.of(context).pop();
            },
            child: const Text('Save'),
          )
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    if (_suggestions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8.0),
          child: Text('Suggestions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        ..._suggestions.map((s) => ListTile(
              leading: const Icon(Icons.lightbulb_outline),
              title: Text(s),
            )),
        const Divider()
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Next Week Plan'),
        centerTitle: true,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _promptAddSuggestion,
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Column(
                      children: const [
                        Icon(Icons.fitness_center, size: 56),
                        SizedBox(height: 8),
                        Text('Your Next Week', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildSuggestions(),
                  const SizedBox(height: 8),
                  Expanded(
                    child: SingleChildScrollView(
                      child: DataTable(
                        columns: const [
                          DataColumn(label: Text('Day')),
                          DataColumn(label: Text('Exercise')),
                          DataColumn(label: Text('Sets')),
                          DataColumn(label: Text('Reps')),
                          DataColumn(label: Text('Suggested (kg)')),
                        ],
                        rows: _planRows.map((r) {
                          final weight = (r['weight'] as double);
                          final weightText = weight > 0 ? weight.toStringAsFixed(1) : '-';
                          return DataRow(cells: [
                            DataCell(Text(r['day'] as String)),
                            DataCell(Text(r['exercise'] as String)),
                            DataCell(Text('${r['sets']}')),
                            DataCell(Text('${r['reps']}')),
                            DataCell(Text(weightText)),
                          ]);
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
