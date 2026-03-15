import test from 'node:test';
import assert from 'node:assert/strict';

import { createCoreLogger } from '../renderer/core/logger.js';
import { createConsoleLogSink, createDomLogSink, createMemoryLogSink } from '../renderer/core/loggerSinks.js';

test('logger core respects level filtering and can run without DOM', () => {
  const memorySink = createMemoryLogSink();
  const logger = createCoreLogger({ sinks: [memorySink] });

  logger.debug('test', 'debug message');
  logger.info('test', 'info message');

  const entries = memorySink.getEntries();
  assert.equal(entries.some((entry) => entry.message === 'info message'), true);
  assert.equal(entries.some((entry) => entry.message === 'debug message'), false);
});

test('logger DOM sink renders entries and clear resets output', () => {
  const output = {
    children: [],
    scrollHeight: 100,
    appendChild(node) {
      this.children.push(node);
    },
    scrollTo() {},
    set innerHTML(value) {
      this._innerHTML = value;
      this.children = [];
    }
  };

  const originalDocument = global.document;
  global.document = {
    createElement(tagName) {
      return {
        tagName,
        className: '',
        textContent: '',
        children: [],
        appendChild(child) {
          this.children.push(child);
        }
      };
    }
  };

  try {
    const domSink = createDomLogSink({ output });
    const logger = createCoreLogger({ sinks: [domSink] });

    logger.info('tree', 'rendered', { a: 1 });
    assert.equal(output.children.length, 1);

    logger.clear();
    assert.equal(output.children.length, 0);
  } finally {
    global.document = originalDocument;
  }
});

test('logger console sink mirrors output when enabled', () => {
  const calls = [];
  const originalConsoleLog = console.log;

  console.log = (...args) => {
    calls.push(args.join(' '));
  };

  try {
    const logger = createCoreLogger({ sinks: [createConsoleLogSink({ mirrorToConsole: true })] });
    logger.info('project', 'saved');
    assert.equal(calls.some((line) => line.includes('saved')), true);
  } finally {
    console.log = originalConsoleLog;
  }
});
