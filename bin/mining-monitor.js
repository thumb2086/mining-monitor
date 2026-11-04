#!/usr/bin/env node
"use strict";

const { main } = require("../src/index.js");

main(process.argv.slice(2)).catch((err) => {
  console.error("mining-monitor error:", err && err.message ? err.message : err);
  process.exit(1);
});