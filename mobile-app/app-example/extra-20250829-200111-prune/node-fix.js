// Node.js 17 完全互換性修正
const os = require('os');

// os.availableParallelism修正
if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length;
}

// ReadableStream/WritableStream修正
if (!global.ReadableStream) {
  try {
    const streams = require('stream/web');
    global.ReadableStream = streams.ReadableStream;
    global.WritableStream = streams.WritableStream;
    global.TransformStream = streams.TransformStream;
  } catch (e) {
    // Node.js 17用のポリフィル
    const { Readable, Writable } = require('stream');
    global.ReadableStream = class ReadableStream {
      constructor() { return new Readable(); }
    };
    global.WritableStream = class WritableStream {
      constructor() { return new Writable(); }
    };
  }
}

// undici互換性修正
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'undici') {
    try {
      const undici = originalRequire.call(this, id);
      // undiciのstream.isReadable問題を修正
      if (undici.stream && typeof undici.stream.isReadable !== 'function') {
        undici.stream.isReadable = function(stream) {
          return stream && typeof stream.readable === 'boolean' ? stream.readable : false;
        };
      }
      return undici;
    } catch (e) {
      return originalRequire.call(this, id);
    }
  }
  return originalRequire.call(this, id);
};

// Blob API修正（Node.js 17用）
if (!global.Blob) {
  try {
    const { Blob } = require('buffer');
    global.Blob = Blob;
  } catch (e) {
    // Blob polyfill for Node.js 17
    global.Blob = class Blob {
      constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || '';
        this.size = parts.reduce((total, part) => total + (part.length || 0), 0);
      }
      
      text() {
        return Promise.resolve(this.parts.join(''));
      }
      
      arrayBuffer() {
        return Promise.resolve(Buffer.concat(this.parts.map(p => Buffer.from(p))));
      }
    };
  }
}

// Event修正
if (!global.Event) {
  global.Event = class Event {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
      this.cancelable = Boolean(options.cancelable);
    }
  };
}

// AbortSignal修正（Node.js v17対応）
if (!global.AbortSignal) {
  const EventTarget = require('events');
  
  global.AbortSignal = class AbortSignal extends EventTarget {
    constructor() {
      super();
      this.aborted = false;
      this.reason = undefined;
      this.onabort = null;
    }
    
    throwIfAborted() {
      if (this.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        error.code = 20;
        throw error;
      }
    }
    
    static abort(reason) {
      const signal = new AbortSignal();
      signal.aborted = true;
      signal.reason = reason || new Error('AbortError');
      return signal;
    }
    
    static timeout(delay) {
      const signal = new AbortSignal();
      setTimeout(() => {
        signal.aborted = true;
        signal.reason = new Error('TimeoutError');
      }, delay);
      return signal;
    }
  };
} else {
  // 既存のAbortSignalに throwIfAborted が無い場合は追加
  if (typeof global.AbortSignal.prototype.throwIfAborted !== 'function') {
    global.AbortSignal.prototype.throwIfAborted = function() {
      if (this.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        error.code = 20;
        throw error;
      }
    };
  }
}

// AbortController修正
if (!global.AbortController) {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = new AbortSignal();
    }
    
    abort(reason) {
      if (!this.signal.aborted) {
        this.signal.aborted = true;
        this.signal.reason = reason || new Error('AbortError');
        this.signal.dispatchEvent(new Event('abort'));
        if (this.signal.onabort) {
          this.signal.onabort();
        }
      }
    }
  };
}

// fetch API修正
if (!global.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    global.fetch = fetch;
    global.Headers = Headers;
    global.Request = Request;
    global.Response = Response;
  } catch (e) {
    console.warn('Fetch API not available');
  }
}