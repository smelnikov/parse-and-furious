const EOL = String.fromCharCode(0);

export function parseSegments(input: string): string[] {
  const segments: string[] = [];

  const p = createParser(input);

  while (p.ch !== EOL) {
    if (p.position === 0 && p.ch === "." && peekChar(p) === "/") {
      readChar(p);
    }

    if (p.ch === "/" || p.ch === ".") {
      readChar(p);
    } else if (p.position !== 0) {
      throw new Error();
    }

    const segment = readSegment(p);

    if (peekChar(p) === EOL && (segment === "ts" || segment === "tsx")) {
      break;
    }

    segments.push(segment);
  }

  return segments;
}

function createParser(input: string) {
  const p = {
    input,
    position: 0,
    readPosition: 0,
    ch: EOL,
  };

  readChar(p);

  return p;
}

type Parser = ReturnType<typeof createParser>;

function readChar(p: Parser) {
  if (p.readPosition >= p.input.length) {
    p.ch = EOL;
  } else {
    p.ch = p.input[p.readPosition];
  }
  p.position = p.readPosition;
  p.readPosition++;
}

function peekChar(p: Parser) {
  if (p.readPosition >= p.input.length) {
    return EOL;
  } else {
    return p.input[p.readPosition];
  }
}

/** `p.ch` is not "/" or "." */
function readSegment(p: Parser) {
  if (p.ch === "$") {
    return readDynamicSegment(p);
  }

  return readStaticSegment(p);
}

/** p.ch === "$" */
export function readDynamicSegment(p: Parser) {
  readChar(p);
  if (p.ch === "." || p.ch === EOL) {
    return "*";
  } else {
    return ":" + readStaticSegment(p);
  }
}

/** `p.ch` is not  ".", "/" or "$" */
export function readStaticSegment(p: Parser) {
  let value = "";

  while (![EOL, ".", "/"].includes(p.ch)) {
    if (p.ch === "[") {
      value += readEscapedChars(p);
    } else {
      value += p.ch;
    }

    readChar(p);
  }

  return value;
}

/** `p.ch` is "[" */
export function readEscapedChars(p: Parser) {
  readChar(p);
  const start = p.position;

  while (![EOL, "]"].includes(p.ch)) {
    readChar(p);
  }

  return p.input.slice(start, p.position);
}
