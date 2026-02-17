/**
 * Jeff Lee's Client Hub - Customer View
 * Pedersen Toyota | Fort Collins
 */

// ========================================
// Configuration
// ========================================

const STORAGE_KEY = 'jefflee_clienthub';
const POLL_INTERVAL = 5000; // Check for new messages every 5 seconds

// ========================================
// State
// ========================================

let customerId = null;
let customer = null;
let lastMessageCount = 0;

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Get customer ID from URL
    const params = new URLSearchParams(window.location.search);
    customerId = params.get('c');

    if (!customerId) {
        showError('Invalid hub link. Please contact Jeff for a new link.');
        return;
    }

    loadCustomerData();
    startPolling();
});

function loadCustomerData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            showError('Hub not found. Please contact Jeff for assistance.');
            return;
        }

        const state = JSON.parse(saved);
        customer = state.customers.find(c => c.id === customerId);

        if (!customer) {
            showError('This hub link has expired or been removed. Please contact Jeff for a new link.');
            return;
        }

        // Check expiry (90 days)
        const createdAt = new Date(customer.createdAt);
        const expiryDate = new Date(createdAt.getTime() + (90 * 24 * 60 * 60 * 1000));
        if (new Date() > expiryDate) {
            showError('This hub link has expired. Please contact Jeff for a new link.');
            return;
        }

        // Update customer name in welcome
        document.getElementById('customerFirstName').textContent = customer.name.split(' ')[0];

        // Mark as online
        updateCustomerStatus(true);

        // Record activity
        recordActivity('opened_hub');

        // Render messages
        renderMessages();
        lastMessageCount = customer.messages.length;

    } catch (e) {
        console.error('Error loading customer data:', e);
        showError('Something went wrong. Please try refreshing the page.');
    }
}

// ========================================
// Message Functions
// ========================================

function renderMessages() {
    if (!customer) return;

    const container = document.getElementById('hubChatMessages');
    
    if (customer.messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <p>No messages yet. Say hi to Jeff!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = customer.messages.map(msg => `
        <div class="message ${msg.type === 'sent' ? 'received' : 'sent'}">
            <div class="message-bubble">
                ${formatMessageText(msg.text)}
                ${msg.tool ? renderToolButton(msg.tool) : ''}
            </div>
            <span class="message-time">${formatTime(msg.timestamp)}</span>
        </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Update message count
    const count = customer.messages.length;
    document.getElementById('messageCount').textContent = count > 0 ? `${count}` : '';
}

function formatMessageText(text) {
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
}

function renderToolButton(toolKey) {
    const tools = {
        trade: { name: 'Trade-In Appraisal', url: 'https://pedersen-tradeappraisal.lovable.app/', icon: '📸' },
        payment: { name: 'Payment Calculator', action: 'openPaymentCalculator()', icon: '💰' },
        smartpath: { name: 'SmartPath', url: 'https://smartpath.pedersentoyota.com/how-it-works?dealerCd=05030&source=t3&zipcode=80525', icon: '🛒' },
        credit: { name: 'Credit Application', url: 'https://www.pedersentoyota.com/finance-application.htm', icon: '📝' },
        documents: { name: 'Upload Documents', action: 'openDocumentModal()', icon: '📄' }
    };

    const tool = tools[toolKey];
    if (!tool) return '';

    if (tool.url) {
        return `
            <a href="${tool.url}" target="_blank" class="message-tool-link" onclick="recordActivity('used_${toolKey}')">
                ${tool.icon} ${tool.name} →
            </a>
        `;
    } else {
        return `
            <button onclick="${tool.action}; recordActivity('used_${toolKey}')" class="message-tool-link">
                ${tool.icon} ${tool.name} →
            </button>
        `;
    }
}

function sendHubMessage() {
    const input = document.getElementById('hubChatInput');
    const text = input.value.trim();
    
    if (!text || !customer) return;

    // Add message to customer's messages (as received from their perspective)
    customer.messages.push({
        id: generateId(),
        type: 'received', // From Jeff's perspective, this is received
        text: text,
        timestamp: new Date().toISOString(),
        read: false
    });

    customer.lastActivity = new Date().toISOString();
    saveCustomerData();

    input.value = '';
    renderMessages();
    
    showToast('Message sent to Jeff!');
}

function handleHubChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendHubMessage();
    }
}

// ========================================
// Payment Calculator
// ========================================

function openPaymentCalculator() {
    document.getElementById('paymentModal').classList.add('active');
    recordActivity('opened_payment');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

function calculatePayment(event) {
    event.preventDefault();

    const price = parseFloat(document.getElementById('vehiclePrice').value) || 0;
    const down = parseFloat(document.getElementById('downPayment').value) || 0;
    const trade = parseFloat(document.getElementById('tradeValue').value) || 0;
    const term = parseInt(document.getElementById('loanTerm').value) || 60;
    const apr = parseFloat(document.getElementById('interestRate').value) || 6.9;

    // Fort Collins tax rate
    const taxRate = 0.083;
    const fees = 996.70; // Doc fee + title + registration

    // Calculations
    const tax = price * taxRate;
    const outTheDoor = price + tax + fees;
    const amountFinanced = outTheDoor - down - trade;
    
    // Monthly payment calculation (PMT formula)
    const monthlyRate = (apr / 100) / 12;
    let monthlyPayment;
    
    if (monthlyRate === 0) {
        monthlyPayment = amountFinanced / term;
    } else {
        monthlyPayment = amountFinanced * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    }

    // Display results
    document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
    document.getElementById('resultPrice').textContent = formatCurrency(price);
    document.getElementById('resultTax').textContent = formatCurrency(tax);
    document.getElementById('resultDown').textContent = '-' + formatCurrency(down);
    document.getElementById('resultTrade').textContent = '-' + formatCurrency(trade);
    document.getElementById('resultFinanced').textContent = formatCurrency(amountFinanced);

    document.getElementById('paymentResult').style.display = 'block';
    
    recordActivity('calculated_payment');
}

// ========================================
// Document Upload
// ========================================

function openDocumentUpload() {
    document.getElementById('documentModal').classList.add('active');
    recordActivity('opened_documents');
}

function closeDocumentModal() {
    document.getElementById('documentModal').classList.remove('active');
}

let selectedFiles = [];

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = [...selectedFiles, ...files];
    renderUploadedFiles();
}

function renderUploadedFiles() {
    const container = document.getElementById('uploadedFiles');
    const submitBtn = document.getElementById('submitDocsBtn');
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        submitBtn.disabled = true;
        return;
    }

    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="uploaded-file">
            <span>📎 ${file.name}</span>
            <button onclick="removeFile(${index})">✕</button>
        </div>
    `).join('');

    submitBtn.disabled = false;
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderUploadedFiles();
}

function submitDocuments() {
    if (selectedFiles.length === 0) return;

    // In production, this would upload to a server
    // For now, just record the activity and show confirmation
    
    const fileNames = selectedFiles.map(f => f.name).join(', ');
    
    // Add message about uploaded documents
    customer.messages.push({
        id: generateId(),
        type: 'received',
        text: `I've uploaded the following documents: ${fileNames}`,
        timestamp: new Date().toISOString(),
        read: false
    });

    customer.lastActivity = new Date().toISOString();
    saveCustomerData();
    recordActivity('uploaded_docs');

    selectedFiles = [];
    closeDocumentModal();
    renderMessages();
    
    showToast('Documents sent to Jeff!');
}

// ========================================
// Activity Tracking
// ========================================

function recordActivity(action) {
    if (!customer) return;
    
    if (!customer.activity.includes(action)) {
        customer.activity.push(action);
        saveCustomerData();
    }
}

function updateCustomerStatus(isOnline) {
    if (!customer) return;
    customer.isOnline = isOnline;
    customer.lastActivity = new Date().toISOString();
    saveCustomerData();
}

// ========================================
// Data Persistence
// ========================================

function saveCustomerData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const state = JSON.parse(saved);
        const index = state.customers.findIndex(c => c.id === customerId);
        
        if (index !== -1) {
            state.customers[index] = customer;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    } catch (e) {
        console.error('Error saving customer data:', e);
    }
}

// ========================================
// Polling for New Messages
// ========================================

function startPolling() {
    setInterval(() => {
        checkForNewMessages();
    }, POLL_INTERVAL);

    // Also check when window regains focus
    window.addEventListener('focus', checkForNewMessages);
}

function checkForNewMessages() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const state = JSON.parse(saved);
        const updatedCustomer = state.customers.find(c => c.id === customerId);
        
        if (updatedCustomer && updatedCustomer.messages.length > lastMessageCount) {
            customer = updatedCustomer;
            lastMessageCount = customer.messages.length;
            renderMessages();
            
            // Show notification for new messages
            const newMessages = customer.messages.slice(-1)[0];
            if (newMessages.type === 'sent') { // Sent by Jeff
                showToast('New message from Jeff!');
            }
        }
    } catch (e) {
        console.error('Error checking for new messages:', e);
    }
}

// ========================================
// Utility Functions
// ========================================

function generateId() {
    return Math.random().toString(36).substring(2, 14);
}

function formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString();
}

function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function showError(message) {
    document.querySelector('.hub-main').innerHTML = `
        <div class="hub-error">
            <div class="error-icon">⚠️</div>
            <h3>Oops!</h3>
            <p>${message}</p>
            <div class="error-contact">
                <p>Contact Jeff directly:</p>
                <a href="tel:720-416-6955" class="btn btn-primary">📞 720-416-6955</a>
                <a href="mailto:jlee@pedersentoyota.com" class="btn btn-secondary">📧 Email Jeff</a>
            </div>
        </div>
    `;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// ========================================
// Handle page visibility
// ========================================

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        updateCustomerStatus(false);
    } else {
        updateCustomerStatus(true);
        checkForNewMessages();
    }
});

// Update status when leaving
window.addEventListener('beforeunload', () => {
    updateCustomerStatus(false);
});
