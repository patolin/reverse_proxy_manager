import test from "node:test";
import assert from "node:assert/strict";
import { apiRequest } from "./api.js";
import { formatMessage, messageParts, messages } from "./messages.js";

test("named placeholders can be reordered without interpreting their values", () => {
  assert.equal(formatMessage("{second} then {first}", {
    first: "{second}",
    second: "two",
  }), "two then {second}");
  assert.equal(formatMessage(messages.deleteSiteHelp, { host: "example.test" }),
    "This will remove the route for example.test. This action cannot be undone.");
});

test("rich message placeholders retain their nodes and can be reordered", () => {
  const service = { type: "strong" };
  const network = { type: "code" };
  assert.deepEqual(messageParts("{network} before {service}", { service, network }),
    ["", network, " before ", service, ""]);
});

test("API errors retain server messages and use catalog fallbacks", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Server message" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    await assert.rejects(apiRequest("/test"), { message: "Server message", status: 400 });

    globalThis.fetch = async () => new Response("{}", {
      status: 503,
      headers: { "content-type": "application/json" },
    });
    await assert.rejects(apiRequest("/test"), { message: "Request failed with status 503", status: 503 });

    globalThis.fetch = async () => new Response("unexpected", { status: 500 });
    await assert.rejects(apiRequest("/test"), { message: messages.unexpectedResponse });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
