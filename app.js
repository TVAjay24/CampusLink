/**
 * Campus OLX - Main Application Logic
 */

const app = {
    // Current active view
    currentView: 'home',

    // Mock Data for Products
    products: [
        {
            id: 1,
            title: "Engineering Mathematics - K.A. Stroud (8th Edition)",
            price: 450,
            category: "Books",
            condition: "Used",
            seller: "Rahul Sharma",
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
            timestamp: "2 hours ago"
        },
        {
            id: 2,
            title: "Casio FX-991EX ClassWiz Scientific Calculator",
            price: 800,
            category: "Electronics",
            condition: "Like New",
            seller: "Priya Patel",
            image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=600",
            timestamp: "5 hours ago"
        },
        {
            id: 3,
            title: "Hostel Study Chair - Ergonomic",
            price: 600,
            category: "Furniture",
            condition: "Used",
            seller: "Amit Kumar",
            image: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600",
            timestamp: "1 day ago"
        },
        {
            id: 4,
            title: "MacBook Air M1 2020 (8GB/256GB)",
            price: 45000,
            category: "Electronics",
            condition: "Used",
            seller: "Neha Singh",
            image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
            timestamp: "1 day ago"
        },
        {
            id: 5,
            title: "Data Structures Handwritten Notes (Complete)",
            price: 150,
            category: "Notes",
            condition: "Used",
            seller: "Vikram Tech",
            image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600",
            timestamp: "2 days ago"
        },
        {
            id: 6,
            title: "Mini Drafter + Drawing Board",
            price: 350,
            category: "Lab Equipment",
            condition: "Like New",
            seller: "Sneha Reddy",
            image: "https://images.unsplash.com/photo-1629446219329-825026915682?auto=format&fit=crop&q=80&w=600",
            timestamp: "3 days ago"
        }
    ],

    // Initialize the application
    init() {
        console.log("Campus OLX initialized");
        this.renderProducts();
        this.setupEventListeners();
        
        // Ensure home is visible on load
        this.navigate('home');
    },

    // Navigation logic to switch between views
    navigate(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
    },

    // Render products in the grid
    renderProducts(filteredProducts = null) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        const dataToRender = filteredProducts || this.products;
        grid.innerHTML = '';

        if (dataToRender.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i data-lucide="package-x" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <h3>No items found</h3>
                    <p>Try adjusting your filters or search query.</p>
                </div>
            `;
            // Re-initialize lucide icons for dynamically added content
            if (window.lucide) lucide.createIcons();
            return;
        }

        dataToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const conditionClass = product.condition === 'New' ? 'new' : 'used';
            
            card.innerHTML = `
                <div class="product-image-container">
                    <span class="product-condition ${conditionClass}">${product.condition}</span>
                    <img src="${product.image}" alt="${product.title}" class="product-image">
                </div>
                <div class="product-details">
                    <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
                    <h3 class="product-title" title="${product.title}">${product.title}</h3>
                    <div class="product-meta">
                        <div class="seller-info">
                            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                            <span>${product.seller}</span>
                        </div>
                        <span class="text-sm">${product.timestamp}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Re-initialize lucide icons for dynamically added content
        if (window.lucide) lucide.createIcons();
    },

    // Setup DOM event listeners
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('post-item-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Item posted successfully! (Mock Action)');
                this.navigate('browse');
                form.reset();
            });
        }

        // Drag and drop zone
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    const p = dropZone.querySelector('p');
                    p.textContent = `${e.dataTransfer.files.length} file(s) selected`;
                    p.style.color = 'var(--accent-yellow)';
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    const p = dropZone.querySelector('p');
                    p.textContent = `${fileInput.files.length} file(s) selected`;
                    p.style.color = 'var(--accent-yellow)';
                }
            });
        }

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = this.products.filter(p => 
                    p.title.toLowerCase().includes(query) || 
                    p.category.toLowerCase().includes(query)
                );
                this.renderProducts(filtered);
            });
        }

        // Category filters
        const categoryRadios = document.querySelectorAll('input[name="category"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const category = e.target.value;
                if (category === 'all') {
                    this.renderProducts();
                } else {
                    const filtered = this.products.filter(p => p.category === category);
                    this.renderProducts(filtered);
                }
            });
        });
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
