
class MyLogger {
  constructor() {
    this.logs = "";
  }

  log(message) {
    this.logs += `\n${message}`;
  }

  getLogs() {
    return this.logs;
  }
}
