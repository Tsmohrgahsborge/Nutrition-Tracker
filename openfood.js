// This file is only for Open Food Facts API requests.
const OPEN_FOOD_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";

// This is the Open Food Facts search API link.
const OPEN_FOOD_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

// This function gets one product using a barcode.
async function searchProductByBarcode(barcode) {
  const url = OPEN_FOOD_PRODUCT_URL + encodeURIComponent(barcode);

  // Fetch gets the product data from Open Food Facts.
  const response = await fetch(url, {
    method: "GET",
    mode: "cors"
  });

  // Turn the response into JSON.
  const data = await response.json();

  // Send the data back to app.js.
  return data;
}

// This function searches for products using text.
async function searchProductsByName(searchText) {
  const url =
    OPEN_FOOD_SEARCH_URL +
    "?search_terms=" + encodeURIComponent(searchText) +
    "&search_simple=1" +
    "&action=process" +
    "&json=1";

  // Fetch gets matching products from Open Food Facts.
  const response = await fetch(url, {
    method: "GET",
    mode: "cors"
  });

  // Turn the response into JSON.
  const data = await response.json();

  // Send the search results back to app.js.
  return data;
}

// This function searches for products by category.
async function searchProductsByCategory(categoryName) {
  const url =
    OPEN_FOOD_SEARCH_URL +
    "?tagtype_0=categories" +
    "&tag_contains_0=contains" +
    "&tag_0=" + encodeURIComponent(categoryName) +
    "&action=process" +
    "&json=1";

  // Fetch gets category results from Open Food Facts.
  const response = await fetch(url, {
    method: "GET",
    mode: "cors"
  });

  // Turn the response into JSON.
  const data = await response.json();

  // Send the category results back to app.js.
  return data;
}

// This function searches for products by brand.
async function searchProductsByBrand(brandName) {
  const url =
    OPEN_FOOD_SEARCH_URL +
    "?tagtype_0=brands" +
    "&tag_contains_0=contains" +
    "&tag_0=" + encodeURIComponent(brandName) +
    "&action=process" +
    "&json=1";

  // Fetch gets brand results from Open Food Facts.
  const response = await fetch(url, {
    method: "GET",
    mode: "cors"
  });

  // Turn the response into JSON.
  const data = await response.json();

  // Send the brand results back to app.js.
  return data;
}