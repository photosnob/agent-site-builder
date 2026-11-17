import { test } from "node:test";
import assert from "node:assert/strict";
import { apexOf, domainPair, isReservedDomain, normalizeDomain, recordsFor } from "../lib/domains";

test("normalizes what agents type", () => {
  assert.equal(normalizeDomain("HTTPS://WWW.JaneDoe.com/about?x=1"), "www.janedoe.com");
  assert.equal(normalizeDomain("janedoe.com."), "janedoe.com");
  assert.equal(normalizeDomain("homes.jane-doe.realtor"), "homes.jane-doe.realtor");
  for (const bad of ["janedoe", "jane doe.com", "1.2.3.4", "-x.com", "x..com", ""]) assert.equal(normalizeDomain(bad), null, bad);
});

test("pairs apex and www, leaves other subdomains alone", () => {
  assert.deepEqual(domainPair("janedoe.com"), { primary: "janedoe.com", alias: "www.janedoe.com" });
  assert.deepEqual(domainPair("www.janedoe.com"), { primary: "www.janedoe.com", alias: "janedoe.com" });
  assert.deepEqual(domainPair("homes.janedoe.com"), { primary: "homes.janedoe.com", alias: null });
  assert.equal(apexOf("www.jane.co.uk"), "jane.co.uk");
});

test("builds the DNS records to show", () => {
  assert.deepEqual(recordsFor("janedoe.com", "www.janedoe.com", "76.76.21.21", "cname.vercel-dns.com").map((r) => [r.type, r.name, r.value]),
    [["A", "@", "76.76.21.21"], ["CNAME", "www", "cname.vercel-dns.com"]]);
  assert.deepEqual(recordsFor("homes.janedoe.com", null, "1.1.1.1", "x.vercel-dns.com").map((r) => [r.type, r.name]), [["CNAME", "homes"]]);
});

test("reserved domains", () => {
  assert.ok(isReservedDomain("my-app.vercel.app"));
  assert.ok(isReservedDomain("localhost"));
  assert.ok(!isReservedDomain("janedoe.com"));
});
