import { expect, test } from "vitest";

import { parseSegments } from "./parseSegments";

test("parseSegments", () => {
  expect(parseSegments("./_index.tsx")).toStrictEqual(["_index"]);
  expect(parseSegments("./created.tsx")).toStrictEqual(["created"]);

  expect(parseSegments("./template/$templateId.tsx")).toStrictEqual([
    "template",
    ":templateId",
  ]);

  expect(parseSegments("./template.$templateId.tsx")).toStrictEqual([
    "template",
    ":templateId",
  ]);

  expect(parseSegments("./$.tsx")).toStrictEqual(["*"]);
  expect(parseSegments("./created/$.tsx")).toStrictEqual(["created", "*"]);
  expect(parseSegments("./created.$.tsx")).toStrictEqual(["created", "*"]);
  expect(parseSegments("./manifest[.]json.tsx")).toStrictEqual([
    "manifest.json",
  ]);

  expect(parseSegments("./mani[$][.]fest[.]json.tsx")).toStrictEqual([
    "mani$.fest.json",
  ]);

  expect(parseSegments("./template/manifest[.]json.tsx")).toStrictEqual([
    "template",
    "manifest.json",
  ]);

  expect(parseSegments("./template.manifest[.]json.tsx")).toStrictEqual([
    "template",
    "manifest.json",
  ]);
});
