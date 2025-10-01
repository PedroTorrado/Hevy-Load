import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  // Load .env from lib/ so it matches how the app loads it
  await dotenv.load(fileName: 'lib/.env');
  final apiKey = dotenv.env['API_KEY'];
  if (apiKey == null || apiKey.isEmpty) {
    print('No API_KEY in lib/.env');
    return;
  }

  // The SDK's ApiClient is internal; create an HttpApiClient instance directly
  final client = HttpApiClient(apiKey: apiKey);
  final uri = Uri.https('generativelanguage.googleapis.com', '/v1beta/models');
  try {
    final response = await client.makeRequest(uri, {});
    print(response);
  } catch (e) {
    print('Error calling ListModels: $e');
  }
}
