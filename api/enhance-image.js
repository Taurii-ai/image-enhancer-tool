export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "928d65b2de4210da5c58e058f5f20830ad8e10e773b0a4f3e18b0569e3a0db58", // Real-ESRGAN 4x model
        input: {
          image: req.body.image // frontend sends image URL
        }
      }),
    });

    let prediction = await replicateResponse.json();

    // Poll until done
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(r => setTimeout(r, 2000)); // wait 2 sec
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
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}