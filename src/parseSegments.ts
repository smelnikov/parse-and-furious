const EOL = String.fromCharCode(0);

export function parseSegments(input: string): string[] {
  const segments: string[] = [];
  const p = createParser(input);
  do {
    segments.push(readSegment(p));
  } while (p.ch !== EOL);
  return segments;
}

function createParser(input: string) {
  const p = { input, position: 0, readPosition: 0, ch: EOL };
  readChar(p);
  return p;
}

type Parser = ReturnType<typeof createParser>;

function readChar(p: Parser) {
  p.position = p.readPosition++;
  p.ch = p.input[p.position] ?? EOL;
}

/** `p.ch` is "/" or "." */
function readSegment(p: Parser) {
  const separator = ['.', '/'].includes(p.ch);
  if (separator && p.position === 0) {
    expectError(p, "'$' or path segment");
  }
  if (separator) {
    readChar(p);
  }
  if (p.ch === EOL) {
    expectError(p, "'$' or path segment");
  }
  return p.ch === '$' //
    ? readDynamicSegment(p)
    : readStaticSegment(p);
}

/** p.ch === "$" */
export function readDynamicSegment(p: Parser) {
  readChar(p);
  if (p.ch === EOL) {
    return '*';
  }
  if (['.', '/'].includes(p.ch)) {
    expectError(p, 'dynamic segment name or splat');
  }
  return `:${readStaticSegment(p)}`;
}

/** `p.ch` is not  ".", "/" or EOL */
function readStaticSegment(p: Parser) {
  let value = '';
  while (!['.', '/', EOL].includes(p.ch)) {
    value += p.ch === '[' ? readEscapedChars(p) : p.ch;
    readChar(p);
  }
  return value;
}

/** `p.ch` is "[" */
function readEscapedChars(p: Parser) {
  readChar(p);
  const start = p.position;
  while (![']', '/', EOL].includes(p.ch)) {
    readChar(p);
  }
  if (p.ch === '/') {
    expectError(p, `anything except '/'`);
  }
  if (p.ch !== ']') {
    expectError(p, `']'`);
  }
  return p.input.slice(start, p.position);
}

function expectError(p: Parser, message: string): never {
  throw new Error(`Failed to parse segments
  '${p.input}'
   ${' '.repeat(p.position)}^ expected ${message}`);
}
