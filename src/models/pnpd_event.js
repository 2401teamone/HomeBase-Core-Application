/**
 * A class that mounts the handler function passed to 'add' which is a function
 * That gets invoked when the specified event is emitted. An instance of
 * PinnipedEvent also controls when to emit the specified event.
 * @param {object NodeEmitter instance} emitter
 * @param {string} eventName
 * @param {string[] Table Names} tables
 */
export default class PinnipedEvent {
  constructor(emitter, eventName) {
    this.emitter = emitter;
    this.eventName = eventName;
    this.count = 0;
  }

  addListener = (handler, tables = []) => {
    this.emitter.on(this.eventName, async (responseData) => {
      // Check if the table name is in the list of tables to listen to
      if (
        (!tables.length || tables.includes(responseData.data.table.name)) &&
        !responseData.res.finished
      ) {
        // Invoke the handler function passed in via the add method in index.js
        await handler(responseData);
        this.count--;
        if (this.count === 0) {
          this.emitter.emit(`${this.eventName}End`);
        }
      } else {
        this.count--;
      }
    });
  };

  async triggerListeners(responseData) {
    this.count = this.emitter.listenerCount(this.eventName);
    this.emitter.emit(this.eventName, responseData);
  }
}
