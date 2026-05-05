// frontend/js/chat.js
// Global Chat System for all roles

class ChatSystem {
    constructor() {
        this.isOpen = false;
        this.unreadCount = 0;
        this.messages = [];
        this.currentTab = 'messages';
        this.createChatButton();
        this.loadUnreadCount();
        // Poll for new messages every 10 seconds
        setInterval(() => {
            if (this.isOpen && this.currentTab === 'messages') {
                this.loadMessages(true);
            }
            this.loadUnreadCount();
        }, 10000);
    }
    
    createChatButton() {
        const chatBtn = document.createElement('div');
        chatBtn.id = 'chatButton';
        chatBtn.className = 'chat-button';
        chatBtn.innerHTML = `
            <span class="chat-icon">💬</span>
            <span class="chat-badge" id="chatBadge" style="display:none;">0</span>
        `;
        chatBtn.onclick = () => this.toggleChatWindow();
        document.body.appendChild(chatBtn);
        
        // Styles have been moved to main.css
    }
    
    toggleChatWindow() {
        const existing = document.getElementById('chatWindow');
        if (existing) {
            existing.remove();
            this.isOpen = false;
        } else {
            this.createChatWindow();
            this.isOpen = true;
        }
    }
    
    createChatWindow() {
        const user = auth.getCurrentUser();
        const window = document.createElement('div');
        window.id = 'chatWindow';
        window.className = 'chat-window';
        window.innerHTML = `
            <div class="chat-header">
                <span>💬 Team Communication</span>
                <button class="close-btn" onclick="document.getElementById('chatWindow').remove(); chatSystem.isOpen = false;">&times;</button>
            </div>
            <div class="chat-tabs">
                <button class="chat-tab active" data-tab="messages">Messages</button>
                <button class="chat-tab" data-tab="requests">Requests</button>
                <button class="chat-tab" data-tab="notifications">Notifications</button>
            </div>
            <div id="chatMessagesPanel" class="chat-messages">
                <div class="loading">Loading messages...</div>
            </div>
            <div id="chatRequestsPanel" class="chat-messages" style="display:none;">
                <div class="requests-header">
                    <button class="btn btn-primary btn-sm" onclick="chatSystem.showRequestForm()">+ New Request</button>
                </div>
                <div id="requestFormContainer" style="display:none;"></div>
                <div id="requestsList"></div>
            </div>
            <div id="chatNotificationsPanel" class="chat-messages" style="display:none;">
                <div class="loading">Loading notifications...</div>
            </div>
            <div class="chat-input-area" id="messageInputArea">
                <select id="chatRecipient" class="recipient-select">
                    <option value="all">Everyone</option>
                    <option value="admin">Admin</option>
                    <option value="sales">Sales Team</option>
                    <option value="warehouse">Warehouse Team</option>
                    <option value="supply">Supply Team</option>
                </select>
                <textarea id="chatInput" class="chat-input" placeholder="Type your message..." rows="1"></textarea>
                <button class="btn btn-primary btn-sm" onclick="chatSystem.sendMessage()">Send</button>
            </div>
        `;
        document.body.appendChild(window);
        
        // Tab switching
        window.querySelectorAll('.chat-tab').forEach(tab => {
            tab.onclick = () => {
                window.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                
                document.getElementById('chatMessagesPanel').style.display = tab.dataset.tab === 'messages' ? 'block' : 'none';
                document.getElementById('chatRequestsPanel').style.display = tab.dataset.tab === 'requests' ? 'block' : 'none';
                document.getElementById('chatNotificationsPanel').style.display = tab.dataset.tab === 'notifications' ? 'block' : 'none';
                
                // Show/hide message input area based on tab
                const messageInputArea = document.getElementById('messageInputArea');
                if (messageInputArea) {
                    messageInputArea.style.display = tab.dataset.tab === 'messages' ? 'flex' : 'none';
                }
                
                if (tab.dataset.tab === 'messages') this.loadMessages();
                if (tab.dataset.tab === 'requests') this.loadRequests();
                if (tab.dataset.tab === 'notifications') this.loadNotifications();
            };
        });
        
        this.loadMessages();
    }
    
    async sendMessage() {
        const recipient = document.getElementById('chatRecipient').value;
        const message = document.getElementById('chatInput').value.trim();
        if (!message) return;
        
        try {
            await apiCall('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    recipient_role: recipient === 'all' ? null : recipient,
                    message: message
                })
            });
            document.getElementById('chatInput').value = '';
            this.loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }
    
    async loadMessages(silent = false) {
        const container = document.getElementById('chatMessagesPanel');
        if (!container) return;
        
        if (!silent) {
            container.innerHTML = '<div class="loading">Loading messages...</div>';
        }
        
        try {
            const response = await apiCall('/messages');
            const messages = response.data || [];
            
            if (messages.length === 0) {
                container.innerHTML = '<div class="empty-state">No messages yet. Start a conversation!</div>';
                return;
            }
            
            const currentUser = auth.getCurrentUser();
            container.innerHTML = messages.map(msg => {
                const isSent = msg.sender_id === currentUser?.id;
                const recipientInfo = msg.recipient_role
                    ? `To: ${msg.recipient_role}`
                    : msg.recipient_id
                        ? 'Direct Message'
                        : 'To: Everyone';
                
                return `
                <div class="chat-message ${isSent ? 'sent' : 'received'}">
                    <div class="message-header">
                        <span class="sender">${escapeHtml(msg.sender_name)} (${msg.sender_role})</span>
                        <span class="recipient-info">${recipientInfo}</span>
                    </div>
                    <div class="message-text">${escapeHtml(msg.message)}</div>
                    <div class="message-footer">
                        <span class="time">${new Date(msg.created_at).toLocaleString()}</span>
                        ${!isSent ? `<button class="btn-reply" onclick="chatSystem.replyToMessage(${msg.sender_id}, '${escapeHtml(msg.sender_name)}')">Reply</button>` : ''}
                    </div>
                </div>
            `}).join('');
            
            if (!silent) {
                container.scrollTop = container.scrollHeight;
            }
            
        } catch (error) {
            if (!silent) {
                container.innerHTML = '<div class="error-state">Failed to load messages</div>';
            }
        }
    }
    
    replyToMessage(senderId, senderName) {
        document.getElementById('chatRecipient').value = 'all';
        document.getElementById('chatInput').value = `@${senderName} `;
        document.getElementById('chatInput').focus();
    }
    
    showRequestForm() {
        const formContainer = document.getElementById('requestFormContainer');
        const requestsList = document.getElementById('requestsList');
        const header = document.querySelector('.requests-header');
        
        // Create form if it doesn't exist yet
        if (!formContainer.innerHTML.trim()) {
            formContainer.innerHTML = `
                <div class="request-form" style="padding: 16px; background: var(--bg-secondary, #f5f5f5); border-radius: 8px; margin: 12px;">
                    <h4 style="margin: 0 0 12px 0;">Create New Request</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Request Type *</label>
                        <select id="requestType" style="width: 100%; padding: 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px;">
                            <option value="">Select Request Type</option>
                            <option value="PRODUCT_UPDATE">Product Update</option>
                            <option value="INVENTORY_ADJUSTMENT">Inventory Adjustment</option>
                            <option value="ORDER_MODIFICATION">Order Modification</option>
                            <option value="SUPPLIER_CHANGE">Supplier Change</option>
                            <option value="PRICE_CHANGE">Price Change</option>
                            <option value="DELETE_SUPPLIER">Delete Supplier</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Target Role *</label>
                        <select id="requestTarget" style="width: 100%; padding: 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px;">
                            <option value="admin">Admin</option>
                            <option value="sales">Sales Team</option>
                            <option value="warehouse">Warehouse Team</option>
                            <option value="supply">Supply Team</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Entity Name/ID (optional)</label>
                        <input type="text" id="requestEntity" placeholder="e.g., Product SKU, Supplier Name..." style="width: 100%; padding: 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Reason/Description *</label>
                        <textarea id="requestReason" rows="3" placeholder="Describe what you need..." style="width: 100%; padding: 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px; resize: vertical;"></textarea>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm" onclick="chatSystem.submitRequest()">Submit Request</button>
                        <button class="btn btn-secondary btn-sm" onclick="chatSystem.hideRequestForm()">Cancel</button>
                    </div>
                </div>
            `;
        }
        
        formContainer.style.display = 'block';
        requestsList.style.display = 'none';
        if (header) header.style.display = 'none';
    }
    
    hideRequestForm() {
        const formContainer = document.getElementById('requestFormContainer');
        const requestsList = document.getElementById('requestsList');
        const header = document.querySelector('.requests-header');
        
        formContainer.style.display = 'none';
        requestsList.style.display = 'block';
        if (header) {
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.padding = '8px 12px';
        }
    }
    
    async submitRequest() {
        const requestType = document.getElementById('requestType').value;
        const targetRole = document.getElementById('requestTarget').value;
        const entityName = document.getElementById('requestEntity').value.trim();
        const reason = document.getElementById('requestReason').value.trim();
        
        if (!requestType) {
            showToast('Please select a request type', 'error');
            return;
        }
        
        if (!reason) {
            showToast('Please provide a reason for your request', 'error');
            return;
        }
        
        try {
            await apiCall('/requests', {
                method: 'POST',
                body: JSON.stringify({
                    request_type: requestType,
                    entity_name: entityName || null,
                    reason: reason,
                    target_role: targetRole
                })
            });
            
            showToast('Request submitted successfully!', 'success');
            
            // Clear form fields
            document.getElementById('requestType').value = '';
            document.getElementById('requestEntity').value = '';
            document.getElementById('requestReason').value = '';
            
            this.hideRequestForm();
            this.loadRequests();
        } catch (error) {
            console.error('Failed to submit request:', error);
            showToast('Failed to submit request. Please try again.', 'error');
        }
    }
    
    async loadRequests() {
        const container = document.getElementById('requestsList');
        if (!container) return;
        
        try {
            const response = await apiCall('/requests?status=pending');
            const requests = response.data || [];
            
            if (requests.length === 0) {
                container.innerHTML = '<div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted, #666);">No pending requests</div>';
                return;
            }
            
            const currentUser = auth.getCurrentUser();
            container.innerHTML = requests.map(req => `
                <div class="request-item" style="padding: 12px; border-bottom: 1px solid var(--border-light, #eee);">
                    <div class="request-title" style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(req.request_type)}${req.entity_name ? ' - ' + escapeHtml(req.entity_name) : ''}</div>
                    <div class="request-details" style="font-size: 0.9em; color: var(--text-muted, #666); margin-bottom: 4px;">
                        Requested by: ${escapeHtml(req.requester_name || req.requested_by_name || 'Unknown')} (${req.requester_role || 'Unknown'})
                    </div>
                    <div class="request-reason" style="margin-bottom: 4px;">${escapeHtml(req.reason)}</div>
                    <div class="request-meta" style="font-size: 0.85em; color: var(--text-muted, #666);">
                        Target: ${escapeHtml(req.target_role || 'admin')} | ${new Date(req.created_at).toLocaleString()}
                    </div>
                    ${currentUser && currentUser.role === 'admin' ? `
                        <div class="request-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="btn btn-success btn-sm" onclick="chatSystem.approveRequest(${req.id})">✓ Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="chatSystem.denyRequest(${req.id})">✕ Deny</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load requests:', error);
            container.innerHTML = '<div class="error-state" style="padding: 24px; text-align: center; color: var(--danger, #dc3545);">Failed to load requests</div>';
        }
    }
    
    async loadNotifications() {
        const container = document.getElementById('chatNotificationsPanel');
        try {
            const response = await apiCall('/notifications');
            const notifications = response.data || [];
            
            if (notifications.length === 0) {
                container.innerHTML = '<div class="empty-state">No notifications</div>';
                return;
            }
            
            container.innerHTML = notifications.map(notif => `
                <div class="notification-item" style="padding: 12px; border-bottom: 1px solid var(--border-light);">
                    <div class="notification-title">${escapeHtml(notif.title)}</div>
                    <div class="notification-message">${escapeHtml(notif.message)}</div>
                    <div class="notification-time">${new Date(notif.created_at).toLocaleString()}</div>
                </div>
            `).join('');
            
        } catch (error) {
            container.innerHTML = '<div class="error-state">Failed to load notifications</div>';
        }
    }
    
    async loadUnreadCount() {
        try {
            const response = await apiCall('/messages/unread');
            const count = response.count || 0;
            const badge = document.getElementById('chatBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 9 ? '9+' : count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to get unread count:', error);
        }
    }
    
    async approveRequest(requestId) {
        try {
            await apiCall(`/requests/${requestId}/approve`, { method: 'POST' });
            this.loadRequests();
            showToast('Request approved', 'success');
        } catch (error) {
            showToast('Failed to approve request', 'error');
        }
    }
    
    async denyRequest(requestId) {
        const reason = prompt('Please provide a reason for denying this request:');
        if (!reason) {
            showToast('Rejection reason is required', 'error');
            return;
        }
        
        try {
            await apiCall(`/requests/${requestId}/deny`, {
                method: 'POST',
                body: JSON.stringify({ rejection_reason: reason })
            });
            this.loadRequests();
            showToast('Request denied', 'info');
        } catch (error) {
            console.error('Failed to deny request:', error);
            showToast('Failed to deny request', 'error');
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize chat system (only once, after auth is ready)
let chatSystem = null;

function initChatSystem() {
    if (chatSystem) return; // Already initialized
    
    if (typeof auth !== 'undefined' && auth.isLoggedIn()) {
        chatSystem = new ChatSystem();
        window.chatSystem = chatSystem; // Make available globally
        console.log('✅ Chat system initialized');
    }
}

// Wait for auth to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initChatSystem, 500);
    });
} else {
    setTimeout(initChatSystem, 500);
}

// Also try to initialize when auth is available (for pages that load auth asynchronously)
if (window.auth) {
    const checkInterval = setInterval(() => {
        if (auth.isLoggedIn() && !chatSystem) {
            initChatSystem();
            clearInterval(checkInterval);
        }
    }, 100);
}