// This is the name used in localStorage.
// Keep this the same so data stays when the app is upgraded.
const STORAGE_KEY = "nutrition-app";

// Get the screens from the page.
const homeScreen = document.getElementById("homeScreen");
const addScreen = document.getElementById("addScreen");

// Get the date buttons and date picker.
const previousDateButton = document.getElementById("previousDateButton");
const nextDateButton = document.getElementById("nextDateButton");
const datePicker = document.getElementById("datePicker");

// Get the tab buttons.
const entriesTab = document.getElementById("entriesTab");
const nutritionTab = document.getElementById("nutritionTab");

// Get the entry buttons and areas.
const addEntryButton = document.getElementById("addEntryButton");
const backButton = document.getElementById("backButton");
const entriesList = document.getElementById("entriesList");

// Get the scanner buttons and overlay.
const scanButton = document.getElementById("scanButton");
const closeScannerButton = document.getElementById("closeScanner");
const scannerOverlay = document.getElementById("scannerOverlay");
const resultBox = document.getElementById("resultBox");

// Get the search tools.
const searchBox = document.getElementById("searchBox");
const searchExisting = document.getElementById("searchExisting");
const searchNew = document.getElementById("searchNew");
const searchHelp = document.getElementById("searchHelp");
const searchResults = document.getElementById("searchResults");

// Get the modal.
const itemModal = document.getElementById("itemModal");
const modalItemName = document.getElementById("modalItemName");
const modalServingSize = document.getElementById("modalServingSize");
const servingSizeQuestion = document.getElementById("servingSizeQuestion");
const modalServingGrams = document.getElementById("modalServingGrams");
const modalServes = document.getElementById("modalServes");
const cancelModalButton = document.getElementById("cancelModalButton");
const saveModalButton = document.getElementById("saveModalButton");

// This will hold the barcode scanner.
let html5QrCode;

// This checks if the scanner is currently running.
let scannerIsRunning = false;

// This stops one barcode scanning over and over.
let hasScanned = false;

// This stores the selected date.
let selectedDate = getTodayDateText();

// This stores the item currently in the modal.
let selectedItem = null;

// This stores if the selected item needs a serving size entered.
let selectedItemNeedsServingSize = false;

// This gets the app data from localStorage.
function getAppData() {
  const savedText = localStorage.getItem(STORAGE_KEY);
  let data;

  // If there is no saved data, make the starting structure.
  if (savedText === null) {
    data = {
      entries: {},
      items: {}
    };
  } else {
    // Try to turn the saved text back into JSON.
    try {
      data = JSON.parse(savedText);
    } catch (error) {
      console.log(error);

      // If something goes wrong, reset safely.
      data = {
        entries: {},
        items: {}
      };
    }
  }

  // Make sure the two main keys exist.
  if (!data.entries) {
    data.entries = {};
  }

  if (!data.items) {
    data.items = {};
  }

  // Upgrade older saved items so localStorage stays small.
  data = migrateSavedItems(data);

  return data;
}

// This saves the app data to localStorage.
function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// This converts old saved items into the newest smaller saved item.
function migrateSavedItems(data) {
  let changed = false;

  for (const itemId in data.items) {
    const item = data.items[itemId];

    // Version 3 is the newest saved item shape.
    if (item && item.saved_version !== 3) {
      data.items[itemId] = upgradeSavedItem(item);
      changed = true;
    }
  }

  if (changed === true) {
    saveAppData(data);
  }

  return data;
}

// This upgrades older small saved items into version 3.
function upgradeSavedItem(item) {
  // Version 2 already had most data, but vitamins were outside micros.
  if (item.saved_version === 2) {
    const oldMicros = item.micros || {};

    return {
      saved_version: 3,
      item_id: item.item_id,
      name: item.name,
      image: item.image,
      serving_size_grams: item.serving_size_grams || 100,
      data_per: "100g",
      macros: item.macros || makeBlankMacros(),
      micros: {
        potassium: oldMicros.potassium !== undefined ? oldMicros.potassium : null,
        sodium: oldMicros.sodium !== undefined ? oldMicros.sodium : null,
        calcium: oldMicros.calcium !== undefined ? oldMicros.calcium : null,
        cholesterol: oldMicros.cholesterol !== undefined ? oldMicros.cholesterol : null,
        iron: oldMicros.iron !== undefined ? oldMicros.iron : null,
        magnesium: oldMicros.magnesium !== undefined ? oldMicros.magnesium : null,
        iodine: oldMicros.iodine !== undefined ? oldMicros.iodine : null,
        zinc: oldMicros.zinc !== undefined ? oldMicros.zinc : null,
        vitamin_a: item.vitamin_a !== undefined ? item.vitamin_a : null,
        vitamin_b12: item.vitamin_b12 !== undefined ? item.vitamin_b12 : null,
        vitamin_b1: item.vitamin_b1 !== undefined ? item.vitamin_b1 : null,
        vitamin_b2: item.vitamin_b2 !== undefined ? item.vitamin_b2 : null,
        vitamin_b3: item.vitamin_b3 !== undefined ? item.vitamin_b3 : null,
        vitamin_b6: item.vitamin_b6 !== undefined ? item.vitamin_b6 : null,
        vitamin_b9: item.vitamin_b9 !== undefined ? item.vitamin_b9 : null,
        vitamin_c: item.vitamin_c !== undefined ? item.vitamin_c : null
      }
    };
  }

  // Older data may still be a full Open Food Facts product.
  return condenseProduct(item, 100);
}

// This makes an empty macros object.
function makeBlankMacros() {
  return {
    added_sugars: null,
    carbohydrates: null,
    energy: null,
    saturated_fat: null,
    unsaturated_fat: null,
    fiber: null,
    protein: null
  };
}

// This gets today's date in the same format as a date input.
function getTodayDateText() {
  const today = new Date();
  return makeDateText(today);
}

// This turns a Date into YYYY-MM-DD.
function makeDateText(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

// This changes the selected date by a number of days.
function changeDate(days) {
  const date = new Date(selectedDate + "T00:00:00");
  date.setDate(date.getDate() + days);
  selectedDate = makeDateText(date);
  datePicker.value = selectedDate;
  renderEntries();
}

// This shows the home screen.
function showHomeScreen() {
  homeScreen.classList.add("active");
  addScreen.classList.remove("active");
  renderEntries();
}

// This shows the add screen.
function showAddScreen() {
  homeScreen.classList.remove("active");
  addScreen.classList.add("active");
  searchBox.value = "";
  searchExisting.checked = true;
  updateSearchHelp();
  renderPopularItems();
}

// This gets an item name from a saved item or Open Food Facts product.
function getItemName(product) {
  return product.name || product.product_name || product.product_name_en || product.generic_name || "Unknown product";
}

// This gets an item image from a saved item or Open Food Facts product.
function getItemImage(product) {
  return product.image || product.image_front_url || product.image_url || "";
}

// This checks if the product already has a serving size.
function hasServingSize(product) {
  return getServingSizeGrams(product, null) !== null;
}

// This gets the serving size from a saved item or Open Food Facts product.
function getServingSize(product) {
  const grams = getServingSizeGrams(product, null);

  if (grams !== null) {
    return grams + " g";
  }

  return "Serving size not listed";
}

// This gets the serving size as grams.
function getServingSizeGrams(product, backupGrams) {
  if (product.serving_size_grams) {
    return Number(product.serving_size_grams);
  }

  if (product.serving_quantity) {
    return Number(product.serving_quantity);
  }

  if (product.serving_size) {
    const match = String(product.serving_size).match(/[0-9]+(\.[0-9]+)?/);

    if (match) {
      return Number(match[0]);
    }
  }

  const backupNumber = cleanNumber(backupGrams);

  if (backupNumber !== null && backupNumber > 0) {
    return backupNumber;
  }

  return null;
}

// This gets the best item id to use.
function getItemId(product) {
  return product.item_id || product.code || product._id || getItemName(product).toLowerCase().replaceAll(" ", "-");
}

// This turns a value into a number, or null if it is missing.
function cleanNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

// This checks the normal nutriments first, then estimated nutriments.
function getNutrient(product, nutrientNames) {
  const nutriments = product.nutriments || {};
  const estimated = product.nutriments_estimated || {};

  for (let i = 0; i < nutrientNames.length; i++) {
    const name = nutrientNames[i];
    const choices = [
      nutriments[name + "_100g"],
      nutriments[name],
      estimated[name + "_100g"],
      estimated[name]
    ];

    for (let j = 0; j < choices.length; j++) {
      const numberValue = cleanNumber(choices[j]);

      if (numberValue !== null) {
        return numberValue;
      }
    }
  }

  return null;
}

// This works out unsaturated fat.
function getUnsaturatedFat(product) {
  const mono = getNutrient(product, ["monounsaturated-fat"]);
  const poly = getNutrient(product, ["polyunsaturated-fat"]);

  // If both parts exist, add them together.
  if (mono !== null || poly !== null) {
    return (mono || 0) + (poly || 0);
  }

  // If only total fat and saturated fat exist, subtract them.
  const fat = getNutrient(product, ["fat"]);
  const saturatedFat = getNutrient(product, ["saturated-fat"]);

  if (fat !== null && saturatedFat !== null) {
    const answer = fat - saturatedFat;

    if (answer < 0) {
      return 0;
    }

    return answer;
  }

  return null;
}

// This gives a nice label for each nutrient.
function getNutrientLabel(key) {
  const labels = {
    added_sugars: "Added sugars",
    carbohydrates: "Carbohydrates",
    energy: "Energy",
    saturated_fat: "Saturated fat",
    unsaturated_fat: "Un-saturated fat",
    fiber: "Fiber",
    protein: "Protein",
    potassium: "Potassium",
    sodium: "Sodium",
    calcium: "Calcium",
    cholesterol: "Cholesterol",
    iron: "Iron",
    magnesium: "Magnesium",
    iodine: "Iodine",
    zinc: "Zinc",
    vitamin_a: "Vitamin A",
    vitamin_b12: "Vitamin B12",
    vitamin_b1: "Vitamin B1",
    vitamin_b2: "Vitamin B2",
    vitamin_b3: "Vitamin B3",
    vitamin_b6: "Vitamin B6",
    vitamin_b9: "Vitamin B9",
    vitamin_c: "Vitamin C"
  };

  return labels[key] || key;
}

// This lists the macro keys in the order they should show.
function getMacroKeys() {
  return [
    "added_sugars",
    "carbohydrates",
    "energy",
    "saturated_fat",
    "unsaturated_fat",
    "fiber",
    "protein"
  ];
}

// This lists the micro keys in the order they should show.
function getMicroKeys() {
  return [
    "potassium",
    "sodium",
    "calcium",
    "cholesterol",
    "iron",
    "magnesium",
    "iodine",
    "zinc",
    "vitamin_a",
    "vitamin_b12",
    "vitamin_b1",
    "vitamin_b2",
    "vitamin_b3",
    "vitamin_b6",
    "vitamin_b9",
    "vitamin_c"
  ];
}

// This works out how many grams of the item were eaten.
function getConsumedGrams(item, entry) {
  const servingSize = getServingSizeGrams(item, 100);
  const serves = cleanNumber(entry.serves) || 0;

  return servingSize * serves;
}

// This scales a 100g nutrient value to the amount eaten.
function scaleNutrientValue(item, entry, nutrientValue) {
  const numberValue = cleanNumber(nutrientValue);

  if (numberValue === null) {
    return null;
  }

  const consumedGrams = getConsumedGrams(item, entry);
  return numberValue * (consumedGrams / 100);
}

// This formats a number without showing too many decimal places.
function formatSmartNumber(value, decimalPlaces) {
  const rounded = Number(value.toFixed(decimalPlaces));
  return String(rounded);
}

// This formats grams into g, mg, or mcg.
function formatGramAmount(grams, zeroUnit) {
  if (grams === 0) {
    return "0 " + zeroUnit;
  }

  if (grams >= 1) {
    return formatSmartNumber(grams, 1) + " g";
  }

  if (grams >= 0.1) {
    return formatSmartNumber(grams, 2) + " g";
  }

  if (grams >= 0.001) {
    return formatSmartNumber(grams * 1000, 1) + " mg";
  }

  if (grams >= 0.000001) {
    return formatSmartNumber(grams * 1000000, 1) + " mcg";
  }

  return formatSmartNumber(grams, 6) + " g";
}

// This makes nutrient values easier to read.
function formatNutrientAmount(key, scaledValue, sectionName) {
  if (scaledValue === null) {
    return "Not listed";
  }

  if (key === "energy") {
    return formatSmartNumber(scaledValue, 0) + " kJ";
  }

  // Macros normally make most sense as grams.
  if (sectionName === "macros") {
    return formatGramAmount(scaledValue, "g");
  }

  // Micros normally make most sense as mg when they are zero.
  return formatGramAmount(scaledValue, "mg");
}

// This builds the small macros and micros tabs inside an entry.
function makeNutritionBox(item, entry) {
  const box = document.createElement("div");
  box.className = "nutrition-box";

  const note = document.createElement("div");
  note.className = "nutrition-note";
  note.textContent = "Nutrition for " + formatSmartNumber(getConsumedGrams(item, entry), 1) + " g consumed";

  const tabRow = document.createElement("div");
  tabRow.className = "nutrient-tabs";

  const macrosButton = document.createElement("button");
  macrosButton.className = "nutrient-tab selected";
  macrosButton.textContent = "Macros";

  const microsButton = document.createElement("button");
  microsButton.className = "nutrient-tab";
  microsButton.textContent = "Micros";

  const nutrientList = document.createElement("div");
  nutrientList.className = "nutrient-list";

  function showMacros() {
    macrosButton.classList.add("selected");
    microsButton.classList.remove("selected");
    renderNutrientList(nutrientList, item, entry, "macros");
  }

  function showMicros() {
    microsButton.classList.add("selected");
    macrosButton.classList.remove("selected");
    renderNutrientList(nutrientList, item, entry, "micros");
  }

  macrosButton.addEventListener("click", showMacros);
  microsButton.addEventListener("click", showMicros);

  tabRow.appendChild(macrosButton);
  tabRow.appendChild(microsButton);

  box.appendChild(note);
  box.appendChild(tabRow);
  box.appendChild(nutrientList);

  showMacros();
  return box;
}

// This shows the nutrient list for either macros or micros.
function renderNutrientList(nutrientList, item, entry, sectionName) {
  const keys = sectionName === "macros" ? getMacroKeys() : getMicroKeys();
  const source = item[sectionName] || {};

  nutrientList.innerHTML = "";

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const scaledValue = scaleNutrientValue(item, entry, source[key]);

    const row = document.createElement("div");
    row.className = "nutrient-row";

    const label = document.createElement("span");
    label.className = "nutrient-label";
    label.textContent = getNutrientLabel(key);

    const value = document.createElement("strong");
    value.className = "nutrient-value";
    value.textContent = formatNutrientAmount(key, scaledValue, sectionName);

    row.appendChild(label);
    row.appendChild(value);
    nutrientList.appendChild(row);
  }
}

// This makes the small item that is saved in localStorage.
function condenseProduct(product, backupServingSizeGrams) {
  const itemId = getItemId(product);
  let servingSizeGrams = getServingSizeGrams(product, backupServingSizeGrams);

  // This is only a safety backup. The user should normally be asked first.
  if (servingSizeGrams === null) {
    servingSizeGrams = 100;
  }

  return {
    saved_version: 3,
    item_id: itemId,
    name: getItemName(product),
    image: getItemImage(product),
    serving_size_grams: servingSizeGrams,
    data_per: "100g",
    macros: {
      added_sugars: getNutrient(product, ["added-sugars"]),
      carbohydrates: getNutrient(product, ["carbohydrates"]),
      energy: getNutrient(product, ["energy-kj", "energy"]),
      saturated_fat: getNutrient(product, ["saturated-fat"]),
      unsaturated_fat: getUnsaturatedFat(product),
      fiber: getNutrient(product, ["fiber"]),
      protein: getNutrient(product, ["proteins", "protein"])
    },
    micros: {
      potassium: getNutrient(product, ["potassium"]),
      sodium: getNutrient(product, ["sodium"]),
      calcium: getNutrient(product, ["calcium"]),
      cholesterol: getNutrient(product, ["cholesterol"]),
      iron: getNutrient(product, ["iron"]),
      magnesium: getNutrient(product, ["magnesium"]),
      iodine: getNutrient(product, ["iodine"]),
      zinc: getNutrient(product, ["zinc"]),
      vitamin_a: getNutrient(product, ["vitamin-a"]),
      vitamin_b12: getNutrient(product, ["vitamin-b12"]),
      vitamin_b1: getNutrient(product, ["vitamin-b1"]),
      vitamin_b2: getNutrient(product, ["vitamin-b2"]),
      vitamin_b3: getNutrient(product, ["vitamin-b3", "vitamin-pp", "niacin"]),
      vitamin_b6: getNutrient(product, ["vitamin-b6"]),
      vitamin_b9: getNutrient(product, ["vitamin-b9", "folates", "folate"]),
      vitamin_c: getNutrient(product, ["vitamin-c"])
    }
  };
}

// This saves an item into localStorage.
// This saves an item into localStorage.
function saveItem(product, backupServingSizeGrams) {
  const data = getAppData();

  // Existing items are already condensed and already contain macros/micros.
  // Reuse them instead of passing them through condenseProduct again.
  if (
    product &&
    product.saved_version === 3 &&
    product.item_id &&
    data.items[product.item_id]
  ) {
    return product.item_id;
  }

  // New Open Food Facts products still need to be condensed and saved.
  const cleanItem = condenseProduct(product, backupServingSizeGrams);

  data.items[cleanItem.item_id] = cleanItem;
  saveAppData(data);

  return cleanItem.item_id;
}

// This adds an entry for the selected date.
function addEntry(itemId, serves) {
  const data = getAppData();

  // Make the date list if it does not exist yet.
  if (!data.entries[selectedDate]) {
    data.entries[selectedDate] = [];
  }

  data.entries[selectedDate].push({
    item_id: itemId,
    serves: serves
  });

  saveAppData(data);
}

// This changes an entry serving amount.
function updateEntryServes(entryNumber, newServes) {
  const data = getAppData();

  if (!data.entries[selectedDate]) {
    return;
  }

  data.entries[selectedDate][entryNumber].serves = newServes;
  saveAppData(data);
  renderEntries();
}

// This deletes an entry.
function deleteEntry(entryNumber) {
  const data = getAppData();

  if (!data.entries[selectedDate]) {
    return;
  }

  data.entries[selectedDate].splice(entryNumber, 1);
  saveAppData(data);
  renderEntries();
}

// This renders the entries for the selected date.
function renderEntries() {
  const data = getAppData();
  const entries = data.entries[selectedDate] || [];

  entriesList.innerHTML = "";

  if (entries.length === 0) {
    entriesList.innerHTML = "<div class='empty-box'>No entries for this date.</div>";
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const item = data.items[entry.item_id];

    // Skip the entry if the item cannot be found.
    if (!item) {
      continue;
    }

    const card = document.createElement("div");
    card.className = "entry-card";

    const summary = document.createElement("button");
    summary.className = "entry-summary";

    summary.appendChild(makeItemImage(item));

    const middle = document.createElement("div");

    const name = document.createElement("strong");
    name.className = "entry-name";
    name.textContent = getItemName(item);

    const servesText = document.createElement("span");
    servesText.className = "entry-serves";
    servesText.textContent = entry.serves + " serves • " + getServingSize(item);

    middle.appendChild(name);
    middle.appendChild(servesText);

    const arrow = document.createElement("span");
    arrow.className = "entry-arrow";
    arrow.textContent = "⌄";

    summary.appendChild(middle);
    summary.appendChild(arrow);

    const details = document.createElement("div");
    details.className = "entry-details";

    const dateText = document.createElement("div");
    dateText.className = "detail-line";
    dateText.textContent = "Date: " + selectedDate;

    const serveRow = document.createElement("div");
    serveRow.className = "serve-row";

    const serveLabel = document.createElement("span");
    serveLabel.textContent = "Servings consumed";

    const serveInput = document.createElement("input");
    serveInput.type = "number";
    serveInput.min = "0";
    serveInput.step = "0.1";
    serveInput.value = entry.serves;

    serveInput.addEventListener("change", function () {
      updateEntryServes(i, serveInput.value);
    });

    serveRow.appendChild(serveLabel);
    serveRow.appendChild(serveInput);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete entry";

    deleteButton.addEventListener("click", function () {
      deleteEntry(i);
    });

    const nutritionBox = makeNutritionBox(item, entry);

    details.appendChild(dateText);
    details.appendChild(serveRow);
    details.appendChild(nutritionBox);
    details.appendChild(deleteButton);

    summary.addEventListener("click", function () {
      card.classList.toggle("open");
    });

    card.appendChild(summary);
    card.appendChild(details);
    entriesList.appendChild(card);
  }
}

// This makes an image or a no image box.
function makeItemImage(item) {
  const itemImage = getItemImage(item);

  if (itemImage !== "") {
    const image = document.createElement("img");
    image.src = itemImage;
    image.alt = getItemName(item);
    return image;
  }

  const noImage = document.createElement("div");
  noImage.className = "no-image";
  noImage.textContent = "No image";
  return noImage;
}

// This opens the modal to add a serving amount.
function openItemModal(item) {
  selectedItem = item;
  selectedItemNeedsServingSize = !hasServingSize(item);

  modalItemName.textContent = getItemName(item);

  if (selectedItemNeedsServingSize === true) {
    modalServingSize.textContent = "Serving size is not listed.";
    servingSizeQuestion.style.display = "block";
    modalServingGrams.value = "100";
  } else {
    modalServingSize.textContent = "Serving size: " + getServingSize(item);
    servingSizeQuestion.style.display = "none";
  }

  modalServes.value = "1";
  itemModal.style.display = "flex";

  if (selectedItemNeedsServingSize === true) {
    modalServingGrams.focus();
  } else {
    modalServes.focus();
  }
}

// This closes the item modal.
function closeItemModal() {
  itemModal.style.display = "none";
  selectedItem = null;
  selectedItemNeedsServingSize = false;
}

// This saves the modal item as an entry.
function saveModalEntry() {
  if (selectedItem === null) {
    return;
  }

  const serves = modalServes.value;
  let servingSizeGrams = null;

  if (selectedItemNeedsServingSize === true) {
    servingSizeGrams = modalServingGrams.value;

    if (servingSizeGrams === "" || Number(servingSizeGrams) <= 0) {
      modalServingGrams.focus();
      return;
    }
  }

  if (serves === "" || Number(serves) <= 0) {
    modalServes.focus();
    return;
  }

  const itemId = saveItem(selectedItem, servingSizeGrams);
  addEntry(itemId, serves);
  closeItemModal();
  showHomeScreen();
}

// This renders one product row.
function renderProductRow(item) {
  const button = document.createElement("button");
  button.className = "product-row";

  button.appendChild(makeItemImage(item));

  const textBox = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = getItemName(item);

  const serving = document.createElement("span");
  serving.textContent = getServingSize(item);

  textBox.appendChild(name);
  textBox.appendChild(serving);

  button.appendChild(textBox);

  button.addEventListener("click", function () {
    openItemModal(item);
  });

  searchResults.appendChild(button);
}

// This renders previous items from localStorage.
function renderExistingItems(searchText) {
  const data = getAppData();
  const items = Object.values(data.items);
  const lowerSearch = searchText.toLowerCase();

  searchResults.innerHTML = "";

  for (let i = 0; i < items.length; i++) {
    const itemName = getItemName(items[i]).toLowerCase();

    if (itemName.includes(lowerSearch)) {
      renderProductRow(items[i]);
    }
  }

  if (searchResults.innerHTML === "") {
    searchResults.innerHTML = "<div class='empty-box'>No saved items found.</div>";
  }
}

// This shows popular previous items.
function renderPopularItems() {
  const data = getAppData();
  const counts = {};

  // Count each item in the entries.
  for (const dateKey in data.entries) {
    const entries = data.entries[dateKey];

    for (let i = 0; i < entries.length; i++) {
      const itemId = entries[i].item_id;

      if (!counts[itemId]) {
        counts[itemId] = 0;
      }

      counts[itemId]++;
    }
  }

  const itemIds = Object.keys(data.items);

  itemIds.sort(function (a, b) {
    return (counts[b] || 0) - (counts[a] || 0);
  });

  searchResults.innerHTML = "";

  if (itemIds.length === 0) {
    searchResults.innerHTML = "<div class='empty-box'>Saved foods and popular items will appear here.</div>";
    return;
  }

  for (let i = 0; i < itemIds.length && i < 8; i++) {
    renderProductRow(data.items[itemIds[i]]);
  }
}

// This gives a search result a simple score.
function getSearchScore(product, searchText) {
  const lowerSearch = searchText.toLowerCase();
  const name = getItemName(product).toLowerCase();
  const countries = product.countries_tags || [];
  let score = 0;

  if (countries.includes("en:australia")) {
    score += 100;
  }

  if (name === lowerSearch) {
    score += 80;
  } else if (name.startsWith(lowerSearch)) {
    score += 50;
  } else if (name.includes(lowerSearch)) {
    score += 25;
  }

  // Prefer products that have useful basic data.
  if (getItemImage(product) !== "") {
    score += 5;
  }

  if (product.nutriments) {
    score += 5;
  }

  return score;
}

// This sorts products so Australian and relevant results appear first.
function sortSearchResults(products, searchText) {
  products.sort(function (a, b) {
    return getSearchScore(b, searchText) - getSearchScore(a, searchText);
  });

  return products;
}

// This searches Open Food Facts when NEW is selected.
async function searchNewItems() {
  const searchText = searchBox.value.trim();

  if (searchText === "") {
    searchResults.innerHTML = "<div class='empty-box'>Type a food and press Enter.</div>";
    return;
  }

  searchResults.innerHTML = "<div class='empty-box'>Searching Open Food Facts...</div>";

  try {
    const data = await searchProductsByName(searchText);
    const products = sortSearchResults(data.products || [], searchText);

    searchResults.innerHTML = "";

    for (let i = 0; i < products.length; i++) {
      renderProductRow(products[i]);
    }

    if (products.length === 0) {
      searchResults.innerHTML = "<div class='empty-box'>No new items found.</div>";
    }
  } catch (error) {
    console.log(error);
    searchResults.innerHTML = "<div class='empty-box'>Search failed. Try again in a moment.</div>";
  }
}

// This updates the search help text.
function updateSearchHelp() {
  if (searchExisting.checked === true) {
    searchHelp.textContent = "Existing foods autocomplete as you type.";
    renderPopularItems();
  } else {
    searchHelp.textContent = "New foods search Open Food Facts only when you press Enter.";
    searchResults.innerHTML = "<div class='empty-box'>Type a food and press Enter.</div>";
  }
}

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

  // Look up the product.
  loadProductFromBarcode(decodedText);
}

// This function runs when scanning fails for a moment.
function onScanError(error) {
  // This happens heaps, so it is not shown.
  console.log("Scanning...");
}

// This function loads product data from a barcode.
async function loadProductFromBarcode(barcode) {
  const data = getAppData();

  // Always check saved items first.
  if (data.items[barcode]) {
    openItemModal(data.items[barcode]);
    return;
  }

  resultBox.textContent = "Looking up product...";

  // Try the API request.
  try {
    const apiData = await searchProductByBarcode(barcode);

    // Check if the product was not found.
    if (apiData.status !== 1) {
      alert("Product not found.");
      return;
    }

    // Get the product part of the data.
    const product = apiData.product;

    // Make sure it keeps the barcode as its item id.
    product.code = barcode;

    // Open the modal to enter servings.
    openItemModal(product);
  } catch (error) {
    alert("Could not load product. Try again in a moment.");

    // Log the real error for testing.
    console.log(error);
  }
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

// Set up the app when the page loads.
datePicker.value = selectedDate;
renderEntries();

// Date navigation buttons.
previousDateButton.addEventListener("click", function () {
  changeDate(-1);
});

nextDateButton.addEventListener("click", function () {
  changeDate(1);
});

datePicker.addEventListener("change", function () {
  selectedDate = datePicker.value;
  renderEntries();
});

// Screen buttons.
addEntryButton.addEventListener("click", showAddScreen);
backButton.addEventListener("click", showHomeScreen);

// Start scanning when the button is clicked.
scanButton.addEventListener("click", openScanner);

// Close scanning when the cross is clicked.
closeScannerButton.addEventListener("click", closeScanner);

// Search mode radio buttons.
searchExisting.addEventListener("change", updateSearchHelp);
searchNew.addEventListener("change", updateSearchHelp);

// Search box typing and enter key.
searchBox.addEventListener("input", function () {
  if (searchExisting.checked === true) {
    const searchText = searchBox.value.trim();

    if (searchText === "") {
      renderPopularItems();
    } else {
      renderExistingItems(searchText);
    }
  }
});

searchBox.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && searchNew.checked === true) {
    searchNewItems();
  }
});

// Modal buttons.
cancelModalButton.addEventListener("click", closeItemModal);
saveModalButton.addEventListener("click", saveModalEntry);

modalServingGrams.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    modalServes.focus();
  }
});

modalServes.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    saveModalEntry();
  }
});
