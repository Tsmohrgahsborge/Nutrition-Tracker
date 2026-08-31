// Get the main buttons from the page.
const scanButton = document.getElementById("scanButton");
const closeScannerButton = document.getElementById("closeScanner");

// Get the scanner overlay and result box.
const scannerOverlay = document.getElementById("scannerOverlay");
const resultBox = document.getElementById("resultBox");

// Get the area where scanned products go.
const scannedItems = document.getElementById("scannedItems");

// This will hold the barcode scanner.
let html5QrCode;

// This checks if the scanner is currently running.
let scannerIsRunning = false;

// This stops one barcode scanning over and over.
let hasScanned = false;

// This function opens the camera scanner.
function openScanner() {
  scannerOverlay.style.display = "block";
  hasScanned = false;

  // Show a simple loading message.
  resultBox.textContent = "Starting camera...";

  // Make the scanner inside the reader div.
  html5QrCode = new Html5Qrcode("reader");

  // These are the scanner settings.
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 150 },

    // These are normal product barcode types.
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,

      // Some products use these barcode types too.
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,

      // This one is useful for other barcodes.
      Html5QrcodeSupportedFormats.CODE_128
    ]
  };

  // Start the scanner using the back camera.
  html5QrCode.start(
    { facingMode: "environment" },
    config,

    // These functions run while scanning.
    onScanSuccess,
    onScanError
  ).then(function () {
    scannerIsRunning = true;

    // Show that the scanner is ready.
    resultBox.textContent = "Scanner is ready.";
  }).catch(function (error) {
    resultBox.textContent = "Camera could not start.";

    // Hide the scanner if it fails.
    scannerOverlay.style.display = "none";
    console.log(error);
  });
}

// This function runs when a barcode is found.
function onScanSuccess(decodedText) {
  if (hasScanned === true) {
    return;
  }

  // Save that something has already scanned.
  hasScanned = true;
  resultBox.textContent = "Barcode ID: " + decodedText;

  // Close the camera after scanning.
  closeScanner();

  // Look up the product using openfood.js.
  loadProduct(decodedText);
}

// This function runs when scanning fails for a moment.
function onScanError(error) {
  // This happens heaps, so it is not shown.
  console.log("Scanning...");
}

// This function loads product data from Open Food Facts.
async function loadProduct(barcode) {
  resultBox.textContent = "Looking up product...";

  // Try the API request.
  try {
    const data = await searchProductByBarcode(barcode);

    // Check if the product was not found.
    if (data.status !== 1) {
      resultBox.textContent = "Product not found.";
      return;
    }

    // Get the product part of the data.
    const product = data.product;

    // Get the product name or use a backup.
    const productName = product.product_name || product.product_name_en || "Unknown product";

    // Get the image or leave it blank.
    const productImage = product.image_front_url || product.image_url || "";

    // Add the product to the page.
    addScannedItem(productName, productImage);

    // Show the user it worked.
    resultBox.textContent = "Added: " + productName;
  } catch (error) {
    resultBox.textContent = "Could not load product.";

    // Log the real error for testing.
    console.log(error);
  }
}

// This function adds the scanned product to the page.
function addScannedItem(productName, productImage) {
  const itemDiv = document.createElement("div");
  itemDiv.className = "scanned-item";

  // Add an image if there is one.
  if (productImage !== "") {
    const image = document.createElement("img");

    // Set up the image.
    image.src = productImage;
    image.alt = productName;

    // Add the image to the item.
    itemDiv.appendChild(image);
  } else {
    const noImage = document.createElement("div");

    // Show a plain box if there is no image.
    noImage.className = "no-image";
    noImage.textContent = "No image";

    // Add the no image box to the item.
    itemDiv.appendChild(noImage);
  }

  // Create the product name text.
  const nameText = document.createElement("strong");
  nameText.textContent = productName;

  // Add the name to the product row.
  itemDiv.appendChild(nameText);

  // Add the product row to the page.
  scannedItems.appendChild(itemDiv);
}

// This function closes the scanner.
function closeScanner() {
  if (html5QrCode && scannerIsRunning) {
    // Stop the camera so it does not stay on.
    html5QrCode.stop().then(function () {
      scannerIsRunning = false;

      // Clear the scanner and hide the overlay.
      html5QrCode.clear();
      scannerOverlay.style.display = "none";
    });
  } else {
    // Hide the scanner if it was not running.
    scannerOverlay.style.display = "none";
  }
}

// Start scanning when the button is clicked.
scanButton.addEventListener("click", openScanner);

// Close scanning when the cross is clicked.
closeScannerButton.addEventListener("click", closeScanner);