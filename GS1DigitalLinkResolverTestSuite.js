const outputElement = 'gs1ResolverTests' // Set this to the id of the element in the HTML document where you want the output to go

// We'll run a series of largely asynchronous discrete tests, each of which is 
// defined within a JSON object as follows. These objects are sent to the 'recordResult' 
// function when first defined and then again after the test has been completed. This 
// is what creates the effect of red squares appearing and then, all being well, turning 
// green as the test is passed.


const resultProps = {
    "id": "", //An id for the test
    "test": "", // conformance statement from spec
    "status": "fail", // (pass|fail|warn), default is fail
    "msg": "", // Displayed to the end user
    "url": "", // The URL we're going to fetch
    "headers": {}  // Ready for any headers we want to set
}

// Where possible, we'll use JavaScript's Fetch function but this is insufficient for most of
//  the tests we need to run. In those cases, we'll need to use a PHP script that executes the 
// request and sends the response back as a JSON object. 

// const testUri = 'http://localhost:8000/test-suites/resolver/1.0.0/tester.php';
// const testUri = 'https://ref.gs1.org/test-suites/resolver/1.0.0/tester.php';
const testUri = 'https://philarcher.org/gs1/tester.php';

// We'll make use of two JSON schemas
const resolverDescriptionFileSchema = 'https://ref.gs1.org/standards/resolver/description-file-schema';
const gs1LinksetSchema = 'https://gs1.github.io/linkset/gs1-linkset-schema.json';

// const RabinRegEx = /^(([^:\/?#]+):)?(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
const RabinRegEx = /^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/i;  // As above but specifically for HTTP(s) URIs
// (see https://www.w3.org/TR/powder-grouping/#rabinsRegEx for the origin of this regex by Jo Rabin)
// gives [2] scheme, [4] domain,[9] port, [10] path, [12] query, [14] fragment

// This is 'RE1' from the DL 1.2 spec but with added case insensitive flag
const plausibleDlURI = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|gtin|8006|itip|8013|gmn|8010|cpid|414|gln|417|party|8017|gsrnp|8018|gsrn|255|gcn|00|sscc|253|gdti|401|ginc|402|gsin|8003|grai|8004|giai)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/i;
// And this is 'RE2' also with added case insensitive flag ('RE3' that attempts to look for a compressed DL URI is not used in the test suite).
const plausibleDlURINoAlphas = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|8006|8013|8010|414|417|8017|8018|255|00|253|401|402|8003|8004)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/i;

// We're going to be checking that link types found are in the ratified list
const linkTypeListSource = 'https://ref.gs1.org/voc/data/linktypes';

// We will be trying to get the linkset by various methods. We will need to keep a note
// of the method(s) that work

let linksetGetMethods = {};

const modelLinkset = {
    "linkset": [
    {
        "anchor": "https://id.gs1.org/01/09506000164908",
        "itemDescription": "Crew neck white t-shirt",
        "https://ref.gs1.org/voc/certificationInfo": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/certificates",
                "title": "Certificates",
                "type": "text/html"
            },
            {
                "href": "https://www.oeko-tex.com/v/07.BH.52767",
                "title": "OEKO-TEX certificate",
                "type": "text/html",
                "hreflang": [
                    "fr"
                ]
            },
            {
                "href": "https://supplier.roadmaptozero.com/flp/certificate/verify/5067/95ac8a1acf238e6ae40d761400687fac",
                "title": "Roadmap to Zero certificate",
                "type": "text/html"
            },
            {
                "href": "https://supplier.roadmaptozero.com/flp/certificate/verify/5067/95ac8a1acf238e6ae40d761400687fac",
                "title": "Roadmap to Zero certificate",
                "type": "text/html"
            },
            {
                "href": "https://certificate.example/001",
                "title": "Another certificate",
                "type": "application/pdf"
            },
            {
                "href": "https://certificate.example/002",
                "title": "Another certificate",
                "type": "application/pdf",
                "hreflang": [
                    "en"
                ]
            },
            {
                "href": "https://certificate.example/003",
                "title": "Another certificate",
                "type": "application/pdf",
                "hreflang": [
                    "en"
                ],
                "context":["LK"]
            }
        ],
        "https://ref.gs1.org/voc/homepage": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/",
                "title": "Menu",
                "type": "text/html",
                "hreflang": [
                    "en"
                ]
            }
        ],
        "https://ref.gs1.org/voc/instructions": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/recycling",
                "title": "Recycling",
                "type": "text/html",
                "hreflang": [
                    "en"
                ]
            }
        ],
        "https://ref.gs1.org/voc/pip": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/pip",
                "title": "Product Info",
                "type": "text/html",
                "hreflang": [
                    "en"
                ]
            }
        ],
        "https://ref.gs1.org/voc/sustainabilityInfo": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/en/sustainability",
                "title": "Sustainability",
                "type": "text/html",
                "hreflang": [
                    "en"
                ]
            },
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/fr/sustainability",
                "title": "Sustainability",
                "type": "text/html",
                "hreflang": [
                    "fr"
                ]
            }
        ],
        "https://ref.gs1.org/voc/traceability": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/track-and-trace",
                "title": "Track and Trace",
                "type": "text/html"
            },
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/track-and-trace",
                "title": "Track and Trace",
                "type": "text/html"
            }
        ],
        "https://ref.gs1.org/voc/defaultLink": [
            {
                "href": "https://ref.gs1.org/tools/demo/2024retail/",
                "title": "Menu"
            }
        ]
    },
    {
        "anchor": "https://id.gs1.org/01/09506000164908/21/1234",
        "itemDescription": "Crew neck white t-shirt, serial number 1234",
        "https://ref.gs1.org/voc/dpp": [
            {
                "href": "https://example.com/dpp/7132mlkG",
                "title": "DPP",
                "type": "application/vc"
            }
        ]
    }    
]
}


// Global variables
let resultsArray = [];


// ***************************************************************************
// This is the main function that takes a Digital Link URI as input and creates the output.
// ***************************************************************************

const testDL = async (dl) =>
{
    clearGrid();
    // We start with some basic tests by simply inspecting the incoming URI
    // No external calls are made at this stage.

    let domain; // We'll need to make tests on the domain name in the DL URI

    // First of all - is the incoming string a URL at all?
    let isURL = Object.create(resultProps);
    isURL.id = 'isURL';
    isURL.test = 'Not listed as a conformance criterion but the DL URI must be a valid URL';
    isURL.msg = 'Given GS1 Digital Link URI is not a valid URL';
    recordResult(isURL);  // The default message is sent to the output. We'll update it if the test is passed.

    // While we're at it, we'll set up the results object for whether it's a valid DL URI or not
    let validDL = Object.create(resultProps);
    validDL.id = 'validDL';
    validDL.test = 'Given input must be a GS1 Digital Link URI';
    validDL.msg = 'Given input is not a valid GS1 Digital link URI, no further testing is possible';
    recordResult(validDL);

    // And whether it's using HTTPS or not
    let isHttps = Object.create(resultProps);
    isHttps.id = 'isHttps';
    isHttps.test = 'SHALL support HTTP Over TLS (HTTPS)';
    isHttps.msg = 'Given GS1 Digital Link URI uses a scheme other than HTTPS';
    isHttps.status = 'warn';
    recordResult(isHttps);

    // We will tolerate leading and training spaces but not spaces within the URL
    dl = dl.replace(/(^\s+|\s+$)/g, '');  // Remove leading and trailing spaces
    // console.log('Given GS1 Digital Link URI is "' + dl + '"');

    // We'll split the URI using Jo Rabin's regex
    let UriElements = dl.match(RabinRegEx);
    // If the input matches the regex, it's an http or https URI
    if (UriElements)
    {
        let scheme = UriElements[2].toLowerCase();
        domain = UriElements[4];  // Sets this important variable
        if (((scheme === 'http') || (scheme === 'https')) && (domain.indexOf('.') !== -1))
        {
            isURL.msg = 'Given GS1 Digital Link URI is a valid URL';
            isURL.status = 'pass';
            recordResult(isURL);
            // At this point we probably have a URL and we have its various elements,
        } // End is it a URL
        if (scheme === 'https')
        {
            isHttps.msg = 'Given GS1 Digital Link URI defines HTTPS as its scheme';
            isHttps.status = 'pass';
            recordResult(isHttps);
        }
    } // End is it a URI

    let plausibleDL;
    // if isHttps.status is pass or warn then we have a URL and we can probe further
    if (isHttps.status !== 'fail')
    {
        plausibleDL = Object.create(resultProps);
        plausibleDL.id = 'plausibleDL';
        plausibleDL.test = 'Following GS1 Digital Link: URI syntax, we can check whether a URL plausibly is, or definitely is not, a DL URI';
        plausibleDL.msg = 'Given URL does not conform to GS1 Digital Link URI syntax, no further tests are possible';
        plausibleDL.status = 'fail';
        // Let's check that it is a plausible DL URI using the regular expression method in the DL URI spec
        if (plausibleDlURINoAlphas.test(dl))
        {
            plausibleDL.status = 'pass';
            plausibleDL.msg = 'URL under test plausibly is a GS1 Digital Link URI (uncompressed)';
        } else if (plausibleDlURI.test(dl))
        {
            plausibleDL.status = 'warn';
            plausibleDL.msg = 'URL under test plausibly is a GS1 Digital Link URI but is using convenience alphas that were deprecated in version 1.2.0 and removed entirley in version 1.3.0 published in November 2022';
        }
        
        recordResult(plausibleDL);
    }
    // So now if plausibleDL.status is pass or warn, then we can pass it to the toolkit for a full check
    if (plausibleDL.status !== 'fail')
    {
        let gs1dlt = new GS1DigitalLinkToolkit(); // We'll need to use the GS1 Digital Link toolkit
        try
        {
            let gs1Array = gs1dlt.extractFromGS1digitalLink(dl);
            // You can get here with a variety of URLs including just a domain name and /gtin etc. 
            // So we need to check further Object returned has a GS1 object within it. 
            // Test for that using Mark's code unless and until we can switch to the BSR
    
            if (gs1dlt.buildStructuredArray(gs1Array.GS1).identifiers.length === 1)
            {
                validDL.status = 'pass';
                validDL.msg = 'Given input is a valid GS1 Digital Link URI';
                recordResult(validDL);
            }
        }
        catch (err)
        {
            console.log('Error when extracting keys from given DL. Message is ' + err);
        }
    }

    // If validDL.status is pass, we're good to go.
    if (validDL.status === 'pass')
    {
        // We'll call a series of functions rather than putting everything here
        // They return an object that normally goes into the async fetch array

        TLSCheck(domain).then();     // This one doesn't push to the array
        rdFileCheck(domain).then();  // Nor this one, so we don't need to wait either for them
        //We'll wait for these run tests
        await runTest(checkHttpVersion(domain));
        await runTest(headerBasedChecks(dl));
        await runTest(errorCodeChecks(dl));
        await runTest(trailingSlashCheck(dl));
        //await runTest(compressionChecks(dl, domain, gs1dlt));
        await runTest(testQuery(dl));
        await runTest(linkTypeIslinkset(dl, true));
        await runTest(ltWithAcceptHeader(dl, true))
        await runTest(fetchAndValidateTheLinkset(dl));
        //await runTest(linksetJsonldHeaderTest(dl));
        await runTest(testFor404(dl));
        await resultSummary();
        
    }
    rotatingCircle(false);
    // End if validDL.status=='pass'
}


const TLSCheck = async (domain) =>
{
    // This is designed to make sure that the server is available over TLS (i.e. using 
    // https works, even if the given DL is http) It does not handle a JSON 
    // response and therefore we don't use the promises array
    let tlsOK = Object.create(resultProps);
    tlsOK.id = 'tlsOK';
    tlsOK.test = 'SHALL support HTTP Over TLS (HTTPS)';
    tlsOK.msg = 'Resolver does not support HTTP over TLS';
    recordResult(tlsOK);

    try
    {
        let response = await fetch('https://' + domain, {method: 'HEAD', mode: 'no-cors'});
        // console.log(`response status is ${response.status}`)
        if (response.status >= 0)
        {   // status is usually 0 for a site that supports https, I think 'cos we're
            //  using non-cors mode. This test could really do with improving
            tlsOK.msg = 'Confirmed that server supports HTTP over TLS';
            tlsOK.status = 'pass';
        }
        recordResult(tlsOK);
    }
    catch (error)
    {
        console.log('TLSCheck() Error: There has been a problem with your fetch operation when checking for TLS support: ', error.message);
    }
    return tlsOK;
}

const rdFileCheck = async (domain) =>
    {
        // Checking that the Resolver Description File is available. Also want to check a few things about it.
    
        let rdFile = Object.create(resultProps);
        rdFile.id = 'rdFile';
        rdFile.test = 'SHALL provide a resolver description file at /.well-known/gs1resolver';
        rdFile.msg = 'Resolver Description File not found';
        recordResult(rdFile);
    
        try
        {
            let testRequest = new Request('https://' + domain + '/.well-known/gs1resolver', {
                method: 'get',
                mode: 'cors',
                redirect: 'follow',
                headers: new Headers({
                    'Accept': 'application/json'
                })
            });
            let response = await fetch(testRequest);
            let data = await response.json();
            const schemaTestResult = await doesJSONSchemaPass(data, resolverDescriptionFileSchema);
            //if (
            //    data['supportedPrimaryKeys'] &&
            //    data['resolverRoot'].match(/^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/) &&
            //    schemaTestResult.testResult
            //)
            if (schemaTestResult.testResult)
            {
                rdFile.msg = 'Resolver description file found with at least minimum required data and is valid against the official GS1 schema';
                rdFile.status = 'pass';
            }
            else if (response.ok)
            {
                rdFile.msg = 'Resolver description file found but does not validate against the official GS1 schema. Error(s): ' + schemaTestResult.errors.join(', ');
            }
            //else
            //{
            //    rdFile.msg = 'Resolver description file found but minimum required data not found';
            //}
            recordResult(rdFile);
        }
        catch (error)
        {
            console.log('rdFileCheck() Error: There has been a problem with your fetch operation: ', error.message);
        }
        return rdFile.status;
    }
    

    const checkHttpVersion = (domain) =>
        {
            let httpVersion = Object.create(resultProps);
            httpVersion.id = 'httpVersion';
            httpVersion.test = 'SHALL support HTTP 1.1 (or higher)';
            httpVersion.status = 'warn';
            httpVersion.msg = 'HTTP version not detected. If other tests passed, it\'s probably OK';
            httpVersion.url = testUri + '?test=getHTTPversion&testVal=' + encodeURIComponent(`https://${domain}`);
            recordResult(httpVersion);
            httpVersion.process = async (data) =>
            {
                let r = parseFloat(data.result.toUpperCase().replace('HTTP', '').replace('/', ''));
                if (r && r >= 1.1)
                {
                    httpVersion.status = 'pass';
                    httpVersion.msg = 'Server at ' + domain + ' supports HTTP ' + r;
                }
                recordResult(httpVersion);
            }
        
            return httpVersion;
        }
        

const headerBasedChecks = (dl) =>
{
    // We'll perform a number of checks based on the headers returned from checking the DL directly

    let corsCheck = Object.create(resultProps);
    corsCheck.id = 'corsCheck';
    corsCheck.test = 'SHALL support CORS';
    corsCheck.msg = 'CORS headers not detected';
    recordResult(corsCheck);

    // *************** Need to look at the link header
    let linkOnRedirect = Object.create(resultProps);
    linkOnRedirect.id = 'linkOnRedirect';
    linkOnRedirect.test = 'SHOULD expose the direct link to the linkset in an HTTP Link header when redirecting.';
    linkOnRedirect.status = 'warn';
    linkOnRedirect.msg = 'No link to the linkset detected when redirecting';
    recordResult(linkOnRedirect);

    
    let legacyLinkHeaders  = Object.create(resultProps);
    legacyLinkHeaders.id = 'legacyLinkHeaders';
    legacyLinkHeaders.test = 'The inclusion of all possible links in the HTTP Link header was deprecated in version 1.0.0 of the GS1-Conformant resolver standard, February 2024';
    legacyLinkHeaders.status = 'pass'; // This is unusual - we're setting this pass and will change to warn if we find a reason
    legacyLinkHeaders.msg = 'No unnecessary links found in HTTP Link header';
    recordResult(legacyLinkHeaders);

    let methodsCheck = Object.create(resultProps);
    methodsCheck.id = 'methodsCheck';
    methodsCheck.test = 'SHALL support HTTP 1.1 (or higher) GET, HEAD and OPTIONS requests.';
    methodsCheck.msg = 'At least one of GET, HEAD or OPTIONS not detected';
    recordResult(methodsCheck);

    let u = stripQueryStringFromURL(dl);
    corsCheck.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
    // console.log(`Looking at ${testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u)}`);
    corsCheck.process = async (data) =>
    {
        //console.log(`What came back was ${JSON.stringify(data.result)}`);
        if ((data.result['Access-Control-Allow-Origin']) || (data.result['access-control-allow-origin']))
        {
            // That's probably enough tbh
            corsCheck.status = 'pass';
            corsCheck.msg = 'CORS headers detected';
            recordResult(corsCheck);
        }
        // Need to handle case insensitivity - some servers use title case, others lower case
        if ((data.result['Access-Control-Allow-Origin'] !== undefined) && (data.result['access-control-allow-methods'] === undefined))
        {
            data.result['access-control-allow-methods'] = data.result['Access-Control-Allow-Methods'];

        }

        if ((typeof data.result['access-control-allow-methods'] === 'string') &&
            (((data.result['access-control-allow-methods'].indexOf('GET') > -1) &&
                    (data.result['access-control-allow-methods'].indexOf('HEAD') > -1)) &&
                (data.result['access-control-allow-methods'].indexOf('OPTIONS') > -1)))
        { // We have our three allowed methods
            methodsCheck.msg = 'GET, HEAD an OPTIONS methods declared to be supported';
            methodsCheck.status = 'pass';
            recordResult(methodsCheck);
        }

        // Handling case-insensitivity of 'Link/link' header
        let linkHeader = data.result['Link'];
        if (!linkHeader) {linkHeader = data.result['link'];}
        if (linkHeader)
        {   
            // we have a link header. 
            // We just want to make sure that there's a link to the linkset.
            // This means a link with a rel value of linkset 
            // If there is more than one link in the header, we can see if they're still
            // including all the links from the linkset. If so, we can warn and say that this
            // is now deprecated.
            
            // console.log(`Link header is ${linkHeader}`);
            let allLinks = linkHeader.split('",');
            for (let i in allLinks)
            {
                if (!allLinks.hasOwnProperty(i))
                {
                    continue;
                }
                allLinks[i] += '"';
            }

            // console.log(`All links is ${allLinks}`);
            // So we have an array, each item in a link with all its attributes
            // We just need to find a link with rel="linkset"
            for (link in allLinks)
            {
                // console.log(`Looking at a link header ${allLinks[link]}`)
                if (allLinks[link].indexOf('rel="linkset"') > -1){
                    linkOnRedirect.status = 'pass';
                    linkOnRedirect.msg = 'Link to the linkset detected when redirecting';
                    recordResult(linkOnRedirect);
                } 
                if (allLinks[link].indexOf('rel="gs1:') > -1){
                    // All we're looking for is a link with an @rel value that includes a gs1: CURIE
                    legacyLinkHeaders.status = 'warn'; 
                    legacyLinkHeaders.msg = 'Unnecessary links found in HTTP Link header';
                    recordResult(legacyLinkHeaders);
                }
            }
        }
    }
    return corsCheck;
}

const errorCodeChecks = (dl) =>
{
    // ******* Test for appropriate use of 400
    let reportWith400 = Object.create(resultProps);
    reportWith400.id = 'reportWith400';
    reportWith400.test = 'SHALL extract and syntactically validate the URI and report errors with an HTTP response code of 400';
    reportWith400.msg = 'Non-conformant GS1 Digital Link URI not reported with 400 error';
    recordResult(reportWith400);

    // ********** Also test not using 200 to report errors
    let noErrorWith200 = Object.create(resultProps);
    noErrorWith200.id = 'noErrorWith200';
    noErrorWith200.test = 'A GS1 conformant resolver SHALL NOT use a 200 OK response code with a resource that indicates an error condition';
    noErrorWith200.msg = 'Error reported with 200 OK';
    recordResult(noErrorWith200);

    // Let's create an error - we know we have a valid DL so we'll mess it up by adding /foo to the end
    reportWith400.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '/foo');
    reportWith400.process = async (data) =>
    {
        let httpResponseCode = data.result['httpCode']
        //console.log(`We have a response code of ${data.result['0']}`);
        if (httpResponseCode === 400)
        {
            reportWith400.msg = 'Non-conformant GS1 Digital Link URI correctly reported with 400 error';
            reportWith400.status = 'pass';
        }
        else
        {
            reportWith400.msg = `Non-conformant GS1 Digital Link URI wrongly reported with HTTP ${httpResponseCode} error`;
        }
        recordResult(reportWith400);
        if (httpResponseCode !== 200)
        {
            noErrorWith200.msg = `Error was correctly reported with a non-200 OK response code of HTTP ${httpResponseCode}`;
            noErrorWith200.status = 'pass';
            recordResult(noErrorWith200);
        }
    }
    return reportWith400;
}

const trailingSlashCheck = (dl) =>
{
    // Need to create a URI with and without a trailing slash
    // We can dispense with any query string and create version with no trailing slash, then append slash to make the
    // other
    let noSlash = stripQueryStringFromURL(dl);
    if (noSlash.lastIndexOf('/') + 1 === noSlash.length)
    {
        noSlash = noSlash.substring(0, noSlash.lastIndexOf('/'));
    }
    let slash = noSlash + '/';

    let trailingSlash = Object.create(resultProps);
    trailingSlash.id = 'trailingSlash';
    trailingSlash.test = 'SHOULD tolerate trailing slashes at the end of GS1 Digital Link URIs, i.e. the resolver SHOULD NOT fail if one is present';
    trailingSlash.msg = 'Resolver responds differently with or without a trailing slash';
    trailingSlash.status = 'warn'; // This is a SHOULD not a SHALL so warn is as strong as we should be
    recordResult(trailingSlash);

    trailingSlash.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(noSlash);
    trailingSlash.process = async (data) =>
    {
        try
        {
            let slashRequest = new Request(testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(slash), {
                method: 'get',
                mode: 'cors'
            })
            let response = await fetch(slashRequest);
            let slashJSON = await response.json();
            if ((data.result.httpCode === slashJSON.result.httpCode) && (data.result.location === slashJSON.result.location))
            {
                trailingSlash.status = 'pass';
                trailingSlash.msg = 'Response from server with and without trailing slash is identical'
                recordResult(trailingSlash); // No need to update if we didn't get here
            }
        }
        catch (error)
        {
            console.log('trailingSlashCheck() Error: There has been a problem with your fetch operation for ' + trailingSlash.url + ': ', error.message);
        }

    }
    return trailingSlash;
}


// Need to do lots of tests with the linkset
// Starting with "can I get it?"

// Ask for linkset using linkType=linkset, If something comes back, hang on to it.
// Ask for linkset using linkType=all - if anything somes back it should be the same as previous. Warn of deprecation
// Don't set Accept header with those two - should be HTML
// Repeat with Accept header set to application/json - should be JSON, doesn't have to be in the linkset formet
// Ask for linkset using Accept header of application/linkset+json without linkType param set (shoud be the same)
// Check for presence of Vary header
// In previous, check for presence of link header to context file by looking at value of @rel, should be the long w3.org URL
// However we got it, validate linkset against the schema
// If valid, test default link.
// If there's a defaultLinkMulti, work through those
// Now work through all the other links by asking for them explicitly - should redirect to the target
// Test for multiple links with exactly the same metadata - which should return a 300


const linkTypeIslinkset = (dl, firstRun) =>
{
    // Check that setting linkType to linkset does not redirect or cause an error
    let ltLinksetNoRedirect = Object.create(resultProps);
    ltLinksetNoRedirect.id = 'ltLinksetNoRedirect';
    ltLinksetNoRedirect.test = 'On receiving a request for the linkset, by setting the linkType parameter to linkset, the resolver SHALL NOT redirect the query and SHALL return the linkset. ';
    ltLinksetNoRedirect.msg = 'Setting linkType to linkset resulted in a redirect or an error';
    recordResult(ltLinksetNoRedirect);
    
    ltLinksetNoRedirect.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=linkset');
    // console.log(`Testing ${ltLinksetNoRedirect.url}`)
    ltLinksetNoRedirect.process = async (data) =>
        {
            // console.log(`What came back was ${data.result['httpCode']}`);
            if (data.result['httpCode'] === 200) {
                ltLinksetNoRedirect.status = 'pass';
                ltLinksetNoRedirect.msg = 'No redirect with linkType set to linkset';
                linksetGetMethods['linkset'] = true; // Record that this method worked for when we want to get the linkset
                recordResult(ltLinksetNoRedirect);
            } else if ((firstRun) && ((data.result['location'] !== undefined) || (data.result['Location'] !== undefined))) {
                // This happens if we ask for a DL URI with a qualifier (like a batch or serial)
                // And resolver redirects to the 'root' identifier. This is perfectly OK but we 
                // need to make a second query to get the linkset
                // Start by looking for a location header (case-insensitive)

                let ltLocation = (data.result['location'] !== undefined) ? data.result['location'] : data.result['Location'];
                if (dl.indexOf(stripQueryStringFromURL(ltLocation)) === 0) {
                    // Meaning that the URI we were redirected to is a less-granular version
                    // of our original dl
                    // console.log(`Here with a location of ${ltLocation}`)
                    linksetGetMethods['location'] = ltLocation;
                    await runTest(linkTypeIslinkset(ltLocation, false)); 
                    // Calls itself with the new (shorter) URL. 
                    // Setting the firstRun flag to false stops it calling itself more than once
                }
            } else {
                // OK so we haven't got a good result from linkType=linkset
                // Let's try the deprecated linkType=all
                await runTest(linkTypeIsAll(dl, true));
            }
        }
        return ltLinksetNoRedirect;
}

const linkTypeIsAll = (dl, firstRun) =>
    {
        // If linkType=linkset didn't work, we'll try this
        // The code is almost the same as when checking linkType=linkset 
        let ltAllNoRedirect = Object.create(resultProps);
        ltAllNoRedirect.id = 'ltAllNoRedirect';
        ltAllNoRedirect.test = 'On receiving a request for the linkset, by setting the linkType paramter to all, the resolver SHALL NOT redirect the query and SHALL return the linkset. ';
        ltAllNoRedirect.msg = 'Setting linkType to all resulted in a redirect or an error';
        recordResult(ltAllNoRedirect);
            
        ltAllNoRedirect.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=all');
        // console.log(`Testing ${ltAllNoRedirect.url}`)
        ltAllNoRedirect.process = async (data) =>
            {
                if (data.result['httpCode'] === 200) {
                    ltAllNoRedirect.status = 'warn';
                    ltAllNoRedirect.msg = 'Using linkType set to all was deprecated in GS1-Conformant resolver 1.0.0 (Feb 2024) in favour of linkType=linkset';
                    linksetGetMethods['all'] = true;; // Record that this method worked for when we want to get the linkset
                    recordResult(ltAllNoRedirect);
                } else if ((firstRun) && ((data.result['location'] !== undefined) || (data.result['Location'] !== undefined))) {
                    let ltLocation = (data.result['location'] !== undefined) ? data.result['location'] : data.result['Location'];
                    if (dl.indexOf(stripQueryStringFromURL(ltLocation)) === 0) {
                        // Meaning that the URI we were redirected to is a less-granular version
                        // of our original dl
                        // console.log(`Here with a location of ${ltLocation}`)
                        linksetGetMethods['location'] = ltLocation;
                        await runTest(ltAllNoRedirect(ltLocation, false)); 
                        // Calls itself with the new (shorter) URL. 
                        // Setting the firstRun flag to false stops it calling itself more than once
                    }
                }
            }
        return ltAllNoRedirect;
    }

const ltWithAcceptHeader = (dl, firstRun) =>
    {
        // This version of the same code used to try and get the linkset by setting
        // the HTTP Accept header to application/linkset+json
        
        let ltAcceptHeader = Object.create(resultProps);
        ltAcceptHeader.id = 'ltAcceptHeader';
        ltAcceptHeader.test = 'On receiving a request for the linkset, by setting the HTTP Accept Header to application/linkset+json, the resolver SHALL NOT redirect the query and SHALL return the linkset. ';
        ltAcceptHeader.msg = 'Setting HTTP Accept header to application/linkset+json resulted in a redirect or an error';
        recordResult(ltAcceptHeader);
        // Note use of getLinksetHeaders in the query to the tester.php service
        ltAcceptHeader.url = testUri + '?test=getLinksetHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=all');
        // console.log(`Testing ${ltAcceptHeader.url}`)
        ltAcceptHeader.process = async (data) =>
            {
                if (data.result['httpCode'] === 200) {
                    ltAcceptHeader.status = 'pass';
                    ltAcceptHeader.msg = 'Setting HTTP Accept header to application/linkset+json did not result in a redirect';
                    linksetGetMethods['accept'] = true; // Record that this method worked for when we want to get the linkset
                    recordResult(ltAcceptHeader);
                } else if ((firstRun) && ((data.result['location'] !== undefined) || (data.result['Location'] !== undefined))) {
                    let ltLocation = (data.result['location'] !== undefined) ? data.result['location'] : data.result['Location'];
                    if (dl.indexOf(stripQueryStringFromURL(ltLocation)) === 0) {
                        // Meaning that the URI we were redirected to is a less-granular version
                        // of our original dl
                        linksetGetMethods['location'] = ltLocation;
                        await runTest(ltWithAcceptHeader(ltLocation, false)); 
                        // Calls itself with the new (shorter) URL. 
                        // Setting the firstRun flag to false stops it calling itself more than once
                    }
                }
            }
        return ltAcceptHeader;
    }


const fetchAndValidateTheLinkset = (dl) =>
    {
        let validLinkset = Object.create(resultProps);
        validLinkset.id = 'validLinkset';
        validLinkset.test = 'Linkset must be valid according to published JSON schema';
        validLinkset.msg = 'Linkset does not validate';
        recordResult(validLinkset);

        // We'll also check the HTTP headers we got with the linkset
        let linksetJsonldCheck = Object.create(resultProps);
        linksetJsonldCheck.id = 'linksetJsonldCheck';
        linksetJsonldCheck.test = 'When requesting the linkset the HTTP response headers SHOULD include a Link header pointing to a JSON-LD context file';
        linksetJsonldCheck.msg = 'Link to JSON-LD context file not detected when requesting linkset';
        linksetJsonldCheck.status = 'warn';
        recordResult(linksetJsonldCheck);

        let declaredContentType = Object.create(resultProps);
        declaredContentType.id = 'declaredContentType';
        declaredContentType.test = 'If the HTTP Accept header is application/linkset+json, the resolver SHALL return the linkset serialised as JSON as defined by RFC9264';
        declaredContentType.msg = 'Linkset retrived from the resolver does not declare the content type as application/linkset+json';
        recordResult(declaredContentType);

        // We'll use the global linksetGetMethods object to help decide which 
        // way to get the linkset
        let u =  linksetGetMethods['location'] === undefined ? stripQueryStringFromURL(dl) : linksetGetMethods['location'] ;
        // We'll use the linkType parameter only if the accept header method doesn't work
        if (!linksetGetMethods['accept']) {
            if (linksetGetMethods['linkset']) {
                u += '?linkType=linkset';
            } else if (linksetGetMethods['all']) {
                u += '?linkType=all'
            }
        }
        // Note the use of the getLinkset funtion in tester.php which uses GET not the usual HEAD
        // It sets the Accept Header to application/linkset+json for all requests, whether
        // or not we're appending a linkType parameter.
        // Bottom line, if there is a linkset, one way or another, this should fetch it
        validLinkset.url = testUri + '?test=getLinkset&testVal=' + encodeURIComponent(u);
        //console.log(`Testing ${validLinkset.url}`)
        validLinkset.process = async (data) =>
            {
                let resultObject = JSON.parse(data.result);
                //console.log(`HTTP Code here is ${resultObject['httpCode']}`)
                // Need to urldecode the returned linkset
                const decodedString = decodeURIComponent(resultObject.responseBody);
                // console.log(`decoded string is ${decodedString}`)
                let tempObject;
        
                try {
                    tempObject = JSON.parse(decodedString);
                }
                catch (e)
                {
                    console.log('sendOutput() Error: ' + e.message);
                }

                // Development linkset is inserted here. In prod mode, we use the received linkset
                // linksetObject = modelLinkset;
                // console.log(`using the model linkset`);

                const schemaTestResult = await doesJSONSchemaPass(tempObject, gs1LinksetSchema);
                if (schemaTestResult.testResult) {
                    validLinkset.msg = 'Linkset validates against the published schema';
                    validLinkset.status = 'pass';
                    recordResult(validLinkset);
                    await linksetTests(dl, tempObject);
                }

                if (tempObject !== undefined) {
                    // work around not quite right linkset implementation in current prod resolver
                    // Seems to have been fixed 2025-06-02 so this hack not used. Good.
                    const linksetObject = tempFixLinkset(tempObject);
                    const schemaTestResult = await doesJSONSchemaPass(linksetObject, gs1LinksetSchema);
                    if (schemaTestResult.testResult) {
                        validLinkset.msg = 'Linkset validates against the published schema';
                        validLinkset.status = 'pass';
                        recordResult(validLinkset);
                        await linksetTests(dl, linksetObject);
                    }
                }
                // Now back to the headers
                // First we'll loo for the link to the JSON-LD context file
                let linkHeader = '';
                if (resultObject.headers.link) {
                    linkHeader = resultObject.headers.link;
                } else if (resultObject.headers.link) {
                    linkHeader = resultObject.headers.link;
                }
                let allLinks = linkHeader.split(',');
                for (i in allLinks) {
                    // console.log(`looking at ${allLinks[i]}`)
                    if ((allLinks[i].indexOf('rel="http://www.w3.org/ns/json-ld#context"') !== -1) &&
                            (allLinks[i].indexOf('type="application/ld+json"') !== -1)) {
                        linksetJsonldCheck.msg = 'Link to JSON-LD context file found';
                        linksetJsonldCheck.status = 'pass';
                        recordResult(linksetJsonldCheck);
                        BREAK
                    }
                }
                // Now we can see whether the declared content type is correct
                let contentType = '';
                if (resultObject.headers['content-type']) {
                    contentType = resultObject.headers['content-type'];
                } else if (resultObject.headers['Content-Type']) {
                    contentType = resultObject.headers['Content-Type'];
                }
                if (contentType === 'application/linkset+json') {
                    declaredContentType.status = 'pass';
                    declaredContentType.msg = 'Content type for the linkset retrieved from the resolver matches the requested application/linkset+json';
                } else if (contentType === 'application/json') {
                    declaredContentType.status = 'warn';
                    declaredContentType.msg = 'Content type for the linkset retrieved from the resolver was application/json but the more specific application/linkset+json was requested';
                }
                recordResult(declaredContentType);
            }
        return validLinkset;
    }
    
        
// This is a temporary hack around the weird behavious of id.gs1.org where 
// linksets are badly formed. Should be removed when new version of GO resolver
// goes live in September 2025
// Now seems unnecessary 2025-06-02
const tempFixLinkset = (linksetObject) => 
    {
        if (Array.isArray(linksetObject.linkset)) {
            return linksetObject;
        } else {
            let modifiedObject = {"linkset":[linksetObject.linkset]};
            //console.log(`modified version is ${JSON.stringify(modifiedObject)}`);
            let hackedLinkset = Object.create(resultProps);
            hackedLinkset.id = 'hackedLinkset';
            hackedLinkset.test = 'Linkset must be valid according to published JSON schema';
            hackedLinkset.msg = 'This is a temporary hack - the linkset is *not* valid as the value of linkset itself must be an array of objects';
            recordResult(hackedLinkset);
            console.log(`Linkset under test has been modified (to make it conformant) by putting the linkset in an array`)
            return modifiedObject;
        }


    }

const doesJSONSchemaPass = async (data, schemaUrl) =>
{
    try
    {
        // Initialize Ajv 
        // Set the strict flag to false as it currently doesn't seem to support format type of uri
        // Need to investigate
        const ajv = new window.ajv7({strict:false});

        // Fetch schema from URL
        const fetchSchema = async () => {
            try {
                const response = await fetch(schemaUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch schema: ${response.statusText}`);
                }

                const schema = await response.json();

                // If the schema specifies Draft-04, replace it with Draft-07
                // Need to update the actual schema
                if (schema.$schema === 'http://json-schema.org/draft-04/schema#') {
                    schema.$schema = 'http://json-schema.org/draft-07/schema#';
                }

                return schema;
            } catch (error) {
                console.error('Error fetching schema:', error.message);
                throw new Error('Unable to fetch schema');
            }
        };

        // Fetch the schema
        let schema;
        try
        {
            schema = await fetchSchema();
        }
        catch (error)
        {
            return {
                testResult: false,
                errors: [error.message]
            };
        }

        // Compile schema and validate data
        try
        {
            const validate = ajv.compile(schema);
            const valid = validate(data);

            if (valid)
            {
                return {testResult: true}; // Success
            }
            else
            {
                return {
                    testResult: false,
                    errors: validate.errors.map(err => `${err.instancePath} ${err.message}`)
                };
            }
        }
        catch (error)
        {
            console.error('Validation error:', error.message);
            return {
                testResult: false,
                errors: [error.message]
            };
        }
    }
    catch (error)
    {
        console.error('Unexpected error:', error.message);
        return {
            testResult: false,
            errors: ['Unexpected error occurred during schema validation']
        };
    }
};

const testQuery = (dl) =>
{
    let qsPassedOn = Object.create(resultProps);
    qsPassedOn.id = 'qsPassedOn';
    qsPassedOn.test = 'By default, SHALL pass on all key=value pairs in the query string of the request URI (if present) when redirecting';
    qsPassedOn.msg = 'Query string not passed on. If the query string is deliberately suppressed for this Digital Link URI, test another one where the default behaviour of passing on the query string applies';
    qsPassedOn.status = 'warn';
    recordResult(qsPassedOn);
    let u = stripQueryStringFromURL(dl);
    let query = 'foo=bar';
    qsPassedOn.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?' + query);
    //console.log(`We're testing the query string in this ${testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?' + query)}`);
    qsPassedOn.process = async (data) =>
    {
        let redirect;
        if (data.result.location){
            redirect = data.result.location;
        } else if (data.result.Location){
            redirect = data.result.Location;
        }
        if (redirect) 
        {          
            // There is a redirection
            if (redirect.indexOf(query) > -1)
            { // Our query is being passed on
                qsPassedOn.status = 'pass';
                qsPassedOn.msg = 'Query passed on when redirecting';
            }
        }
        else
        {
            qsPassedOn.msg = 'GS1 Digital Link URI not redirected so cannot test this feature';
        }
        recordResult(qsPassedOn);
    }
    return qsPassedOn;
}


const linksetTests = async (dl, linksetObject) => {
    // This routine is called only after we know we have a valid linkset
    // That means we can make some assumptions about its structure
    // However, we don't know how many relavant anchors it has. There should be at least
    // one against which we can match our incoming dl, but we may have to
    // chop the end off the dl to find the match

    // First a bit of hosekeeping.
    // We need to handle the 3 namespaces that can be used for GS1 link types
    // Reduce them all to 'gs1:'
    // We'll stringify the linkset, do a search and replace, and re-parse it.
    let linksetObjectAsString = JSON.stringify(linksetObject);
    const re = /https:\/\/((ref\.)|(www\.))?gs1\.org\/voc\//gi;
    linksetObjectAsString = linksetObjectAsString.replace(re, 'gs1:');
    //console.log(linksetObjectString);
    const workingLinksetObject = JSON.parse(linksetObjectAsString);

    // Now we will work through the linksetObject looking for anchors that
    // match our dl and then, if there are qualifier paths, remove those and look
    // again, i.e. walk up the tree.
    // So if the path is /01/{gtin}/10/{serial} we'll look for an anchor that matches
    // that, then chop off the last two segments and look for a match for just /01/{gtin}
    // As we do this, we can build up a picture of the link types for which we have links
    // If the same link type appears at multiple levels only the most granular level applies

    // We're most concerned with path elements so let's get those somewhere we can
    // refer to them and manage them if we want to
    const UriElements = dl.match(RabinRegEx); // (see near the top of this code library)
    let pathElements = UriElements[10].split('/');
    let currentDL = stripQueryStringFromURL(dl); // As usual, query strings are irrelevant

    // We need to keep track of the link types found and processed
    let linkTypesAvailable = [];

    // We know there should be a default link so we can set that object up outside
    // of the loop

    let defaultLinkExists = Object.create(resultProps);
    defaultLinkExists.id = 'defaultLinkExists';
    defaultLinkExists.test = 'For each identified entity there SHALL be exactly one default link, the list of link types for which SHALL include gs1:defaultLink. This default is defined without any of the optional attributes, that is, it SHALL include a title, but SHALL NOT include other attributes.';
    defaultLinkExists.msg = 'No default link found';
    recordResult(defaultLinkExists);


    while (pathElements.length > 2) { 
        // This outer loop works back from the right hand side of the dl
        for (i in workingLinksetObject.linkset) {
            // The working linkset is an array with one anchor per object
            // It's that anchor we want to match against our currentDL
            if (workingLinksetObject.linkset[i].anchor === currentDL) {
                // We have a match for this DL
                // Now we need to see what link types there are for this anchor
                // And then, for each link type, process the link(s) found

                for (j in workingLinksetObject.linkset[i]) {
                    // So we're working our way through the array that is the value of the 
                    // `linkset` property
                    if ((j !== 'anchor') && (j !== 'itemDescription')) {
                        // In a valid linset, if it's not the anchor or the itemDescription, 
                        // it must be a link type
                        const currentLinkType = j;
                        // The same link type may be used higher up the hierarchy but we
                        // must only check it at the most granular level for which there
                        // is a match. Therefore, we only process this link type if we haven't
                        // seen it already. To do that, we need to keep a note of what we
                        // have done
                        if (!linkTypesAvailable.includes(currentLinkType)) {
                            linkTypesAvailable.push(currentLinkType);

                            // We'll start by looking for a defaultLink at this level
                            if (currentLinkType === 'gs1:defaultLink') {
                                defaultLinkExists.msg = 'Default link found';
                                defaultLinkExists.status = 'pass';
                                recordResult(defaultLinkExists);
                                // If we have a defaultLink, there should only be one link object
                                // Let's check and record that result
                                let singleDefaulLink = Object.create(resultProps);
                                singleDefaulLink.id = 'singleDefaulLink';
                                singleDefaulLink.test = 'For each identified entity there SHALL be exactly one default link, the list of link types for which SHALL include gs1:defaultLink. This default is defined without any of the optional attributes, that is, it SHALL include a title, but SHALL NOT include other attributes.';
                                if (workingLinksetObject.linkset[i][currentLinkType].length === 1) {
                                    singleDefaulLink.status='pass';
                                    singleDefaulLink.msg = 'Single default link found'
                                } else if (workingLinksetObject.linkset[i][currentLinkType].length !== 1){
                                    singleDefaulLink.msg = 'Multiple (or zero) default links found'
                                }
                                recordResult(singleDefaulLink);
                                // We should be redirected to the default's href with a simple query
                                // console.log(`Is our default link ${workingLinksetObject.linkset[i]['gs1:defaultLink'][0].href} ?`)
                                if ((singleDefaulLink.status ==='pass') && (workingLinksetObject.linkset[i]['gs1:defaultLink'][0].href)) {
                                    await runTest(testDefaultLink(dl, workingLinksetObject.linkset[i]['gs1:defaultLink'][0].href));
                                }
                            } else if (workingLinksetObject.linkset[i][currentLinkType].length === 1) {
                                // There is a single possible redirect for this link type, nothing else matters 
                                // at this point so we're looking for a simple redirect
                                // If the current link type is gs1:defaultLinkMulti that deserves a warning
                                // as it makes no sense to have a single "defaultMulti"
                                if (currentLinkType === 'gs1:defaultLinkMulti') {
                                    let singleMultiLink = Object.create(resultProps);
                                    singleMultiLink.id = 'singleMultiLink';
                                    singleMultiLink.test = `Support for gs1:defaultLinkMulti is optional but, if supported, it allows a resolver to take note of, for example, a user’s language preferences to determine which of several available redirects are followed.`;
                                    singleMultiLink.status = 'warn';
                                    singleMultiLink.msg = `A single link is defined for gs1:defaultLinkMulti. This is inconsistent with its intended use`;
                                    recordResult(singleMultiLink);
                                } else {
                                    // console.log(`Link type of ${currentLinkType} should redirect to ${workingLinksetObject.linkset[i][currentLinkType][0].href}`)
                                    await runTest(testSingleLinkObject(dl, currentLinkType, workingLinksetObject.linkset[i][currentLinkType][0].href));
                                }
                            } else if (workingLinksetObject.linkset[i][currentLinkType].length > 1) {
                                // Here we have more than one link object for a given link type
                                // We take into consideration the type and hreflang attributes
                                // The context attribute is optional and its value space undefined in
                                // the standard, therefore we cannot use it formally in these tests
                                // However, we do need to look at it because a resolver may use it in
                                // any way it wants and so we can't expect a 300 response for link objects
                                // where the context is different, even though we're not testing it directly

                                // Set up an array for this link type that stores the array position
                                // of link objects with identical attributes
                                // These should return an HTTP 300 response
                                let threehundredLinks = [];
                
                                for (linkObject in workingLinksetObject.linkset[i][currentLinkType]) {
                                // Start with the first one and put its attributes in a mini object
                                // f is the one for which we're looking for any exact matches (m)

                                    for (let f = 0; f < workingLinksetObject.linkset[i][currentLinkType].length; f++) {
                                        if (!threehundredLinks.includes(f)) {
                                            // If we haven't already got this in our list of 300s
                                            const lo1 = {};
                                            if (workingLinksetObject.linkset[i][currentLinkType][f].type) {lo1.type = workingLinksetObject.linkset[i][currentLinkType][f].type}
                                            if (workingLinksetObject.linkset[i][currentLinkType][f].hreflang) {lo1.hreflang = workingLinksetObject.linkset[i][currentLinkType][f].hreflang}
                                            if (workingLinksetObject.linkset[i][currentLinkType][f].context) {lo1.context = workingLinksetObject.linkset[i][currentLinkType][f].context}

                                            // Now we look through the other link objects, noting exact matches
                                            // If we find one, we record the two under test in the threehundredLinks array

                                            for (let m = 0; m < workingLinksetObject.linkset[i][currentLinkType].length; m++) {
                                                if ((f !== m) && (!threehundredLinks.includes(m))) {
                                                    const lo2 = {};
                                                    if (workingLinksetObject.linkset[i][currentLinkType][m].type) {lo2.type = workingLinksetObject.linkset[i][currentLinkType][m].type}
                                                    if (workingLinksetObject.linkset[i][currentLinkType][m].hreflang) {lo2.hreflang = workingLinksetObject.linkset[i][currentLinkType][m].hreflang}
                                                    if (workingLinksetObject.linkset[i][currentLinkType][m].context) {lo2.context = workingLinksetObject.linkset[i][currentLinkType][m].context}
                                                    if (identicalAttributes(lo1, lo2)) {
                                                        if (!threehundredLinks.includes(f)) {threehundredLinks.push(m)}
                                                        if (!threehundredLinks.includes(m)) {threehundredLinks.push(m)}
                                                    }
                                    
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log(`For ${currentLinkType} Check any of these to get a 300 ${threehundredLinks}`)
                                // console.log(`For ${currentLinkType} Check all that are not in ${threehundredLinks} individually`)
                                await testMultipleLinks(dl, currentLinkType, workingLinksetObject.linkset[i][currentLinkType], threehundredLinks);
                            }
                        }
                    }
                }
            }
        }  
        // Remove last two segments and go round again
        currentDL = currentDL.substring(0, currentDL.lastIndexOf('/'));
        currentDL = currentDL.substring(0, currentDL.lastIndexOf('/'));
        pathElements.pop(); pathElements.pop();
    }
    // console.log(`I have my link Types which are ${linkTypesAvailable}`)
    // Before we finish this marathon, let's just check that all the link types
    // that we have found are in the GS1 set
    // checkGS1LinkTypes(linkTypesAvailable);
    let linkTypesDefined = Object.create(resultProps);
    linkTypesDefined.id = 'linkTypesDefined';
    linkTypesDefined.test = 'Link types SHOULD be given as a URI defined in the GS1 Web vocabulary';
    linkTypesDefined.status = 'warn';
    linkTypesDefined.msg = 'Link type detected that claims to be defined in the GS1 Web Vocabulary but is not';
    recordResult(linkTypesDefined);

    // Fetch the current list of link types
    const fetchRatifiedLinkTypes = async () => {
        try {
            const response = await fetch('https://ref.gs1.org/voc/data/linktypes', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ratified link type list: ${response.statusText}`);
            }

            const list = await response.json();

            return list;
        } catch (error) {
            console.error('Error fetching list:', error.message);
            throw new Error('Unable to fetch list');
        }
    };

    // Fetch the list
    let list;
    try
    {
        list = await fetchRatifiedLinkTypes();
    }
    catch (error)
    {
        return {
            testResult: false,
            errors: [error.message]
        };
    }
    // Set overall result to pass
    linkTypesDefined.status = 'pass';
    linkTypesDefined.msg = 'All GS1 link types found are in the current ratified set';
    
    // Now look for any that aren't in the list and reset back to warn if needs be
    for (lt in linkTypesAvailable) {
        if (linkTypesAvailable[lt].indexOf('gs1:') === 0) {
            // We're only looking at GS1 link types
            linkTypeName = linkTypesAvailable[lt].substring(4);
            if (list[linkTypeName] === undefined) {
                linkTypesDefined.status = 'warn';
                linkTypesDefined.msg = `gs1:${linkTypeName} is not a ratified GS1 link type`;
            }
        }
    }
    recordResult(linkTypesDefined);
}


const testDefaultLink = (dl, targetURL) => {
    let defaultTarget = Object.create(resultProps);
    defaultTarget.id = 'defaultTarget';
    defaultTarget.test = "One of the links SHALL be recognised by the resolver as the default and the resolver SHALL redirect to that URL unless there is information supplied within the query to the contrary.";
    defaultTarget.msg = "Resolver does not redirect to the default as expected"
    recordResult(defaultTarget);
    let u = stripQueryStringFromURL(dl);
    defaultTarget.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
    defaultTarget.process = async (data) =>
        {
            let targetLocation = data.result.Location;
            if (!targetLocation) {targetLocation = data.result.location}
            if (targetURL === targetLocation) {
                defaultTarget.status = 'pass';
                defaultTarget.msg = "Resolver correctly redirects to default"
                recordResult(defaultTarget);
            }
        }  
    return defaultTarget;
}


const testSingleLinkObject = (dl, linkType, targetURL) => {
    let loObject = Object.create(resultProps);
    loObject.id = 'loFor' + linkType.replace(':','');
    loObject.test = 'If the requested type of link is available, the resolver SHALL redirect to it';
    loObject.msg = `Requesting linkType of ${linkType} did not redirect to ${targetURL}`;
    loObject.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=' + linkType);
    // console.log(`Single link object fetching ${loObject.url}`)
    recordResult(loObject);
    loObject.process = async (data) =>
        {
            let targetLocation = data.result.Location;
            if (!targetLocation) {targetLocation = data.result.location}
            if (targetLocation.indexOf('?linkType='+linkType) !== -1) 
                {
                    targetLocation = stripQueryStringFromURL(targetLocation)
                } else if (targetLocation.indexOf('&linkType='+linkType) !== -1) 
                {
                    targetLocation = targetLocation.substring(0, targetLocation.indexOf('&linkType='))
                }
            //console.log(`targetURL is ${targetURL} and targetLocation is ${targetLocation}, test is ${(targetURL === targetLocation)}`)
            if (targetURL === targetLocation) {
                loObject.status = 'pass';
                loObject.msg = `Resolver correctly redirects to ${targetURL} for ${linkType} `
                recordResult(loObject);
            }
        } 
    return loObject 
}

const testMultipleLinks = async (dl, linkType, arrayOfLinkObjects, threehundredLinks) => {
    let done300 = false;
    // console.log(`Looking at ${linkType} with its ${arrayOfLinkObjects.length} LOs, noting the 300s ${threehundredLinks}.`)
    for (lo in arrayOfLinkObjects) {
        let lang = ''; let context = ''; let mediaType = '';
        let loObject = Object.create(resultProps);
        loObject.id = 'loFor' + linkType.replace(':','') + lo;
        if ((threehundredLinks.includes(parseInt(lo))) && (done300)) {
            // console.log(`Done`)
            continue
        } else if (threehundredLinks.includes(parseInt(lo))) {
            // console.log(`Our link object ${lo} is in the 300Links array`)
            // We'll only test one of the links in the threehundredLinks array.
            // We'll assume that if the resolver returns a 300 for one, it will do so for all
            loObject.test = 'Where it is impossible to determine which of multiple links of the same link type is the best match, the resolver should return the list of the available links of that type with an HTTP response code of 300 Multiple Choices.';
            loObject.msg = `A request for which the linkset contains multiple links for ${linkType} with the following identical attributes did not return a 300 response: `;
            loObject.status = 'warn';
            loObject.process = async (data) =>
            {
                if (data.result['httpCode'] === 300) {
                    loObject.status = 'pass';
                    loObject.msg = 'Resolver returned a 300 result when queried for a link for which it has multiple possible responses.';
                    recordResult(loObject);
                }
            }
            done300 = true;
        } else {
            // console.log(`Our link object ${lo} is not in the 300Links array`)
            // So now we're looking for a redirect, not a 300
            loObject.test = 'If the requested type of link is available, the resolver SHALL redirect to it';
            loObject.msg = `Requesting linkType of ${linkType} with the following parameters did not redirect to ${arrayOfLinkObjects[lo].href}`;
            loObject.process = async (data) =>
            {
                // Need to handle 'location' and 'Location'
                // Need to handle linkType in the target location query string whether on its own or added to existng query
                let targetLocation = data.result.Location;
                if (!targetLocation) {targetLocation = data.result.location}
                if (targetLocation.indexOf('?linkType='+linkType) !== -1) {
                    targetLocation = stripQueryStringFromURL(targetLocation)
                } else if (targetLocation.indexOf('&linkType='+linkType) !== -1) {
                    targetLocation = targetLocation.substring(0, targetLocation.indexOf('&linkType='))
                }
                // Now we can do the comparison
                if (arrayOfLinkObjects[lo].href === targetLocation) {
                    loObject.status = 'pass';
                    loObject.msg = loObject.msg.replace('did not redirect', 'redirected')
                }
                recordResult(loObject);
            } 
        }
        // In all cases, we need to construct the request with all the relevant parameters
        let queryString = '?'
        if (linkType !== 'gs1:defaultLinkMulti') {
            // Never ask for defaultLinkMulti explicitly
            linkTypeToQuery = '?linkType=' + linkType;
        }
        if (arrayOfLinkObjects[lo].type !== null) {
            loObject.msg += ` type: ${arrayOfLinkObjects[lo].type}`;
            if (queryString.length > 1) {
                // So this isn't the first name=value pair
                queryString += '&';
            }
            queryString += `mediaType=${arrayOfLinkObjects[lo].type}`;
            
        }
        if (Array.isArray(arrayOfLinkObjects[lo].hreflang)) {
            loObject.msg += ` hreflang: ${arrayOfLinkObjects[lo].hreflang[0]}`;
            if (queryString.length > 1) {
                // So this isn't the first name=value pair
                queryString += '&';
            }
            queryString += `lang=${arrayOfLinkObjects[lo].hreflang[0]}`;
        }
        if ((arrayOfLinkObjects[lo].context !== undefined) && (Array.isArray(arrayOfLinkObjects[lo].context))) {
            if (queryString.length > 1) {
                // So this isn't the first name=value pair
                queryString += '&';
            }
            loObject.msg += ` context: ${arrayOfLinkObjects[lo].context[0]}`;
            queryString += `context=${arrayOfLinkObjects[lo].context[0]}`;
        } else if (arrayOfLinkObjects[lo].context !== undefined) {
            // console.log(`here with something else and ${arrayOfLinkObjects[lo].context}`)
            loObject.msg += ` context: ${arrayOfLinkObjects[lo].context}`
            queryString += `context=${arrayOfLinkObjects[lo].context}`;
        }
        loObject.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + queryString);
        console.log(`fetching ${loObject.url}`)
        recordResult(loObject);
        await runTest(loObject);
    }
}

const identicalAttributes = (lo1, lo2) => {
    let typeMatch = false; let hreflangMatch = false; let contextMatch = false;
    if ((!lo1.type) && (!lo2.type)) {
        // Both are undefined
        typeMatch = true;
    } else if (((lo1.type) && (lo2.type)) && ((lo1.type === lo2.type))) {
        // Both are defined and are the same
        typeMatch = true
    } // In any other circumstance, there must be a difference.
    // Repeat for hreflang
    if ((!lo1.hreflang) && (!lo2.hreflang)) {
        //Both are undefined
        hreflangMatch = true;
    } else if (((lo1.hreflang) && (lo2.hreflang)) && (lo1.hreflang.every((val, idx) => val === lo2.hreflang[idx]))) {
        // Both are defined and the arrays of hreflangs are equivalent
        hreflangMatch = true
    }
    // Repeat for context, but it could be a string or an array 
    // (could conceiveably be an object but thats getting over-complicated so we'll ignore that possibility)
    if ((!lo1.context) && (!lo2.context)) {
        //Both are undefined
        contextMatch = true;
    } else if ((lo1.context) && (lo2.context)) {
        // This has not been tested as of 2025-05-23
        if (((Array.isArray(lo1.context)) && (Array.isArray(lo2.context))) && (lo1.context.every((val, idx) => val === lo2.context[idx]))) {
            contextMatch = true;
        } else if (lo1.context === lo2.context) {
            contextMatch = true;
        }
    }
            
    return (typeMatch && hreflangMatch && contextMatch)
}

const testFor404 = (dl) => {
    // A check that if we ask for a link type for which no link is available
    // the resolver returns a 404

    let specificLinkTypeNotFound = Object.create(resultProps);
    specificLinkTypeNotFound.id = 'specificLinkTypeNotFound';
    specificLinkTypeNotFound.test = 'If the requested type of link is not available, the resolver SHALL return a 404 Not Found message.';
    specificLinkTypeNotFound.msg = 'Requesting a specific link type for which no link is available did not result in a 404 Not Found response';
    specificLinkTypeNotFound.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=gs1:nosuchlt');
    recordResult(specificLinkTypeNotFound);

    specificLinkTypeNotFound.process = async (data) => {
        if (data.result['httpCode'] === 404) {
            specificLinkTypeNotFound.status = 'pass';
            specificLinkTypeNotFound.msg = 'Requesting a specific link type for which no link is available resulted in a 404 Not Found response';
            recordResult(specificLinkTypeNotFound);
        }
    }
    return specificLinkTypeNotFound;
}

const resultSummary = async () => {
    // Working with the testArray that was defined as a global variable near the top
    // Let's start by calculating a simple percentage success
    let pass = 0; let fail = 0; let rdFileText=''; let invalidLinksetText=''; 
    let criticalFailure = 0; 
    for (i in resultsArray) {
        if (resultsArray[i].status === 'pass') {pass++}
        if (resultsArray[i].status === 'fail') {fail++}
        if (resultsArray[i].id === 'rdFile') {
            if (resultsArray[i].status !== 'pass') {
                // critical failure as Resolver Description File is essential
                rdFileText = `GS1-Conformant resolvers MUST be declared at /.well-known/gs1resolver so that they can be distinguished from other services`;
                criticalFailure++;
            }
        }
        if ((resultsArray[i].id === 'validLinkset') || (resultsArray[i].id === 'hackedLinkset')) {
            if (resultsArray[i].status !== 'pass') {
                // Critical failure as linkset must be valid
                invalidLinksetText = `GS1-Conformant resolvers MUST return a valid linkset, formatted as JSON, as defined in RFC 9264`;
                criticalFailure++;
            }
        }
    }
    let pc = 100 * pass/(pass+fail)
    let percentPassed = parseFloat(pc).toFixed(0);
    // let text = `You passed ${percentPassed}% of the tests. `;
    let text = '';
    let p = document.createElement('p');
    p.id = 'overallReport';
    if (criticalFailure) {
        p.className = 'fail'
        if (criticalFailure === 1) {
            text += `There is at least one critical issue: ${rdFileText}${invalidLinksetText}.`;
        } else {
            text += `There are critical issues: ${rdFileText} and ${invalidLinksetText}.`;
        }
    } else if (pc === 100) {
        p.className = 'pass'
    } else if (pc > 60) {
        p.className = 'lightWarn'
    } else {
        p.className = 'warn'
    }
    p.appendChild(document.createTextNode(text));
    if (text !== '') {
        document.getElementById(outputElement).prepend(p)
    }
}




const rotatingCircle = (showFlag) =>
{
    document.getElementById('rotatingcircle').style.visibility = showFlag ? "visible" : "hidden";
}



// ********************* Processing functions ******************************

function stripQueryStringFromURL(url)
{
    try
    {
        return url.indexOf('?') > -1 ? url.substring(0, url.indexOf('?')) : url;
    }
    catch (e)
    {
        console.log(`stripQueryStringFromURL() URL: '${url}',  Error: ${e.message}`);
        // print stacktrace
        console.log(e.stack);
    }
}

/**
 * runTest() executes the .process() method in the supplied test.
 * @param test
 * @returns {Promise<void>}
 */
const runTest = async (test) =>
{
    // console.log('Here with Fetching ' + test.url + ' for ' + test.id);
    try
    {
        let response = await fetch(test.url, {headers: test.headers});
        let data = await response.json();
        await test.process(data);
        // runTest has called recordResult since day 1 but it's unnecessary and
        // giving odd results in some cases. Commented out 2025-06-02
        //recordResult(test);
    }
    catch (error)
    {
        console.log(`"Error from test id: '${test.id}' on '${test.url}' has error: ${error}`);
        // print stacktrace
        console.log(error.stack);
    }
    return test.status;
}


// ************************** Output functions *****************************

function getDL()
{
    let dl = document.getElementById('testResults');
    if (!dl)
    {
        dl = document.createElement('dl');
        dl.id = 'testResults';
        document.getElementById(outputElement).appendChild(dl);
    }
    return dl;
}


function clearGrid()
{
    let e = document.getElementById('overallReport');
    if (e) {
        e.remove();
    }
    e = document.getElementById('resultsGrid');
    if (e)
    {
        e.innerHTML = '';
    }
    e = document.getElementById('testResults');
    if (e)
    {
        e.innerHTML = '';
    }
    return true;
}

function getGrid()
{
    let p = document.getElementById('resultsGrid')
    if (!p)
    {
        p = document.createElement('p');
        p.id = 'resultsGrid';
        document.getElementById(outputElement)
            .appendChild(p);
    }
    return p;
}

function recordResult(result)
{
    try
    {
        // See if result is already in the array
        let i = 0;
        while ((i < resultsArray.length) && (resultsArray[i].id !== result.id))
        {
            i++;
        }
        // i now either points to the existing record or the next available index, either way we can now push the result
        // into the array
        resultsArray[i] = result;
        sendOutput(result);
        return 1;
    }
    catch (e)
    {
        console.log('recordResult() Error: ' + e.message);
        return 0;
    }
}

function sendOutput(o)
{
    // We begin by creating or updating entries in the DL list
    // If the dt/dd pair exist we need to update them, otherwise we need to create them
    // So begin by testing for existence

    try
    {
        let dd = document.getElementById(o.id + 'dd');
        if (dd)
        {
            // It exists
            dd.innerHTML = o.msg;
            dd.className = o.status;
        }
        else
        {
            // It doesn't exist so we need to create everything
            let dt = document.createElement('dt');
            dt.id = o.id;
            let t = document.createTextNode(o.test);
            dt.appendChild(t);
            dd = document.createElement('dd');
            dd.id = o.id + 'dd';
            dd.className = o.status;
            t = document.createTextNode(o.msg);
            dd.appendChild(t);

            let dl = getDL();
            dl.appendChild(dt);
            dl.appendChild(dd);
        }

        // Now we want to do the same for the grid
        let grid = getGrid();
        // Does the grid square exist?
        let a = document.getElementById(o.id + 'a');
        if (a)
        {
            // It exists - this will just be a status change
            a.className = o.status;
        }
        else
        {
            // It doesn't exist and needs to be created
            let sq = document.createElement('a');
            sq.id = o.id + 'a';
            sq.href = '#' + o.id;
            sq.className = o.status;
            sq.title = o.test;
            grid.appendChild(sq);
        }
    }
    catch (e)
    {
        console.log('sendOutput() Error: ' + e.message);
    }
}
