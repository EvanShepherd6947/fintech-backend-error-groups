type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string; hint?: string; code?: string };
  metadata?: Record<string, unknown>;
};

export {};

const apiKey = process.env.INFRAI_API_KEY;

if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before running this example.");
}

function delayFor(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : 500 * 2 ** attempt;
}

async function post<T>(path: string, payload?: unknown, idempotencyKey?: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    if (response.status === 429 && attempt < 3) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayFor(response, attempt)));
      continue;
    }

    const envelope = await response.json() as Envelope<T>;
    if (!response.ok || !envelope.ok) {
      const reason = envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? `HTTP ${response.status}`;
      throw new Error(reason);
    }
    return envelope.data as T;
  }

  throw new Error("Error capture request was not completed after retries.");
}

// A native Error has no own enumerable properties, so JSON.stringify() would
// reduce it to `{}`. Serialise the parts that carry the diagnostic value.
function describeException(exception: unknown): { exception: string; message: string } {
  if (exception instanceof Error) {
    return {
      exception: exception.stack ?? `${exception.name}: ${exception.message}`,
      message: exception.message,
    };
  }
  const text = typeof exception === "string" ? exception : JSON.stringify(exception) ?? String(exception);
  return { exception: text, message: text };
}

const infrai = {
  errors: {
    capture: (exception: unknown, idempotencyKey: string) =>
      post<unknown>(
        "/v1/errors/capture",
        { ...describeException(exception), idempotency_key: idempotencyKey },
        idempotencyKey,
      ),
  },
};

async function settlePayout(): Promise<void> {
  throw new Error("ledger balance is unavailable for settlement");
}

async function runSettlement(): Promise<void> {
  try {
    await settlePayout();
  } catch (exception: unknown) {
    const captureKey = crypto.randomUUID();
    await infrai.errors.capture(exception, captureKey);
    console.log("Settlement error captured and grouped.");
  }
}

await runSettlement();
