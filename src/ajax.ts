/**
 * Options for the ajax.
 */
export interface Options {
  responseType: "json" | "text";
  url: string;
  method: string;
  user: string;
  password: string;
  async: boolean;
  headers: { [key in string]: string };
  data: Document | BodyInit;
}

/**
 * Default options for the ajax.
 *
 * @private
 * @type {Object}
 */
const defaults: Partial<Options> = {
  responseType: "json",
};

/**
 * A function to perform ajax requests. It returns promise instead of relying on callbacks.
 *
 * @example
 * ATV.Ajax('http://api.mymovieapp.com/movies')
 *     .then((response) => // do something with the response)
 *     .catch((error) => // catch errors )
 *
 * @memberof module:ajax
 *
 * @param  {String} url                                 Resource url
 * @param  {Object} [options={responseType: 'json'}]    Options to apply for the ajax request
 * @param  {String} [method='GET']                      Type of HTTP request (defaults to GET)
 * @return {Promise}                                     The Promise that resolves on ajax success
 */
function ajax(
  url: string | Options,
  options?: Partial<Options>,
  method = "GET"
): Promise<XMLHttpRequest> {
  if (typeof options === "undefined" && typeof url === "object" && url.url) {
    const newUrl = url.url;
    options = url;
    url = newUrl;
  } else if (typeof url !== "string") {
    console.error("No url/options specified for the ajax.");
    return Promise.reject(
      new TypeError("Options must be an object for making the ajax request.")
    );
  }

  return new Promise((resolve, reject) => {
    // default options
    options = Object.assign({}, defaults, options);
    if (options.method) {
      method = options.method;
    }

    console.log(
      `initiating ajax request... url: ${url}`,
      " :: options:",
      options
    );

    const xhr = new XMLHttpRequest();

    // set response type
    if (options.responseType) {
      xhr.responseType = options.responseType;
    }
    // open connection
    xhr.open(
      method,
      url as string,
      typeof options.async === "undefined" ? true : options.async,
      options.user,
      options.password
    );
    // set headers
    Object.entries(options.headers ?? {}).forEach(function ([name, value]) {
      xhr.setRequestHeader(name, value);
    });
    // listen to the state change
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status >= 200 && xhr.status <= 300) {
        resolve(xhr);
      } else {
        reject(xhr);
      }
    };
    // error handling
    xhr.addEventListener("error", () => reject(xhr));
    xhr.addEventListener("abort", () => reject(xhr));
    // send request
    xhr.send(options.data);
  });
}

const methods = {
  /**
   * Perform an ajax request using HTTP GET
   *
   * @example
   * ATV.Ajax.get('http://api.mymovieapp.com/movies')
   *         .then((response) => // do something with the response)
   *         .catch((error) => // catch errors )
   *
   * @alias module:ajax.get
   *
   * @param  {string} url                         Resource url
   * @param  {Object} [options={@link defaults}]  Ajax options
   * @return {Promise}                            The Promise that resolves on ajax success
   */
  get(url: string, options: Partial<Options>) {
    return ajax(url, options, "GET");
  },
  /**
   * Perform an ajax request using HTTP POST
   *
   * @example
   * ATV.Ajax.post('http://api.mymovieapp.com/movies', {data})
   *         .then((response) => // do something with the response)
   *         .catch((error) => // catch errors )
   *
   * @alias module:ajax.post
   *
   * @param  {string} url                         Resource url
   * @param  {Object} [options={@link defaults}]  Ajax options
   * @return {Promise}                            The Promise that resolves on ajax success
   */
  post(url: string, options: Partial<Options>) {
    return ajax(url, options, "POST");
  },
  /**
   * Perform an ajax request using HTTP PUT
   *
   * @alias module:ajax.put
   *
   * @param  {string} url                         Resource url
   * @param  {Object} [options={@link defaults}]  Ajax options
   * @return {Promise}                            The Promise that resolves on ajax success
   */
  put(url: string, options: Partial<Options>) {
    return ajax(url, options, "PUT");
  },
  /**
   * Perform an ajax request using HTTP DELETE
   *
   * @alias module:ajax.del
   *
   * @param  {string} url                         Resource url
   * @param  {Object} [options={@link defaults}]  Ajax options
   * @return {Promise}                            The Promise that resolves on ajax success
   */
  del(url: string, options: Partial<Options>) {
    return ajax(url, options, "DELETE");
  },
};

Object.assign(ajax, methods);
/**
 * A very minimalistic AJAX implementation that returns promise instead of relying in callbacks.
 *
 * @module ajax
 *
 * @author eMAD <emad.alam@yahoo.com>
 *
 */
export default ajax as typeof ajax & typeof methods;
