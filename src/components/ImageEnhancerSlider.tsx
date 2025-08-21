import { useState } from "react";
import ReactCompareImage from "react-compare-image";

export function ImageEnhancerSlider() {
  const [original, setOriginal] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOriginal(URL.createObjectURL(file));
    setLoading(true);

    const res = await fetch("/api/enhance-image", {
      method: "POST",
      body: file, // raw file
    });
    const data = await res.json();

    if (data.enhanced) {
      setEnhanced(data.enhanced);
    }

    setLoading(false);
  };

  return (
    <div className="p-8">
      <input type="file" onChange={handleUpload} />
      {loading && <p>Enhancing your image...</p>}
      {original && enhanced && (
        <div className="mt-6">
          <ReactCompareImage leftImage={original} rightImage={enhanced} />
        </div>
      )}
    </div>
  );
}