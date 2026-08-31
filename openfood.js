// This file is only for Open Food Facts API requests.
const OPEN_FOOD_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";

// This is the Open Food Facts search API link.
const OPEN_FOOD_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

// These are the only fields the app needs from Open Food Facts.
const OPEN_FOOD_FIELDS = [
  "code",
  "_id",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "countries_tags",
  "image_front_url",
  "image_url",
  "serving_size",
  "serving_quantity",
  "serving_quantity_unit",
  "quantity",
  "nutriments",
  "nutriments_estimated"
].join(",");

// This waits before trying a request again.
function waitForRetry(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// This fetches JSON and retries when the API gives a 503 error.
async function fetchJsonWithRetry(url) {
  let lastError = null;

  // Try up to 5 times.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors"
      });

      // A 503 error means the API is temporarily unavailable.
      if (response.status === 503) {
        lastError = new Error("503 Service Unavailable");
        await waitForRetry(350 * attempt);
        continue;
      }

      // Stop if another server error happens.
      if (!response.ok) {
        throw new Error("Request failed: " + response.status);
      }

      // Turn the response into JSON.
      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error;

      // Only retry fetch errors and 503 style problems.
      if (attempt < 5) {
        await waitForRetry(350 * attempt);
      }
    }
  }

  throw lastError;
}

// This function gets one product using a barcode.
async function searchProductByBarcode(barcode) {
  const url =
    OPEN_FOOD_PRODUCT_URL +
    encodeURIComponent(barcode) +
    "?fields=" + encodeURIComponent(OPEN_FOOD_FIELDS);

  // Send the data back to app.js.
  return await fetchJsonWithRetry(url);
}

// This makes an Open Food Facts search URL.
function makeSearchUrl(searchText, australiaOnly) {
  let url =
    OPEN_FOOD_SEARCH_URL +
    "?search_terms=" + encodeURIComponent(searchText) +
    "&search_simple=1" +
    "&action=process" +
    "&json=1" +
    "&page_size=12" +
    "&fields=" + encodeURIComponent(OPEN_FOOD_FIELDS);

  // This prioritises Australian products.
  if (australiaOnly === true) {
    url +=
      "&tagtype_0=countries" +
      "&tag_contains_0=contains" +
      "&tag_0=" + encodeURIComponent("Australia");
  }

  return url;
}

// This function searches for products using text.
async function searchProductsByName(searchText) {
  // Search Australia first because this app is made for Australian use.
  const australiaData = await fetchJsonWithRetry(makeSearchUrl(searchText, true));
  const australiaProducts = australiaData.products || [];

  // If there are enough Australian products, use those.
  if (australiaProducts.length >= 4) {
    return australiaData;
  }

  // If not, also try the world search and merge the two lists.
  const worldData = await fetchJsonWithRetry(makeSearchUrl(searchText, false));
  const worldProducts = worldData.products || [];
  const usedCodes = {};
  const mergedProducts = [];

  for (let i = 0; i < australiaProducts.length; i++) {
    const code = australiaProducts[i].code || australiaProducts[i]._id || i;
    usedCodes[code] = true;
    mergedProducts.push(australiaProducts[i]);
  }

  for (let i = 0; i < worldProducts.length; i++) {
    const code = worldProducts[i].code || worldProducts[i]._id || i;

    if (!usedCodes[code]) {
      mergedProducts.push(worldProducts[i]);
    }
  }

  worldData.products = mergedProducts.slice(0, 12);
  return worldData;
}
