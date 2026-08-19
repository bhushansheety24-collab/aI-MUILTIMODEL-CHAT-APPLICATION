async function searchPlatform(query, platform, limit = 5, lat = 12.9716, lon = 77.5946) {
  const url = new URL("https://api.quickcommerceapi.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("platform", platform);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);

  console.log(`🛍️ Searching ${platform} for:`, query);

  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.QUICKCOMMERCE_API_KEY },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`🛍️ ${platform} search failed:`, res.status, errText);
    throw new Error(`${platform} search failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const products = data?.data?.products || [];

  return products.slice(0, limit).map((p) => ({
    title: p.name,
    price: p.offer_price ? `₹${p.offer_price}` : p.mrp ? `₹${p.mrp}` : "N/A",
    mrp: p.mrp ? `₹${p.mrp}` : null,
    rating: p.rating,
    available: p.available,
    link: p.deeplink,
    store: platform,
  }));
}

export async function comparePrices(query, limitPerStore = 5, lat, lon) {
  const [amazonResults, flipkartResults] = await Promise.allSettled([
    searchPlatform(query, "Amazon", limitPerStore, lat, lon),
    searchPlatform(query, "Flipkart", limitPerStore, lat, lon),
  ]);

  if (amazonResults.status === "rejected") {
    console.error("🛍️ Amazon promise rejected:", amazonResults.reason?.message);
  }
  if (flipkartResults.status === "rejected") {
    console.error("🛍️ Flipkart promise rejected:", flipkartResults.reason?.message);
  }

  return {
    amazon: amazonResults.status === "fulfilled" ? amazonResults.value : [],
    flipkart: flipkartResults.status === "fulfilled" ? flipkartResults.value : [],
  };
}