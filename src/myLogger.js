
class MyLogger {
  constructor() {
    this.logs = "";
  }

  log(message) {
    this.logs += `\n${message}`;
    Logger.log(message);
  }

  getLogs() {
    return this.logs;
  }
}
