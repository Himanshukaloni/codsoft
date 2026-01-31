class AdminDashboard {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000/api' 
            : '/api';
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.editingProductId = null;
        
        this.init();
    }

    async init() {
        if (!this.token) {
            window.location.href = '/';
            return;
        }

        await this.checkAuth();
        this.setupEventListeners();
        await this.loadDashboardStats();
    }

    async checkAuth() {
        try {
            const user = await this.apiRequest('/auth/me');
            if (user.role !== 'admin') {
                this.showToast('Access denied. Admin only.', 'error');
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }
            this.currentUser = user;
            document.getElementById('adminName').textContent = user.name;
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

    // Dashboard Stats
    async loadDashboardStats() {
        try {
            const stats = await this.apiRequest('/admin/stats');
            
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalProducts').textContent = stats.totalProducts;
            document.getElementById('totalOrders').textContent = stats.totalOrders;
            document.getElementById('totalRevenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
            
            document.getElementById('pendingOrders').textContent = stats.ordersByStatus.pending;
            document.getElementById('processingOrders').textContent = stats.ordersByStatus.processing;
            document.getElementById('shippedOrders').textContent = stats.ordersByStatus.shipped;
            document.getElementById('deliveredOrders').textContent = stats.ordersByStatus.delivered;
        } catch (error) {
            this.showToast('Failed to load stats', 'error');
        }
    }

    // Products
    async loadProducts() {
        const loading = document.getElementById('productsLoading');
        const container = document.getElementById('productsTable');
        
        loading.classList.add('active');
        
        try {
            const products = await this.apiRequest('/products');
            
            if (products.length === 0) {
                container.innerHTML = '<p style="padding: 2rem; text-align: center;">No products found</p>';
                return;
            }
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td><img src="${product.image}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover;"></td>
                                <td>${product.name}</td>
                                <td>${product.category}</td>
                                <td>$${product.price.toFixed(2)}</td>
                                <td>${product.stock}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="adminApp.editProduct('${product._id}')">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="adminApp.deleteProduct('${product._id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            this.showToast('Failed to load products', 'error');
            container.innerHTML = '<p style="padding: 2rem; text-align: center; color: red;">Failed to load products</p>';
        } finally {
            loading.classList.remove('active');
        }
    }

    showProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        const form = document.getElementById('productForm');
        
        form.reset();
        
        if (product) {
            title.textContent = 'Edit Product';
            this.editingProductId = product._id;
            document.getElementById('productId').value = product._id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productImage').value = product.image || '';
            document.getElementById('productDescription').value = product.description || '';
        } else {
            title.textContent = 'Add Product';
            this.editingProductId = null;
        }
        
        modal.classList.add('active');
    }

    async editProduct(id) {
        try {
            const product = await this.apiRequest(`/products/${id}`);
            this.showProductModal(product);
        } catch (error) {
            this.showToast('Failed to load product', 'error');
        }
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await this.apiRequest(`/products/${id}`, { method: 'DELETE' });
            this.showToast('Product deleted successfully', 'success');
            this.loadProducts();
        } catch (error) {
            this.showToast(error.message || 'Failed to delete product', 'error');
        }
    }

    async saveProduct(formData) {
        try {
            const productData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                stock: parseInt(formData.get('stock')) || 100,
                image: formData.get('image'),
                description: formData.get('description')
            };

            if (this.editingProductId) {
                await this.apiRequest(`/products/${this.editingProductId}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                });
                this.showToast('Product updated successfully', 'success');
            } else {
                await this.apiRequest('/products', {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });
                this.showToast('Product created successfully', 'success');
            }

            document.getElementById('productModal').classList.remove('active');
            this.loadProducts();
        } catch (error) {
            this.showToast(error.message || 'Failed to save product', 'error');
        }
    }

    // Orders
    async loadOrders() {
        const loading = document.getElementById('ordersLoading');
        const container = document.getElementById('ordersTable');
        
        loading.classList.add('active');
        
        try {
            const orders = await this.apiRequest('/orders');
            
            if (orders.length === 0) {
                container.innerHTML = '<p style="padding: 2rem; text-align: center;">No orders found</p>';
                return;
            }
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Email</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>${order._id.slice(-8)}</td>
                                <td>${order.userName}</td>
                                <td>${order.userEmail}</td>
                                <td>${order.items.length}</td>
                                <td>$${order.total.toFixed(2)}</td>
                                <td><span class="badge badge-${order.status}">${order.status}</span></td>
                                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="adminApp.viewOrderDetails('${order._id}')">View</button>
                                    <select onchange="adminApp.updateOrderStatus('${order._id}', this.value)" class="btn btn-sm">
                                        <option value="">Change Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            this.showToast('Failed to load orders', 'error');
            container.innerHTML = '<p style="padding: 2rem; text-align: center; color: red;">Failed to load orders</p>';
        } finally {
            loading.classList.remove('active');
        }
    }

    async viewOrderDetails(orderId) {
        try {
            const order = await this.apiRequest(`/orders/${orderId}`);
            
            const modal = document.getElementById('orderModal');
            const detailsContainer = document.getElementById('orderDetails');
            
            detailsContainer.innerHTML = `
                <div style="margin-bottom: 1.5rem;">
                    <h4>Order ID: ${order._id}</h4>
                    <p><strong>Status:</strong> <span class="badge badge-${order.status}">${order.status}</span></p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${order.userName}</p>
                    <p><strong>Email:</strong> ${order.userEmail}</p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4>Shipping Address</h4>
                    <p>${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</p>
                    <p>${order.shippingInfo.address}</p>
                    <p>${order.shippingInfo.city}, ${order.shippingInfo.zip}</p>
                    <p>${order.shippingInfo.country}</p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4>Payment Information</h4>
                    <p><strong>Card:</strong> **** **** **** ${order.paymentInfo.cardLast4}</p>
                    <p><strong>Cardholder:</strong> ${order.paymentInfo.cardName}</p>
                </div>
                
                <div>
                    <h4>Items</h4>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <img src="${item.image}" alt="${item.name}">
                                <div>
                                    <p><strong>${item.name}</strong></p>
                                    <p>Quantity: ${item.quantity}</p>
                                    <p>Price: $${item.price.toFixed(2)}</p>
                                    <p>Subtotal: $${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--border);">
                    <h3>Total: $${order.total.toFixed(2)}</h3>
                </div>
            `;
            
            modal.classList.add('active');
        } catch (error) {
            this.showToast('Failed to load order details', 'error');
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        if (!newStatus) return;
        
        try {
            await this.apiRequest(`/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            this.showToast('Order status updated', 'success');
            this.loadOrders();
            this.loadDashboardStats();
        } catch (error) {
            this.showToast(error.message || 'Failed to update order status', 'error');
        }
    }

    // Users
    async loadUsers() {
        const loading = document.getElementById('usersLoading');
        const container = document.getElementById('usersTable');
        
        loading.classList.add('active');
        
        try {
            const users = await this.apiRequest('/admin/users');
            
            if (users.length === 0) {
                container.innerHTML = '<p style="padding: 2rem; text-align: center;">No users found</p>';
                return;
            }
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td><span class="badge badge-${user.role}">${user.role}</span></td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            this.showToast('Failed to load users', 'error');
            container.innerHTML = '<p style="padding: 2rem; text-align: center; color: red;">Failed to load users</p>';
        } finally {
            loading.classList.remove('active');
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/';
        });

        // Product modal
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('closeProductModal').addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });

        document.getElementById('cancelProduct').addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.saveProduct(formData);
        });

        // Order modal
        document.getElementById('closeOrderModal').addEventListener('click', () => {
            document.getElementById('orderModal').classList.remove('active');
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    switchSection(section) {
        // Update active menu item
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Hide all sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${section}-section`).classList.add('active');

        // Load data for section
        switch(section) {
            case 'dashboard':
                this.loadDashboardStats();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'users':
                this.loadUsers();
                break;
        }
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

// Initialize admin app
const adminApp = new AdminDashboard();
