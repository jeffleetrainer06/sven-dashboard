/**
 * Jeff Lee's Client Hub - Sales Console
 * Pedersen Toyota | Fort Collins
 */

// ========================================
// Data Store
// ========================================

const STORAGE_KEY = 'jefflee_clienthub';
const LINK_EXPIRY_DAYS = 90;

// Tool URLs
const TOOLS = {
    trade: {
        name: 'Trade-In Appraisal',
        url: 'https://pedersen-tradeappraisal.lovable.app/',
        icon: '📸'
    },
    payment: {
        name: 'Payment Calculator',
        url: '#payment-calculator',
        icon: '💰'
    },
    smartpath: {
        name: 'SmartPath',
        url: 'https://smartpath.pedersentoyota.com/how-it-works?dealerCd=05030&source=t3&zipcode=80525',
        icon: '🛒'
    },
    credit: {
        name: 'Credit Application',
        url: 'https://www.pedersentoyota.com/finance-application.htm',
        icon: '📝'
    },
    documents: {
        name: 'Upload Documents',
        url: '#upload-documents',
        icon: '📄'
    }
};

const LINKS = {
    inventory: {
        name: 'New Inventory',
        url: 'https://www.pedersentoyota.com/new-inventory/index.htm'
    },
    specials: {
        name: 'Current Specials',
        url: 'https://www.pedersentoyota.com/specials/new.htm'
    },
    directions: {
        name: 'Directions',
        url: 'https://www.google.com/maps/dir/?api=1&destination=Pedersen+Toyota+Fort+Collins+CO'
    },
    hours: {
        name: 'Hours & Info',
        url: 'https://www.pedersentoyota.com/dealership/hours-and-directions.htm'
    }
};

// State
let state = {
    customers: [],
    activeCustomerId: null
};

// ========================================
// Initialization
// ========================================

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            state = JSON.parse(saved);
            // Clean up expired customers
            const now = Date.now();
            state.customers = state.customers.filter(c => {
                const expiryDate = new Date(c.createdAt).getTime() + (LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
                return now < expiryDate;
            });
            saveState();
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCustomerList(btn.dataset.filter);
        });
    });

    // Chat input auto-resize
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });
    }
}

// ========================================
// Customer Management
// ========================================

function generateId() {
    return Math.random().toString(36).substring(2, 14);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function formatTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
}

function createCustomer(data) {
    const customer = {
        id: generateId(),
        name: data.name,
        firstName: data.firstName || data.name.split(' ')[0],
        lastName: data.lastName || data.name.split(' ').slice(1).join(' '),
        email: data.email || '',
        phone: data.phone || '',
        vehicleInterest: data.vehicleInterest || 'Not specified',
        leadSource: data.leadSource || 'internet',
        notes: data.notes || '',
        status: 'inquiry',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messages: [],
        activity: [],
        isOnline: false
    };

    // Add welcome message
    const vehicleText = data.vehicleInterest && data.vehicleInterest !== 'Not specified' 
        ? `find the perfect ${data.vehicleInterest}` 
        : 'find your perfect vehicle';
    
    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: `Hi ${customer.firstName}! Welcome to your personal vehicle shopping hub. I'm Jeff, and I'll be helping you ${vehicleText}. Feel free to use the tools below or message me anytime with questions!`,
        timestamp: new Date().toISOString()
    });

    state.customers.unshift(customer);
    saveState();
    return customer;
}

function getCustomer(id) {
    return state.customers.find(c => c.id === id);
}

function updateCustomer(id, updates) {
    const index = state.customers.findIndex(c => c.id === id);
    if (index !== -1) {
        state.customers[index] = { ...state.customers[index], ...updates };
        saveState();
    }
}

function deleteCustomerById(id) {
    state.customers = state.customers.filter(c => c.id !== id);
    if (state.activeCustomerId === id) {
        state.activeCustomerId = null;
        clearChatView();
    }
    saveState();
    renderCustomerList();
}

// ========================================
// UI Rendering
// ========================================

function renderCustomerList(filter = 'all', searchQuery = '') {
    const list = document.getElementById('customerList');
    const empty = document.getElementById('emptyCustomers');
    
    let customers = [...state.customers];
    
    // Apply search filter
    if (searchQuery) {
        customers = customers.filter(c => 
            c.name.toLowerCase().includes(searchQuery) ||
            c.email.toLowerCase().includes(searchQuery) ||
            c.vehicleInterest.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply status filters
    if (filter === 'active') {
        customers = customers.filter(c => {
            const lastActivity = new Date(c.lastActivity);
            const hourAgo = new Date(Date.now() - 3600000);
            return lastActivity > hourAgo;
        });
    } else if (filter === 'followup') {
        customers = customers.filter(c => {
            return c.messages.some(m => m.type === 'received' && !m.read);
        });
    }

    if (customers.length === 0 && state.customers.length === 0) {
        empty.style.display = 'flex';
        list.innerHTML = '';
        list.appendChild(empty);
        return;
    }

    empty.style.display = 'none';
    
    if (customers.length === 0 && searchQuery) {
        list.innerHTML = '<div class="no-results">No customers match your search</div>';
        return;
    }
    
    list.innerHTML = customers.map(customer => {
        const isActive = customer.id === state.activeCustomerId;
        const hasUnread = customer.messages.some(m => m.type === 'received' && !m.read);
        const lastMessage = customer.messages[customer.messages.length - 1];
        const preview = lastMessage ? lastMessage.text.substring(0, 35) + (lastMessage.text.length > 35 ? '...' : '') : '';
        const statusEmoji = getStatusEmoji(customer.status || 'inquiry');
        
        return `
            <div class="customer-card ${isActive ? 'active' : ''}" onclick="selectCustomer('${customer.id}')">
                <div class="customer-main">
                    <div class="customer-name-row">
                        <span class="customer-name">${customer.name}</span>
                        <span class="customer-time">${formatTime(customer.lastActivity)}</span>
                    </div>
                    <div class="customer-vehicle-row">
                        <span class="customer-vehicle">🚗 ${customer.vehicleInterest}</span>
                        <span class="status-badge">${statusEmoji}</span>
                    </div>
                    <div class="customer-preview">${preview}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusEmoji(status) {
    const statuses = {
        inquiry: '📋 Inquiry',
        active: '🟢 Active',
        appointment: '📅 Appointment',
        pending: '⏳ Pending',
        sold: '✅ Sold',
        lost: '❌ Lost'
    };
    return statuses[status] || '📋 Inquiry';
}

function selectCustomer(id) {
    state.activeCustomerId = id;
    renderCustomerList();
    renderChatView(id);
    renderCustomerDetails(id);
    updateHeaderStats();
    
    // Show chat input and actions
    document.getElementById('chatInputContainer').style.display = 'block';
    document.getElementById('chatActions').style.display = 'flex';
    document.getElementById('chatCustomerMeta').style.display = 'flex';
}

function renderChatView(customerId) {
    const customer = getCustomer(customerId);
    if (!customer) return;

    // Update header
    document.getElementById('chatCustomerName').textContent = customer.name;
    document.getElementById('chatEmail').textContent = `✉️ ${customer.email || 'No email'}`;
    document.getElementById('chatVehicle').textContent = customer.vehicleInterest || 'No vehicle specified';
    document.getElementById('chatStatusDropdown').value = customer.status || 'inquiry';

    // Render messages
    const container = document.getElementById('chatMessages');
    document.getElementById('chatPlaceholder').style.display = 'none';
    
    container.innerHTML = customer.messages.map(msg => `
        <div class="message ${msg.type}">
            <div class="message-bubble">
                ${msg.text}
                ${msg.tool ? `<div class="message-tool">${TOOLS[msg.tool]?.icon || '🔗'} Sent: ${TOOLS[msg.tool]?.name || msg.tool}</div>` : ''}
            </div>
            <span class="message-time">${formatTime(msg.timestamp)}</span>
        </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Mark messages as read
    customer.messages.forEach(m => {
        if (m.type === 'received') m.read = true;
    });
    saveState();
}

function renderCustomerDetails(customerId) {
    const customer = getCustomer(customerId);
    
    if (!customer) {
        document.getElementById('detailsEmpty').style.display = 'flex';
        document.getElementById('detailsContent').style.display = 'none';
        return;
    }

    document.getElementById('detailsEmpty').style.display = 'none';
    document.getElementById('detailsContent').style.display = 'block';

    // Update detail fields
    document.getElementById('customerStatus').value = customer.status || 'inquiry';
    document.getElementById('detailEmail').textContent = customer.email || '-';
    document.getElementById('detailPhone').textContent = customer.phone || '-';
    document.getElementById('detailVehicle').textContent = customer.vehicleInterest || '-';
    document.getElementById('detailLastActivity').textContent = formatTime(customer.lastActivity);
}

function updateCustomerStatus() {
    if (!state.activeCustomerId) return;
    
    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;

    // Sync both dropdowns
    const chatDropdown = document.getElementById('chatStatusDropdown');
    const detailsDropdown = document.getElementById('customerStatus');
    
    const newStatus = chatDropdown ? chatDropdown.value : detailsDropdown.value;
    
    customer.status = newStatus;
    
    // Sync the other dropdown
    if (chatDropdown) chatDropdown.value = newStatus;
    if (detailsDropdown) detailsDropdown.value = newStatus;
    
    saveState();
    renderCustomerList();
}

function updateHeaderStats() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    const activeCount = state.customers.filter(c => {
        const lastActivity = new Date(c.lastActivity).getTime();
        return lastActivity > hourAgo || c.isOnline;
    }).length;
    
    const unreadCount = state.customers.filter(c => 
        c.messages.some(m => m.type === 'received' && !m.read)
    ).length;
    
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('unreadCount').textContent = unreadCount;
}

function clearChatView() {
    document.getElementById('chatCustomerName').textContent = 'Select a customer';
    document.getElementById('chatCustomerMeta').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = `
        <div class="chat-placeholder" id="chatPlaceholder">
            <div class="placeholder-icon">💬</div>
            <p>Select a customer to view conversation</p>
        </div>
    `;
    document.getElementById('chatInputContainer').style.display = 'none';
    document.getElementById('chatActions').style.display = 'none';
    document.getElementById('detailsEmpty').style.display = 'flex';
    document.getElementById('detailsContent').style.display = 'none';
}

function getDayNumber(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ========================================
// Chat Functions
// ========================================

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text || !state.activeCustomerId) return;

    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;

    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: text,
        timestamp: new Date().toISOString()
    });

    customer.lastActivity = new Date().toISOString();
    saveState();

    input.value = '';
    input.style.height = 'auto';
    renderChatView(state.activeCustomerId);
    renderCustomerList();
}

function handleChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendTool(toolKey) {
    if (!state.activeCustomerId) {
        showToast('Select a customer first');
        return;
    }

    const tool = TOOLS[toolKey];
    if (!tool) return;

    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;

    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: `Here's a helpful tool for you:`,
        tool: toolKey,
        timestamp: new Date().toISOString()
    });

    customer.lastActivity = new Date().toISOString();
    saveState();

    renderChatView(state.activeCustomerId);
    renderCustomerList();
    showToast(`${tool.name} sent to ${customer.name.split(' ')[0]}`);
}

function sendLink(linkKey) {
    if (!state.activeCustomerId) {
        showToast('Select a customer first');
        return;
    }

    const link = LINKS[linkKey];
    if (!link) return;

    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;

    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: `Check out our ${link.name}: ${link.url}`,
        timestamp: new Date().toISOString()
    });

    customer.lastActivity = new Date().toISOString();
    saveState();

    renderChatView(state.activeCustomerId);
    renderCustomerList();
    showToast(`Link sent to ${customer.name.split(' ')[0]}`);
}

// ========================================
// Modal Functions
// ========================================

function openAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.add('active');
    document.getElementById('customerName').focus();
}

function closeAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('active');
    document.getElementById('addCustomerForm').reset();
}

function handleAddCustomer(event) {
    event.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    
    const data = {
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        email: document.getElementById('customerEmail').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        vehicleInterest: document.getElementById('vehicleInterest').value.trim() || 'Not specified',
        leadSource: document.getElementById('leadSource').value,
        notes: document.getElementById('customerNotes').value.trim()
    };

    const customer = createCustomer(data);
    
    // Generate and copy link
    const hubUrl = getCustomerHubUrl(customer.id);
    copyToClipboard(hubUrl);

    closeAddCustomerModal();
    renderCustomerList();
    selectCustomer(customer.id);
    
    showToast(`Hub created for ${firstName}! Link copied to clipboard`);
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    renderCustomerList('all', query);
}

function openVehicleRequestForm() {
    // TODO: Implement vehicle request form modal
    showToast('Vehicle Request Form coming soon');
}

// ========================================
// Customer Actions
// ========================================

function copyCustomerLink() {
    if (!state.activeCustomerId) return;
    const url = getCustomerHubUrl(state.activeCustomerId);
    copyToClipboard(url);
    showToast('Hub link copied to clipboard!');
}

function viewCustomerHub() {
    if (!state.activeCustomerId) return;
    const url = getCustomerHubUrl(state.activeCustomerId);
    window.open(url, '_blank');
}

function editCustomer() {
    // TODO: Implement edit modal
    showToast('Edit feature coming soon');
}

function deleteCustomer() {
    if (!state.activeCustomerId) return;
    
    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;

    if (confirm(`Delete ${customer.name}'s hub? This cannot be undone.`)) {
        deleteCustomerById(state.activeCustomerId);
        showToast('Customer deleted');
    }
}

function getCustomerHubUrl(customerId) {
    // In production, this would be a proper URL
    // For now, use the same origin with a query parameter
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'hub.html');
    return `${baseUrl}?c=${customerId}`;
}

// ========================================
// Utility Functions
// ========================================

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
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
// Simulate receiving messages (for demo)
// ========================================

// In production, this would be replaced with WebSocket or polling
function simulateCustomerMessage(customerId, text) {
    const customer = getCustomer(customerId);
    if (!customer) return;

    customer.messages.push({
        id: generateId(),
        type: 'received',
        text: text,
        timestamp: new Date().toISOString(),
        read: false
    });

    customer.lastActivity = new Date().toISOString();
    customer.isOnline = true;
    saveState();

    renderCustomerList();
    if (state.activeCustomerId === customerId) {
        renderChatView(customerId);
    }
}

// ========================================
// Quick Actions
// ========================================

function getTextLink() {
    if (!state.activeCustomerId) return;
    const url = getCustomerHubUrl(state.activeCustomerId);
    copyToClipboard(url);
    showToast('Hub link copied! Ready to text to customer.');
}

function sendPortalInvite() {
    if (!state.activeCustomerId) return;
    
    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;
    
    const url = getCustomerHubUrl(state.activeCustomerId);
    
    const inviteMessage = `Hi ${customer.firstName}! 👋

I've set up your personal Client Hub dashboard where you can:

✅ Track your vehicle search progress
✅ Chat with me directly anytime
✅ Access resources and updates

Click here to access your hub: ${url}`;

    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: inviteMessage,
        timestamp: new Date().toISOString()
    });
    
    customer.lastActivity = new Date().toISOString();
    saveState();
    renderChatView(state.activeCustomerId);
    renderCustomerList();
    showToast('Portal invite sent in chat!');
}

function textTradeAppraisal() {
    if (!state.activeCustomerId) return;
    copyToClipboard('https://pedersen-tradeappraisal.lovable.app/');
    showToast('Trade appraisal link copied! Ready to text to customer.');
}

function scheduleTestDrive() {
    if (!state.activeCustomerId) {
        showToast('Select a customer first');
        return;
    }
    
    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;
    
    const message = `I'd love to get you scheduled for a test drive! What day and time works best for you this week? We're open Monday-Saturday 9am-7pm.`;
    
    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: message,
        timestamp: new Date().toISOString()
    });
    
    customer.lastActivity = new Date().toISOString();
    saveState();
    renderChatView(state.activeCustomerId);
    showToast('Test drive message sent!');
}

function explainReservation() {
    if (!state.activeCustomerId) {
        showToast('Select a customer first');
        return;
    }
    
    const customer = getCustomer(state.activeCustomerId);
    if (!customer) return;
    
    const message = `Here's how our reservation process works:

1️⃣ **Reserve your vehicle** - A small refundable deposit holds your chosen vehicle
2️⃣ **Complete paperwork online** - Use SmartPath to start your financing application
3️⃣ **Schedule delivery** - Pick a time that works for you
4️⃣ **Drive home happy** - We'll have everything ready when you arrive

Want me to start a reservation for you?`;
    
    customer.messages.push({
        id: generateId(),
        type: 'sent',
        text: message,
        timestamp: new Date().toISOString()
    });
    
    customer.lastActivity = new Date().toISOString();
    saveState();
    renderChatView(state.activeCustomerId);
    showToast('Reservation explanation sent!');
}

// Update LINKS with new options
const LINKS = {
    toyota: {
        name: 'Toyota.com',
        url: 'https://www.toyota.com/'
    },
    smartpath: {
        name: 'SmartPath',
        url: 'https://smartpath.pedersentoyota.com/how-it-works?dealerCd=05030&source=t3&zipcode=80525'
    },
    accessories: {
        name: 'AIM Accessories',
        url: 'https://parts.pedersentoyota.com/'
    },
    inventory: {
        name: 'New Inventory',
        url: 'https://www.pedersentoyota.com/new-inventory/index.htm'
    },
    specials: {
        name: 'Current Specials',
        url: 'https://www.pedersentoyota.com/specials/new.htm'
    },
    directions: {
        name: 'Directions',
        url: 'https://www.google.com/maps/dir/?api=1&destination=Pedersen+Toyota+Fort+Collins+CO'
    },
    hours: {
        name: 'Hours & Info',
        url: 'https://www.pedersentoyota.com/dealership/hours-and-directions.htm'
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderCustomerList();
    setupEventListeners();
    updateHeaderStats();
});

// Expose for testing
window.simulateMessage = simulateCustomerMessage;
