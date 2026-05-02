// frontend/js/chat.js
// Global Chat System for all roles

class ChatSystem {
    constructor() {
        this.isOpen = false;
        this.unreadCount = 0;
        this.messages = [];
        this.createChatButton();
        this.loadUnreadCount();
        setInterval(() => this.loadUnreadCount(), 30000); // Check every 30 seconds
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
                <div class="loading">Loading requests...</div>
            </div>
            <div id="chatNotificationsPanel" class="chat-messages" style="display:none;">
                <div class="loading">Loading notifications...</div>
            </div>
            <div class="chat-input-area">
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
                document.getElementById('chatMessagesPanel').style.display = tab.dataset.tab === 'messages' ? 'block' : 'none';
                document.getElementById('chatRequestsPanel').style.display = tab.dataset.tab === 'requests' ? 'block' : 'none';
                document.getElementById('chatNotificationsPanel').style.display = tab.dataset.tab === 'notifications' ? 'block' : 'none';
                
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
            await apiCall('/api/messages', {
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
    
    async loadMessages() {
        const container = document.getElementById('chatMessagesPanel');
        try {
            const response = await apiCall('/api/messages');
            const messages = response.data || [];
            
            if (messages.length === 0) {
                container.innerHTML = '<div class="empty-state">No messages yet. Start a conversation!</div>';
                return;
            }
            
            container.innerHTML = messages.map(msg => `
                <div class="chat-message ${msg.sender_id === auth.getCurrentUser()?.id ? 'sent' : 'received'}">
                    <div class="sender">${escapeHtml(msg.sender_name)} (${msg.sender_role})</div>
                    <div class="message-text">${escapeHtml(msg.message)}</div>
                    <div class="time">${new Date(msg.created_at).toLocaleTimeString()}</div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
            
        } catch (error) {
            container.innerHTML = '<div class="error-state">Failed to load messages</div>';
        }
    }
    
    async loadRequests() {
        const container = document.getElementById('chatRequestsPanel');
        try {
            const response = await apiCall('/api/requests?status=pending');
            const requests = response.data || [];
            
            if (requests.length === 0) {
                container.innerHTML = '<div class="empty-state">No pending requests</div>';
                return;
            }
            
            container.innerHTML = requests.map(req => `
                <div class="request-item" style="padding: 12px; border-bottom: 1px solid var(--border-light);">
                    <div class="request-title"><strong>${escapeHtml(req.request_type)}</strong> - ${escapeHtml(req.entity_name)}</div>
                    <div class="request-details">Requested by: ${escapeHtml(req.requested_by_name)}</div>
                    <div class="request-reason">Reason: ${escapeHtml(req.reason)}</div>
                    ${auth.hasRole('admin') ? `
                        <div class="request-actions" style="margin-top: 8px;">
                            <button class="btn btn-success btn-sm" onclick="chatSystem.approveRequest(${req.id})">Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="chatSystem.denyRequest(${req.id})">Deny</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
        } catch (error) {
            container.innerHTML = '<div class="error-state">Failed to load requests</div>';
        }
    }
    
    async loadNotifications() {
        const container = document.getElementById('chatNotificationsPanel');
        try {
            const response = await apiCall('/api/notifications');
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
            const response = await apiCall('/api/messages/unread');
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
            await apiCall(`/api/requests/${requestId}/approve`, { method: 'POST' });
            this.loadRequests();
            showToast('Request approved', 'success');
        } catch (error) {
            showToast('Failed to approve request', 'error');
        }
    }
    
    async denyRequest(requestId) {
        try {
            await apiCall(`/api/requests/${requestId}/deny`, { method: 'POST' });
            this.loadRequests();
            showToast('Request denied', 'info');
        } catch (error) {
            showToast('Failed to deny request', 'error');
        }
    }
}

// Initialize chat system
let chatSystem;
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isLoggedIn()) {
        chatSystem = new ChatSystem();
    }
});