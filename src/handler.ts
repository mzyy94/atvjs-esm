import _ from "lodash";

import Navigation from "./navigation";
import Menu from "./menu";

// element level attribute that will be used for link to another pages
const hrefAttribute = "data-href-page";
const hrefOptionsAttribute = "data-href-page-options";
const hrefPageReplaceAttribute = "data-href-page-replace";
const modalCloseBtnAttribute = "data-alert-dissmiss";
const menuItemReloadAttribute = "reloadOnSelect";

export type Config = {
  events?: { [key in string]: (string | Function)[] | Function };
} & { [key: string]: Function };

/**
 * Page level default handlers.
 *
 * @private
 * @type {Object<Object<Function>>}
 */
const handlers = {
  /**
   * All the handlers associated to the select event.
   * @type {Object}
   */
  select: {
    /**
     * A handler to allow declaring anchors to other pages in the TVML templates.
     *
     * @example <caption>A typical usage would be something like:</caption>
     *     <TVML TEMPLATE>
     *         ...
     *
     *         <lockup data-href-page="details" data-href-page-options="{id: 'MOVIE_ID'}">
     *             ...
     *         </lockup>
     *
     *         ...
     *     </END TEMPLATE>
     *     which will navigate to the details page with the provided options object
     *
     * @private
     * @param  {Event} e    The event passed while this handler is invoked.
     */
    onLinkClick(e: Event) {
      const element = e.target as Element;
      const page = element.getAttribute(hrefAttribute);
      const replace = element.getAttribute(hrefPageReplaceAttribute) == "true";

      if (!page) return;

      let attr = element.getAttribute(hrefOptionsAttribute);
      attr = attr || "{}";
      let options = {};

      // try to make the options object
      try {
        options = JSON.parse(attr);
      } catch (ex) {
        console.warn(
          `Invalid value for the page options (${hrefOptionsAttribute}=${attr}) in the template.`
        );
        options = {};
      }

      Navigation.navigate(page, options, replace); // perform navigation
    },
    /**
     * A handler that will allow declaring modal dismiss button in the TVML alert templates.
     *
     * @example <caption>A typical usage would be something like:</caption>
     *
     *          <TVML ALERT TEMPLATE>
     *
     *              ...
     *
     *              <button data-alert-dissmiss="close">
     *                  <text>Cancel</text>
     *              </button>
     *
     *              ...
     *
     *          </END TEMPLATE>
     *
     * @private
     * @param  {Event} e    The event passed while this handler was invoked
     */
    onModalCloseBtnClick(e: Event) {
      const element = e.target as Element;
      const closeBtn = element.getAttribute(modalCloseBtnAttribute);

      if (closeBtn) {
        console.log(
          "close button clicked within the modal, dismissing modal..."
        );
        Navigation.dismissModal();
      }
    },
    /**
     * Handler for menu navigation
     *
     * @private
     * @param  {Event} e    The event passed while this handler was invoked
     */
    onMenuItemSelect(e: Event) {
      const element = e.target as MenuItem;
      const menuId = element.getAttribute("id") as string;
      const elementType = element.nodeName.toLowerCase();
      const page = element.page;

      if (elementType === "menuitem") {
        // no need to proceed if the page is already loaded or there is no page definition present
        if (
          (!element.pageDoc || element.getAttribute(menuItemReloadAttribute)) &&
          page
        ) {
          // set a loading message intially to the menuitem
          Menu.setDocument(
            Navigation.getLoaderDoc(Menu.getLoadingMessage()),
            menuId
          );
          // load the page
          page().then(
            (doc) => {
              // if there is a document loaded, assign it to the menuitem
              if (doc) {
                // assign the pageDoc to disable reload everytime
                element.pageDoc = doc;
                Menu.setDocument(doc, menuId);
              }
              // dissmiss any open modals
              Navigation.dismissModal();
            },
            (error) => {
              // if there was an error loading the page, set an error page to the menu item
              Menu.setDocument(Navigation.getErrorDoc(error), menuId);
              // dissmiss any open modals
              Navigation.dismissModal();
            }
          );
        }
      }
    },
  },
};

/**
 * Sets the default handlers options
 *
 * @inner
 * @alias module:handler.setOptions
 *
 * @param {Object} cfg The configuration object {defaults}
 */
function setOptions(cfg: Partial<{ handlers: typeof handlers }> = {}) {
  console.log("setting handler options...", cfg);
  // override the default options
  _.defaultsDeep(handlers, cfg.handlers);
}

/**
 * Iterates over the events configuration and add event listeners to the document.
 *
 * @example
 * {
 *     events: {
 *         'scroll': function(e) { // do the magic here },
 *         'select listItemLockup title': 'onTitleSelect',
 *         'someOtherEvent': ['onTitleSelect', function(e) { // some other magic }, ...]
 *     },
 *     onTitleSelect: function(e) {
 *         // do the magic here
 *     }
 * }
 *
 * @todo Implement querySelectorAll polyfill (it doesn't seem to exist on the xml document)
 *
 * @private
 *
 * @param {Document} doc            The document to add the listeners on.
 * @param {Object} cfg              The page object configuration.
 * @param {Boolean} [add=true]      Whether to add or remove listeners. Defaults to true (add)
 */
function setListeners(doc: Document, cfg: Config = {}, add = true) {
  if (!doc || !(doc instanceof Document)) {
    return;
  }

  let listenerFn = doc.addEventListener;
  if (!add) {
    listenerFn = doc.removeEventListener;
  }
  if (_.isObject(cfg.events)) {
    const events = cfg.events;

    _.each(events, (fns, e) => {
      let [ev, selector] = e.split(" ");
      let elements: ArrayLike<Element | Document> | Error = [];
      if (!_.isArray(fns)) {
        // support list of event handlers
        fns = [fns];
      }
      if (selector) {
        selector = e.substring(e.indexOf(" ") + 1); // everything after space
        elements = _.attempt(() => doc.querySelectorAll(selector)); // catch any errors while document selection
      } else {
        elements = [doc];
      }
      elements = _.isError(elements) ? [] : elements;
      _.each(fns, (fn) => {
        fn = _.isString(fn) ? cfg[fn] : fn; // assume the function to be present on the page configuration obeject
        if (_.isFunction(fn)) {
          const f = fn;
          console.log(
            (add ? "adding" : "removing") + " event on documents...",
            ev,
            elements
          );
          _.each(elements, (el) =>
            listenerFn.call(el, ev, (e) => f.call(cfg, e))
          ); // bind to the original configuration object
        }
      });
    });
  }
}

/**
 * Iterates over the events configuration and add event listeners to the document.
 *
 * @example
 * ATV.Handler.addListeners(tvmlDoc,
 * {
 *     events: {
 *         'scroll': function(e) { // do the magic here },
 *         'select listItemLockup title': 'onTitleSelect',
 *         'someOtherEvent': ['onTitleSelect', function(e) { // some other magic }, ...]
 *     },
 *     onTitleSelect: function(e) {
 *         // do the magic here
 *     }
 * });
 *
 * @todo Implement querySelectorAll polyfill (it doesn't seem to exist on the xml document)
 *
 * @inner
 * @alias module:handler.addListeners
 *
 * @param {Document} doc            The document to add the listeners on.
 * @param {Object} cfg              The page object configuration.
 */
function addListeners(doc: Document, cfg: Config) {
  setListeners(doc, cfg, true);
}

/**
 * Iterates over the events configuration and remove event listeners from document.
 *
 * ATV.Handler.removeListeners(tvmlDoc,
 * {
 *     events: {
 *         'scroll': function(e) { // do the magic here },
 *         'select listItemLockup title': 'onTitleSelect',
 *         'someOtherEvent': ['onTitleSelect', function(e) { // some other magic }, ...]
 *     },
 *     onTitleSelect: function(e) {
 *         // do the magic here
 *     }
 * });
 *
 * @todo Implement querySelectorAll polyfill (it doesn't seem to exist on the xml document)
 *
 * @inner
 * @alias module:handler.removeListeners
 *
 * @param {Document} doc            The document to add the listeners on.
 * @param {Object} cfg              The page object configuration.
 */
function removeListeners(doc: Document, cfg: Config) {
  setListeners(doc, cfg, false);
}

/**
 * Iterates over the list of page level default handlers and set/unset listeners on the provided document.
 *
 * @private
 *
 * @param {Document} doc            The document to set/unset listeners on.
 * @param {Boolean} [add=true]      Whether to add or remove listeners. Defaults to true (add)
 */
function setDefaultHandlers(doc: Document, add = true) {
  if (!doc || !(doc instanceof Document)) {
    return;
  }

  let listenerFn = doc.addEventListener;
  if (!add) {
    listenerFn = doc.removeEventListener;
  }

  // iterate over all the handlers and add it as an event listener on the doc
  _.each(handlers, (handler, name) => {
    _.each(handler, (callback) => {
      listenerFn.call(doc, name, callback);
    });
  });
}

/**
 * Syntactical sugar to {setDefaultHandlers} with add=true
 *
 * @private
 *
 * @param {Document} doc        The document to add the listeners on.
 */
function addDefaultHandlers(doc: Document) {
  setDefaultHandlers(doc, true);
}

/**
 * Syntactical sugar to {setDefaultHandlers} with add=false
 *
 * @private
 *
 * @param {Document} doc        The document to add the listeners on.
 */
function removeDefaultHandlers(doc: Document) {
  setDefaultHandlers(doc, false);
}

/**
 * Sets/unsets the event handlers as per the event configuration.
 * Also adds/removes the [default page level handlers]{@link handlers}.
 *
 * @private
 *
 * @param {Document}  doc           The page document.
 * @param {Obejct}  cfg             Page configuration object
 * @param {Boolean} [add=true]      Whether to add or remove the handlers
 */
function setHandlers(doc: Document, cfg: Config, add = true) {
  if (add) {
    addDefaultHandlers(doc);
    addListeners(doc, cfg);
  } else {
    removeDefaultHandlers(doc);
    removeListeners(doc, cfg);
  }
}

/**
 * Sets the event handlers as per the event configuration.
 * Also adds the [default page level handlers]{@link handlers}.
 *
 * @inner
 * @alias module:handler.addAll
 *
 * @param {Document}  doc           The page document.
 * @param {Obejct}  cfg             Page configuration object
 */
function addHandlers(doc: Document, cfg: Config) {
  setHandlers(doc, cfg, true);
}

/**
 * Unset the event handlers as per the event configuration.
 * Also removes the [default page level handlers]{@link handlers}.
 *
 * @inner
 * @alias module:handler.removeAll
 *
 * @param {Document}  doc           The page document.
 * @param {Obejct}  cfg             Page configuration object
 */
function removeHandlers(doc: Document, cfg: Config) {
  setHandlers(doc, cfg, false);
}

/**
 * A minimalistic Event handling library for Apple TV applications
 *
 * @module handler
 *
 * @author eMAD <emad.alam@yahoo.com>
 *
 */
export default {
  setOptions: setOptions,
  addListeners: addListeners,
  removeListeners: removeListeners,
  addAll: addHandlers,
  removeAll: removeHandlers,
};
