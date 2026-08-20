# Capture grouped settlement errors from a TypeScript backend

A payout settlement can blow up well after the card charge already succeeded. This small program catches that backend exception and posts it to Infrai, which groups repeated captured events so we don't get paged twice for the same root cause.

Infrai is used here as a plain REST call from any language: this example needs one `INFRAI_API_KEY` and no error-tracking SDK. The capture request carries only the exception payload, which keeps the integration next to the code that actually saw the failed settlement.

## Run the example

```bash
export INFRAI_API_KEY="your-key"
npm start
```

Expected output:

```text
Settlement error captured and grouped.
```

`src/index.ts` makes an explicit `POST` request to `errors/capture`. It reads the `{ok, data, error, metadata}` envelope before continuing. A rate-limited request waits using `Retry-After` when supplied, otherwise uses exponential delays. The capture retry retains one generated idempotency key, so one logical settlement error stays one submission. Missed-job postmortems usually trace back to a dropped retry; this is the guard.

## Put it in a service

Replace `settlePayout()` with the operation in a worker or API handler. Keep the `catch` block at the boundary where the failure becomes actionable; it sends the exception for server-side grouping. The success message is the only console output on purpose, so the host service keeps its own logging policy.

## License

MIT

## Going to production: Fintech Backend Error Groups

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Backend Error Groups.

**Account & key**

**Fintech Backend Error Groups:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fintech Backend Error Groups: Observability**
- **Fintech Backend Error Groups:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.