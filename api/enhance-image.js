// pages/api/enhance-image.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN");
    return res.status(500).json({ error: "Server misconfiguration: missing token" });
  }

  try {
    const versionId = "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";

    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: versionId,
        input: { image: req.body.image },
      }),
    });

    if (createRes.status === 422) {
      const errorText = await createRes.text();
      console.error("Invalid version error:", errorText);
      return res.status(422).json({ error: "Invalid model version – please use a valid version ID", details: errorText });
    }

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Replicate error:", errorText);
      return res.status(createRes.status).json({ error: errorText });
    }

    let prediction = await createRes.json();

    // Poll for completion
    while (!["succeeded", "failed"].includes(prediction.status)) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      prediction = await pollRes.json();
    }

    if (prediction.status === "succeeded") {
      return res.status(200).json({ output: prediction.output });
    } else {
      return res.status(500).json({ error: "Enhancement failed", details: prediction });
    }
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
}