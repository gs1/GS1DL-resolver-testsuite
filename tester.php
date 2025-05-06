<?php

// Allow Cross-Origin Resource Sharing (CORS) for API
use JetBrains\PhpStorm\NoReturn;

// header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

// Handle routes
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$publicFolderPath = __DIR__ . '/public';

error_log("Hello! publicFolderPath = " . $publicFolderPath, 0);
error_log('requestUri = ' . $requestUri, 0);

if (str_ends_with( $requestUri, "/"))
{
    error_log('Serving index.html', 0);
    // Serve index.html for the root path
    serveFile("index.html", $publicFolderPath);
}
elseif (isset($queryString) && str_starts_with($queryString, 'test='))
{
    // Handle API requests only if the query string starts with 'test='
    echo handleApiRequest($queryString);
}
else
{
    // Serve static files from the public directory
    serveFile(ltrim($requestUri, '/'), $publicFolderPath);
}

// Function to serve static files
#[NoReturn] function serveFile(string $filename, string $folder): void
{
    // make sure that filee name is without any URI stem before it.
    $filename = basename($filename);
    $filePath = $folder . '/' . $filename;

    error_log('Serving file: ' . $filePath, 0);
    if (is_file($filePath))
    {
        // Serve the file with appropriate headers
        $mimeType = mime_content_type($filePath);
        header("Content-Type: $mimeType");
        readfile($filePath);
    }
    else
    {
        error_log('Could not find file: ' . $filePath, 0);
        http_response_code(404);
        echo "404 Not Found";
    }
    exit();
}

// Function to handle API requests
function handleApiRequest(string $queryString): string
{
    $params = parseQuery($queryString);
    $resultObj = [];

    if (isset($params['test']))
    {
        // echo "Here with ".$params['test']." and ".$params['testVal'];
        if ($params['test'] === 'getHTTPversion' && isset($params['testVal']))
        {
            $version = getHttpVersion($params['testVal']);
            $resultObj = [
                "test" => $params['test'],
                "testVal" => $params['testVal'],
                "result" => $version
            ];
        }
        elseif ($params['test'] === 'getAllHeaders' && isset($params['testVal']))
        {
            $headersResult = getCustomHeaders($params['testVal'], false);
            $resultObj = [
                "test" => $params['test'],
                "testVal" => $params['testVal'],
                "result" => $headersResult
            ];
        }
        elseif ($params['test'] === 'getLinksetHeaders' && isset($params['testVal']))
        {
            $headersResult = getCustomHeaders($params['testVal'], true);
            $resultObj = [
                "test" => $params['test'],
                "testVal" => $params['testVal'],
                "result" => $headersResult
            ];
        }
        elseif ($params['test'] === 'getLinkset' && isset($params['testVal']))
        {
            //$linksetResult = trim(getLinkset(urldecode($params['testVal'])), '"');
            $linksetResult = trim(getLinkset($params['testVal']), '"');
            $resultObj = [
                "test" => $params['test'],
                "testVal" => $params['testVal'],
                "result" => $linksetResult
            ];
        }
        else
        {
            $resultObj = ["error" => "Invalid test command"];
        }
    }
    else
    {
        $resultObj = ["error" => "No valid command received"];
    }

    return json_encode($resultObj);
}

// Function to parse the query string
function parseQuery(string $query): array
{
    parse_str($query, $result);
    // echo "Incoming testVal is ".$result['testVal'];
    // Security check to make sure we're only handling https query
    // Note that the PHP function parse_str url decodes the received data
    if (!str_starts_with($result['testVal'], 'https://'))
    {
        $result['testVal'] = null;
    }
    //echo "Here with ".$result['testVal']." and then...";

    // return array_map('urldecode', $result);
    return $result;
}

// Function to retrieve HTTP version
function getHttpVersion(string $url): string
{
    try
    {
        $headers = get_headers($url, 1); // Perform a HEAD request
        if ($headers === false)
        {
            throw new Exception("Failed to fetch headers for $domain.");
        }

        // Use HTTP stream context to detect the protocol version
        $httpResponse = $http_response_header[0] ?? '';
        if (str_contains($httpResponse, 'HTTP/1.1'))
        {
            return 'HTTP/1.1';
        }
        elseif (str_contains($httpResponse, 'HTTP/2'))
        {
            return 'HTTP/2';
        }

        return 'Unknown';
    }
    catch (Exception $e)
    {
        return $e->getMessage();
    }
}

// Function to retrieve all headers
function getCustomHeaders(string $uri, $setForLinkset): array
{
    try {
        // Initialize cURL
        $ch = curl_init();

        // Set cURL options
        curl_setopt($ch, CURLOPT_URL, $uri); // Set the URL
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Return the response as a string
        curl_setopt($ch, CURLOPT_HEADER, true); // Include headers in the output
        curl_setopt($ch, CURLOPT_NOBODY, false); // Fetch the entire response (headers + body)
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Follow redirects (handle 302 responses)
        curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Timeout for the request

        // Setup cURL HTTP Request Headers
        $headers = [
            "Origin: https://ref.gs1.org/test-suites/resolver/"
        ];
        
        if ($setForLinkset) {
            $headers[] = "Accept: application/linkset+json";
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);


        // Execute the request
        $response = curl_exec($ch);

        // Check for cURL errors
        if ($response === false) {
            throw new Exception("cURL error: " . curl_error($ch));
        }

        // Extract headers from the response
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE); // Get the size of the headers
        $headersRaw = substr($response, 0, $headerSize); // Extract raw headers
        $headers = parseHeadersToArray($headersRaw); // Convert raw headers to an associative array

        // Extract HTTP status code
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // Cleanup
        curl_close($ch);

        // Prepare the result
        $result = [
            "uri" => $uri,
            "httpCode" => $httpCode,
            "httpMsg" => parseHttpStatusMessage($headersRaw),
            "requestURI" => $_SERVER['REQUEST_URI'] ?? '',
            "Requesting_User_Agent" => $_SERVER['HTTP_USER_AGENT'] ?? '',
            "Requesting_Accept_Header" => $_SERVER['HTTP_ACCEPT'] ?? '',
            "Requesting_Accept_Language" => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
        ];

        // Merge response headers into the result
        return array_merge($result, $headers);
    } catch (Exception $e) {
        return ["error" => $e->getMessage()];
    }
}


function getLinkset(string $uri): string
{
    try {
        // Initialize cURL
        $ch = curl_init();

        // Set cURL options
        curl_setopt($ch, CURLOPT_URL, $uri); // Set the URL
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Return the response body as a string
        curl_setopt($ch, CURLOPT_HEADER, false); // Exclude raw headers in the response
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Accept: application/linkset+json" // Set the Accept header
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Set a timeout for the request

        // Execute the request
        $response = curl_exec($ch);

        // Check for cURL errors
        if ($response === false) {
            throw new Exception("cURL error: " . curl_error($ch));
        }

        // Get HTTP response code
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // Close the cURL session
        curl_close($ch);

        // URL-encode the response body
        $encodedResponse = rawurlencode($response);

        // Prepare final JSON result
        $result = [
            "uri" => $uri,
            "httpCode" => $httpCode,
            "responseBody" => $encodedResponse
        ];

        return json_encode($result); // Return the result as a JSON string
    } catch (Exception $e) {
        // Handle and return errors in JSON format
        return json_encode(["error" => $e->getMessage()]);
    }
}


/**
 * Parse raw headers into an associative array.
 */
function parseHeadersToArray(string $headersRaw): array
{
    $headers = [];
    $lines = explode("\r\n", trim($headersRaw));
    foreach ($lines as $line) {
        if (str_contains($line, ': ')) {
            [$key, $value] = explode(': ', $line, 2);
            $headers[$key] = $value;
        } else {
            // Handle HTTP status line (for example "HTTP/1.1 200 OK")
            $headers[0] = $line;
        }
    }
    return $headers;
}

/**
 * Example implementation of parseHttpStatusMessage (optional, if needed).
 */


// Helper function to parse HTTP status message
function parseHttpStatusMessage(string $h): string
{
    // global $http_response_header;
    // $firstLine = $http_response_header["0"] ?? '';
    // preg_match('/HTTP\/[0-9.]+\s\d+\s(.+)/', $firstLine, $matches);
    // return $matches[1] ?? '';
    $splitsResult = explode(" ", $h);
    $i = 2; $r = '';
    while (isset($splitsResult[$i]))
    {
        $r = $r.$splitsResult[$i].' ';
        $i++;
    }
    return trim($r);
}
