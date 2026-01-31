class ShopApp {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000/api' 
            : '/api';
        
        this.products = [];
        this.cart = [];
        this.currentUser = null;
        this.currentCategory = 'all';
        this.currentSort = 'featured';
        this.shippingInfo = {};
        this.paymentInfo = {};
        this.token = localStorage.getItem('token');
        
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadProducts();
        this.setupEventListeners();
        this.loadCart();
        this.hideLoading();
    }

    async apiRequest(endpoint, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            defaultHeaders['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
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

    async checkAuth() {
        if (this.token) {
            try {
                const user = await this.apiRequest('/auth/me');
                this.currentUser = user;
                this.updateAuthUI();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.token = null;
                localStorage.removeItem('token');
            }
        }
    }

    updateAuthUI() {
        const dashboardLink = document.getElementById('dashboardLink');
        const adminLink = document.getElementById('adminLink');
        
        if (this.currentUser) {
            dashboardLink.style.display = 'block';
            if (this.currentUser.role === 'admin') {
                adminLink.style.display = 'block';
            }
        } else {
            dashboardLink.style.display = 'none';
            adminLink.style.display = 'none';
        }
    }

    async loadProducts() {
        const loading = document.getElementById('loadingProducts');
        const grid = document.getElementById('productsGrid');
        
        loading.classList.add('active');
        grid.innerHTML = '';

        try {
            const params = new URLSearchParams({
                category: this.currentCategory !== 'all' ? this.currentCategory : '',
                sort: this.currentSort
            });

            this.products = await this.apiRequest(`/products?${params}`);
            
            if (this.products.length === 0) {
                grid.innerHTML = '<p style="text-align: center; padding: 4rem; color: var(--color-text-light);">No products found. Please seed the database.</p>';
                return;
            }

            this.renderProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showToast('Failed to load products');
            grid.innerHTML = '<p style="text-align: center; padding: 4rem; color: red;">Failed to load products. Make sure the server is running and database is seeded.</p>';
        } finally {
            loading.classList.remove('active');
        }
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = '';

        this.products.forEach((product, index) => {
            const card = this.createProductCard(product, index);
            grid.appendChild(card);
        });
    }

    createProductCard(product, index) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x400?text=${encodeURIComponent(product.name)}'">
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <button class="product-add-btn" data-id="${product._id}">Add to Cart</button>
            </div>
        `;

        card.querySelector('.product-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToCart(product._id);
        });

        return card;
    }

    addToCart(productId) {
        const product = this.products.find(p => p._id == productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item._id == productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.cart.push({
                ...product,
                productId: product._id,
                quantity: 1
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showToast('Added to cart');
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item._id != productId);
        this.saveCart();
        this.updateCartUI();
    }

    updateQuantity(productId, change) {
        const item = this.cart.find(item => item._id == productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartItems = document.getElementById('cartItems');
        const cartEmpty = document.getElementById('cartEmpty');
        const cartTotal = document.getElementById('cartTotal');

        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;

        if (this.cart.length === 0) {
            cartItems.innerHTML = '';
            cartEmpty.classList.add('active');
        } else {
            cartEmpty.classList.remove('active');
            cartItems.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-category">${item.category}</div>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        <div class="cart-item-actions">
                            <div class="quantity-control">
                                <button class="quantity-btn" data-id="${item._id}" data-action="decrease">-</button>
                                <span class="quantity-value">${item.quantity}</span>
                                <button class="quantity-btn" data-id="${item._id}" data-action="increase">+</button>
                            </div>
                            <button class="cart-item-remove" data-id="${item._id}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.quantity-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const action = e.target.dataset.action;
                    this.updateQuantity(id, action === 'increase' ? 1 : -1);
                });
            });

            document.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    this.removeFromCart(id);
                });
            });
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const saved = localStorage.getItem('cart');
        if (saved) {
            this.cart = JSON.parse(saved);
            this.updateCartUI();
        }
    }

    async login(email, password) {
        try {
            const data = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.token = data.token;
            this.currentUser = data.user;
            localStorage.setItem('token', data.token);
            
            this.updateAuthUI();
            this.showToast('Welcome back!');
            this.closeModal('authModal');
            return true;
        } catch (error) {
            this.showToast(error.message || 'Login failed');
            return false;
        }
    }

    async register(name, email, password) {
        try {
            const data = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            this.token = data.token;
            this.currentUser = data.user;
            localStorage.setItem('token', data.token);
            
            this.updateAuthUI();
            this.showToast('Account created!');
            this.closeModal('authModal');
            return true;
        } catch (error) {
            this.showToast(error.message || 'Registration failed');
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('token');
        this.updateAuthUI();
        this.showToast('Logged out');
        this.closeModal('authModal');
    }

    startCheckout() {
        if (!this.currentUser) {
            this.showModal('authModal');
            this.showToast('Please sign in to checkout');
            return;
        }

        if (this.cart.length === 0) {
            this.showToast('Your cart is empty');
            return;
        }

        this.closeCart();
        this.showModal('checkoutModal');
        this.setCheckoutStep(1);
    }

    setCheckoutStep(step) {
        document.querySelectorAll('.checkout-step').forEach((el, index) => {
            if (index + 1 <= step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        document.querySelectorAll('.checkout-form-step').forEach(el => {
            el.classList.remove('active');
        });

        const steps = {
            1: 'shippingStep',
            2: 'paymentStep',
            3: 'reviewStep',
            4: 'successStep'
        };

        const stepElement = document.getElementById(steps[step]);
        if (stepElement) {
            stepElement.classList.add('active');
        }

        if (step === 3) {
            this.populateReview();
        }
    }

    populateReview() {
        const reviewShipping = document.getElementById('reviewShipping');
        const reviewPayment = document.getElementById('reviewPayment');
        const reviewItems = document.getElementById('reviewItems');
        const reviewTotal = document.getElementById('reviewTotal');

        reviewShipping.innerHTML = `
            <p>${this.shippingInfo.firstName} ${this.shippingInfo.lastName}</p>
            <p>${this.shippingInfo.address}</p>
            <p>${this.shippingInfo.city}, ${this.shippingInfo.zip}</p>
            <p>${this.shippingInfo.country}</p>
        `;

        reviewPayment.innerHTML = `
            <p>Card ending in ${this.paymentInfo.cardNumber.slice(-4)}</p>
            <p>${this.paymentInfo.cardName}</p>
        `;

        reviewItems.innerHTML = this.cart.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>${item.name} × ${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        reviewTotal.textContent = `$${total.toFixed(2)}`;
    }

    async placeOrder() {
        try {
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const orderData = {
                items: this.cart.map(item => ({
                    productId: item._id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                })),
                shippingInfo: this.shippingInfo,
                paymentInfo: this.paymentInfo,
                total: total
            };

            await this.apiRequest('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });

            this.cart = [];
            this.saveCart();
            this.updateCartUI();
            this.setCheckoutStep(4);
            this.showToast('Order placed successfully!');
        } catch (error) {
            this.showToast(error.message || 'Order failed');
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        if (modalId === 'authModal') {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const loggedInMenu = document.getElementById('loggedInMenu');
            
            if (this.currentUser) {
                loginForm.classList.add('hidden');
                registerForm.classList.add('hidden');
                loggedInMenu.classList.remove('hidden');
                
                document.getElementById('userGreeting').textContent = `Welcome, ${this.currentUser.name}!`;
                const adminMenuLink = document.getElementById('adminMenuLink');
                if (this.currentUser.role === 'admin') {
                    adminMenuLink.style.display = 'block';
                } else {
                    adminMenuLink.style.display = 'none';
                }
            } else {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                loggedInMenu.classList.add('hidden');
            }
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    openCart() {
        document.getElementById('cartSidebar').classList.add('active');
    }

    closeCart() {
        document.getElementById('cartSidebar').classList.remove('active');
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.classList.add('active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 1500);
    }

    setupEventListeners() {
        document.getElementById('cartBtn').addEventListener('click', () => this.openCart());
        document.getElementById('cartClose').addEventListener('click', () => this.closeCart());
        document.getElementById('cartOverlay').addEventListener('click', () => this.closeCart());
        document.getElementById('userBtn').addEventListener('click', () => this.showModal('authModal'));
        document.getElementById('checkoutBtn').addEventListener('click', () => this.startCheckout());

        document.getElementById('authClose').addEventListener('click', () => this.closeModal('authModal'));
        document.getElementById('authOverlay').addEventListener('click', () => this.closeModal('authModal'));
        
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        });

        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password);
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            this.register(name, email, password);
        });

        document.getElementById('logoutBtnModal').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('checkoutClose').addEventListener('click', () => this.closeModal('checkoutModal'));
        document.getElementById('checkoutOverlay').addEventListener('click', () => this.closeModal('checkoutModal'));

        document.getElementById('shippingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.shippingInfo = {
                firstName: document.getElementById('shippingFirstName').value,
                lastName: document.getElementById('shippingLastName').value,
                address: document.getElementById('shippingAddress').value,
                city: document.getElementById('shippingCity').value,
                zip: document.getElementById('shippingZip').value,
                country: document.getElementById('shippingCountry').value
            };
            this.setCheckoutStep(2);
        });

        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.paymentInfo = {
                cardNumber: document.getElementById('cardNumber').value,
                cardExpiry: document.getElementById('cardExpiry').value,
                cardCVC: document.getElementById('cardCVC').value,
                cardName: document.getElementById('cardName').value
            };
            this.setCheckoutStep(3);
        });

        document.getElementById('backToShipping').addEventListener('click', () => this.setCheckoutStep(1));
        document.getElementById('backToPayment').addEventListener('click', () => this.setCheckoutStep(2));
        document.getElementById('placeOrderBtn').addEventListener('click', () => this.placeOrder());
        
        document.getElementById('continueShoppingBtn').addEventListener('click', () => {
            this.closeModal('checkoutModal');
            this.setCheckoutStep(1);
        });

        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.loadProducts();
            });
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.loadProducts();
        });

        this.setupCardFormatting();
    }

    setupCardFormatting() {
        const cardNumber = document.getElementById('cardNumber');
        const cardExpiry = document.getElementById('cardExpiry');
        const cardCVC = document.getElementById('cardCVC');

        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue.substring(0, 19);
        });

        cardExpiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\//g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        cardCVC.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });
    }
}

const app = new ShopApp();
