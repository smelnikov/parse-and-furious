import type { Arbitrary } from 'fast-check';
import {
  assert,
  letrec,
  oneof,
  property,
  record,
  string,
  stringMatching,
} from 'fast-check';
import { expect, test } from 'vitest';

import { parseSegments } from './parseSegments.ts';

interface SegmentNode {
  left: SegmentTreeValue;
  separator: string;
  right: SegmentTreeValue;
}

type SegmentTreeValue = string | SegmentNode;

interface Visitors {
  segment?: (leaf: string) => void;
  separator?: (separator: string) => void;
}

class SegmentTree {
  readonly #value;

  constructor(value: SegmentTreeValue) {
    this.#value = value;
  }

  toInput(toInput = (s: string) => s) {
    const input: string[] = [];

    this.visit({
      segment: s => {
        input.push(toInput(s));
      },
      separator: s => {
        input.push(s);
      },
    });

    return input.join('');
  }

  toSegments() {
    const segments: string[] = [];

    this.visit({
      segment: s => {
        segments.push(s);
      },
    });

    return segments;
  }

  visit(visitors: Visitors) {
    function visit(value: SegmentTreeValue) {
      if (typeof value === 'string') {
        visitors.segment?.(value);
      } else {
        visit(value.left);
        visitors.separator?.(value.separator);
        visit(value.right);
      }
    }

    visit(this.#value);
  }
}

function segmentTree(segment: Arbitrary<string>) {
  const { tree } = letrec<{
    segment: string;
    node: SegmentNode;
    tree: SegmentTreeValue;
  }>(tie => ({
    segment,
    node: record({
      left: tie('tree'),
      separator: stringMatching(/^[./]$/),
      right: tie('tree'),
    }),
    tree: oneof(
      { depthSize: 'small', withCrossShrink: true },
      tie('segment'),
      tie('node'),
    ),
  }));

  return tree.map(value => new SegmentTree(value));
}

test('static segments', () => {
  assert(
    property(segmentTree(stringMatching(/^[^./[$][^./[]*$/)), tree => {
      const input = tree.toInput(segment => segment);
      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('dynamic segments', () => {
  assert(
    property(segmentTree(stringMatching(/^:[^./[]+$/)), tree => {
      const input = tree.toInput(segment => segment.replace(/^:/, '$'));
      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('mixed static and dynamic segments', () => {
  assert(
    property(
      segmentTree(
        oneof(
          stringMatching(/^[^./[$:][^./[]*$/),
          stringMatching(/^:[^./[]+$/),
        ),
      ),
      tree => {
        const input = tree.toInput(segment => segment.replace(/^:/, '$'));
        const segments = tree.toSegments();

        expect(parseSegments(input)).toStrictEqual(segments);
      },
    ),
  );
});

test('splats', () => {
  expect(parseSegments('$')).toStrictEqual(['*']);

  assert(
    property(
      segmentTree(
        oneof(
          stringMatching(/^[^./[$:][^./[]*$/),
          stringMatching(/^:[^./[]+$/),
        ),
      ),
      stringMatching(/^[./]$/),
      (tree, sep) => {
        const input = [
          tree.toInput(segment => segment.replace(/^:/, '$')),
          sep,
          '$',
        ].join('');

        const segments = [...tree.toSegments(), '*'];

        expect(parseSegments(input)).toStrictEqual(segments);
      },
    ),
  );
});

test('escaping in static segments', () => {
  assert(
    property(segmentTree(string({ minLength: 1 })), tree => {
      const input = tree.toInput(segment =>
        segment.replace(/^[./[$]+|[./[]+/g, '[$&]'),
      );

      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('escaping in dynamic segments', () => {
  assert(
    property(segmentTree(string({ minLength: 1 }).map(s => `:${s}`)), tree => {
      const input = tree.toInput(segment =>
        segment.replace(/^:/, '$').replace(/([./[]+)/g, '[$1]'),
      );

      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('escaping the whole static segment', () => {
  assert(
    property(segmentTree(stringMatching(/^[^[\]]+$/)), tree => {
      const input = tree.toInput(segment => `[${segment}]`);
      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('escaping the whole dynamic segments', () => {
  assert(
    property(segmentTree(stringMatching(/^:[^[\]]+$/)), tree => {
      const input = tree.toInput(segment =>
        segment.replace(/^:(.+)$/, '$[$1]'),
      );

      const segments = tree.toSegments();

      expect(parseSegments(input)).toStrictEqual(segments);
    }),
  );
});

test('failures with no segments at all', () => {
  expect(() => parseSegments('')).toThrow(
    `Failed to parse segments
  ''
   ^ expected '$' or path segment`,
  );
});

test('failure when splat is not at the end', () => {
  expect(() => parseSegments('$.invalid')).toThrowErrorMatchingInlineSnapshot(
    `
    [Error: Failed to parse segments
      '$.invalid'
        ^ expected dynamic segment name or splat]
  `,
  );

  expect(() => parseSegments('$/invalid')).toThrowErrorMatchingInlineSnapshot(
    `
    [Error: Failed to parse segments
      '$/invalid'
        ^ expected dynamic segment name or splat]
  `,
  );
});

test('failure when escape sequence is not closed', () => {
  expect(() => parseSegments('u[sers')).toThrowErrorMatchingInlineSnapshot(
    `
    [Error: Failed to parse segments
      'u[sers'
             ^ expected ']']
  `,
  );

  expect(() => parseSegments('u[.s.ers')).toThrowErrorMatchingInlineSnapshot(
    `
    [Error: Failed to parse segments
      'u[.s.ers'
               ^ expected ']']
  `,
  );
});

test('failure when missing an initial segment', () => {
  assert(
    property(
      stringMatching(/^[./]$/),
      segmentTree(
        oneof(
          stringMatching(/^[^./[$:][^./[]*$/),
          stringMatching(/^:[^./[]+$/),
        ),
      ),
      (sep, tree) => {
        const input = [
          sep,
          tree.toInput(segment => segment.replace(/^:/, '$')),
        ].join('');

        expect(() => parseSegments(input)).toThrow(
          `Failed to parse segments
  '${input}'
   ^ expected '$' or path segment`,
        );
      },
    ),
  );
});

test('failure when missing a final segment', () => {
  assert(
    property(
      segmentTree(
        oneof(
          stringMatching(/^[^./[$:][^./[]*$/),
          stringMatching(/^:[^./[]+$/),
        ),
      ),
      stringMatching(/^[./]$/),
      (tree, sep) => {
        const input = [
          tree.toInput(segment => segment.replace(/^:/, '$')),
          sep,
        ].join('');

        expect(() => parseSegments(input)).toThrow(
          `Failed to parse segments
  '${input}'
   ${' '.repeat(input.length)}^ expected '$' or path segment`,
        );
      },
    ),
  );
});
