# OMEGA v4.13.0-jsonschema-export

## Tag Info
- Tag: v4.13.0-jsonschema-export
- TagRef: refs/tags/v4.13.0-jsonschema-export
- CapabilityCommit: 9c94b80671da2e2545d735410a879842bbfa5152
- Date: 2026-01-18T14:50:00+01:00

## Capabilities (NDJSON Schema v1.2.0)
- Schema version: 1.2.0
- New field: tagExact (boolean) - true if exact tag match, false if nearest
- New command: omega schema --format ndjson [--out file]
- JSON Schema export for NDJSON streaming format
- Full JSON Schema 2020-12 compliant

## Changes
- FIX A: repo-hygiene test ignores .claude/ and settings.local files
- FIX B: schema event includes tagExact boolean
- NEW: omega schema command with JSON Schema export
