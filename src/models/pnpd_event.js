/**
 * A class that mounts the handler function passed to 'add' which is a function
 * That gets invoked when the specified event is emitted. An instance of
 * PinnipedEvent also controls when to emit the specified event.
 * @param {object NodeEmitter instance} emitter
 * @param {string} eventName
 * @param {string[] Table Names} tables
 */
export default class PinnipedEvent {
  constructor(emitter, eventName, tables = []) {
    this.emitter = emitter;
    this.eventName = eventName;
    this.tables = tables;
    this.eventRegisteredCount = 0;
  }

  add = (handler) => {
    // Increment the eventRegisteredCount to keep track of the number of events
    this.eventRegisteredCount++;

    // Register the event handler
    this.emitter.on(this.eventName, async (responseData) => {
      // Check if the table name is in the list of tables to listen to
      if (
        (!this.tables.length ||
          this.tables.includes(responseData.data.table.name)) &&
        !responseData.res.finished
      ) {
        // Invoke the handler function passed in via the add method in index.js
        await handler(responseData);

        /* 
          If the eventRegisteredCount is 1, emit the event with the _END suffix
          to indicate that all listeners for this event have been executed
         */
        if (this.eventRegisteredCount === 1) {
          this.emitter.trigger(`${this.eventName}_END`);
        }
      }

      // After callback runs decrement the count of remaining listeners
      this.eventRegisteredCount--;
    });
  };

  trigger(responseData) {
    this.emitter.emit(this.eventName, responseData);
  }
}
