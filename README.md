# GS1DL-resolver-testsuite
This is the test suite that can be used to assess whether a resolver conforms to the GS1 Digital Link standard.
 
 <!-- A [demo is available](https://gs1.github.io/GS1DL-resolver-testsuite/) -->

Note that work on this test suite is not yest complete. The list of conformance criteria and whether or not tests have been implemented is in a [separate file](Conformance.txt).

 
 The test suite is written as a JavaScript function that takes a GS1 Digital Link URI as input. This should be an example from your resolver. Load the script file (GS1DigitalLinkResolverTestSuite.js) into your page, as well as the [GS1 Digital Link Toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js), and then arrange for your sample DL URL to be passed to the `testDL()` function. 
 
 For each individual test, a test object is created that includes:
 * the conformance criteria (copied from the standard);
 * the status of the test, which defaults to `fail`;
 * the 'fail' message to display;
 * a specific method that executes the test and sets the status to `pass` and updates the output message if appropriate.
 Almost all of the tests require a `fetch` operation and most are loaded into an array that is then processed in series using `Array.reduce()`. This avoids all the fetch operations being triggered at once. 
 
 The output is displayed in two ways:
 1. as a list of individual statements, styled to indicate `pass`, `fail` or `warn`;
 2. as a grid of coloured rectangles to give an immediate visual indication of the status of your resolver.
 
 The test suite creates both of these and inserts them into your page as child elements of an element carrying an `id` of `gs1ResolverTests`. This is defined as a constant in the JavaScript file so that it cna be changed if you wish.
 
 As well as the [GS1 Digital Link Toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js), the script makes use of a small Perl script. This is simply because I find it easier to control HTTP requests using Perl's LWP module that JavaScript's fetch. In addition, one of the tests uses [curl](https://curl.haxx.se/) as I can't see a way to use fetch to discover the version of HTTP being used (GS1 Digital Link requires 1.1 or higher). The Perl script returns an Object that contains the results of the HTTP HEAD request, which is then processed in the JavaScript. If you can find a better way to do this, please commit it here!

