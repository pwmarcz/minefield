
/* eslint no-console: 0 */

export class Socket {
  constructor() {
    this.queue = [];
    this.handlers = {};
  }

  connect(url) {
    console.log('connecting to ' + url);
    this.ws = new WebSocket(url);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onclose = this.onClose.bind(this);
  }

  onMessage(message) {
    let msg = JSON.parse(message.data);
    this.handle(msg);
  }

  onOpen() {
    this.queue.forEach(messageData => this.ws.send(messageData));
    this.queue = [];
    this.handle({ type: 'connect'});
  }

  onClose() {
    this.handle({ type: 'disconnect'});
  }

  on(type, handler) {
    this.handlers[type] = this.handlers[type] || [];
    this.handlers[type].push(handler);
  }

  emit(msg) {
    let messageData = JSON.stringify(msg);

    if (!this.ws || this.ws.readyState === WebSocket.CONNECTING) {
      this.queue.push(messageData);
    } else if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(messageData);
    } else {
      // drop message
    }
  }

  handle(msg) {
    if (this.handlers[msg.type]) {
      this.handlers[msg.type].forEach(handler => handler(msg.type, msg));
    }
  }
}
