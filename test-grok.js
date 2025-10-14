// Test Grok provider directly
import { checkWithGrok } from "./src/lib/providers/grok.ts";

const input = {
  keyword: "dating app",
  domain: "tinder.com",
  country: "DE",
  language: "en",
};

console.log("Testing Grok provider...");
console.log("Input:", input);

checkWithGrok(input)
  .then((result) => {
    console.log("\n✓ Success!");
    console.log("Result:", JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.log("\n✗ Error:");
    console.log(error.message);
    console.log(error.stack);
  });
