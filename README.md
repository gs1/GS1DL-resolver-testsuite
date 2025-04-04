# GS1DL-resolver-testsuite
This is the repository for the code behind the Resolver test suite, hosted at https://ref.gs1.org/test-suites/resolver/. It can be used to assess whether a resolver conforms to the GS1 Digital Link standard.
 
The test suite is written as a JavaScript function that takes a GS1 Digital Link URI as input. This should be an example from your resolver. Load the script file (GS1DigitalLinkResolverTestSuite.js) into your page, as well as the [GS1 Digital Link Toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js), and then arrange for your sample DL URL to be passed to the `testDL()` function. 
 
 For each individual test, a test object is created that includes:
 * the conformance criteria (copied from the standard);
 * the status of the test, which defaults to `fail`;
 * the 'fail' message to display;
 * a specific method that executes the test and sets the status to `pass` and updates the output message if appropriate.
 Almost all of the tests require a `fetch` operation and most are loaded into an array that is then processed in series using `Array.reduce()`. This avoids all the fetch operations being triggered at once and creates the effect of the various tests appearing and, hopefully, switching from red to green as each one is executed. 
 
 The output is displayed in two ways:
 1. as a list of individual statements, styled to indicate `pass`, `fail` or `warn`;
 2. as a grid of coloured rectangles to give an immediate visual indication of the status of your resolver. Each square hyperlinks to the more detailed result.
 
The test suite creates both of these and inserts them into your page as child elements of an element carrying an `id` of `gs1ResolverTests`. This is defined as a constant in the JavaScript file so that it can be changed if you wish.
 
As well as the [GS1 Digital Link Toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js), the script makes use of a set of functions in a [helper PHP file]([url](https://github.com/gs1/GS1DL-resolver-testsuite/blob/master/tester.php)). THis is because it is easier to control HTTP requests using PHP and Curl than JavaScript's fetch. The PHP script returns an Object that contains the results of the HTTP HEAD request, which is then processed in the JavaScript.

Contributions welcome, noting the license under which the code is made available.

