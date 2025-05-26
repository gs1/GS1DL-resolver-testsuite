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

const linkProps = { // We'll need to test lots of links (from the linkset) so it's good to have all their properties in an object
    "href": "",
    "rel": "",
    "title": "",
    "hreflang": "",
    "type": ""
}

// Where possible, we'll use JavaScript's Fetch function but this is insufficient for some of
//  the tests we need to run. In those cases, we'll need to use a PHP script that executes the 
// request and sends the response back as a JSON object. 

// const testUri = 'http://localhost:8000/test-suites/resolver/1.0.0/tester.php';
const testUri = 'https://ref.gs1.org/test-suites/resolver/1.0.0/tester.php';

const resolverDescriptionFileSchema = 'https://ref.gs1.org/standards/resolver/description-file-schema';

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

// Global variables
let resultsArray = [];
let gs1dlt = new GS1DigitalLinkToolkit(); // We'll make a lot of use of the GS1 Digital Link toolkit


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
        await runTest(linkTypeIslinkset(dl));
        await runTest(linksetHeaderTests(dl));
        await runTest(linksetJsonldHeaderTest(dl));
        await resultSummary();
        
    }
    rotatingCircle(false);
    // End validDL.status=='pass'
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

const linksetJsonldHeaderTest = (dl) =>
    {
        // This routine specifically looks at the HTTP response headers when using 
        // the Accept: application/linkset+json method to get the linkset
    
        let linksetJsonldCheck = Object.create(resultProps);
        linksetJsonldCheck.id = 'linksetJsonldCheck';
        linksetJsonldCheck.test = 'When requesting the linkset the HTTP response headers SHOULD include a Link header pointing to a JSON-LD context file';
        linksetJsonldCheck.msg = 'Link to JSON-LD context file not detected when requesting linkset';
        linksetJsonldCheck.status = 'warn';
        recordResult(linksetJsonldCheck);
    
        // let linksetContentType = Object.create(resultProps);
        // linksetContentType.id = 'linksetContentType';
        // linksetContentType.test = 'When served as application/linkset+json, the HTTP Content Type header should report this';
        // linksetContentType.msg = 'Linkset not served with application/linkset+json Content Type';
        // linksetContentType.status = 'warn';
        // recordResult(linksetContentType);

        let u = stripQueryStringFromURL(dl);
        linksetJsonldCheck.url = testUri + '?test=getLinksetHeaders&testVal=' + encodeURIComponent(u);
        linksetJsonldCheck.process = async (data) =>
        {
            let linkHeader = '';
            if (data.result['Link']) {
                linkHeader = data.result['Link'];
            } else if (data.result['link']) {
                linkHeader = data.result['link'];
            }
            let allLinks = linkHeader.split(',');
            for (i in allLinks) {
                if ((allLinks[i].indexOf('rel="http://www.w3.org/ns/json-ld#context"') !== -1) &&
                (allLinks[i].indexOf('type="application/ld+json"') !== -1)) {
                    linksetJsonldCheck.msg = 'Link to JSON-LD context file found';
                    linksetJsonldCheck.status = 'pass';
                    recordResult(linksetJsonldCheck);
                    BREAK
                }
            }

            // let contentType = '';
            // if (data.result['Content-Type']) {
            //     contentType = data.result['Content-Type'];
            // } else if (data.result['content-type']) {
            //     contentType = data.result['content-type'];
            // }
            // if (contentType === 'application/linkset+json') {
            //     linksetContentType.status = 'pass';
            //     linksetContentType.msg = 'Linkset served with correct Content-Type header'

            // } else {
            //     linksetContentType.msg = `When requested as application/likset+json, HTTP Response header declares ${contentType}`;
            // }
            // recordResult(linksetContentType);

        }
        return linksetJsonldCheck;
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
// Test for a link type that is not included - should be a 404


const linkTypeIslinkset = (dl) =>
{
    // Check that setting linkType to linkset does not redirect or cause an error
    let ltLinksetNoRedirect = Object.create(resultProps);
    ltLinksetNoRedirect.id = 'ltLinksetNoRedirect';
    ltLinksetNoRedirect.test = 'On receiving a request for the linkset, by setting the linkType parameter to linkset, the resolver SHALL NOT redirect the query and SHALL return the linkset. ';
    ltLinksetNoRedirect.msg = 'Setting linkType to linkset resulted in a redirect or an error';
    recordResult(ltLinksetNoRedirect);
    
    let u = stripQueryStringFromURL(dl) + '?linkType=linkset';
    ltLinksetNoRedirect.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
    //console.log(`Testing ${ltLinksetNoRedirect.url}`)
    ltLinksetNoRedirect.process = async (data) =>
        {
            //console.log(`What came back was ${JSON.stringify(data.result)}`);
            if (data.result['httpCode'] === 200) {
                ltLinksetNoRedirect.status = 'pass';
                ltLinksetNoRedirect.msg = 'No redirect with linkType set to linkset';
                recordResult(ltLinksetNoRedirect);
            } else {
                await runTest(linkTypeIsAll(dl));
            }
        }
        return ltLinksetNoRedirect;
}

const linkTypeIsAll = (dl) =>
    {
    
        // If linkType=linkset didn't wor, we'll try this
        let ltAllNoRedirect = Object.create(resultProps);
        ltAllNoRedirect.id = 'ltAllNoRedirect';
        ltAllNoRedirect.test = 'On receiving a request for the linkset, by setting the linkType paramter to all, the resolver SHALL NOT redirect the query and SHALL return the linkset. ';
        ltAllNoRedirect.msg = 'Setting linkType to all resulted in a redirect or an error';
        recordResult(ltAllNoRedirect);
            
        let u = stripQueryStringFromURL(dl) + '?linkType=all';
        //console.log(`u is ${u}`);
        ltAllNoRedirect.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
        //console.log(`Testing ${ltAllNoRedirect.url}`)
        ltAllNoRedirect.process = async (data) =>
            {
                //console.log(`What came back was ${JSON.stringify(data.result)}`);
                if (data.result['httpCode'] === 200) {
                    ltAllNoRedirect.status = 'warn';
                    ltAllNoRedirect.msg = 'Using linkType set to all was deprecated in GS1-Conformant resolver 1.0.0 (Feb 2024) in favour of linkType=linkset';
                    recordResult(ltAllNoRedirect);
                }
            }
        return ltAllNoRedirect;
    }

const linksetHeaderTests = (dl) =>
    {
        let ltAcceptNoRedirect = Object.create(resultProps);
        ltAcceptNoRedirect.id = 'ltAcceptNoRedirect';
        ltAcceptNoRedirect.test = 'On receiving a request for the linkset, by setting the HTTP Accept header to application/linkset+json, the resolver SHALL NOT redirect the query and SHALL return the linkset.';
        ltAcceptNoRedirect.msg = 'Setting Accept header to application/linkset+json resulted in a redirect or an error';
        recordResult(ltAcceptNoRedirect);
        ltAcceptNoRedirect.url = testUri + '?test=getLinkset&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl));
        ltAcceptNoRedirect.process = async (data) =>
            {
                // data.result is a string that we need to parse into JSON
                let resultObject = JSON.parse(data.result);
                //console.log(`What came back was ${JSON.stringify(resultObject)}`);
                 if (resultObject.httpCode === 200) {
                    ltAcceptNoRedirect.status = 'pass';
                    ltAcceptNoRedirect.msg = 'No redirect when asking for linkset by setting the Accept header';
                    recordResult(ltAcceptNoRedirect);
                    
                    const decodedString = decodeURIComponent(resultObject.responseBody);
                    // console.log(`decoded string is ${decodedString}`)
                    const tempObject = JSON.parse(decodedString);

                    // Development linkset is inserted here. In prod mode, we use the 
                    // received linkset
                    // const linksetObject = modelLinkset;
                    // console.log(`using the model linkset`);
                    const linksetObject = tempFixLinkset(tempObject);



                    let validLinkset = Object.create(resultProps);
                    validLinkset.id = 'validLinkset';
                    validLinkset.test = 'Linkset must be valid according to published JSON schema';
                    validLinkset.msg = 'Linkset does not validate';
                    recordResult(validLinkset);
                    const schemaTestResult = await doesJSONSchemaPass(linksetObject, 'https://gs1.github.io/linkset/gs1-linkset-schema.json');
                    if (schemaTestResult.testResult) 
                    {
                        validLinkset.msg = 'Linkset validates against the published schema';
                        validLinkset.status = 'pass';
                        recordResult(validLinkset);
                        await linksetTests(dl, linksetObject);
                    } 
                }
            }
        return ltAcceptNoRedirect;
    }
    
        // This is a temporary hack around the weird behavious of id.gs1.org where linksets are badly formed
        // 
    const tempFixLinkset = (linksetObject) => {
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
    // Need to handle the 3 namespaces that can be used for GS1 link types
    // Reduce them all to 'gs1:'
    // We'll stringify the linkset, do a search and replace, and re-parse it.
    let linksetObjectString = JSON.stringify(linksetObject);
    const re = /https:\/\/((ref\.)|(www\.))?gs1\.org\/voc\//gi;
    linksetObjectString = linksetObjectString.replace(re, 'gs1:');
    //console.log(linksetObjectString);
    const modifiedLinksetObject = JSON.parse(linksetObjectString);
    // Remember that a linkset takes an array of objects, one per anchor
    // We'll call those 'anchorLinksets' as the anchor is the distinguishing feature
    // of each object within the array
    // Also bear in mind that 'walking up the tree' complicates things further
    // wrt the default link. 






    for (i in modifiedLinksetObject.linkset) {
        const anchorLinkset = modifiedLinksetObject.linkset[i];
        // Let's go through and find all the link types in use for this anchor
        let linkTypesInUse = [];
        for (l in anchorLinkset) {
            if ((l !== 'anchor') && (l !== 'itemDescription')) {
                // console.log(`recording ${l}`)
                linkTypesInUse.push(l);
            }
        }

        // So now we have all our link types in the linkset for this anchor as gs1:{linkType}

        // We'll just check that all the GS1 link types in use, are defined in the Web Voc

        let linkTypesDefined = Object.create(resultProps);
        linkTypesDefined.id = 'linkTypesDefined';
        linkTypesDefined.test = 'Link types SHOULD be given as a URI defined in the GS1 Web vocabulary';
        linkTypesDefined.status = 'warn';
        linkTypesDefined.msg = 'Link type detected that claims to be defined in the GS1 Web Vocabulary but is not';
        recordResult(linkTypesDefined);
        await checkGS1LinkTypes(linkTypesDefined, linkTypesInUse);

        // We know there should be a default link so we can set that object up outside
        // of the loop

        let defaultLinkExists = Object.create(resultProps);
        defaultLinkExists.id = 'defaultLinkExists';
        defaultLinkExists.test = 'For each identified entity there SHALL be exactly one default link, the list of link types for which SHALL include gs1:defaultLink. This default is defined without any of the optional attributes, that is, it SHALL include a title, but SHALL NOT include other attributes.';
        defaultLinkExists.msg = 'No default link found';
        recordResult(defaultLinkExists);

        // Now we'll work our way through the set for this anchor

        for (lt in linkTypesInUse) {
            const linkType = linkTypesInUse[lt]
            // The default link is a special case
            // More work needed as default might be higher up the tree
            // Parking lot 2025-05-24
            if (linkType === 'gs1:defaultLink') {
                defaultLinkExists.msg = 'Default link found';
                defaultLinkExists.status = 'pass';
                recordResult(defaultLinkExists);
                // This one is straightforward, there should only be one link object
                let singleDefaulLink = Object.create(resultProps);
                singleDefaulLink.id = 'singleDefaulLink';
                singleDefaulLink.test = 'For each identified entity there SHALL be exactly one default link, the list of link types for which SHALL include gs1:defaultLink. This default is defined without any of the optional attributes, that is, it SHALL include a title, but SHALL NOT include other attributes.';
                if (anchorLinkset[linkType].length === 1) {
                    singleDefaulLink.status='pass';
                    singleDefaulLink.msg = 'Single default link found'
                } else if (anchorLinkset[linkType].length !== 1){
                    singleDefaulLink.msg = 'Multiple (or zero) default links found'
                }
                recordResult(singleDefaulLink);
                // console.log(`The default targetURL is ${linkset[linkType][0].href}`);
                // And we should be redirected to its href with a simple query
                if ((singleDefaulLink.status ==='pass') && (anchorLinkset[linkType][0].href)) {
                   await runTest(testDefaultLink(dl, anchorLinkset[linkType][0].href));
                }
            } else if (anchorLinkset[linkType].length === 1) {
                // There is a single possible redirect for this link type, nothing else matters 
                // at this point so we're looking for a simplre redirect
                // console.log(`Link type of ${linkType} has 1 link`)
                await runTest(testSingleLinkObject(dl, linkType, anchorLinkset[linkType][0].href));
            } else if (anchorLinkset[linkType].length > 1) {
                // Here we have more than one link object for a given link type
                // We take into consideration the type and hreflang attributes
                // The context attribute is optional and its value space undefined in
                // the standard, therefore we cannot use it formally in these tests
                // However, we do need to look at it because a resolver may use it in
                // any way it wants and so we can't expect a 300 response for link objects
                // where the context is different, even though we're not testing it directly

                // Set up an array for this link type that stores the array position
                // of link objects with identical attributes
                let threehundredLinks = [];
                
                for (linkObject in anchorLinkset[linkType]) {
                    // console.log(`Here for link ${linkObject} of ${linkType} which has ${anchorLinkset[linkType].length} links`)
                    // Start with the first one and put its attributes in a mini object
                    // j is the one for which we're looking for any exact matches (k)

                    for (let j = 0; j < anchorLinkset[linkType].length; j++) {
                        if (!threehundredLinks.includes(j)) {
                            // If we haven't already got this in our list of 300s
                            const lo1 = {};
                            if (anchorLinkset[linkType][j].type) {lo1.type = anchorLinkset[linkType][j].type}
                            if (anchorLinkset[linkType][j].hreflang) {lo1.hreflang = anchorLinkset[linkType][j].hreflang}
                            if (anchorLinkset[linkType][j].context) {lo1.context = anchorLinkset[linkType][j].context}

                            // Now we look through the other link objects, noting exact matches
                            // If we find one, we record the two under test in the threehundredLinks array

                            for (let k = 0; k < anchorLinkset[linkType].length; k++) {
                                if ((j !== k) && (!threehundredLinks.includes(k))) {
                                    const lo2 = {};
                                    if (anchorLinkset[linkType][k].type) {lo2.type = anchorLinkset[linkType][k].type}
                                    if (anchorLinkset[linkType][k].hreflang) {lo2.hreflang = anchorLinkset[linkType][k].hreflang}
                                    if (anchorLinkset[linkType][k].context) {lo2.context = anchorLinkset[linkType][k].context}
                                    if (identicalAttributes(lo1, lo2)) {
                                        if (!threehundredLinks.includes(j)) {threehundredLinks.push(j)}
                                        if (!threehundredLinks.includes(k)) {threehundredLinks.push(k)}
                                    }
                                    
                                }
                            }
                        }
                    }
                }
                // console.log(`For ${linkType} Check any of these to get a 300 ${threehundredLinks}`)
                // console.log(`For ${linkType} Check all that are not in ${threehundredLinks} individually`)
                await testMultipleLinks(dl, linkType, anchorLinkset[linkType], threehundredLinks);
            }
        }
    }
    return;
}

const checkGS1LinkTypes = async (linkTypesDefined, linkTypesInUse) => {
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
    for (lt in linkTypesInUse) {
        if (linkTypesInUse[lt].indexOf('gs1:') === 0) {
            // We're only looking at GS1 link types
            linkTypeName = linkTypesInUse[lt].substring(4);
            if (list[linkTypeName] === undefined) {
                linkTypesDefined.status = 'warn';
                linkTypesDefined.msg = `gs1:${linkTypeName} is not a ratified GS1 link type`;
            }
        }
    }
    recordResult(linkTypesDefined);
    return linkTypesDefined.status;
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
    //console.log(`fetching ${loObject.url}`)
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
        if (arrayOfLinkObjects[lo].type !== null) {
            loObject.msg += ` type: ${arrayOfLinkObjects[lo].type}`;
            mediaType= `&mediaType=${encodeURIComponent(arrayOfLinkObjects[lo].type)}`;
        }
        if (Array.isArray(arrayOfLinkObjects[lo].hreflang)) {
            loObject.msg += ` hreflang: ${arrayOfLinkObjects[lo].hreflang[0]}`;
            lang = `&lang=${arrayOfLinkObjects[lo].hreflang[0]}`;
        }
        if ((arrayOfLinkObjects[lo].context !== undefined) && (Array.isArray(arrayOfLinkObjects[lo].context))) {
            // console.log(`here with array`)
            loObject.msg += ` context: ${arrayOfLinkObjects[lo].context[0]}`;
            context = `&context=${arrayOfLinkObjects[lo].context[0]}`;
        } else if (arrayOfLinkObjects[lo].context !== undefined) {
            // console.log(`here with something else and ${arrayOfLinkObjects[lo].context}`)
            loObject.msg += ` context: ${arrayOfLinkObjects[lo].context}`
            context = `&context=${arrayOfLinkObjects[lo].context}`;
        }
        loObject.url = testUri + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQueryStringFromURL(dl) + '?linkType=' + linkType + lang + mediaType + context);
        // console.log(`fetching ${loObject.url}`)
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

const resultSummary = async () => {
    // Working with the testArray that was defined as a global variable near the top
    // Let's start by calculating a simple percentage success
    let pass = 0; let fail = 0; let rdFileText=''; let invalidLinksetText=''; let criticalFailure = 0;
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
        if (resultsArray[i].id === 'validLinkset') {
            if (resultsArray[i].status !== 'pass') {
                // Critical failure as linkset must be valid
                invalidLinksetText = `GS1-Conformant resolvers MUST return a valid linkset, formatted as JSON, as defined in RFC 9264`;
                criticalFailure++;
            }
        }
    }
    let pc = 100 * pass/(pass+fail)
    let percentPassed = parseFloat(pc).toFixed(0);
    let text = `You passed ${percentPassed}% of the tests. `;
    let p = document.createElement('p');
    p.id = 'overallReport';
    if (criticalFailure) {
        p.className = 'fail'
        if (criticalFailure === 1) {
            text += `However, there is at least one critical issue: ${rdFileText}${invalidLinksetText}.`;
        } else {
            text += `However, there are critical issues: ${rdFileText} and ${invalidLinksetText}.`;
        }
    } else if (pc === 100) {
        p.className = 'pass'
    } else if (pc > 60) {
        p.className = 'lightWarn'
    } else {
        p.className = 'warn'
    }
    p.appendChild(document.createTextNode(text));
    document.getElementById(outputElement).prepend(p)
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
    //console.log('Fetching ' + test.url + ' for ' + test.id);
    try
    {
        let response = await fetch(test.url, {headers: test.headers});
        let data = await response.json();
        await test.process(data);
        recordResult(test);
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
