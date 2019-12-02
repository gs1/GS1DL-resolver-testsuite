const outputElement = 'gs1ResolverTests' // Set this to the id of the element in the document where you want the output to.

const resultProps = {
  "id" : "", //An id for the test
  "test" : "", // conformance statement from spec
  "status" : "fail", // (pass|fail|warn), default is fail
  "msg" : "", // Displayed to the end user
  "url" : "" // The URL we're going to fetch
}

const linkProps = {
  "href" : "",
  "rel" : "",
  "title" : "",
  "hreflang" : "",
  "type": ""
}

const perlTests = 'https://philarcher.org/cgi-bin/testHarness.pl';

let testList =[];
let resultsArray = [];




// ***************************************************************************
// This is the main function that takes a Digital Link URI as input and creates the output.
// ***************************************************************************

function testDL(dl) {
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
  let UriElements;
  let RabinRegEx = /^(([^:\/?#]+):)?(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
  // (see https://www.w3.org/TR/powder-grouping/#rabinsRegEx for the origin of this regex by Jo Rabin)

  // A couple of things we need to be portable...

  let domain; // We need this to be portable. Others below aren't needed outside the code block.
  let gs1dlt = new GS1DigitalLinkToolkit();

  if (UriElements = dl.match(RabinRegEx)) {
    //  for (i in UriElements) {console.log('i is ' + i + ' which is ' + UriElements[i])}
    let scheme = UriElements[2];
    domain = UriElements[4];
    let port = UriElements[9];
    let path = UriElements[10];
    let query = UriElements[12];
    let frag = UriElements[14];
    if (((scheme == 'http') || (scheme == 'https')) && (domain.indexOf('.') != -1)) {
      isURL.msg = 'Given GS1 Digital Link URI is a valid URL';
      isURL.status = 'pass';
      recordResult(isURL);

      // At this point we probably have a URL and we have its various elements,
      // But we should check to see if it's a valid DL URL which we can do using the DL toolkit

      try {
  	    let gs1Array = gs1dlt.extractFromGS1digitalLink(dl); 
        // You can get here with a variety of URLs including just a domain name and /gtin etc. So we need to check further
        // Object returned has a GS1 object within it. Test for that using Mark's code
        if (gs1dlt.buildStructuredArray(gs1Array.GS1).identifiers.length == 1) {
          validDL.status = 'pass';
          validDL.msg = 'Given input is a valid GS1 Digital Link URI';
          recordResult(validDL);
        }
      } catch(err) {
      	console.log('Error when extracting keys from given DL. Message is ' + err);    // Don't actually want to stop processing.  validInputCheck.status is our flag for future processing
      }
    } // End is it a URL
    if (scheme == 'https') {
      isHttps.msg = 'Given GS1 Digital Link URI defines HTTPS as its scheme';
      isHttps.status = 'pass';
      recordResult(isHttps);
    }
  } // End is it a URI

  // We can only go beyond this point if we have a valid DL URI, so we test for that

  if (validDL.status == 'pass') {
    // We'll call a series of functions rather than putting everything here
    // They return an object that normally goes into the asynch fetch array

    TLSCheck(domain);     // This one doesn't push to the array
    rdFileCheck(domain);  // Nor this one

    testList.push(checkHttpVersion(domain));
    testList.push(headerBasedChecks(dl));
    testList.push(errorCodeChecks(dl));
    testList.push(trailingSlashCheck(dl));
    testList.push(compressionChecks(dl, domain, gs1dlt));
    testList.push(jsonTests(dl));
    testList.push(jsonLdTests(dl));
    testList.push(testQuery(dl));

    // Now we run all the fetch-based tests one after the other. Promise-based means they don't all happen at once.
    testList.reduce(
      (chain, d) => chain.then(() => runTest(d)).catch((error) => console.log('There has been a problem with your fetch operation for: ', error.message)),
      Promise.resolve()
    );
  } // End validDL.status=='pass'
}


function TLSCheck(domain) {
  // This is designed to make sure that the server is available over TLS (i.e. using https works, even if the given DL is http)
  // It does not handle a JSON response and therefore we don't use the promises array
console.log('Domain is '+ domain);
  let tlsOK = Object.create(resultProps);
  tlsOK.id = 'tlsOK';
  tlsOK.test = 'SHALL support HTTP Over TLS (HTTPS)';
  tlsOK.msg = 'Resolver does not support HTTP over TLS';
  recordResult(tlsOK);
	
//  fetch('https://hintleshamandchattisham.onesuffolk.net/', {  // Used for debugging, this is one of the few sites I know that doesn't support https!
  fetch('https://' + domain, {
    method: 'HEAD',
    mode: 'no-cors'
    })
    .then(function (response) {
    if (parseInt(response.status, 10) >= 0) {   // status is usually 0 for a site that supports https, I think 'cos we're using non-cors mode. 
      tlsOK.msg = 'Confirmed that server supports HTTP over TLS';
      tlsOK.status = 'pass';
    }
    recordResult(tlsOK);
  })
    .catch(function(error) {
    console.log('There has been a problem with your fetch operation when checking for TLS support: ', error.message);
  });
  return tlsOK;
}

function checkHttpVersion(domain) {
  let httpVersion = Object.create(resultProps);
  httpVersion.id = 'httpVersion';
  httpVersion.test = 'SHALL support HTTP 1.1 (or higher)';
  httpVersion.status = 'warn';
  httpVersion.msg = 'HTTP version not detected. If other tests passed, it\'s probably OK';
  httpVersion.url = perlTests + '?test=getHTTPversion&testVal=' + domain;
  recordResult(httpVersion);
  httpVersion.process = function(data) {
    let r = parseFloat(data.result);
    if ((r != NaN) && (r >= 1.1)) {
        httpVersion.status = 'pass';
        httpVersion.msg = 'Server at ' + domain + ' supports HTTP ' + r;
      }
    recordResult(httpVersion);
  }
  return httpVersion;
}

function headerBasedChecks(dl) {
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
 
  // We'll use the corsCheck object as the primary one here but will process the headers to look at the ones about the links too
  // We need to get rid of any query string in the dl so we'll do that first
  let u = stripQuery(dl);
  corsCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u);
  corsCheck.process = function(data) {
  // console.log('Looking for access control header ' + data.result['access-control-allow-origin']);
    if (data.result['access-control-allow-origin'] != '') {
      // That's probably enough tbh
      corsCheck.status = 'pass';
      corsCheck.msg = 'CORS headers detected';
      recordResult(corsCheck);
    }
    if (((data.result['access-control-allow-methods'].indexOf('GET') > -1) || (data.result['access-control-allow-methods'].indexOf('HEAD') > -1)) || (data.result['access-control-allow-methods'].indexOf('OPTIONS') > -1)) { // We have our three allowed methods
      methodsCheck.msg = 'GET, HEAD an OPTIONS methods declared to be supported';
      methodsCheck.status = 'pass';
      recordResult(methodsCheck);
    }

    if (data.result.link != null) {   // we have a link header. We'll now test that each link has the required attributes
      let allLinks = data.result.link.split(','); // allLinks is an array of what's available
      // We'll use a series of regular expressions to extract the relevant metadata for each link since order is unimportant
      // RegExes are computationally expensive but performance is not a key issue here

      let hrefRE = /^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/;
      let relRE = /rel="(.*?)"/;
      let titleRE = /title="(.*?)"/;
      let hreflangRE = /hreflang="(.*?)"/;
      let typeRE = /type="(.*?)"/;
      let linkArray = [];
      linkMetadata.status = 'pass';   // Assume pass and switch to fail if any of the SHALL tests fail
      // We store each of the attributes in an object as we'll need this to run further tests on those links
      for (let link = 0; link < allLinks.length; link++) {
        let linkObj =  Object.create(linkProps);
        linkObj.href = allLinks[link].substring(allLinks[link].indexOf('<')+1, allLinks[link].indexOf('>'));
        if (!hrefRE.test(linkObj.href)) {
          linkMetadata.status = 'fail'; 
          console.log('Link ' + link + ' failed on url which is ' + linkObj.href)
        }
        if (relRE.test(allLinks[link])) {
          linkObj.rel = relRE.exec(allLinks[link])[1]
        } else {
          linkMetadata.status = 'fail'; console.log('No link type (rel) declared for ' + linkObj.href + ' (link ' + link + ')')
        }
        if (titleRE.test(allLinks[link])) {
          linkObj.title = titleRE.exec(allLinks[link])[1]
        } else {
          linkMetadata.status = 'fail'; console.log('No title given for ' + linkObj.href + ' (link ' + link + ')')
        }
        //Those are the SHALLs, now we'll record the others for future use
        linkObj.hreflang = hreflangRE.exec(allLinks[link]) == null ? '' : hreflangRE.exec(allLinks[link])[1];
        linkObj.type = typeRE.exec(allLinks[link]) == null ? '' : typeRE.exec(allLinks[link])[1];

        // If we still have linkMetadata.status == 'pass' at this point, then we can go ahead and test that link in more detail
        if (linkMetadata.status == 'pass') {linkArray.push(linkObj)}
      }

      // Now we want to set up tests for all the links in linkArray

      for (let i = 0; i < linkArray.length; i++ ) {
        linkArray[i].id = 'link'+i;
        linkArray[i].status = 'fail';
        linkArray[i].msg = 'Requesting link type of ' + linkArray[i].rel + ' does not redirect to correct target URL (' + linkArray[i].href + ')';
        linkArray[i].test = 'SHALL redirect to the requested linkType if available';
        linkArray[i].url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?linkType=' + linkArray[i].rel);
        recordResult(linkArray[i]);
        linkArray[i].process = function(data) {
        // Strip the query strings before matching (should probably be more precise about this. Might be important info in target URL that we're missing)
        let l = stripQuery(data.result.location);
        let k = stripQuery(linkArray[i].href);
          if (l == k) {  // redirection target is correct
            linkArray[i].msg = 'Requesting link type of ' + linkArray[i].rel + ' redirects to correct target URL (' + linkArray[i].href + ')';
            linkArray[i].status = 'pass';
          }
        }
      }
      // Now we can test those links one by one.
      linkArray.reduce(
        (chain, d) => chain.then(() => runTest(d)).catch((error) => console.log('There has been a problem with your fetch operation for: ', error.message)),
        Promise.resolve()
      );


      if (linkMetadata.status == 'pass') {
        linkMetadata.msg = 'Target URL and required metadata found for all links';
        // Looking for redirect link
        if (data.result.location != null) { // We have a redirect
          for (let i = 0; i < linkArray.length; i++) {
            if (linkArray[i].href == data.result.location) {
              defaultLinkSet.msg = 'Default response is to redirect to one of the available links (' + linkArray[i].href + ') with a linkType of ' + linkArray[i].rel;
              defaultLinkSet.status = 'pass';
            }
          }
          if (data.result.link != null) { // We have a link header present when redirecting
            linkOnRedirect.msg = 'Link headers present when redirecting';
            linkOnRedirect.status = 'pass';
          }
        } else {
          defaultLinkSet.msg = 'Default response is not to redirect so can\'t test that a given linkType is the default'; 
          defaultLinkSet.status = 'warn';
          linkOnRedirect.status = 'warn';
          linkOnRedirect.msg = u + ' does not redirect so cannot test';
        }
        recordResult(defaultLinkSet)
      } else {    // We have problems with the links, can't continue testing them
        linkMetadata.msg = 'Target URL and/or required metadata not found for all links';
      }
    } 
    recordResult(linkMetadata);
    recordResult(linkOnRedirect);
  }
  return corsCheck;
}

function errorCodeChecks(dl) {
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
  reportWith400.process = function(data) {
    if (data.result.httpCode == '400') {
      reportWith400.msg = 'Non-conformant GS1 Digital Link URI reported with 400 error';
      reportWith400.status = 'pass';
    } else {
      reportWith400.msg = 'Non-conformant GS1 Digital Link URI reported with ' + data.result.httpCode + ' error';
    }
    recordResult(reportWith400); 
    if (data.result.httpCode != '200') {
      noErrorWith200.msg = 'Error not reported with 200 OK';
      noErrorWith200.status = 'pass';
      recordResult(noErrorWith200); 
    }
  }
  return reportWith400;
}

function trailingSlashCheck(dl) {
  // Need to create a URI with and without a trailing slash
  // We can dispense with any query string and create version with no trailing slash, then append slash to make the other
  let noSlash = stripQuery(dl);
  if (noSlash.lastIndexOf('/') + 1 == noSlash.length) {
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
  trailingSlash.process = function(data) {
    slashRequest = new Request(perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(slash), {
      method:'get',
      mode: 'cors'
    })
    fetch(slashRequest)
    .then(function(response) {
      defaultHeaders = response.json();
      return defaultHeaders;
    })
    .then(function(slashJSON) {
      // OK, we have our two JSON objects and we can look for key points of similarity
      // We should get the same redirect or 200 for both slash and noSlash.
      if ((data.result.httpCode == slashJSON.result.httpCode) && (data.result.location == slashJSON.result.location)) {
        trailingSlash.status = 'pass';
        trailingSlash.msg = 'Response from server with and without trailing slash is identical'
        recordResult(trailingSlash); // No need to update if we didn't get here
      }
    })
    .catch(function(error) {
      console.log('There has been a problem with your fetch operation for ' + slashRequest.url + ': ', error.message)
    });
  }
  return trailingSlash;
}

function compressionChecks(dl, domain, gs1dlt) {
  // ******** test for decompression support************
  // Basic method is to send the same request compressed and uncompressed, should get the same response except that compressed adds uncompressed to Link header

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
  validDecompressCheck.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(dl);
  validDecompressCheck.process = function(data) {
    let compDL = gs1dlt.compressGS1DigitalLink(dl, false, 'https://' + domain, false, true, false);
    //  console.log('Compressed URI is ' + compDL);
    compressedRequest = new Request(perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(compDL), {
      method:'head',
      mode: 'cors'
    })
    fetch(compressedRequest)
    .then(function(response) {
      rj = response.json();
      return rj;
    })
    .then(function(compressedJSON) {

      // OK, we have our two JSON objects and we can look for key points of similarity
      // We should get the same redirect or 200 for both compressed and not compressed
      if ((data.result.httpCode == compressedJSON.result.httpCode) && (data.result.location == compressedJSON.result.location)) {
        validDecompressCheck.status = 'pass';
        validDecompressCheck.msg = 'Response from server identical for compressed and uncompressed GS1 Digital link URI'
        recordResult(validDecompressCheck); 
      }
      // Now we're looking for the uncompressed version in the link header
      if (compressedJSON.result.link.indexOf(dl) > -1) {   // It's in there, now we have to check for presence of owl:sameAs @rel
        let allLinks = compressedJSON.result.link.split(',');
        let i = 0;
        while (allLinks[i].indexOf(dl) == -1) {i++}    // We know it's there somewhere because we just tested for it

        // ****************** This block not fully tested as id.gs1.org fails at the moment (2019-10-18) **************

        let re = /(rel=.owl:sameAs)|(rel=.http:\/\/www.w3.org\/2002\/07\/owl#sameAs)/;
        if (allLinks[i].search(re) != -1) {
          exposeDecompressedLink.status = 'pass';
          exposeDecompressedLink.msg = 'Uncompressed URI present in compressed URI response link header with @rel of owl:sameAs';
          recordResult(exposeDecompressedLink);
        } else {
          exposeDecompressedLink.status = 'warn';
          exposeDecompressedLink.msg = 'Uncompressed URI present in compressed URI response link header but without @rel of owl:sameAs';
          recordResult(exposeDecompressedLink);
        }
      }
    })
    .catch(function(error) {
      console.log('There has been a problem with your fetch operation for ' + compressedRequest.url + ' ( testing ' + compDL + '): ', error.message)
    });
  }
  return validDecompressCheck;
}


function jsonTests(dl) {
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

  varyAccept.url = perlTests + '?test=getAllHeaders&accept=json&testVal=' + encodeURIComponent(stripQuery(dl) + '?linkType=all');
  varyAccept.process = function(data) {
    if (data.result.vary != null) {   // We have a vary header
      // might be an array or a single value
      if (data.result.vary[0] != null) {    // We have an array
        varyAccept.msg = 'Vary header detected, but does not include Accept suggesting no content negotiation for media type';
        for (var k in data.result.vary) {
          if (data.result.vary[k] == 'Accept') {
            varyAccept.status = 'pass';
          }
        }
      } else if (data.result.vary == 'Accept') {
        varyAccept.status = 'pass';
      }
      if (varyAccept.status == 'pass') {
        varyAccept.msg = 'Vary response header includes Accept suggesting content negotiation for media type';
        recordResult(varyAccept);
      }
    }

    // Let's see if the content-type reported from that HEAD request is JSON
    if (data.result['content-type'] == 'application/json') {
      listAsJSON.msg = 'Response media type is JSON';
      listAsJSON.status = 'warn';
      recordResult(listAsJSON);

      // Media type says it's JSON, but is it? We need to test that directly
      let newRequest = new Request(stripQuery(dl) + '?linkType=all', {
        method:'get',
        mode: 'cors',
        redirect: 'follow',
      	headers: new Headers({
    	 	'Accept': 'application/json'
        })
      });
      fetch(newRequest)
       .then(function(response) {
        return response.json();
      })
      .then(function(receivedJSON) {
        // console.log(receivedJSON);
        // Spec version 1.1 doesn't specify the JSON schema - coming in version 1.2 - so we can't run a test on whether it's conformant or not
        listAsJSON.msg = 'JSON received with linkType=all';
        listAsJSON.status = 'pass';
        recordResult(listAsJSON);
      })
      .catch(function(error) {  // parsing as JSON failed
      listAsJSON.status = 'fail';
      listAsJSON.msg = 'Asking for linkType=all did not return JSON';
      recordResult(listAsJSON);
      });
    }
  }
  return varyAccept;
}

function jsonLdTests(dl) {
  // ************ Test for JSON-LD
  let listAsJSONLD = Object.create(resultProps);
  listAsJSONLD.id = 'listAsJSONLD';
  listAsJSONLD.test = 'SHALL respond to a query parameter of linkType set to all by returning a list of links available to the client application. The list SHALL be available as JSON, SHOULD be available as JSON-LD and MAY be available in HTML and any other formats, served through content negotiation.';
  listAsJSONLD.msg = 'List of links does not appear to be available as JSON-LD';
  listAsJSONLD.status = 'warn';   // This is a SHOULD so default is warn, not fail
  recordResult(listAsJSONLD);

  listAsJSONLD.url = perlTests + '?test=getAllHeaders&accept=jld&testVal=' + encodeURIComponent(stripQuery(dl) + '?linkType=all');
  listAsJSONLD.process = function(data) {
    // Let's see if the content-type reported from that HEAD request is JSON-LD
    if (data.result['content-type'] == 'application/ld+json') {
      listAsJSONLD.msg = 'List of links appears to be available as JSON-LD';
      listAsJSONLD.status = 'pass';
      recordResult(listAsJSONLD);
    }
  }
  return listAsJSONLD;
}

function rdFileCheck(domain) {
  // Checking that the Resolver Description File is available. Also want to check a few things about it.

  let rdFile = Object.create(resultProps);
  rdFile.id = 'rdFile';
  rdFile.test = 'SHALL provide a resolver description file at /.well-known/gs1resolver';
  rdFile.msg = 'Resolver Description File not found';
  recordResult(rdFile);

  let testRequest = new Request('https://' + domain + '/.well-known/gs1resolver', {
    method:'get',
    mode: 'cors',
    redirect: 'follow',
  	headers: new Headers({
	 	'Accept': 'application/json'
	  })
  });
  fetch(testRequest)
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    if (data.resolverRoot.match(/^((https?):)(\/\/((([^\/?#]*)@)?([^\/?#:]*)(:([^\/?#]*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/) && (data.supportedPrimaryKeys != null)) {
      rdFile.msg = 'Resolver description file found with at least minimum required data';
      rdFile.status = 'pass';
    } else {
      rdFile.msg = 'Resolver description file found but minimum required data not found';
    }
    recordResult(rdFile);
  })
  .catch(function(error) {
    console.log('There has been a problem with your fetch operation: ', error.message);
  });
  return 1; 
}

function testQuery(dl) {
  qsPassedOn = Object.create(resultProps);
  qsPassedOn.id = 'qsPassedOn';
  qsPassedOn.test = 'By default, SHALL pass on all key=value pairs in the query string of the request URI (if present) when redirecting';
  qsPassedOn.msg = 'Query string not passed on. If the query string is deliberately suppressed for this Digital Link URI, test another one where the default behaviour of passing on the query string applies';
  qsPassedOn.status = 'warn';
  recordResult(qsPassedOn);
  let u = stripQuery(dl);
  let query = 'foo=bar';
  qsPassedOn.url = perlTests + '?test=getAllHeaders&testVal=' + encodeURIComponent(u + '?' + query);
  qsPassedOn.process = function(data) {
    if (data.result.location != undefined) {          // There is a redirection
      if (data.result.location.indexOf(query) > -1) { // Our query is being passed on
        qsPassedOn.status = 'pass';
        qsPassedOn.msg = 'Query passed on when redirecting';
      }
    } else {
      qsPassedOn.msg = 'GS1 Digital Link URI not redirected so cannot test this feature';
    }
    recordResult(qsPassedOn);
  }
  return qsPassedOn;
}
     





// ********************* Processing functions ******************************

// A little function I find handy

function stripQuery(u) {
  return u.indexOf('?') > -1 ? u.substring(0, u.indexOf('?')) : u;
}


// This is the function called by 'reducing' the list of tests 

function runTest(test) {  
  return new Promise((resolve, reject) => {
  fetch(test.url)
  .then(response => response.json())
  .then(data => {
    test.process(data);
    recordResult(test);
    resolve(`Completed`);
  })
  .catch(error => {
    console.log("Error from '" + test.url + "' is " + error);
    reject(`Rejected`);
  });
  });
}

// ************************** Output functions *****************************

function getDL() {
  let dl;
  if (dl = document.getElementById('testResults')) {
  } else {
    dl = document.createElement('dl');
    dl.id = 'testResults';
    document.getElementById(outputElement).appendChild(dl);
  }
  return dl;
}

function getGrid() {
  let p;
  if (p = document.getElementById('resultsGrid')) {
  } else {
    p = document.createElement('p');
    p.id = 'resultsGrid';
    document.getElementById(outputElement).appendChild(p);
  }
  return p;
}

function recordResult(result) {
  // See if result is already in the array
  let i = 0;
  while ((i < resultsArray.length) && (resultsArray[i].id != result.id)) {
    i++;
  }
  // i now either points to the existing record or the next available index, either way we can now push the result into the array
  resultsArray[i] = result;
  sendOutput(result);
  return 1;
}

function sendOutput(o) {
  // We begin by creating or updating entries in the DL list
  // If the dt/dd pair exist we need to update them, otherwise we need to create them
  // So begin by testing for existence

  let dd;
  if (dd = document.getElementById(o.id + 'dd')) { // It exists
    dd.innerHTML = o.msg;
    dd.className = o.status;
  } else {                                            // It doesn't exist so we need to create everything
    let dt = document.createElement('dt');
    dt.id = o.id;
    var t = document.createTextNode(o.test);
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
  let a;
  if (a = document.getElementById(o.id + 'a')) { // It exists - this will just be a status change
    a.className = o.status;
  } else {  // It doesn't exist and needs to be created
    let sq = document.createElement('a');
    sq.id = o.id + 'a';
    sq.href = '#' + o.id;
    sq.className = o.status;
    sq.title = o.test;
    grid.appendChild(sq);
  }
}
