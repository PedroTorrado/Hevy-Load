import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  // Load .env from lib/ so it matches how the app loads it
  await dotenv.load(fileName: 'lib/.env');
  final apiKey = dotenv.env['API_KEY'];
  if (apiKey == null || apiKey.isEmpty) {
    print('No API_KEY in lib/.env');
    return;
  }

  final uri = Uri.https('generativelanguage.googleapis.com', '/v1beta/models');
  try {
    final resp = await http.get(uri, headers: {'x-goog-api-key': apiKey});
    if (resp.statusCode == 200) {
      final jsonBody = json.decode(resp.body);
      print(jsonBody);
    } else {
      print('HTTP ${resp.statusCode}: ${resp.body}');
    }
  } catch (e) {
    print('Error calling ListModels: $e');
  }
}
