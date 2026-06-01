import assert from "node:assert/strict";
import {
  advanceReaderOnboarding,
  READER_ONBOARDING_STORAGE_KEY,
} from "./reader-onboarding";

assert.equal(
  READER_ONBOARDING_STORAGE_KEY,
  "novelang.readerOnboarding.v1"
);

assert.equal(
  advanceReaderOnboarding("sentence", "sentence-toggled"),
  "word"
);

assert.equal(advanceReaderOnboarding("word", "word-opened"), "ratio");

assert.equal(advanceReaderOnboarding("ratio", "ratio-changed"), "done");

assert.equal(
  advanceReaderOnboarding("sentence", "word-opened"),
  "sentence"
);
