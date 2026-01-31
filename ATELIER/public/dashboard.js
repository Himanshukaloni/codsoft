class ClientDashboard {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000/api' 
            : '/api';
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        if (!this.token) {
            window.location.href = '/';
            return;
        }

        await this.checkAuth();
        this.setupEventListeners();
        await this.loadOrders();
    }

    async checkAuth() {
        try {
            const user = await this.apiRequest('/auth/me');
            this.currentUser = user;
            document.getElementById('userName').textContent = user.name;
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    }

    async apiRequest(endpoint, options = {}) {
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${this.API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async loadOrders() {
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        const ordersGrid = document.getElementById('ordersGrid');

        loading.style.display = 'block';
        emptyState.style.display = 'none';
        ordersGrid.innerHTML = '';

        try {
            const orders = await this.apiRequest('/orders/my-orders');

            loading.style.display = 'none';

            if (orders.length === 0) {
                emptyState.style.display = 'block';
                return;
            }

            ordersGrid.innerHTML = orders.map(order => this.createOrderCard(order)).join('');
        } catch (error) {
            loading.style.display = 'none';
            this.showToast('Failed to load orders', 'error');
            ordersGrid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--error);">
                    <p>Failed to load orders. Please try again later.</p>
                </div>
            `;
        }
    }

    createOrderCard(order) {
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order._id.slice(-8)}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <span class="badge badge-${order.status}">${order.status}</span>
                </div>

                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.image}" alt="${item.name}" class="item-image">
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                <div class="item-info">
                                    Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="shipping-info">
                    <strong>Shipping to:</strong><br>
                    ${order.shippingInfo.firstName} ${order.shippingInfo.lastName}<br>
                    ${order.shippingInfo.address}<br>
                    ${order.shippingInfo.city}, ${order.shippingInfo.zip}<br>
                    ${order.shippingInfo.country}
                </div>

                <div class="order-footer">
                    <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                    ${this.getOrderStatusMessage(order.status)}
                </div>
            </div>
        `;
    }

    getOrderStatusMessage(status) {
        const messages = {
            'pending': '<span style="color: var(--warning);">⏳ Order is being processed</span>',
            'processing': '<span style="color: #3498db;">📦 Preparing your order</span>',
            'shipped': '<span style="color: #9b59b6;">🚚 On the way to you</span>',
            'delivered': '<span style="color: var(--success);">✓ Delivered</span>',
            'cancelled': '<span style="color: var(--error);">✗ Order cancelled</span>'
        };
        return messages[status] || '';
    }

    setupEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
}

const dashboardApp = new ClientDashboard();
