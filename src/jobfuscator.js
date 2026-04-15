/******************************************************************************
 * JObfuscator WebApi interface
 *
 * Version        : v1.0.0
 * Language       : JavaScript
 * Author         : Bartosz Wójcik
 * Web page       : https://www.pelock.com
 *
 *****************************************************************************/

import { readFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";

/**
 * @typedef {Object} JObfuscatorResult
 * @property {number} error Error code (see ERROR_* constants).
 * @property {string} [output] Obfuscated source when error is ERROR_SUCCESS.
 * @property {boolean} [demo] Demo mode when key is invalid or empty.
 * @property {number} [credits_left] Credits remaining after the operation.
 * @property {number} [credits_total] Total credits for the activation key.
 * @property {boolean} [expired] True when the last credit was used.
 * @property {number} [string_limit] Max. source size (bytes), e.g. demo limit.
 */

/**
 * JObfuscator WebApi client.
 */
export default class JObfuscator {
  /** @type {string} default JObfuscator WebApi endpoint */
  static API_URL = "https://www.pelock.com/api/jobfuscator/v1";

  /** @type {number} success */
  static ERROR_SUCCESS = 0;

  /** @type {number} invalid size for source code (it's 1500 bytes max. for demo version) */
  static ERROR_INPUT_SIZE = 1;

  /** @type {number} input source is empty */
  static ERROR_INPUT = 2;

  /** @type {number} Java source code parsing error */
  static ERROR_PARSING = 3;

  /** @type {number} Java parsed code obfuscation error */
  static ERROR_OBFUSCATION = 4;

  /** @type {number} An error occurred while generating output code */
  static ERROR_OUTPUT = 5;

  /** @type {string|null} WebApi key for the service */
  #apiKey;

  /** @type {boolean} should the source code be compressed */
  enableCompression = true;

  /** @type {boolean} change linear code execution flow to non-linear version */
  mixCodeFlow = true;

  /** @type {boolean} rename variable names to random string values */
  renameVariables = true;

  /** @type {boolean} rename method names to random string values */
  renameMethods = true;

  /** @type {boolean} shuffle methods order in the output source */
  shuffleMethods = true;

  /** @type {boolean} encrypt integers using more than 15 floating point math functions from the java.lang.Math.* class */
  intsMathCrypt = true;

  /** @type {boolean} encrypt strings using polymorphic encryption algorithms */
  cryptStrings = true;

  /** @type {boolean} for each method, extract all possible integers from the code and store them in an array */
  intsToArrays = true;

  /** @type {boolean} for each method, extract all possible doubles from the code and store them in an array */
  dblsToArrays = true;

  /**
   * Initialize JObfuscator class
   *
   * @param {string|null} [apiKey=null] Activation key for the service (it can be empty for demo mode)
   */
  constructor(apiKey = null) {
    this.#apiKey = apiKey;
  }

  /**
   * Login to the service and get the information about the current license limits
   *
   * @param {boolean} [returnAsObject=true] Return result as an object or JSON encoded string
   * @returns {Promise<JObfuscatorResult|string|null>} An object with the results or null on error
   */
  async login(returnAsObject = true) {
    /** @type {Record<string, string>} */
    const params = { command: "login" };
    return this.#postRequest(params, returnAsObject);
  }

  /**
   * Obfuscate Java source code file using provided parameters
   *
   * @param {string} javaFilePath Java source code *.java file path
   * @param {boolean} [returnAsObject=true] Return result as an object or JSON encoded string
   * @returns {Promise<JObfuscatorResult|string|null>} An object with the results or null on error
   */
  async obfuscateJavaFile(javaFilePath, returnAsObject = true) {
    let source;
    try {
      source = await readFile(javaFilePath, "utf8");
    } catch {
      return null;
    }
    if (!source) return null;
    return this.obfuscateJavaSource(source, returnAsObject);
  }

  /**
   * Obfuscate Java source code (string) using provided parameters
   *
   * @param {string} javaSource Java source code
   * @param {boolean} [returnAsObject=true] Return result as an object or JSON encoded string
   * @returns {Promise<JObfuscatorResult|string|null>} An object with the results or null on error
   */
  async obfuscateJavaSource(javaSource, returnAsObject = true) {
    /** @type {Record<string, string>} */
    const params = {
      command: "obfuscate",
      source: javaSource,
    };
    return this.#postRequest(params, returnAsObject);
  }

  /**
   * Send a POST request to the server
   *
   * @param {Record<string, string>} paramsArray An object with the parameters
   * @param {boolean} returnAsObject Return result as an object or JSON encoded string
   * @returns {Promise<JObfuscatorResult|string|null>}
   */
  async #postRequest(paramsArray, returnAsObject) {
    const params = { ...paramsArray };

    //
    // add activation key to the parameters array
    //
    if (this.#apiKey) {
      params.key = this.#apiKey;
    }

    //
    // obfuscation strategies
    //
    if (this.mixCodeFlow) params.mix_code_flow = "1";
    if (this.renameVariables) params.rename_variables = "1";
    if (this.renameMethods) params.rename_methods = "1";
    if (this.shuffleMethods) params.shuffle_methods = "1";
    if (this.intsMathCrypt) params.ints_math_crypt = "1";
    if (this.cryptStrings) params.crypt_strings = "1";
    if (this.intsToArrays) params.ints_to_arrays = "1";
    if (this.dblsToArrays) params.dbls_to_arrays = "1";

    //
    // check if compression is enabled
    //
    if (this.enableCompression && params.source) {
      const compressed = deflateSync(Buffer.from(params.source, "utf8"), { level: 9 });
      params.source = compressed.toString("base64");
      params.compression = "1";
    }

    const formData = new FormData();
    for (const [k, v] of Object.entries(params)) {
      formData.append(k, v);
    }

    let responseText;
    try {
      const response = await fetch(JObfuscator.API_URL, {
        method: "POST",
        body: formData,
        headers: {
          "User-Agent": "PELock JObfuscator",
        },
      });
      responseText = await response.text();
    } catch {
      return null;
    }

    //
    // check the result
    //
    if (!responseText) return null;

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return null;
    }

    if (!result || typeof result !== "object") return null;

    //
    // depack output code back into the string
    //
    let depacked = false;

    if (this.enableCompression && result.error === JObfuscator.ERROR_SUCCESS && result.output) {
      try {
        const buf = Buffer.from(result.output, "base64");
        result.output = inflateSync(buf).toString("utf8");
        depacked = true;
      } catch {
        return null;
      }
    }

    if (returnAsObject) {
      return result;
    }

    //
    // if output was depacked - pack it again to JSON format
    //
    if (depacked) {
      return JSON.stringify(result);
    }

    //
    // return original JSON response code
    //
    return responseText;
  }
}
