import ResponseData from "../../models/response_data.js";

/**
 * Custom route event middleware that triggers before custom routes are
 * hit
 * @memberof PinnipedEventTypes.
 * @param {Object} app - The Pinniped app instance
 * @returns {Function} - The middleware function
 */
export default function customRouteEvent(app) {
  return (req, res, next) => {
    app.onCustomRoute().trigger(new ResponseData(req, res));
    next();
  };
}
