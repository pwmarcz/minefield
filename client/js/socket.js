
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
    let { type, args } = JSON.parse(message.data);
    this.handle(type, ...args);
  }

  onOpen() {
    this.queue.forEach(messageData => this.ws.send(messageData));
    this.queue = [];
    this.handle('connect');
  }

  onClose() {
    this.handle('disconnect');
  }

  on(type, handler) {
    this.handlers[type] = this.handlers[type] || [];
    this.handlers[type].push(handler);
  }

  emit(type, ...args) {
    let messageData = JSON.stringify({ type, args });

    if (!this.ws || this.ws.readyState === WebSocket.CONNECTING) {
      this.queue.push(messageData);
    } else if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(messageData);
    } else {
      // drop message
    }
  }

  handle(type, ...args) {
    if (this.handlers[type]) {
      this.handlers[type].forEach(handler => handler(...args));
    }
  }
}
