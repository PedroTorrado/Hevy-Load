import 'dart:async';

import 'package:heavy_load/services/database_service.dart';
import 'package:isar/isar.dart';  // ! Import ISAR

import 'package:flutter/material.dart';
import 'dashboard.dart';
import 'models/todo.dart';
import 'workouts.dart';
import 'settings.dart';
import 'databasetest.dart';

Future<void> main() async {
  await _setup(); // Initialize the database service before running the app 
  runApp(const MyApp());
}

Future<void> _setup() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DatabaseService.setup(); // ! Initialize the database service
}

class MyApp extends StatefulWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {

  List <Todo> todos = [];

  StreamSubscription? _todoSubscription;

  @override
  void initState() {
    super.initState();
    DatabaseService.db.todos.buildQuery<Todo>().watch(fireImmediately: true).listen((data) {
      setState(() {
        todos = data;
      });
    });
    // Initialize the database service
  }

  @override
  void dispose() {
    _todoSubscription?.cancel();
    super.dispose();
  }
  ThemeMode _themeMode = ThemeMode.system;

  void _changeTheme(ThemeMode? mode) {
    if (mode != null) {
      setState(() {
        _themeMode = mode;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue.shade400, brightness: Brightness.light),
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Color(0xFFBBDEFB),
            fontFamily: 'Roboto',
            fontWeight: FontWeight.bold,
            fontSize: 22,
          ),
        ),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Color(0xFF333333)),
        ),
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFF1976D2), brightness: Brightness.dark),
        scaffoldBackgroundColor: const Color(0xFF181A20),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF181A20),
          foregroundColor: Color(0xFF90CAF9),
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Color(0xFF90CAF9),
            fontWeight: FontWeight.bold,
            fontSize: 22,
          ),
        ),
        cardColor: const Color(0xFF23272F),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Color(0xFFEEEEEE)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Color(0xFF1976D2),
            foregroundColor: Colors.white,
          ),
        ),
      ),
      themeMode: _themeMode,
      initialRoute: '/',
      routes: {
        '/': (context) => HomePage(onOpenSettings: () => Navigator.pushNamed(context, '/settings')),
        '/dashboard': (context) => const DashboardPage(),
        '/workouts': (context) => const WorkoutsPage(),
        '/databasetest': (context) => databasetest(todos: todos),
        '/settings': (context) => SettingsPage(
          themeMode: _themeMode,
          onThemeChanged: _changeTheme,
        ),
      },
    );
  }
}

class HomePage extends StatelessWidget {
  final VoidCallback onOpenSettings;

  const HomePage({Key? key, required this.onOpenSettings}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        centerTitle: false, // Important for left alignment
        titleSpacing: 0,
        title: Row(
          children: [
            IconButton(
              tooltip: 'Dashboard',
              onPressed: () => Navigator.pushNamed(context, '/dashboard'),
              icon: const Icon(Icons.dashboard_outlined),
            ),
            IconButton(
              tooltip: 'Workouts',
              onPressed: () => Navigator.pushNamed(context, '/workouts'),
              icon: const Icon(Icons.timeline_outlined),
            ),
            const SizedBox(width: 8),
          
            Expanded(child: SizedBox()),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.data_array),
            tooltip: 'Database Test',
            onPressed: () => Navigator.pushNamed(context, '/databasetest'),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Settings',
            onPressed: onOpenSettings,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'Track and visualize your workout progress',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ExerciseCard(
              title: 'Bench Press',
              color: Colors.blue.shade400,
            ),
            const SizedBox(height: 16),
            ExerciseCard(
              title: 'Squat',
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            ExerciseCard(
              title: 'Deadlift',
              color: Colors.green,
            ),
            const SizedBox(height: 40),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              margin: const EdgeInsets.symmetric(horizontal: 8),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Text(
                      'Welcome Back!',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade200,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Ready to crush your next workout? Check your dashboard for progress and stats.',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey.shade700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const DashboardPage()),
                        );
                      },
                      icon: const Icon(Icons.dashboard),
                      label: const Text('Go to Dashboard'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ExerciseCard extends StatelessWidget {
  final String title;
  final Color color;
  final double pr = 0;
  final int reps = 0;
  final String firstAchieved = 'N/A';
  final String lastAchieved = 'N/A';
  final double fontsize = 25;

  const ExerciseCard({
    required this.title,
    required this.color,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      color: color.withOpacity(0.15),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: color,
                width: 6,
              ),
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
            ),
          ),
        width: 300,
        height: 300,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(),
            Text(
              title,
              style: TextStyle(
                fontSize: fontsize,
                fontWeight: FontWeight.w600,
                color: Colors.blue.shade200,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              '$pr kg',
              style: TextStyle(
                fontSize: fontsize/0.75,
                color: Colors.grey.shade100,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              '$reps rep(s)',
              style: TextStyle(
                fontSize: fontsize/1,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              '_____________________________________',
              style: TextStyle(
                color: Colors.grey.shade800,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              'First Achieved: $firstAchieved',
              style: TextStyle(
                fontSize: fontsize/1.5,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            Text(
              'Latest PR: $lastAchieved',
              style: TextStyle(
                fontSize: fontsize/1.5,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            )
          ],
        ),
      ),
      ),
    );
  }
}