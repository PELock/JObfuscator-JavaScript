/******************************************************************************
 * JObfuscator WebApi interface usage example.
 *
 * In this example we will verify our activation key status.
 *
 * Version        : v1.0.0
 * Language       : JavaScript
 * Author         : Bartosz Wójcik
 * Web page       : https://www.pelock.com
 *
 *****************************************************************************/

import JObfuscator from "jobfuscator";

//
// include JObfuscator class
//

//
// if you don't want to use npm use import from a local copy
//
// import JObfuscator from "./JObfuscator.js";

//
// create JObfuscator class instance (we are using our activation key)
//
const myJObfuscator = new JObfuscator("ABCD-ABCD-ABCD-ABCD");

//
// login to the service
//
const result = await myJObfuscator.login();

//
// result object holds the information about the license
//
// result.demo          - is it a demo mode (invalid or empty activation key was used)
// result.credits_left  - usage credits left after this operation
// result.credits_total - total number of credits for this activation code
// result.string_limit  - Max. source code size allowed (it's 1500 bytes for demo mode)
//
if (result !== null) {
  console.log("Demo version status - " + (result.demo ? "true" : "false"));
  console.log("Usage credits left - " + result.credits_left);
  console.log("Total usage credits - " + result.credits_total);
  console.log("Max. source code size - " + result.string_limit);
} else {
  throw new Error("Something unexpected happen while trying to login to the service.");
}
