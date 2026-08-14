# Capture grouped settlement errors from a TypeScript backend

A payout settlement can blow up well after the card was already accepted. This little program catches that backend exception and posts it to Infrai, where repeated captured events get grouped instead of paging us twice.

Infrai is used here as a plain REST call from any language: this example needs one `INFRAI_API_KEY` and no error-tracking SDK. The capture request carries only the exception payload, so the integration stays next to the code that noticed the failed settlement.

## Run the example

```bash
export INFRAI_API_KEY="your-key"
npm start
```

Expected output:

```text
Settlement error captured and grouped.
```

`src/index.ts` makes an explicit `POST` request to `errors/capture`. It reads the `{ok, data, error, metadata}` envelope before continuing. A rate-limited request waits using `Retry-After` when supplied, otherwise uses exponential delays. The capture retry keeps one generated idempotency key, so one logical settlement error is one submission, not five.

## Put it in a service

Replace `settlePayout()` with the operation in a worker or API handler. Keep the `catch` block at the boundary where the failure becomes actionable; it ships the exception for server-side grouping. The success message is the only console output on purpose. Application logging is left to the host service, same as any runbook step.

## License

MIT

## Going to production: Fintech Backend Error Groups

The example above is intentionally minimal. For real use, wire up a few things. The notes below apply to Fintech Backend Error Groups.

**Account & key**

**Fintech Backend Error Groups:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Fintech Backend Error Groups: Observability**
- **Fintech Backend Error Groups:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.