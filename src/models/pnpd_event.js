class PinnipedEvent {
  /**
   * @param {object} emitter - NodeEmitter instance
   * @param {string} eventName
   * @param {string[]} tables - table names
   */
  constructor(emitter, eventName, tables = []) {
    this.emitter = emitter;
    this.eventName = eventName;
    this.tables = tables;
  }

  /**
   * @method
   * @param {function} handler - callback to run when event fires
   */

  add = (handler) => {
    this.emitter.on(this.eventName, (responseData) => {
      if (
        (!this.tables.length ||
          this.tables.includes(responseData.data.table.name)) &&
        !responseData.res.finished
      ) {
        handler(responseData);
      }
    });
  };

  /**
   *
   * @param {object} responseData - passed to add callback
   * @param {object} responseData.req - Express req
   * @param {object} responseData.res - Express res
   * @param {object} responseData.data - Relevant data for the event - crud operations will have the tables the event is fired on
   */
  trigger(responseData) {
    this.emitter.emit(this.eventName, responseData);
  }
}

export default PinnipedEvent;
