export default class ResponseData {
  constructor(req, res, data = {}) {
    this.req = req;
    this.res = res;
    this.data = data;
  }

  /**
   * Check if the response has been sent
   * @returns {boolean}
   */
  responseSent() {
    return this.res.finished;
  }

  formatGeneralResponse() {
    return { data: this.data };
  }

  formatAllResponse() {
    return {
      ...this.data,
      table: {
        id: this.data.table.id,
        name: this.data.table.name,
      },
      rows: this.data.rows,
    };
  }

  formatOneResponse() {
    return {
      ...this.data,
      table: {
        id: this.data.table.id,
        name: this.data.table.name,
      },
      row: this.data.rows[0],
    };
  }
}
