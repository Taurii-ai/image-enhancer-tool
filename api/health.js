// api/health.js
export default async function handler(req, res) {
  const model = process.env.ENHANCER_MODEL_SLUG || "nightmareai/real-esrgan";
  const tokenSet = !!process.env.REPLICATE_API_TOKEN;
  const extra = process.env.ENHANCER_EXTRA || "{}";
  res.json({
    ok: true,
    model,
    tokenSet,
    extra: JSON.parse(extra),
  });
}