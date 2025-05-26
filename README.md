# GS1DL-resolver-testsuite
This is the repository for the code behind the Resolver test suite, hosted at https://ref.gs1.org/test-suites/resolver/. It can be used to assess whether a resolver conforms to the GS1 Digital Link standard and is provided to encourage such conformance. The [resolver standard](https://ref.gs1.org/standards/resolver/) has several quirks that, sadly, can trip up the unwary.
 
The test suite is written as a JavaScript function that takes a GS1 Digital Link URI as input.  
 
 For each individual test, an object is created that includes:
 * the conformance criteria (copied from the standard);
 * the status of the test, which defaults to `fail`;
 * the 'fail' message to display;
 * a specific method that executes the test and sets the status to `pass` and updates the output message if appropriate.
Tests are either individual or closely related, such as when several tests are carried out from a single response to a query to the resolver. This means a lot of the code is executed asynchronously. This avoids all the fetch operations being triggered at once and creates the effect of the various tests appearing and, hopefully, switching from red to green as each one is executed. 
 
 The output is displayed in two ways:
 1. as a list of individual statements, styled to indicate `pass`, `fail` or `warn`;
 2. as a grid of coloured rectangles to give an immediate visual indication of the status of your resolver. Each square hyperlinks to the more detailed result.
 
The test suite creates both of these and inserts them into an HTML page as child elements of an element carrying an `id` of `gs1ResolverTests`. This is defined as a constant in the JavaScript file so that it can be changed if you wish.
 
As well as the [GS1 Digital Link Toolkit](https://github.com/gs1/GS1DigitalLinkToolkit.js), the script makes use of a set of functions in a [helper PHP file](https://github.com/gs1/GS1DL-resolver-testsuite/blob/master/tester.php). This is because it is easier to control HTTP requests using PHP and Curl than JavaScript's fetch. The PHP script returns an Object that contains the results of the HTTP HEAD request, which is then processed in the JavaScript.

Contributions welcome, noting the license under which the code is made available.

# Work in progress
There is still a significant amount of work to be done on the test suite and it's near-certain that there are bugs and other deficiencies that could lead to false results. Please raise an issue for any that you find or, even better, suggest code edits.

