import _ from "lodash";
import Parser from "./parser";
import Ajax from "./ajax";
import Handler, { Config as HandlerConfig } from "./handler";

/**
 * Created pages cache.
 *
 * @private
 * @type {Object}
 */
const pages = new Map<string, Page>();

type Page = (options: PageOptions) => Promise<Document | null>;
type Template = ((data: object) => string) | string;

export interface Options {
  style: string;
  template: Template;
  data: ((d: object) => object) | object;
  options: {
    responseType: "json" | "text";
  };
  ready?: Function;
  afterReady?: Function;
  url?: string;
  onError?: Function;
}

export interface PageOptions {
  replace?: boolean;
}

/**
 * Page level defaults that needs to be overridden.
 *
 * @private
 * @type {Object}
 */
const defaults: Options = {
  /**
   * Default styles (override with the required style)
   * @type {String}
   */
  style: "",
  /**
   * Template functin that takes data and returns the TVML template string.
   *
   * @param  {Object} data    The data associated with the template
   * @return {string}         The final TVML template string.
   */
  template(data: object) {
    console.warn("No template exists!");
    return "";
  },
  /**
   * Data transformation function that will be invoked before passing the data to the template function.
   *
   * @param  {Object} d   The data object
   * @return {Obect}      The transformed data
   */
  data(d: object) {
    return d;
  },
  /**
   * Default options that will be passed to the ajax options
   *
   * @type {Object}
   */
  options: {
    responseType: "json",
  },
};

/**
 * Sets the default options for the page.
 *
 * @inner
 * @alias module:page.setOptions
 *
 * @param {Object} cfg The configuration object {defaults}
 */
function setOptions(cfg = {}) {
  console.log("setting default page options...", cfg);
  // override the default options
  _.assign(defaults, cfg);
}

/**
 * Adds style to a document.
 *
 * @todo Check for existing style tag within the head of the provided document and append if exists
 *
 * @private
 *
 * @param  {String} style Style string
 * @param  {Document} doc   The document to add styles on
 */
function appendStyle(style: string, doc: Document) {
  if (!_.isString(style) || !doc) {
    console.log("invalid document or style string...", style, doc);
    return;
  }
  const docEl = doc.getElementsByTagName("document").item(0) as Element;
  const styleString = ["<style>", style, "</style>"].join("");
  let headTags = doc.getElementsByTagName("head");

  let headTag = headTags && headTags.item(0);
  if (!headTag) {
    headTag = doc.createElement("head");
    docEl.insertBefore(headTag, docEl.firstChild);
  }
  headTag.innerHTML = styleString;
}

/**
 * Prepares a document by adding styles and event handlers.
 *
 * @inner
 * @alias module:page.prepareDom
 *
 * @param  {Document} doc       The document to prepare
 * @return {Document}           The document passed
 */
function prepareDom(doc: Document, cfg: Partial<Options> & HandlerConfig = {}) {
  if (!(doc instanceof Document)) {
    console.warn("Cannnot prepare, the provided element is not a document.");
    return;
  }
  // apply defaults
  _.defaults(cfg, defaults);
  // append any default styles
  appendStyle(cfg.style as string, doc);
  // attach event handlers
  Handler.addAll(doc, cfg);

  return doc;
}

/**
 * A helper method that calls the data method to transform the data.
 * It then creates a dom from the provided template and the final data.
 *
 * @inner
 * @alias module:page.makeDom
 *
 * @param  {Object} cfg             Page configuration options
 * @param  {Object} response        The data object
 * @return {Document}               The newly created document
 */
function makeDom(cfg: Options & HandlerConfig, response: object = []) {
  // apply defaults
  _.defaults(cfg, defaults);
  // create Document
  const doc = Parser.dom(
    cfg.template,
    _.isFunction(cfg.data) ? cfg.data(response) : cfg.data
  );
  // prepare the Document
  prepareDom(doc, cfg);
  // call the after ready method if defined in the configuration
  if (_.isFunction(cfg.afterReady)) {
    console.log("calling afterReady method...");
    cfg.afterReady(doc);
  }
  // cache cfg at the document level
  Object.assign(doc, { page: cfg });

  return doc;
}

/**
 * Generated a page function which returns a promise after invocation.
 *
 * @private
 *
 * @param  {Object} cfg     The page configuration object
 * @return {Function}       A function that returns promise upon execution
 */
function makePage(cfg: Options & HandlerConfig): Page {
  return (options: PageOptions) => {
    _.defaultsDeep(cfg, defaults);

    console.log("making page... options:", cfg);

    // return a promise that resolves after completion of the ajax request
    // if no ready method or url configuration exist, the promise is resolved immediately and the resultant dom is returned
    return new Promise<Document | null>((resolve, reject) => {
      if (_.isFunction(cfg.ready)) {
        // if present, call the ready function
        console.log("calling page ready... options:", options);
        // resolves promise with a doc if there is a response param passed
        // if the response param is null/falsy value, resolve with null (usefull for catching and supressing any navigation later)
        cfg.ready(
          options,
          (response: Options & HandlerConfig) =>
            resolve(
              response || _.isUndefined(response)
                ? makeDom(cfg, response)
                : null
            ),
          reject
        );
      } else if (cfg.url) {
        // make ajax request if a url is provided
        Ajax.get(cfg.url, cfg.options).then(
          (xhr) => {
            resolve(makeDom(cfg, xhr.response));
          },
          (xhr) => {
            // if present, call the error handler
            if (_.isFunction(cfg.onError)) {
              cfg.onError(xhr.response, xhr);
            } else {
              reject(xhr);
            }
          }
        );
      } else {
        // no url/ready method provided, resolve the promise immediately
        resolve(makeDom(cfg));
      }
    });
  };
}

/**
 * A minimalistic page creation library for Apple TV applications
 *
 * @module page
 *
 * @author eMAD <emad.alam@yahoo.com>
 *
 */
export default {
  setOptions,
  /**
   * Create a page that can be later used for navigation.
   *
   * @example
   * const homepage = create({
   *     name: 'homepage',
   *     url: 'path/to/server/api/',
   *     template(data) {
   *         // return a string here (preferably TVML)
   *     },
   *     data(d) {
   *         // do your data transformations here and return the final data
   *         // the transformed data will be passed on to your template function
   *     },
   *     options: {
   *         // ajax options
   *     },
   *     events: {
   *         // event maps and handlers on the configuration object
   *         'scroll': function(e) { // do the magic here },
   *         'select': 'onTitleSelect'
   *     },
   *     onError(response, xhr) {
   *         // perform the error handing
   *     },
   *     ready(options, resolve, reject) {
   *         // call resolve with the data to render the provided template
   *
   *         // you may also call resolve with null/falsy value to suppress rendering,
   *         // this is useful when you want full control of the page rendering
   *
   *         // reject is not preferred, but you may still call it
   *
   *         // any configuration options passed while calling the page method,
   *         // will be carried over to ready method at runtime
   *     },
   *     afterReady(doc) {
   *         // all your code that relies on a document object should go here
   *     },
   *     onTitleSelect(e) {
   *         // do the magic here
   *     }
   * });
   * homepage(options) -> promise that resolves to a document
   *
   * //(or if using the navigation class)
   *
   * Navigation.navigate('homepage') -> promise that resolves on navigation
   *
   * @param  {String|Object} name     Name of the page or the configuration options
   * @param  {Object} cfg             Page configuration options
   * @return {Function}               A function that returns promise upon execution
   */
  create(name: string, cfg: { name: string }) {
    console.log("creating page... name:", name);

    if (_.isObject(name)) {
      cfg = name;
      name = cfg.name;
    }

    _.assign(cfg, { name });

    if (!name || !_.isString(name)) {
      console.warn(
        "Creating page without a name, name based navigation will not be possible."
      );
    }

    // warn in case the page already exists
    if (pages.has(name)) {
      console.warn(`The given page name ${name} already exists! Overriding...`);
    }
    // FIXME: Remove any
    const p = makePage(cfg as any);
    // cache for later user
    pages.set(name, p);
    // merge configurations on the page
    // FIXME: failed with merging read-only property.
    // _.assign(p, cfg);
    // return the created page to allow chaining
    return p;
  },
  /**
   * Returns the previously created page from the cache.
   *
   * @example
   * // create page
   * ATV.Page.create('homepage', { page configurations });
   * // later in the app
   * const homepage = ATV.Page.get('homepage');
   *
   * @param  {string} name    Name of the previously created page
   * @return {Page}           Page function
   */
  get(name: string) {
    return pages.get(name);
  },
  prepareDom,
  makeDom,
};
