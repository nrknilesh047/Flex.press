// Printing Rates (per sq ft)
const RATES = {
    economy: 10,
    standard: 25,
    premium: 50
};

// --- Firebase Configuration ---
// TO USER: Replace with your actual Firebase config from the console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (Checks if keys are replaced)
let db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    // These scripts should be loaded in index.html as modules
    // but for simple flat file structure we use the global CDN version
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// Current State
let currentType = 'standard';

// DOM Elements
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const quantityInput = document.getElementById('quantity');
const nameInput = document.getElementById('name');
const addressInput = document.getElementById('address');
const totalPriceEl = document.getElementById('totalPrice');
const selectedFlexInput = document.getElementById('selectedFlex');
const designFileInput = document.getElementById('designFile');
const fileNameDisplay = document.getElementById('fileName');
const orderForm = document.getElementById('orderForm');

// Initialize
function init() {
    selectType('standard'); // Default selection

    // Add event listeners for inputs
    [widthInput, heightInput, quantityInput].forEach(input => {
        input.addEventListener('input', calculatePrice);
    });

    // File upload listener
    designFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = `Selected: ${e.target.files[0].name}`;
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    // Form Submit
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        openModal();
    });

    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 800);
        }, 3000);
    });

    // Check Helpline Availability
    checkHelplineAvailability();
    setInterval(checkHelplineAvailability, 60000); // Check every minute

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'gold';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Theme Toggle Listener
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme = 'gold';

            if (currentTheme === 'gold') {
                newTheme = 'dark';
            } else if (currentTheme === 'dark') {
                newTheme = 'light';
            } else if (currentTheme === 'light') {
                newTheme = 'cartoon';
            } else {
                newTheme = 'gold';
            }

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        // Reset classes
        icon.className = 'fa-solid';

        if (theme === 'gold') {
            icon.classList.add('fa-gem'); // Diamond
        } else if (theme === 'light') {
            icon.classList.add('fa-sun');
        } else if (theme === 'cartoon') {
            icon.classList.add('fa-face-smile');
        } else {
            icon.classList.add('fa-moon');
        }
    }
}

// Select Flex Type
window.selectType = function (type) {
    currentType = type;

    // Update visuals
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('selected');
        const indicator = card.querySelector('.select-indicator');
        if (indicator) indicator.textContent = 'Select';
    });

    const activeCard = document.querySelector(`.card[data-type="${type}"]`);
    if (activeCard) {
        activeCard.classList.add('selected');
        const indicator = activeCard.querySelector('.select-indicator');
        if (indicator) indicator.textContent = 'Selected';
    }

    // Update Input
    selectedFlexInput.value = type.charAt(0).toUpperCase() + type.slice(1);

    // Recalculate
    calculatePrice();
}

// Calculate Price
function calculatePrice() {
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 1;

    if (width > 0 && height > 0) {
        const area = width * height;
        const rate = RATES[currentType];
        const total = area * rate * quantity;

        totalPriceEl.textContent = `₹${total.toLocaleString()}`;
    } else {
        totalPriceEl.textContent = '₹0';
    }
}

// Check Helpline Availability (12 PM - 5 PM)
function checkHelplineAvailability() {
    const now = new Date();
    const hours = now.getHours(); // 0-23
    const helplineContainer = document.getElementById('helplineContainer');

    // 12 PM is 12, 5 PM is 17 (so strictly less than 17 means up to 16:59)
    if (hours >= 12 && hours < 17) {
        helplineContainer.style.display = 'block';
    } else {
        helplineContainer.style.display = 'none';
    }
}

// --- Payment Logic ---

// --- Payment Logic ---
let currentPaymentMode = 'full';

window.selectPaymentMethod = function (mode) {
    currentPaymentMode = mode;

    // Update UI
    document.querySelectorAll('.payment-option-label').forEach(label => {
        label.classList.remove('selected');
        const input = label.querySelector('input');
        if (input.value === mode) {
            label.classList.add('selected');
            input.checked = true;
        }
    });

    // Option: Update Estimated Cost logic here if you want to show "Payable Now"
    // For now, I'll rely on modal update.
}

function openModal() {
    const modal = document.getElementById('paymentModal');

    // Calculate Mode 
    const paymentRadios = document.getElementsByName('paymentMethod');
    for (const radio of paymentRadios) {
        if (radio.checked) {
            currentPaymentMode = radio.value;
            break;
        }
    }

    generateQR(currentPaymentMode);
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    // No need to reset QR section display since it's always visible in modal now
}

function generateQR(mode) {
    // Calculate Amount
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 1;
    const rate = RATES[currentType];
    const totalAmount = width * height * rate * quantity;

    let payingAmount = totalAmount;
    if (mode === 'half') {
        payingAmount = totalAmount / 2;
    }

    const modalTotal = document.getElementById('modalTotal');
    if (modalTotal) modalTotal.textContent = `₹${payingAmount.toLocaleString()}`;

    const payingAmountEl = document.getElementById('payingAmount');
    if (payingAmountEl) {
        payingAmountEl.textContent = `₹${payingAmount.toLocaleString()}`;
    }

    // Generate UPI Link
    const upiID = '8957183459@ibl';
    const upiName = 'RamFlex';
    const upiLink = `upi://pay?pa=${upiID}&pn=${upiName}&am=${payingAmount}&cu=INR`;

    // Generate QR Image
    const qrImage = document.getElementById('qrImage');
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
}

// Removed window.showQR as it is no longer used by buttons.
window.hideQR = function () {
    closeModal();
}

window.verifyPayment = function () {
    const utr = document.getElementById('utrNumber').value;
    if (utr.length < 12) {
        alert("Please enter a valid 12-digit UTR/Transaction ID");
        return;
    }

    // UI Feedback
    const qrSection = document.getElementById('qrSection');
    const loaderSection = document.getElementById('paymentLoader');
    const successSection = document.getElementById('paymentSuccess');
    const orderIdDisplay = document.getElementById('orderIdDisplay');

    if (qrSection) qrSection.style.display = 'none';
    if (loaderSection) loaderSection.style.display = 'flex';

    // Simulated Verification Delay
    const orderId = Math.floor(Math.random() * 1000000);
    setTimeout(() => {
        if (loaderSection) loaderSection.style.display = 'none';
        if (successSection) {
            successSection.style.display = 'flex';
            if (orderIdDisplay) orderIdDisplay.textContent = orderId;
        }

        setTimeout(() => {
            finishOrder(orderId);
            // Hide success section for next time
            if (successSection) successSection.style.display = 'none';
            if (qrSection) qrSection.style.display = 'block';
        }, 2000);
    }, 2500);
}

// Email Configuration
const OWNER_EMAIL = "nrknilesh047@gmail.com";

window.finishOrder = async function (orderId = Math.floor(Math.random() * 1000000)) {
    const name = nameInput.value;
    const phone = document.getElementById('phone') ? document.getElementById('phone').value : 'N/A';
    const email = document.getElementById('email') ? document.getElementById('email').value : 'N/A';
    const address = addressInput.value;
    const qty = quantityInput.value;
    const utr = document.getElementById('utrNumber') ? document.getElementById('utrNumber').value : 'N/A';
    const totalRaw = totalPriceEl.textContent.replace(/[^\d.]/g, '');
    const total = parseFloat(totalRaw);
    const designFile = designFileInput.files[0];

    const orderData = {
        orderId: `#${orderId}`,
        customerName: name,
        phone: phone,
        email: email,
        address: address,
        type: currentType.toUpperCase(),
        quantity: qty,
        totalCost: total,
        paymentMode: currentPaymentMode,
        utr: utr,
        status: 'Pending',
        timestamp: new Date().toISOString()
    };

    // 1. Save to Database (Local/Firebase)
    if (db) {
        try {
            await db.collection("orders").add(orderData);
            console.log("Order saved to database!");
        } catch (error) {
            console.error("Error saving order:", error);
        }
    } else {
        const localOrders = JSON.parse(localStorage.getItem('flex_orders') || '[]');
        localOrders.push(orderData);
        localStorage.setItem('flex_orders', JSON.stringify(localOrders));
        console.log("Saved to local database");
    }

    closeModal();

    // 2. Prepare Alert Message
    let message = `Order Placed Successfully!\n\nOrder ID: #${orderId}\nName: ${name}\nType: ${currentType.toUpperCase()}\nQuantity: ${qty}\nTotal Cost: ${totalPriceEl.textContent}\nAddress: ${address}`;

    if (currentPaymentMode === 'half') {
        message += `\n\nPAYMENT: 50% Advance Received (₹${total / 2}).\nBALANCE DUE: ₹${total / 2} (Pay at Shop).`;
    } else {
        message += `\n\nPAYMENT: Full Amount Paid (Online).\nStatus: Verified.`;
    }

    message += `\nUTR: ${utr}`;

    // 3. Send Email in Background
    sendOrderEmail(orderData, designFile);

    alert(message);

    // Reset Form
    orderForm.reset();
    selectType('standard');
    if (document.getElementById('utrNumber')) document.getElementById('utrNumber').value = '';
    fileNameDisplay.textContent = '';
}

// Function to send email via FormSubmit.co
async function sendOrderEmail(data, file) {
    const formData = new FormData();

    // Add hidden configuration for FormSubmit
    formData.append("_captcha", "false");
    formData.append("_template", "table");
    formData.append("_subject", `New Order #${data.orderId} from ${data.customerName}`);

    // Add Order Data
    formData.append("Order ID", data.orderId);
    formData.append("Customer Name", data.customerName);
    formData.append("Phone Number", data.phone);
    formData.append("Customer Email", data.email);
    formData.append("Delivery Address", data.address);
    formData.append("Flex Quality", data.type);
    formData.append("Quantity", data.quantity);
    formData.append("Total Cost", `₹${data.totalCost}`);
    formData.append("Payment Mode", data.paymentMode === 'half' ? '50% Advance' : 'Full Payment');
    formData.append("UTR/Transaction ID", data.utr);

    // Add File if exists
    if (file) {
        formData.append("Design File", file);
    }

    try {
        await fetch(`https://formsubmit.co/${OWNER_EMAIL}`, {
            method: "POST",
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log("Email sent successfully to owner.");
    } catch (error) {
        console.error("Failed to send email:", error);
    }
}

// Location Modal
window.openLocationModal = function () {
    const modal = document.getElementById('locationModal');
    if (modal) modal.style.display = 'flex';
}

window.closeLocationModal = function () {
    const modal = document.getElementById('locationModal');
    if (modal) modal.style.display = 'none';
}

// Start
init();
