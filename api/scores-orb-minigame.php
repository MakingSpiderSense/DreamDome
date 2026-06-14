<?php
header('Content-Type: application/json');

$file = __DIR__ . '/scores-orb-minigame.json';

/**
 * Send a JSON response
 *
 * This function sets the HTTP status code, sends the data as a JSON string to the user, and then stops the program immediately.
 *
 * @param int $status The HTTP status code to send, like 200 for success or 400 for an error.
 * @param array $payload The data you want to send back, which will be turned into a JSON format.
 * @return void This function does not return anything because it stops the script.
 */
function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

/**
 * Check category validity
 *
 * This function checks if the provided name for a score list matches one of the four allowed types used in the game.
 *
 * @param string $category The name of the leaderboard category to check.
 * @return bool Returns true if the name is allowed, or false if it is not.
 */
function is_valid_category(string $category): bool {
    return in_array($category, [
        'standard-all-time',
        'standard-monthly',
        'power-all-time',
        'power-monthly'
    ]);
}

/**
 * Check name validity
 *
 * This function checks if a player's name only contains letters and numbers and is between 1 and 12 characters long.
 *
 * @param string $name The player name to check.
 * @return bool Returns true if the name follows the rules, or false if it does not.
 */
function is_valid_name(string $name): bool {
    return is_string($name) && preg_match('/\A[A-Za-z0-9]{1,12}\z/', $name);
}

/**
 * Name pool for placeholders
 */
$playerNamePool = [
    'Parzival', 'Art3mis', 'Aech', 'Shoto', 'Daito', 'Anorak', 'Og',
    '655321', 'Hiro', 'YT', 'Da5id', 'Neo', 'Morpheus', 'Trinity',
    'MindFlayer', 'LawnmowerMan', 'Tron', 'BrainDancer', 'Wintermute',
    'Neuromancer', 'FreeGuy', 'JSilverhand', 'VikVektor', 'SpaceHarrier',
    'Dreamweaver'
];

/**
 * Get placeholder names
 *
 * This function shuffles a backup list to fill up the leaderboard when there are not enough real players, making sure the same names appear for everyone each month.
 *
 * @param string $category The type of leaderboard we need names for.
 * @return array A shuffled list of names used to fill empty spots.
 */
function get_placeholders(string $category): array {
    global $playerNamePool;
    $monthKey = gmdate('Y-m'); // E.g. '2024-06'
    // We group categories by runType so Universal Monthly and All-Time share the same name sequence
    $runType = strpos($category, 'power') !== false ? 'power' : 'standard';
    // Seed the random number generator deterministically
    $seed = crc32($monthKey . $runType); // crc32 takes any string and outputs a consistent 32-bit integer
    mt_srand($seed); // Seed the random number generator
    // Copy the player pool into $pool, then shake it up!
    $pool = $playerNamePool;
    // Fisher-Yates shuffle
    for ($i = count($pool) - 1; $i > 0; $i--) {
        $j = mt_rand(0, $i);
        $tmp = $pool[$i];
        $pool[$i] = $pool[$j];
        $pool[$j] = $tmp;
    }
    // Return the entire shuffled pool
    return $pool;
}

/**
 * Organize the game leaderboards
 *
 * This function goes through all the score categories to remove old monthly data, adds placeholder names if there are fewer than ten entries, and sorts everyone so the best times stay at the top.
 *
 * @param array &$scores The collection of scores that will be checked and updated.
 * @return bool Returns true if any changes were made to the data, otherwise returns false.
 */
function maintain_leaderboards(array &$scores): bool {
    $categories = ['standard-all-time', 'standard-monthly', 'power-all-time', 'power-monthly'];
    $currentMonth = gmdate('Y-m'); // E.g. '2024-06'
    $monthStartTimestamp = gmmktime(0, 0, 0, gmdate('n'), 1, gmdate('Y')) * 1000; // Start of the current month in UTC
    $modified = false;

    foreach ($categories as $category) {
        // Fallback to empty array as starting point if category is missing or invalid
        if (!isset($scores[$category]) || !is_array($scores[$category])) {
            $scores[$category] = [];
            $modified = true;
        }

        // 1. Remove outdated entries
        // `array_values` simply cleans up the array index numbers if any entries are filtered out
        $scores[$category] = array_values(array_filter($scores[$category], function ($score) use ($category, $currentMonth) {
            // Always keep all-time scores, regardless of date
            if (strpos($category, 'all-time') !== false) {
                return true;
            }
            // For everything else (monthly scores), keep only if from current month
            return isset($score['savedAt']) && gmdate('Y-m', $score['savedAt'] / 1000) === $currentMonth;
        }));

        // 2. Pad to 10 entries: Treat placeholders as "real" but disposable
        if (count($scores[$category]) < 10) {
            $modified = true;
            $placeholders = get_placeholders($category);
            $existingNames = array_column($scores[$category], 'name'); // Array of existing names
            // Don't reuse names already on the board
            $availablePlaceholders = array_values(array_diff($placeholders, $existingNames));

            $placeholderIndex = 0;
            while (count($scores[$category]) < 10) {
                $scores[$category][] = [
                    'name' => $availablePlaceholders[$placeholderIndex++] ?? 'Dreamer',
                    'timeMs' => 90000 + (count($scores[$category]) * 30000), // Incremental times: 1:30, 2:00, 2:30...
                    'savedAt' => $monthStartTimestamp,
                    'isPlaceholder' => true
                ];
            }
        }

        // 3. Global sort and slice: Ensure top 10 relative to ALL current entries
        usort($scores[$category], function ($a, $b) {
            return $a['timeMs'] - $b['timeMs'];
        });

        if (count($scores[$category]) > 10) {
            $scores[$category] = array_slice($scores[$category], 0, 10);
            $modified = true;
        }
    }

    return $modified;
}

/**
 * Load scores from file
 *
 * This function reads a JSON file and turns its text into a list of scores that the program can use, returning an empty list if the file is missing or invalid.
 *
 * @param string $file The path to the JSON file where scores are kept.
 * @return array A list containing the scores or an empty list.
 */
function load_scores(string $file): array {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

/**
 * Save scores to file
 *
 * This function takes a list of scores and writes them into a file on the server so they can be remembered later.
 *
 * @param string $file The location and name of the file where you want to save the data.
 * @param array $data The collection of score information that you want to store.
 * @return bool Returns true if the information was saved successfully, or false if something went wrong.
 */
function save_scores(string $file, array $data): bool {
    // Note: LOCK_EX blocks other requests to write to the file to prevent data corruption
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX) !== false;
}

$scores = load_scores($file);

// Ensure the leaderboard is correctly padded with placeholders if needed and updated for the current month
if (maintain_leaderboards($scores)) {
    save_scores($file, $scores);
}

/**
 * GET - Retrieve scores for a specific category
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $category = $_GET['category'] ?? '';
    // Return error in invalid category
    if (!is_valid_category($category)) {
        respond(400, ['error' => 'Invalid category']);
    }

    // Echo response
    // Since we called maintain_leaderboards, the data is already padded and sorted
    echo json_encode($scores[$category] ?? []);
    exit;
}

/**
 * POST - Save a new score
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the raw JSON string from the request body
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    // Make sure it's an array (valid JSON object)
    if (!is_array($data)) {
        respond(400, ['error' => 'Invalid JSON payload']);
    }
    // Extract and validate input
    $category = $data['category'] ?? '';
    $name = trim((string)($data['name'] ?? ''));
    $timeMs = (int)($data['timeMs'] ?? 0);
    $savedAt = (int)($data['savedAt'] ?? time() * 1000);
    // Validation
    if (!is_valid_category($category)) {
        respond(400, ['error' => 'Invalid category']);
    }
    if ($name === '' || !is_valid_name($name)) {
        respond(400, ['error' => 'Invalid name (1-12 alphanumeric characters)']);
    }
    if ($timeMs <= 0) {
        respond(400, ['error' => 'Invalid time']);
    }

    // Add new user score
    $scores[$category][] = [
        'name' => $name,
        'timeMs' => $timeMs,
        'savedAt' => $savedAt
    ];

    // Maintain the boards - sorts new user score in and knocks out the 10th (slowest) entry
    maintain_leaderboards($scores);

    // Save and respond with the updated category scores
    if (save_scores($file, $scores)) {
        respond(200, ['success' => true, 'scores' => $scores[$category]]);
    } else {
        respond(500, ['error' => 'Could not save score file']);
    }
}

// Default response for unsupported methods
respond(405, ['error' => 'Method not allowed']);
