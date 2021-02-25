const outputElement = 'gs1ResolverTests' // Set this to the id of the element in the document where you want the output
                                         // to.

const resultProps = {
    "id": "", //An id for the test
    "test": "", // conformance statement from spec
    "status": "fail", // (pass|fail|warn), default is fail
    "msg": "", // Displayed to the end user
    "url": "", // The URL we're going to fetch
    "headers": {}  // Ready for any headers we want to set
}

const linkProps = {
    "href": "",
    "rel": "",
    "title": "",
    "hreflang": "",
    "type": ""
}

const perlTests = 'https://philarcher.org/cgi-bin/testHarness.pl';

// const RabinRegEx = /^(([^:\/?#]+):)?(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
const RabinRegEx = /^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
// (see https://www.w3.org/TR/powder-grouping/#rabinsRegEx for the origin of this regex by Jo Rabin)
// gives [2] scheme, [4] domain,[9] port, [10] path, [12] query, [14] fragment

// This is 'RE1' from the DL 1.2 spec
const plausibleDlURI = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|gtin|8006|itip|8013|gmn|8010|cpid|414|gln|417|party|8017|gsrnp|8018|gsrn|255|gcn|00|sscc|253|gdti|401|ginc|402|gsin|8003|grai|8004|giai)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/;
// And this is 'RE2' ('RE3' that attempts to look for a compressed DL URI is not used in the test suite).
const plausibleDlURINoAlphas = /^https?:(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(((\/(01|8006|8013|8010|414|417|8017|8018|255|00|253|401|402|8003|8004)\/)(\d{4}[^\/]+)(\/[^/]+\/[^/]+)?[/]?(\?([^?\n]*))?(#([^\n]*))?))/;

const linkTypeListSource = 'https://gs1.github.io/WebVoc/gs1Voc_v1_3.jsonld';

// Global variables
let testList = [];
let resultsArray = [];
let domain;
let gs1dlt = new GS1DigitalLinkToolkit();


// ***************************************************************************
// This is the main function that takes a Digital Link URI as input and creates the output.
// The second parameter can be used to switch individual tests on and off to
// test against the relevant version of the DL spec.
// ***************************************************************************

const testDL = async (dl, dlVersion) =>
{
    clearGrid();
    // First we want to test whether the given input is a URL or not.
    // Set up the a results object for testing whether what we have is a URL or not
    let isURL = Object.create(resultProps);
    isURL.id = 'isURL';
    isURL.test = 'Not listed as a conformance criterion but the DL URI must be a valid URL';
    isURL.msg = 'Given GS1 Digital Link URI is not a valid URL';
    recordResult(isURL);

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
    console.log('Given GS1 Digital Link URI is "' + dl + '"');
    let UriElements = dl.match(RabinRegEx)
    if (UriElements)
    {
        let scheme = UriElements[2];
        domain = UriElements[4];  // Sets this global variable
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
        plausibleDL.msg = 'Given URL does not conform to GS1 Digital Link URI syntax (uncompressed), no further tests are possible';
        plausibleDL.status = 'fail';
        if (plausibleDlURI.test(dl))
        {
            plausibleDL.status = 'pass';
            plausibleDL.msg = 'URL under test plausibly is a GS1 Digital Link URI (uncompressed)';
            if (!plausibleDlURINoAlphas.test(dl))
            {
                plausibleDL.status = 'warn';
                plausibleDL.msg = 'URL under test plausibly is a GS1 Digital Link URI BUT uses convenience alphas which are being deprecated in favour of all-numeric AIs';
            }
        }
        recordResult(plausibleDL);
    }
    // So now if plausibleDL.status is pass or warn, then we can pass it to the toolkit for a full check
    if (plausibleDL.status !== 'fail')
    {
        try
        {
            let gs1Array = gs1dlt.extractFromGS1digitalLink(dl);
            // You can get here with a variety of URLs including just a domain name and /gtin etc. So we need to check
            // further Object returned has a GS1 object within it. Test for that using Mark's code
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
        // They return an object that normally goes into the asynch fetch array

        TLSCheck(domain).then();     // This one doesn't push to the array
        rdFileCheck(domain).then();  // Nor this one, so we don't need to wait either for them

        //We'll wait for these run tests
        await runTest(checkHttpVersion(domain));
        await runTest(headerBasedChecks(dl, dlVersion));
        await runTest(errorCodeChecks(dl));
        await runTest(trailingSlashCheck(dl));
        await runTest(compressionChecks(dl, domain, gs1dlt));
        await runTest(testQuery(dl));
        if (dlVersion === '1.1')
        {
            await runTest(jsonTests(dl));
            await runTest(jsonLdTests(dl));
        }
        else
        {
            await runTest(testLinkset(dl));
            await runTest(testJldContext(dl));
        }
    }
    rotatingCircle(false);
    // End validDL.status=='pass'
}


const TLSCheck = async (domain) =>
{
    // This is designed to make sure that the server is available over TLS (i.e. using https works, even if the given
    // DL is http) It does not handle a JSON response and therefore we don't use the promises array
    console.log('Domain is ' + domain);
    let tlsOK = Object.create(resultProps);
    tlsOK.id = 'tlsOK';
    tlsOK.test = 'SHALL support HTTP Over TLS (HTTPS)';
    tlsOK.msg = 'Resolver does not support HTTP over TLS';
    recordResult(tlsOK);

    //  fetch('https://hintleshamandchattisham.onesuffolk.net/', {  // Used for debugging, this is one of the few sites
    // I know that doesn't support https!

    try
    {
        let response = await fetch('https://' + domain, { method: 'HEAD', mode: 'no-cors' });

        if (response.status >= 0)
        {   // status is usually 0 for a site that supports https, I think 'cos we're using non-cors mode.
            tlsOK.msg = 'Confirmed that server supports HTTP over TLS';
            tlsOK.status = 'pass';
        }
        recordResult(tlsOK);
    }
    catch (error)
    {
        console.log('There has been a problem with your fetch operation when checking for TLS support: ', error.message);
    }
    return tlsOK;
}

const checkHttpVersion = (domain) =>
{
    let httpVersion = Object.create(resultProps);
    httpVersion.id = 'httpVersion';
    httpVersion.test = 'SHALL support HTTP 1.1 (or higher)';
    httpVersion.status = 'warn';
    httpVersion.msg = 'HTTP version not detected. If other tests passed, it\'s probably OK';
    httpVersion.url = perlTests + '?test=getHTTPversion&testVal=' + domain;
    recordResult(httpVersion);
    httpVersion.process = async (data) =>
    {
        let r = parseFloat(data.result);
        if (r && r >= 1.1)
        {
            httpVersion.status = 'pass';
            httpVersion.msg = 'Server at ' + domain + ' supports HTTP ' + r;
        }
        recordResult(httpVersion);
    }

    return httpVersion;
}

const headerBasedChecks = (dl, dlVersion) =>
{
    // We'll perform a number of checks based on the headers returned from checking the DL directly

    let corsCheck = Object.create(resultProps);
    corsCheck.id = 'corsCheck';
    corsCheck.test = 'SHALL support CORS';
    corsCheck.msg = 'CORS headers not detected';
    recordResult(corsCheck);

    let methodsCheck = Object.create(resultProps);
    methodsCheck.id = 'methodsCheck';
    methodsCheck.test = 'SHALL support HTTP 1.1 (or higher) GET, HEAD and OPTIONS requests.';
    methodsCheck.msg = 'At least one of GET, HEAD or OPTIONS not detected';
    recordResult(methodsCheck);

    // *************** Various tests around the links
    let linkOnRedirect = Object.create(resultProps);
    linkOnRedirect.id = 'linkOnRedirect';
    linkOnRedirect.test = 'SHOULD expose the full list of links available to the client in an HTTP Link header when redirecting.';
    linkOnRedirect.status = 'warn';
    linkOnRedirect.msg = 'No link header detected when redirecting';
    recordResult(linkOnRedirect);

    let defaultLinkSet = Object.create(resultProps);
    defaultLinkSet.id = 'defaultLinkSet';
    defaultLinkSet.test = 'SHALL recognise one available linkType as the default for any given request URI and, within that, SHALL recognise one default link';
    defaultLinkSet.msg = 'Default response does not redirect to any of the list of available links';
    recordResult(defaultLinkSet);

    let linkMetadata = Object.create(resultProps);
    linkMetadata.id = 'linkMetadata';
    linkMetadata.test = 'All links exposed SHALL include the target URL, the link relationship type (the linkType) and a human-readable title';
    linkMetadata.msg = 'Incomplete link metadata';
    recordResult(linkMetadata);

    // We'll use the corsCheck object as the primary one here but will process the headers to look at the ones about
    // the links too We need to get rid of any query string in the dl so we'll do that first
    let u = stripQuery(dl);
    corsCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
    corsCheck.process = async (data) =>
    {
        // console.log('Looking for access control header ' + data.result['access-control-allow-origin']);
        if (data.result['access-control-allow-origin'])
        {
            // That's probably enough tbh
            corsCheck.status = 'pass';
            corsCheck.msg = 'CORS headers detected';
            recordResult(corsCheck);
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

        if (data.result.link != null)
        {   // we have a link header. We'll now test that each link has the required attributes

            // The structure we're dealing with is:
            // <url>; rel="val"; type="val"; hreflang="val"; title="val", {next}
            // Tempting to split on the comma but titles can include commas, so we'll split on ", and then
            // push a comma back on the end of each one

            let allLinks = data.result.link.split(/",/);
            for (let i in allLinks)
            {
                if (!allLinks.hasOwnProperty(i)) continue;
                allLinks[i] += '"';
            }
            // We'll use a series of regular expressions to extract the relevant metadata for each link since order is
            // unimportant RegExes are computationally expensive but performance is not a key issue here

            let hrefRE = /^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
            let relRE = /rel="(.*?)"/;
            let titleRE = /title="(.*?)"/;
            let hreflangRE = /hreflang="(.*?)"/;
            let typeRE = /type="(.*?)"/;
            let linkArray = [];
            linkMetadata.status = 'pass';   // Assume pass and switch to fail if any of the SHALL tests fail
            // We store each of the attributes in an object as we'll need this to run further tests on those links
            for (let link in allLinks)
            {
                //Safety code when using for..in as some objects may have inherited parent properties
                if (!allLinks.hasOwnProperty(link)) continue;

                let linkObj = Object.create(linkProps);
                linkObj.href = allLinks[link].substring(allLinks[link].indexOf('<') + 1, allLinks[link].indexOf('>'));
                if (!hrefRE.test(linkObj.href))
                {
                    linkMetadata.status = 'fail';
                    console.log('Link ' + link + ' failed on url which is ' + linkObj.href)
                }
                if (relRE.test(allLinks[link]))
                {
                    linkObj.rel = relRE.exec(allLinks[link])[1]
                }
                else
                {
                    linkMetadata.status = 'fail';
                    console.log('No link type (rel) declared for ' + linkObj.href + ' (link ' + link + ')')
                }
                if (titleRE.test(allLinks[link]))
                {   // owl:sameAs doesn't need a title
                    linkObj.title = titleRE.exec(allLinks[link])[1]
                }
                else if (linkObj.rel !== 'owl:sameAs')
                {
                    linkMetadata.status = 'fail';
                    console.log('No title given for ' + linkObj.href + ' (link ' + allLinks[link] + ')')
                }
                //Those are the SHALLs, now we'll record the others for future use
                linkObj.hreflang = hreflangRE.exec(allLinks[link]) == null ? '' : hreflangRE.exec(allLinks[link])[1];
                linkObj.type = typeRE.exec(allLinks[link]) == null ? '' : typeRE.exec(allLinks[link])[1];

                // If we still have linkMetadata.status == 'pass' at this point, then we can go ahead and test that
                // link in more detail
                if ((linkMetadata.status === 'pass') && (linkObj.rel !== 'owl:sameAs'))
                {
                    linkArray.push(linkObj)
                }
            }

            // Now we want to set up tests for all the links in linkArray but only for testing version 1.1 (1.2 tests the links in the linkset)

            if (dlVersion === '1.1')
            {
              for (let i in linkArray)
              {
                if (!linkArray.hasOwnProperty(i)) continue;

                linkArray[i].id = 'link' + i;
                linkArray[i].status = 'fail';
                linkArray[i].msg = 'Requesting link type of ' + linkArray[i].rel + ' does not redirect to correct target URL (' + linkArray[i].href + ')';
                linkArray[i].test = 'SHALL redirect to the requested linkType if available';
                linkArray[i].url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?linkType=' + linkArray[i].rel);
                if (linkArray[i].hreflang !== '')
                {  // We have a specific language to deal with
                    linkArray[i].headers = {'Accept-language': linkArray[i].hreflang};
                }
                recordResult(linkArray[i]);
                linkArray[i].process = async (data) =>
                {
                    // Strip the query strings before matching (should probably be more precise about this. Might be
                    // important info in target URL that we're missing)
                    let l = stripQuery(data.result.location);
                    let k = stripQuery(linkArray[i].href);
                    if (l === k)
                    {  // redirection target is correct
                        linkArray[i].msg = 'Requesting link type of ' + linkArray[i].rel;
                        if (linkArray[i].hreflang !== '')
                        {
                            linkArray[i].msg += ' (with language set to ' + linkArray[i].hreflang + ')';
                        }
                        linkArray[i].msg += ' redirects to correct target URL (' + linkArray[i].href + ')';
                        linkArray[i].status = 'pass';
                    }
                }
            }
            // Now we can test those links one by one.
            try
            {
                for (let test of linkArray) await runTest(test);
            }
            catch (error)
            {
                console.log('There has been a problem with your fetch operation for: ', error.message);
            }
            // Old code...
            /*
             linkArray.reduce(
             (chain, d) => chain.then(() => runTest(d))
             .catch((error) => console.log('There has been a problem with your fetch operation for: ', error.message)),
             Promise.resolve()
             );
             */
            }
            if (linkMetadata.status === 'pass')
            {
                linkMetadata.msg = 'Target URL and required metadata found for all links';
                // Looking for redirect link
                if (data.result.location != null)
                { // We have a redirect
                    for (let i = 0;
                         i < linkArray.length;
                         i++)
                    {
                        if (linkArray[i].href === data.result.location)
                        {
                            defaultLinkSet.msg = 'Default response is to redirect to one of the available links (' + linkArray[i].href + ') with a linkType of ' + linkArray[i].rel;
                            defaultLinkSet.status = 'pass';
                        }
                    }
                    if (data.result.link != null)
                    { // We have a link header present when redirecting
                        linkOnRedirect.msg = 'Link headers present when redirecting';
                        linkOnRedirect.status = 'pass';
                    }
                }
                else
                {
                    defaultLinkSet.msg = 'Default response is not to redirect so can\'t test that a given linkType is the default';
                    defaultLinkSet.status = 'warn';
                    linkOnRedirect.status = 'warn';
                    linkOnRedirect.msg = u + ' does not redirect so cannot test';
                }
                recordResult(defaultLinkSet)
            }
            else
            {    // We have problems with the links, can't continue testing them
                linkMetadata.msg = 'Target URL and/or required metadata not found for all links';
            }
        }
        recordResult(linkMetadata);
        recordResult(linkOnRedirect);
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

    // Let's create an error - we know we have a valid DL
    reportWith400.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQuery(dl) + '/foo');
    reportWith400.process = async (data) =>
    {
        if (data.result.httpCode === '400')
        {
            reportWith400.msg = 'Non-conformant GS1 Digital Link URI reported with 400 error';
            reportWith400.status = 'pass';
        }
        else
        {
            reportWith400.msg = 'Non-conformant GS1 Digital Link URI reported with ' + data.result.httpCode + ' error';
        }
        recordResult(reportWith400);
        if (data.result.httpCode !== '200')
        {
            noErrorWith200.msg = 'Error not reported with 200 OK';
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
    let noSlash = stripQuery(dl);
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

    trailingSlash.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(noSlash);
    trailingSlash.process = async (data) =>
    {
        try
        {
            let slashRequest = new Request(perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(slash), {
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
            console.log('There has been a problem with your fetch operation for ' + trailingSlash.url + ': ', error.message);
        }

    }
    return trailingSlash;
}

const  compressionChecks = (dl, domain, gs1dlt) =>
{
    // ******** test for decompression support************
    // Basic method is to send the same request compressed and uncompressed, should get the same response except that
    // compressed adds uncompressed to Link header

    // First compression test checks whether HTTP response is the same and any redirect is the same
    let validDecompressCheck = Object.create(resultProps);
    validDecompressCheck.id = 'validDecompressCheck';
    validDecompressCheck.test = 'SHALL be able to decompress a URI to generate a GS1 Digital Link URI';
    validDecompressCheck.msg = 'Response from server for compressed and not-compressed URI not identical';
    recordResult(validDecompressCheck);

    // Second compression test checks whether resolver exposes uncompressed version in the link header
    let exposeDecompressedLink = Object.create(resultProps);
    exposeDecompressedLink.id = 'exposeDecompressedLink';
    exposeDecompressedLink.test = 'If handling a compressed request URI, it SHALL expose the uncompressed URI in the Link response header with a rel value of owl:sameAs.';
    exposeDecompressedLink.msg = 'Uncompressed URI not found in response link header when resolving a compressed URI';
    recordResult(exposeDecompressedLink);

    // Unlike the header-based tests, we preserve the query string for this test
    // console.log('Uncompressed url is ' + perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(dl));
    validDecompressCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(dl);
    validDecompressCheck.process = async (data) =>
    {
        try
        {
            let compDL = gs1dlt.compressGS1DigitalLink(dl, false, 'https://' + domain, false, true, false);
            // console.log('Compressed URI is ' + perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(compDL));
            const compressedRequest = new Request(perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(compDL), {
                method: 'get',
                mode: 'cors'
            });
            let response = await fetch(compressedRequest);
            let compressedJSON = await response.json();
            // OK, we have our two JSON objects and we can look for key points of similarity
            // We should get the same redirect or 200 for both compressed and not compressed
            // console.log('comparing ' + data.result.httpCode + ' with ' + compressedJSON.result.httpCode);
            if ((data.result.httpCode === compressedJSON.result.httpCode) && (data.result.location === compressedJSON.result.location))
            {
                validDecompressCheck.status = 'pass';
                validDecompressCheck.msg = 'Response from server identical for compressed and uncompressed GS1 Digital link URI';
                recordResult(validDecompressCheck);
            }
            // Now we're looking for the uncompressed version in the link header
            let numericDL = numericOnly(dl);
            if (compressedJSON.result.link.indexOf(numericDL) > -1)
            {   // It's in there, now we have to check for presence of owl:sameAs @rel
                let allLinks = compressedJSON.result.link.split(',');
                let i = 0;
                while (allLinks[i].indexOf(numericDL) === -1)
                {
                    i++
                }    // We know it's there somewhere because we just tested for it
                let re = /(rel=.owl:sameAs)|(rel=.http:\/\/www.w3.org\/2002\/07\/owl#sameAs)/;
                if (allLinks[i].search(re) !== -1)
                {
                    exposeDecompressedLink.status = 'pass';
                    exposeDecompressedLink.msg = 'Uncompressed URI present in compressed URI response link header with @rel of owl:sameAs';
                    recordResult(exposeDecompressedLink);
                }
                else
                {
                    exposeDecompressedLink.status = 'warn';
                    exposeDecompressedLink.msg = 'Uncompressed URI present in compressed URI response link header but without @rel of owl:sameAs';
                    recordResult(exposeDecompressedLink);
                }
            }
        }
        catch (error)
        {
            console.log('There has been a problem with your fetch operation for ' + compressedRequest.url + ' ( testing ' + compDL + '): ', error.message)
        }
    }
    return validDecompressCheck;
}

// jsonTests only apply to DL version 1.1
const jsonTests = (dl) =>
{
    let varyAccept = Object.create(resultProps);
    varyAccept.id = 'varyAccept';
    varyAccept.test = 'SHALL respond to a query parameter of linkType set to all by returning a list of links available to the client application. The list SHALL be available as JSON, SHOULD be available as JSON-LD and MAY be available in HTML and any other formats, served through content negotiation.';
    varyAccept.msg = 'Vary response not found suggesting no content negotiation';
    varyAccept.status = 'warn'; // This is a SHOULD not a SHALL so warn is as strong as we should be
    recordResult(varyAccept);

    // ************ When we test this, we can also see if we get JSON back if asked for it
    let listAsJSON = Object.create(resultProps);
    listAsJSON.id = 'listAsJSON';
    listAsJSON.test = 'SHALL respond to a query parameter of linkType set to all by returning a list of links available to the client application. The list SHALL be available as JSON, SHOULD be available as JSON-LD and MAY be available in HTML and any other formats,  served through content negotiation.';
    listAsJSON.msg = 'List of links does not appear to be available as JSON';
    recordResult(listAsJSON);

    varyAccept.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQuery(dl) + '?linkType=all');
    varyAccept.headers = {'Accept': 'application/json'};
    varyAccept.process = async (data) =>
    {
        if (data.result.vary != null)
        {
            // We have a vary header
            // might be an array or a single value
            if (data.result.vary[0] != null)
            {    // We have an array
                varyAccept.msg = 'Vary header detected, but does not include Accept suggesting no content negotiation for media type';
                for (let k in data.result.vary)
                {
                    if (!data.result.vary.hasOwnProperty(k)) continue;

                    if (data.result.vary[k] === 'Accept')
                    {
                        varyAccept.status = 'pass';
                    }
                }
            }
            else if (data.result.vary === 'Accept')
            {
                varyAccept.status = 'pass';
            }
            if (varyAccept.status === 'pass')
            {
                varyAccept.msg = 'Vary response header includes Accept suggesting content negotiation for media type';
                recordResult(varyAccept);
            }
        }

        // Let's see if the content-type reported from that HEAD request is JSON
        if (data.result['content-type'] === 'application/json')
        {
            listAsJSON.msg = 'Response media type is JSON';
            listAsJSON.status = 'warn';
            recordResult(listAsJSON);

            // Media type says it's JSON, but is it? We need to test that directly
            try
            {
                let response = await fetch(stripQuery(dl) + '?linkType=all', { headers: {'Accept': 'application/json'} });
                let receivedJSON = await response.json();
                listAsJSON.msg = 'JSON received with linkType=all';
                listAsJSON.status = 'pass';
                recordResult(listAsJSON);
            }
            catch (error)
            {
                listAsJSON.status = 'fail';
                listAsJSON.msg = 'Asking for linkType=all did not return JSON';
                recordResult(listAsJSON);

            }
        }
    }
    return varyAccept;
}

const jsonLdTests = (dl) =>
{
    // ************ Test for JSON-LD
    let listAsJSONLD = Object.create(resultProps);
    listAsJSONLD.id = 'listAsJSONLD';
    listAsJSONLD.test = 'SHALL respond to a query parameter of linkType set to all by returning a list of links available to the client application. The list SHALL be available as JSON, SHOULD be available as JSON-LD and MAY be available in HTML and any other formats, served through content negotiation.';
    listAsJSONLD.msg = 'List of links does not appear to be available as JSON-LD';
    listAsJSONLD.status = 'warn';   // This is a SHOULD so default is warn, not fail
    recordResult(listAsJSONLD);

    listAsJSONLD.url = perlTests + '?test=getAllHeaders&accept=jld&testVal=' + encodeURIComponent(stripQuery(dl) + '?linkType=all');
    listAsJSONLD.process = (data) =>
    {
        // Let's see if the content-type reported from that HEAD request is JSON-LD
        if (data.result['content-type'] === 'application/ld+json')
        {
            listAsJSONLD.msg = 'List of links appears to be available as JSON-LD';
            listAsJSONLD.status = 'pass';
            recordResult(listAsJSONLD);
        }
    }
    return listAsJSONLD;
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
        if (data['resolverRoot'].match(/^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/) && (data.supportedPrimaryKeys != null))
        {
            rdFile.msg = 'Resolver description file found with at least minimum required data';
            rdFile.status = 'pass';
        }
        else
        {
            rdFile.msg = 'Resolver description file found but minimum required data not found';
        }
        recordResult(rdFile);
    }
    catch (error)
    {
        console.log('There has been a problem with your fetch operation: ', error.message);
    }
}


const testQuery = (dl) =>
{
    let qsPassedOn = Object.create(resultProps);
    qsPassedOn.id = 'qsPassedOn';
    qsPassedOn.test = 'By default, SHALL pass on all key=value pairs in the query string of the request URI (if present) when redirecting';
    qsPassedOn.msg = 'Query string not passed on. If the query string is deliberately suppressed for this Digital Link URI, test another one where the default behaviour of passing on the query string applies';
    qsPassedOn.status = 'warn';
    recordResult(qsPassedOn);
    let u = stripQuery(dl);
    let query = 'foo=bar';
    qsPassedOn.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?' + query);
    qsPassedOn.process = async (data) =>
    {
        if (data.result.location !== undefined)
        {          // There is a redirection
            if (data.result.location.indexOf(query) > -1)
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

// Linkset introduced in version 1.2
const testLinkset = (dl) =>
{
    // We need to run several tests against the linkset. The first is the one we'll use to try and fetch the linkset.
    // If all the tests pass, we'll record the linkset in the thisLinkset global variable
    let validLinkset = true; // There are lots of places where this can be set to false, this is the only 'true' assignment

    //Setup soleMember ready for test
    let soleMember = Object.create(resultProps);
    soleMember.id = 'soleMember';
    soleMember.test = 'A set of links MUST be represented as a JSON object which MUST have "linkset" as its sole member.';
    soleMember.msg = 'No linkset found or multiple members found';
    soleMember.url = stripQuery(dl) + '?linkType=all';
    soleMember.headers = {'Accept': 'application/linkset+json'};
    recordResult(soleMember);

    //Setup contextObjectArray ready for test
    let contextObjectArray = Object.create(resultProps);
    contextObjectArray.id = 'contextObjectArray';
    contextObjectArray.test = 'The "linkset" member is an array in which a distinct JSON object - the "link context object" - MUST be used to represent links that have the same link context.';
    contextObjectArray.msg = 'No array found';
    // console.log("contextObjectArray = ", contextObjectArray);
    recordResult(contextObjectArray);

    //Setup contextObject ready for test
    let contextObject = Object.create(resultProps);
    contextObject.id = 'contextObject'
    contextObject.test = 'Each link context object MUST have an "anchor" member with a value that represents the link context. The linkset standard allows a value of ""  for anchor but GS1 Digital Link requires an absolute URI that follows the GS1 DL syntax (uncompressed)';
    contextObject.msg = 'No anchor found';
    recordResult(contextObject);

    //Author test script for execution in runTest()
    soleMember.process = async (data) =>
    {

//        data = dummy; Used in debugging. See dummy linkset at the end of the file
        try
        {
            soleMember.status = data.linkset && Array.isArray(data.linkset) ? 'pass' : 'fail';

            if (soleMember.status === 'pass')
            {
                soleMember.msg = 'Linkset found as sole member';
                recordResult(soleMember);
                if (typeof(data.linkset) === "object" && typeof(data.linkset[0]) === "object")
                {
                    contextObjectArray.status = 'pass';
                    contextObjectArray.msg = 'Array found';
                    recordResult(contextObjectArray);
                }
                if (typeof data.linkset[0].anchor === 'string')
                {
                    contextObject.msg = 'Value for anchor found but is not a GS1 Digital Link URI (uncompressed)';
                    if (plausibleDlURI.test(data.linkset[0].anchor))
                    {
                        contextObject.status = 'pass';
                        contextObject.msg = 'GS1 Digital Link URI (uncompressed) found as anchor';
                        if (!plausibleDlURINoAlphas.test(data.linkset[0].anchor))
                        {
                            contextObject.status = 'warn';
                            contextObject.msg = 'GS1 Digital Link URI (uncompressed) found as anchor BUT using convenience alphas which are being deprecated in favour of all-numeric AIs';
                        }
                    }
                    recordResult(contextObject);
                }

                if (contextObject.status === 'fail')
                {
                    validLinkset = false;
                }
                else
                {
                    // This means we almost certainly have a linkset with a valid anchor
                    // Now we want to work through the linkset looking for link relation types
                    // Linkset says these can be registered IANA link relations or URIs.
                    // For this test, we'll ignore any link rel type that isn't a URI
                    // If it is a URI, pass if it's a GS1 link type, otherwise warn
                    // A URI MUST be followed by an array with one or more link target objects

                    // First we need to fetch the current set of GS1 link types from linkTypeListSource
                    let GS1LinkTypes = [];
                    let response = await fetch(linkTypeListSource, {headers: {'Accept': 'application/ld+json'}});
                    let lt = await response.json();
                    for (const entry of lt['@graph'])
                    {
                        if (entry['rdfs:subPropertyOf'] && entry['rdfs:subPropertyOf']['@id'] === 'gs1:linkType')
                        {
                            const linkTypeName = entry['@id'].replace('gs1:', '');
                            GS1LinkTypes.push({
                                title: entry['rdfs:label']['@value'],
                                description: entry['rdfs:comment']['@value'],
                                curie: `gs1:${linkTypeName}`,
                                url: `https://gs1.org/voc/${linkTypeName}`,
                            });
                        }
                    }

                    // Lots to do here but we need to do it after we've fetched the link types, hence putting it
                    // here after a .then Need a counter as we need unique IDs for the reporting objects
                    let count = 0;
                    let defaultLinkOK = false;
                    let defaultLinkObject = Object.create(resultProps);
                    defaultLinkObject.id = 'defaultLinkObject';
                    defaultLinkObject.test = 'SHALL recognise one available link as the default for any given request URI.';
                    defaultLinkObject.msg = 'No default link found';
                    recordResult(defaultLinkObject);

                    for (let i in data.linkset[0])
                    {
                        //Safety code in case object we are iterating over has inherited some unwanted parent properties:
                        if (!data.linkset[0].hasOwnProperty(i)) continue;

                        count++;
                        if (RabinRegEx.test(i))
                        { // We're looking at a URI as a link rel type
                            let linkRelObject = Object.create(resultProps);
                            linkRelObject.id = 'linkRelObject' + count;
                            linkRelObject.test = 'If supporting multiple links per identified item, (resolvers) SHALL recognise the GS1 Web vocabulary namespace. A resolver MAY recognise additional namespaces (registered IANA link rel types are ignored in this test suite)';
                            linkRelObject.msg = 'Link relation type ' + i + ' is not recognised or proposed by GS1';
                            linkRelObject.status = 'warn';
                            recordResult(linkRelObject);
                            if (typeof GS1LinkTypes.find(x => x.url === i) === 'object')
                            {
                                linkRelObject.msg = 'Link relation type ' + i + ' recognised or proposed by GS1';
                                linkRelObject.status = 'pass';
                                recordResult(linkRelObject);
                            }
                            if ((i === 'https://gs1.org/voc/defaultLink') && (defaultLinkOK === false))
                            { // So we haven't already got a default link.
                                defaultLinkOK = true; // We have found our default link
                                defaultLinkObject.status = 'pass';
                                defaultLinkObject.msg = 'Default link found';
                                recordResult(defaultLinkObject);
                            }
                            else if ((i === 'https://gs1.org/voc/defaultLink') && (defaultLinkOK))
                            {
                                // Multiple default links found, which is an error
                                defaultLinkObject.status = 'fail';
                                defaultLinkObject.msg = 'Duplicate default link found (perhaps you meant to use defaultLink*?)';
                                recordResult(defaultLinkObject);
                                validLinkset = false;
                            }

                            let arrayOfTargetObjects = Object.create(resultProps);
                            arrayOfTargetObjects.id = 'arrayOfTargetObjects' + count;
                            arrayOfTargetObjects.test = 'Linkset requires there be an array of link target objects for every link relation, even if there is only one link target object.';
                            arrayOfTargetObjects.msg = 'No array, or invalid array of link target objects found for ' + i;
                            if (typeof data.linkset[0][i] === 'object')
                            {
                                if (checkTargetObjects(i, data.linkset[0][i]))
                                {
                                    arrayOfTargetObjects.status = 'pass';
                                    arrayOfTargetObjects.msg = 'Array of target objects found for ' + i;
                                }
                                else
                                {
                                    validLinkset = false;
                                }
                            }
                            recordResult(arrayOfTargetObjects);
                        }
                    }
                    if (defaultLinkOK === false)
                    {
                        validLinkset = false
                    }
                    if (validLinkset)
                    {
                        await testLinksInLinkset(dl, data.linkset[0])
                    }
                }

            }
        } // End if soleMember.status === 'pass', i.e. we probably have some sort of linkset
        catch (error)
        {
            console.log('There has been a problem with your fetch operation: ', error.message);
        }
    }
    return soleMember;
 }

function checkTargetObjects(lt, a)
{
    let counter = 0;
    let returnValue = true;
    let langRegEx = /^[a-z]{2}($|-[A-Z]{2})/;   // We'll assume that if a language tag matches this, it's a valid value.
                                                // We won't fetch the list of valid values and check against that.
    let typeRegEx = /^[a-z]{4,}\//;             // Again, not checking against IANA list but must begin with at least 4
                                                // lower case letters followed by a slash
    for (let target in a)
    {
        //Safety code when using for..in as some objects may have inherited parent properties
        if (!a.hasOwnProperty(target))
        {
            continue;
        }
        counter++;
        let targetObj = Object.create(resultProps);
        targetObj.id = 'targetObj' + lt + counter;
        targetObj.test = 'All links exposed SHALL include the target URL, the link relationship type (the link type) and a human-readable title';
        targetObj.msg = 'Target link minimum requirements not met';
        // We know we have a link rel type or we wouldn't be here. So we just need to check the other two
        if ((typeof a[target].href === 'string') && (RabinRegEx.test(a[target].href)))
        {  // we have a target URL. Now to check the title - which can come in two ways (that are not exclusive)
            let myTitle = '';
            if ((typeof a[target].title === 'string') && (a[target].title !== ""))
            {
                myTitle = a[target].title;
            }
            if (Array.isArray(a[target]["title*"]) && typeof a[target]["title*"][0].value === 'string' && a[target]["title*"][0].value !== "")
            {
                for (const t of a[target]["title*"])
                {
                  myTitle += `, ${t.value} (${t.language})`;
                }
            }
            // other attributes are optional, but if present, they need to conform to certain rules.
            // Start with hreflang which takes an array of language codes
            if (Array.isArray(a[target].hreflang))
            { // We have something for the hreflang which must be an array of valid language tags
                if (typeof a[target].hreflang[0] === 'string')
                {
                    targetObj.msg = 'Array of language tags found.';
                    for (let lang in a[target].hreflang)
                    {
                        //Safety code when using for..in as some objects may have inherited parent properties
                        if (!a[target].hreflang.hasOwnProperty(lang)) continue;
                        
                        if (!langRegEx.test(a[target].hreflang[lang]))
                        {
                            returnValue = false;
                            targetObj.msg += ' ' + a[target].hreflang[lang] + ' is not a valid language tag';
                        }
                    }
                }
                else
                {
                    targetObj.msg = 'Value of hreflang for ' + a[target].href + ' is present but is not an array';
                    returnValue = false;
                }
            }

            if (a[target].type !== undefined)
            { // We have something for the type
                if (!typeRegEx.test(a[target].type))
                {
                    returnValue = false;
                    targetObj.msg += ' Media type ' + a[target].type + ' is not valid';
                }
            }
            if ((returnValue) && (myTitle !== ''))
            {
                targetObj.status = 'pass';
                // Worth creating a friendly message here so that links can be distinguished
                targetObj.msg = 'Target link minimum requirements met for ' + a[target].href + ' (' + lt.replace('https://gs1.org/voc/', 'gs1:') + ', ' + myTitle;
                if (a[target].hreflang !== undefined)
                {
                    for (let lang of a[target].hreflang)
                    {
                        targetObj.msg += ', ' + lang;
                    }
                }
                if (a[target].type !== undefined)
                {
                    targetObj.msg += ', ' + a[target].type;
                }
                targetObj.msg += ')';
            }
        }
        recordResult(targetObj);
        if (targetObj.status !== 'pass')
        {
            returnValue = false
        }
    }
    return returnValue;
}

/**
 * Author a series of tests for all the linktypes found in the linkset
 * (except for defaultLink and defaultLink* which have already been authored)
 * @param ls
 * @param dl
 * @param linkArray
 */
const authorLinkSetLanguageTests = (ls, dl, linkArray) =>
{
    for (let r in ls)
    {
        if (!ls.hasOwnProperty(r))
        {
            continue;
        }

        // r is a top level element in the context object. This might be things like 'itemDescription' and anchor.
        // We are only interested where r is a URL and is not one of the default links already processed
        if ((RabinRegEx.test(r)) && ((r !== 'https://gs1.org/voc/defaultLink') && (r !== 'https://gs1.org/voc/defaultLink*')))
        {
            let linkType = r.replace('https://gs1.org/voc/', 'gs1:');
            //console.log('We have a link type of ' + r);
            // Confident that r is a link type and that we should now be able to construct queries that should redirect
            // accordingly.
            let linkCount = 0;

            // ls.r is an array of target objects for the given link type
            for (let targetObject of ls[r])
            {
                linkCount += 1;
                let u = stripQuery(dl) + '?linkType=' + linkType; // Creates basic request URI for that link type
                let loCheck = {
                    "id": "", //An id for the test
                    "test": "", // conformance statement from spec
                    "status": "fail", // (pass|fail|warn), default is fail
                    "msg": "", // Displayed to the end user
                    "url": "", // The URL we're going to fetch
                    "headers": {}  // Ready for any headers we want to set
                }


                loCheck.test = 'Resolvers SHALL redirect to the default link unless there is information in the request that can be matched against available link metadata to provide a better response.';
                if ((typeof targetObject.context === 'string') && (targetObject.context !== ''))
                {
                    // So we have a GS1 context variable as well as a link type
                    u += '&context=' + targetObject.context;
                }
                loCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u); // This is the
                                                                                                  // complete test
                                                                                                  // URL to send to
                                                                                                  // the helper
                                                                                                  // application
                // Now we need to construct the HTTP request. Does this target object specify a media type? If so,
                // we'll be explicit in what we want
                if ((typeof targetObject.type === 'string') && (targetObject.type !== ''))
                {
                    loCheck.headers.Accept = targetObject.type;
                }
                else
                {
                    loCheck.headers.Accept = '*/*';    // try as I might I cannot persuade JS not to need this in
                                                       // this loop
                }
                // So far we haven't take account of language, which we need to do.
                // There might be multiple languages (even a single one will be in an array)

                if (Array.isArray(targetObject.hreflang) && typeof targetObject.hreflang[0] === 'string' && (targetObject.hreflang[0] !== ''))
                {
                    // We have at least one language
                    loCheck.headers['Accept-language'] = targetObject.hreflang[0];
                }
                else
                {
                    // console.log('NOT setting language here to for ' + loCheck.id);
                    loCheck.headers['Accept-language'] = 'en'; // Default language. Would love not to have to do
                                                               // this.
                }
                loCheck.id = `LOTEST_${linkType}_${linkCount}_${loCheck.headers['Accept-language']}_${loCheck.headers.Accept}`;

                loCheck.msg = describeRequest(dl, linkType, targetObject, loCheck);
                loCheck.href = targetObject.href; // This is the URL we should be directed to. We pass it to the
                                                  // process function within loCheck

                recordResult(loCheck);

                loCheck.process = async (data) =>
                {
                    // console.log('We want to match location header ' + stripQuery(data.result.location) + ' with
                    // linkset href of ' + stripQuery(targetObject.href));
                    if (stripQuery(data.result.location) === stripQuery(loCheck.href))
                    { // There is a redirection to the correct link
                        loCheck.status = 'pass';
                        loCheck.msg = loCheck.msg.replace('failed to redirect to ', 'redirected to ');
                        recordResult(loCheck);
                    }
                }

                linkArray.push(loCheck);

                // If there are more languages, we can clone the loCheck object and just change a few things before
                // pushing it to the linkArray

                let langNo = 1;
                while (Array.isArray(targetObject.hreflang) && (typeof targetObject.hreflang[langNo] === 'string' && targetObject.hreflang[langNo] !== ''))
                {
                    console.error("WAS I HERE?!", targetObject.hreflang[langNo]);
                    let clone = loCheck;
                    clone.id += targetObject.hreflang[langNo];
                    clone.headers['Accept-language'] = targetObject.hreflang[langNo];
                    clone.msg = describeRequest(dl, linkType, targetObject, clone);
                    recordResult(clone);
                    linkArray.push(clone);
                    langNo++;
                }


            }
        }
    }
}

const  testLinksInLinkset = async (dl, ls) =>
{
  // This function is called if we're confident that we have a linkset. The linkset itself arrives as ls.
  // We're going to set up an array of tests and reduce that promise array separately for each link
  let linkArray = [];

  // Setup Test 1: Checking the default response
  let defaultResponseCheck = Object.create(resultProps);
  defaultResponseCheck.id = 'defaultResponseCheck';
  defaultResponseCheck.test = 'Resolvers SHALL redirect to the default link unless there is information in the request that can be matched against available link metadata to provide a better response.';
  let u = stripQuery(dl);
  defaultResponseCheck.msg = 'Request to ' + u + ' without any extra information did not redirect to default link';
  defaultResponseCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
  recordResult(defaultResponseCheck);
  defaultResponseCheck.process = async (data) =>
  {
    // There can only be one href for the defaultLink, so we can hard-code the [0] value.
    if (data.result.location === ls["https://gs1.org/voc/defaultLink"][0].href)
    { // There is a redirection to the default link
      defaultResponseCheck.status = 'pass';
      defaultResponseCheck.msg = 'Redirection to default link of ' + ls["https://gs1.org/voc/defaultLink"][0].href + ' confirmed';
    }
    else
    {
      defaultResponseCheck.msg += ' which is ' + ls["https://gs1.org/voc/defaultLink"][0].href;
    }
    recordResult(defaultResponseCheck);
  }
  linkArray.push(defaultResponseCheck);

  // Now we need to check any default* links - which is more complicated.
  if (Array.isArray(ls["https://gs1.org/voc/defaultLink*"]))
  {
    // So we have one or more defaultLink* entries
    for (let dlElement of ls["https://gs1.org/voc/defaultLink*"])
    {
      // Loop through links for the defaultLink* link type
      // Resolvers MAY use any HTTP request header to differentiate defaultLink* entries
      // However, only Accept-Language and Accept are part of the spec so that's all we're going to test for.
      // The spec does not define how to prioritize the two but for simplicity we'll treat them as equal and
      // use them both when testing, i.e. look at each link and use whatever info is available that can be
      // expressed in an HTTP request.

      // Sample 'dlElement' would be
      // {
      //   "href": "https://dalgiardino.com/risotto-rice-with-mushrooms/",  <-- We know we have this
      //   "title": "Product information",                                  <-- we might have this and/or title*
      //   "type": "text/html",                                             <-- This is one thing we're interested in if present
      //   "hreflang": ["en", "fr"]                                         <-- And this is the other
      // }

      let defLinkStarCheck = Object.create(resultProps);
      defLinkStarCheck.id = 'defLinkStar';
      defLinkStarCheck.test = 'Resolvers SHALL redirect to the default link unless there is information in the request that can be matched against available link metadata to provide a better response.';
      let u = stripQuery(dl);
      defLinkStarCheck.msg = `Request to ${u} `;
      if ((typeof dlElement.type === 'string') && (dlElement.type !== ''))
      { // So we have a media type to specify
        defLinkStarCheck.headers['Accept'] = dlElement.type;
        defLinkStarCheck.msg += `with Accept header set to ${dlElement.type} `;
      }
      if (Array.isArray(dlElement.hreflang))
      { // We have a language. We have already checked that if there is a language, it's in an array and is of the right format, so we can use it confidently
        defLinkStarCheck.headers['Accept-language'] = dlElement.hreflang[0];
        if (defLinkStarCheck.msg.indexOf('header set to') !== -1)
        { // meaning we have set an Accept header
          defLinkStarCheck.msg += ' and ';
        }
        defLinkStarCheck.msg += `with Accept-language header set to ${dlElement.hreflang[0]} `;
      }
      defLinkStarCheck.msg += `did not redirect to the correct link, which is ${dlElement.href}`;
      recordResult(defLinkStarCheck);
      defLinkStarCheck.url = `${perlTests}?test=getAllHeaders&testVal=${encodeURIComponent(u)}`;
      defLinkStarCheck.process = async (data) =>
      {
        if (data.result.location === dlElement.href)
        {  // There is a redirection to the correct link
          defLinkStarCheck.status = 'pass';
          defLinkStarCheck.msg = `Redirection to default* link of '${dlElement.href}' confirmed.`;
          recordResult(defLinkStarCheck);
        }
        //Add this test to the linkArray
      }
      linkArray.push(defLinkStarCheck);

      // So far we've assumed a single language. There might be more in which case we need to check those too
      // but it's almost the same so we start by cloning the text object

      if (Array.isArray(dlElement.hreflang))
      {
        let extraLang = 1;
        while (dlElement.hreflang[extraLang] !== undefined)
        {
          console.log('Should not be here');
          let o = Object.assign(Object.create(resultProps), defLinkStarCheck);
          // give this cloned test object a new id and update the language header
          o.id += `${extraLang}`;
          o.headers['Accept-language'] = dlElement.hreflang[extraLang];
          recordResult(o);
          linkArray.push(o);
          extraLang++;
        }
      }
    }
  }
  authorLinkSetLanguageTests(ls, dl, linkArray);
  // OK, run the tests!
  try
  {
    for (let linkTest of linkArray)
    {
        await runTest(linkTest);
    }
  }
  catch (error)
  {
    console.log('There has been a problem with your fetch operation for: ', error.message);
  }

    /* Was:
    linkArray.reduce(
        (chain, d) => chain.then(() => runTest(d))
            .catch((error) => console.log('There has been a problem with your fetch operation for: ', error.message)),
        Promise.resolve()
    );
    </
     */
}


const rotatingCircle = (showFlag) =>
{
    document.getElementById('rotatingcircle').style.visibility = showFlag ? "visible" : "hidden";
}


const describeRequest = (dl, linkType, targetObject, testObject) =>
{
    let msg = 'Request for ' + stripQuery(dl) + '?linkType=' + linkType + ' failed to redirect to expected target URL:' + targetObject.href;
    msg += ' Additional request parameters used: ';
    if ((typeof targetObject.context === 'string') && (targetObject.context !== ''))
    {
        msg += 'context: ' + targetObject.context + '; ';
    }
    if (typeof testObject.headers['Accept-language'] === 'string')
    {
        msg += 'Accept-language: ' + testObject.headers['Accept-language'] + '; ';
    }
    if (typeof testObject.headers.Accept === 'string')
    {
        msg += 'Accept: ' + testObject.headers.Accept + '.';
    }

    // msg += ' Request url is ' + testObject.url;
    return msg;
}


function testJldContext(dl)
{
    let jldContext = Object.create(resultProps);
    let regex = /rel=*http:\/\/www.w3.org\/ns\/json-ld#context/;
    jldContext.id = 'jldContext';
    jldContext.test = 'SHALL respond to a query parameter of linkType set to all by returning a list of links available to the client application. The list SHALL be available as per Linkset: Media Types and a Link Relation Type for Link Sets.';
    jldContext.msg = 'No HTTP Link Header detected pointing to JSON-LD Context';
    jldContext.status = 'warn';
    jldContext.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(stripQuery(dl) + '?linkType=all');
    jldContext.headers = {'Accept': 'application/linkset+json'};
    recordResult(jldContext);
    jldContext.process = async (data) =>
    {
        if ((data.result.link != null) && (regex.test(data.result.link)))
        {
            jldContext.status = 'pass';
            jldContext.msg = 'HTTP Link Header detected pointing to JSON-LD Context';
            recordResult(jldContext);
        }
    }
    return jldContext;
}


// ********************* Processing functions ******************************

// A little function I find handy

function stripQuery(u)
{
    return u.indexOf('?') > -1 ? u.substring(0, u.indexOf('?')) : u;
}

function numericOnly(dl)
{    // Bound to be a better way of doing this but this is nice and simple
    let rv = dl.replace('gtin', '01');
    rv = rv.replace('itip', '8006');
    rv = rv.replace('gmn', '8013');
    rv = rv.replace('cpid', '8010');
    rv = rv.replace('shipTo', '410');
    rv = rv.replace('billTo', '411');
    rv = rv.replace('purchasedFrom', '412');
    rv = rv.replace('shipFor', '413');
    rv = rv.replace('gln', '414');
    rv = rv.replace('payTo', '415');
    rv = rv.replace('glnProd', '416');
    rv = rv.replace('party', '417');
    rv = rv.replace('gsrnp', '8017');
    rv = rv.replace('gsrn', '8018');
    rv = rv.replace('gcn', '255');
    rv = rv.replace('sscc', '00');
    rv = rv.replace('gdti', '253');
    rv = rv.replace('ginc', '401');
    rv = rv.replace('gsin', '402');
    rv = rv.replace('grai', '8003');
    rv = rv.replace('giai', '8004');
    return rv;
}


/**
 * runTest() executes the .process() method in the supplied test.
 * @param test
 * @returns {Promise<void>}
 */
const runTest = async (test) =>
{
    // console.log('Fetching ' + test.url + ' for ' + test.id + ' with language at ' + test.headers['Accept-language']);
    try
    {
        let response = await fetch(test.url, { headers: test.headers });
        let data = await response.json();
        await test.process(data);
        recordResult(test);
    }
    catch (error)
    {
        console.log(`"Error from test id: '${test.id}' on '${test.url}' has error: ${error}`);
    }
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
    let e = document.getElementById('resultsGrid');
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

function sendOutput(o)
{
    // We begin by creating or updating entries in the DL list
    // If the dt/dd pair exist we need to update them, otherwise we need to create them
    // So begin by testing for existence

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


let dummy = {
    "linkset": [
        {
            "anchor": "https://example.com/01/614141123452",
            "itemDescription": "Example product",
            "https://gs1.org/voc/defaultLink": [
                {
                    "href": "https://dalgiardino.com/risotto-rice-with-mushrooms/",
                    "title": "foo"
                }
            ],
            "https://gs1.org/voc/defaultLink*": [
                {
                    "href": "https://dalgiardino.com/risotto-rice-with-mushrooms/index.html.vi",
                    "hreflang": ["vi"],
                    "type": "text/html",
                    "title": "Product information"
                },
                {
                    "href": "https://example.com/fr/defaultPage",
                    "hreflang": ["fr"],
                    "type": "application/json",
                    "title": "Information produit"
                }
            ],
            "https://gs1.org/voc/pip": [
                {
                    "href": "https://example.com/en/defaultPage",
                    "hreflang": ["en"],
                    "type": "text/html",
                    "title": "Product information"
                },
                {
                    "href": "https://example.com/fr/defaultPage",
                    "hreflang": ["fr"],
                    "title": "Information produit"
                }
            ],
            "https://gs1.org/voc/whatsInTheBox": [
                {
                    "href": "https://example.com/en/packContents/GB",
                    "hreflang": ["en"],
                    "title": "What's in the box?",
                    "context": "GB"
                },
                {
                    "href": "https://example.com/fr/packContents/FR",
                    "hreflang": ["fr"],
                    "title": "Qu'y a-t-il dans la boite?",
                    "context": "FR"
                },
                {
                    "href": "https://example.com/fr/packContents/CH",
                    "hreflang": ["fr"],
                    "title": "Qu'y a-t-il dans la boite?",
                    "context": "CH"
                }
            ],
            "https://gs1.org/voc/relatedVideo": [
                {
                    "href": "https://video.example",
                    "hreflang": ["en", "fr"],
                    "title": "See it in action!",
                    "title*": [{"value": "See it in action!", "language": "en"}, {"value": "Voyez-le en action!", "language": "fr"}]
                }
            ]
        }
    ]
}
