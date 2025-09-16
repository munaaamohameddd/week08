// week08/frontend/main.js

document.addEventListener('DOMContentLoaded', () => {
    // API endpoints for the Product and Order services.
    const PRODUCT_API_BASE_URL = 'http://4.237.181.7:8000';
    const ORDER_API_BASE_URL = 'http://4.198.2.176:8001';

    // DOM Elements
    const messageBox = document.getElementById('message-box');
    const productForm = document.getElementById('product-form');
    const productListDiv = document.getElementById('product-list');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const placeOrderForm = document.getElementById('place-order-form');
    const orderListDiv = document.getElementById('order-list');

    // Shopping Cart State
    let cart = [];
    let productsCache = {}; // Cache products fetched to easily get details for cart items

    // --- Utility Functions ---
    function showMessage(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.style.display = 'block';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000);
    }

    function formatCurrency(amount) {
        return `$${parseFloat(amount).toFixed(2)}`;
    }

    // --- Product Service Interactions ---
    async function fetchProducts() {
        productListDiv.innerHTML = '<p>Loading products...</p>';
        const url = `${PRODUCT_API_BASE_URL}/products/`;
        console.log("Attempting to fetch products from URL:", url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            
            productListDiv.innerHTML = '';
            productsCache = {};

            if (products.length === 0) {
                productListDiv.innerHTML = '<p>No products available yet. Add some above!</p>';
                return;
            }

            products.forEach(product => {
                productsCache[product.product_id] = product;
                const productCard = document.createElement('div');
                productCard.className = 'product-card';

                productCard.innerHTML = `
                    <img src="${product.image_url || 'https://placehold.co/300x200/cccccc/333333?text=No+Image'}" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/300x200/cccccc/333333?text=Image+Error';" />
                    <h3>${product.name} (ID: ${product.product_id})</h3>
                    <p>${product.description || 'No description available.'}</p>
                    <p class="price">${formatCurrency(product.price)}</p>
                    <p class="stock">Stock: ${product.stock_quantity}</p>
                    <p><small>Created: ${new Date(product.created_at).toLocaleString()}</small></p>
                    <p><small>Last Updated: ${new Date(product.updated_at).toLocaleString()}</small></p>
                    <div class="upload-image-group">
                        <label for="image-upload-${product.product_id}">Upload Image:</label>
                        <input type="file" id="image-upload-${product.product_id}" accept="image/*" data-product-id="${product.product_id}">
                        <button class="upload-btn" data-id="${product.product_id}">Upload Photo</button>
                    </div>
                    <div class="card-actions">
                        <button class="add-to-cart-btn" data-id="${product.product_id}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>
                        <button class="delete-btn" data-id="${product.product_id}">Delete</button>
                    </div>
                `;
                productListDiv.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error fetching products:', error);
            showMessage(`Failed to load products: ${error.message}`, 'error');
            productListDiv.innerHTML = '<p>Could not load products. Please check the Product Service.</p>';
        }
    }

    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('product-name').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const stock_quantity = parseInt(document.getElementById('product-stock').value, 10);
        const description = document.getElementById('product-description').value;

        const newProduct = { name, price, stock_quantity, description };

        try {
            const response = await fetch(`${PRODUCT_API_BASE_URL}/products/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
            }

            const addedProduct = await response.json();
            showMessage(`Product "${addedProduct.name}" added successfully! ID: ${addedProduct.product_id}`, 'success');
            productForm.reset();
            fetchProducts();
        } catch (error) {
            console.error('Error adding product:', error);
            showMessage(`Error adding product: ${error.message}`, 'error');
        }
    });

    productListDiv.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const productId = event.target.dataset.id;
            if (!confirm(`Are you sure you want to delete product ID: ${productId}?`)) {
                return;
            }
            try {
                const response = await fetch(`${PRODUCT_API_BASE_URL}/products/${productId}`, { method: 'DELETE' });
                if (response.status === 204) {
                    showMessage(`Product ID: ${productId} deleted successfully.`, 'success');
                    fetchProducts();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                showMessage(`Error deleting product: ${error.message}`, 'error');
            }
        }

        if (event.target.classList.contains('add-to-cart-btn')) {
            const productId = event.target.dataset.id;
            const productName = event.target.dataset.name;
            const productPrice = parseFloat(event.target.dataset.price);
            addToCart(productId, productName, productPrice);
        }

        if (event.target.classList.contains('upload-btn')) {
            const productId = event.target.dataset.id;
            const fileInput = document.getElementById(`image-upload-${productId}`);
            const file = fileInput.files[0];

            if (!file) {
                showMessage("Please select an image file to upload.", 'info');
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {
                showMessage(`Uploading image for product ${productId}...`, 'info');
                const response = await fetch(`${PRODUCT_API_BASE_URL}/products/${productId}/upload-image`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
                }

                const updatedProduct = await response.json();
                showMessage(`Image uploaded successfully for product ${updatedProduct.name}!`, 'success');
                fileInput.value = '';
                fetchProducts();
            } catch (error) {
                console.error('Error uploading image:', error);
                showMessage(`Error uploading image: ${error.message}`, 'error');
            }
        }
    });

    // --- Cart Functions ---
    function addToCart(productId, productName, productPrice) {
        const existingItemIndex = cart.findIndex(item => item.product_id === productId);
        if (existingItemIndex !== -1) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({ product_id: productId, name: productName, price: productPrice, quantity: 1 });
        }
        updateCartDisplay();
        showMessage(`Added "${productName}" to cart!`, 'info');
    }

    function updateCartDisplay() {
        cartItemsList.innerHTML = '';
        let totalCartAmount = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li>Your cart is empty.</li>';
        } else {
            cart.forEach(item => {
                const li = document.createElement('li');
                const itemTotal = item.quantity * item.price;
                totalCartAmount += itemTotal;
                li.innerHTML = `
                    <span>${item.name} (x${item.quantity})</span>
                    <span>${formatCurrency(item.price)} each - ${formatCurrency(itemTotal)}</span>
                `;
                cartItemsList.appendChild(li);
            });
        }
        cartTotalSpan.textContent = `Total: ${formatCurrency(totalCartAmount)}`;
    }

    // --- Order Service Interactions ---
    placeOrderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (cart.length === 0) {
            showMessage("Your cart is empty. Add products before placing an order.", 'info');
            return;
        }

        const userId = parseInt(document.getElementById('order-user-id').value, 10);
        const shippingAddress = document.getElementById('shipping-address').value;

        const orderItems = cart.map(item => ({
            product_id: parseInt(item.product_id, 10),
            quantity: item.quantity,
            price_at_purchase: item.price
        }));

        const newOrder = { user_id: userId, shipping_address: shippingAddress, items: orderItems };

        try {
            showMessage("Placing order...", 'info');
            const response = await fetch(`${ORDER_API_BASE_URL}/orders/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
            }

            const placedOrder = await response.json();
            showMessage(`Order ${placedOrder.order_id} placed successfully! Total: ${formatCurrency(placedOrder.total_amount)}`, 'success');
            cart = [];
            updateCartDisplay();
            placeOrderForm.reset();
            fetchOrders();
            fetchProducts();
        } catch (error) {
            console.error('Error placing order:', error);
            showMessage(`Error placing order: ${error.message}`, 'error');
        }
    });

    async function fetchOrders() {
        orderListDiv.innerHTML = '<p>Loading orders...</p>';
        try {
            const response = await fetch(`${ORDER_API_BASE_URL}/orders/`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const orders = await response.json();
            
            orderListDiv.innerHTML = '';
            if (orders.length === 0) {
                orderListDiv.innerHTML = '<p>No orders available yet.</p>';
                return;
            }

            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.innerHTML = `
                    <h3>Order ID: ${order.order_id}</h3>
                    <p>User ID: ${order.user_id}</p>
                    <p>Order Date: ${new Date(order.order_date).toLocaleString()}</p>
                    <p>Status: <span id="order-status-${order.order_id}">${order.status}</span></p>
                    <p>Total Amount: ${formatCurrency(order.total_amount)}</p>
                    <p>Shipping Address: ${order.shipping_address || 'N/A'}</p>
                    <h4>Items:</h4>
                    <ul class="order-items">
                        ${order.items.map(item => `
                            <li>
                                <span>Product ID: ${item.product_id}</span> - Qty: ${item.quantity} @ ${formatCurrency(item.price_at_purchase)} (Total: ${formatCurrency(item.item_total)})
                            </li>
                        `).join('')}
                    </ul>
                `;
                orderListDiv.appendChild(orderCard);
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            showMessage(`Failed to load orders: ${error.message}`, 'error');
            orderListDiv.innerHTML = '<p>Could not load orders. Please check the Order Service.</p>';
        }
    }

    orderListDiv.addEventListener('click', async (event) => {
        if (event.target.classList.contains('status-update-btn')) {
            const orderId = event.target.dataset.id;
            const statusSelect = document.getElementById(`status-select-${orderId}`);
            const newStatus = statusSelect.value;

            try {
                showMessage(`Updating status for order ${orderId} to "${newStatus}"...`, 'info');
                const response = await fetch(`${ORDER_API_BASE_URL}/orders/${orderId}/status?new_status=${newStatus}`, { method: 'PATCH' });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
                }

                const updatedOrder = await response.json();
                document.getElementById(`order-status-${orderId}`).textContent = updatedOrder.status;
                showMessage(`Order ${orderId} status updated to "${updatedOrder.status}"!`, 'success');
                fetchOrders();
            } catch (error) {
                console.error('Error updating order status:', error);
                showMessage(`Error updating order status: ${error.message}`, 'error');
            }
        }

        if (event.target.classList.contains('delete-btn')) {
            const orderId = event.target.dataset.id;
            if (!confirm(`Are you sure you want to delete order ID: ${orderId}?`)) {
                return;
            }
            try {
                const response = await fetch(`${ORDER_API_BASE_URL}/orders/${orderId}`, { method: 'DELETE' });

                if (response.status === 204) {
                    showMessage(`Order ID: ${orderId} deleted successfully.`, 'success');
                    fetchOrders();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `HTTP error! status: ${response.status}`);
                }
            } catch (error) {
                console.error('Error deleting order:', error);
                showMessage(`Error deleting order: ${error.message}`, 'error');
            }
        }
    });

    fetchProducts();
    fetchOrders();
});
