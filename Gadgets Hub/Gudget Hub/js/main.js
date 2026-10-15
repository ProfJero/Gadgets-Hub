/**
 * GAOGETS HUB - Main JavaScript
 * All product data comes from Firebase Firestore
 * Settings loaded from Firebase settings collection
 */

import { 
  db,
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  doc,
  getDoc,
  setDoc,  // ← ADD THIS IMPORT
  updateDoc,
  onSnapshot,
  analytics,
  logEvent
} from "./firebase-config.js";

// ==========================================
// STATE
// ==========================================
let cart = [];
let cartCount = 0;
let isCartOpen = false;
let isNotificationsOpen = false;
let isWishlistOpen = false;
let currentCategory = 'all';
let products = [];
let trendingProducts = [];
let wishlist = [];
let notifications = [];
let heroInterval = null;
let currentSlide = 0;
const totalSlides = 3;

// ==========================================
// SETTINGS (from Firebase)
// ==========================================
let settings = {
  freeDeliveryThreshold: 30000,
  shippingFee: 45,
  expressShippingFee: 85,
  storeName: 'GAOGETS HUB',
  storeDescription: 'Where Tech Meets Trust. Premium laptops for every need.',
  currency: '₵',
  announcementText: 'Free delivery on orders over ₵30,000 • Ghana Independence Month Deals!'
};

// ==========================================
// DOM REFERENCES
// ==========================================
const productGrid = document.getElementById('productGrid');
const trendingGrid = document.getElementById('trendingGrid');
const cartBadge = document.getElementById('cartBadge');
const countdownEl = document.getElementById('countdown');
const mobileNav = document.getElementById('mobileNav');
const mobileOverlay = document.getElementById('mobileOverlay');
const menuToggle = document.getElementById('mobileMenuToggle');
const closeMenu = document.getElementById('closeMobileMenu');
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dot');
const heroPrev = document.getElementById('heroPrev');
const heroNext = document.getElementById('heroNext');
const notificationToggle = document.getElementById('notificationToggle');
const wishlistToggle = document.getElementById('wishlistToggle');
const mobileNotificationsLink = document.getElementById('mobileNotificationsLink');
const mobileWishlistLink = document.getElementById('mobileWishlistLink');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const announcementText = document.getElementById('announcementText');
const footerDescription = document.getElementById('footerDescription');

// ==========================================
// LOAD SETTINGS FROM FIRESTORE
// ==========================================
async function loadSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'storeSettings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      settings = { ...settings, ...docSnap.data() };
      applySettings();
      console.log('✅ Settings loaded from Firebase');
    } else {
      // Create default settings if they don't exist
      await createDefaultSettings();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use default settings
    applySettings();
  }
}

async function createDefaultSettings() {
  try {
    const settingsRef = doc(db, 'settings', 'storeSettings');
    await setDoc(settingsRef, {
      freeDeliveryThreshold: 30000,
      shippingFee: 45,
      expressShippingFee: 85,
      storeName: 'GAOGETS HUB',
      storeDescription: 'Where Tech Meets Trust. Premium laptops for every need.',
      currency: '₵',
      announcementText: 'Free delivery on orders over ₵30,000 • Ghana Independence Month Deals!',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Default settings created in Firebase');
    applySettings();
  } catch (error) {
    console.error('Error creating default settings:', error);
    // Use hardcoded defaults
    applySettings();
  }
}

function applySettings() {
  // Update announcement bar
  if (announcementText) {
    const threshold = settings.freeDeliveryThreshold || 30000;
    announcementText.textContent = settings.announcementText || 
      `Free delivery on orders over ${settings.currency}${threshold.toLocaleString()} • Shop Ghana Independence Month Deals!`;
  }
  
  // Update footer description
  if (footerDescription) {
    footerDescription.textContent = settings.storeDescription || 'Where Tech Meets Trust. Premium laptops for every need.';
  }
  
  // Update document title
  document.title = `${settings.storeName || 'GAOGETS HUB'} · Where Tech Meets Trust`;
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function showToast(message, duration = 2500) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==========================================
// CART SYSTEM
// ==========================================
function loadCart() {
  try {
    const saved = localStorage.getItem('shopghana_cart');
    if (saved) {
      cart = JSON.parse(saved);
      cartCount = cart.reduce((total, item) => total + item.quantity, 0);
      updateCartBadge();
    }
  } catch (e) { console.warn('Failed to load cart:', e); }
}

function saveCart() {
  try {
    localStorage.setItem('shopghana_cart', JSON.stringify(cart));
  } catch (e) { console.warn('Failed to save cart:', e); }
}

function updateCartBadge() {
  if (cartBadge) {
    if (cartCount > 0) {
      cartBadge.textContent = cartCount;
      cartBadge.classList.remove('hidden');
    } else {
      cartBadge.textContent = '0';
      cartBadge.classList.add('hidden');
    }
  }
}

function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function addToCart(productName, price, quantity = 1, image = '', productId = '') {
  const existingItem = cart.find(item => 
    item.name === productName && 
    item.productId === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      productId: productId,
      name: productName,
      price: price,
      quantity: quantity,
      image: image || '',
    });
  }

  cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  updateCartBadge();
  saveCart();
  showToast(`🛒 Added "${productName}" to cart!`);
  renderCartItems();
  
  setTimeout(() => openCart(), 400);
}

function removeFromCart(itemId) {
  cart = cart.filter(item => item.id !== itemId);
  cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  updateCartBadge();
  saveCart();
  renderCartItems();
  if (cart.length === 0) showToast('🛒 Cart is now empty');
}

function updateCartQuantity(itemId, newQuantity) {
  const item = cart.find(item => item.id === itemId);
  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    item.quantity = newQuantity;
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    updateCartBadge();
    saveCart();
    renderCartItems();
  }
}

function createCartDrawer() {
  const existing = document.querySelector('.cart-drawer');
  if (existing) existing.remove();

  const drawer = document.createElement('div');
  drawer.className = 'cart-drawer';
  drawer.innerHTML = `
    <div class="flex items-center justify-between p-4 border-b border-outline/60">
      <h2 class="text-xl font-bold text-trust">Your Cart</h2>
      <button class="close-cart p-2 hover:bg-brand-blue-soft rounded-full transition-all">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="cart-items-container flex-1 overflow-y-auto p-4 space-y-4"></div>
    <div class="border-t border-outline/60 p-4 bg-surface">
      <div class="flex justify-between items-center mb-4">
        <span class="font-semibold text-sm">Total:</span>
        <span class="text-xl font-bold text-brand-orange cart-total">₵ 0.00</span>
      </div>
      <button class="checkout-btn w-full bg-brand-blue text-white font-bold py-3 rounded-full hover:bg-brand-blue-dark transition">
        Proceed to Checkout
      </button>
      <button class="continue-shopping w-full mt-2 text-muted hover:text-brand-orange transition font-semibold text-sm">
        Continue Shopping
      </button>
    </div>
  `;

  document.body.appendChild(drawer);

  const closeBtn = drawer.querySelector('.close-cart');
  const continueBtn = drawer.querySelector('.continue-shopping');
  const overlay = document.querySelector('.drawer-overlay');

  closeBtn.addEventListener('click', closeCart);
  continueBtn.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);

  const checkoutBtn = drawer.querySelector('.checkout-btn');
  checkoutBtn.addEventListener('click', function() {
    if (cart.length === 0) {
      showToast('🛒 Your cart is empty!');
      return;
    }
    const total = getCartTotal();
    const freeDelivery = total >= (settings.freeDeliveryThreshold || 30000);
    const shipping = freeDelivery ? 0 : (settings.shippingFee || 45);
    const grandTotal = total + shipping;
    showToast(`💳 Proceeding to checkout. Total: ${settings.currency}${grandTotal.toFixed(2)}`);
    window.location.href = 'checkout.html';
  });
}

function renderCartItems() {
  const container = document.querySelector('.cart-items-container');
  const totalEl = document.querySelector('.cart-total');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <span class="material-symbols-outlined text-6xl text-muted/40 mb-4">shopping_cart</span>
        <p class="text-muted font-medium">Your cart is empty</p>
        <p class="text-muted text-sm mt-2">Start adding some items!</p>
      </div>
    `;
    if (totalEl) totalEl.textContent = `${settings.currency} 0.00`;
    return;
  }

  let html = '';
  cart.forEach(item => {
    const imageUrl = fixImageUrl(item.image);
    html += `
      <div class="flex gap-4 p-3 bg-surface rounded-xl border border-outline/60 cart-item" data-id="${item.id}">
        <div class="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface/50">
          <img src="${imageUrl}" alt="${item.name}" class="w-full h-full object-cover" 
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23E6DCD2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2224%22 font-family=%22Inter%22%3E${item.name.charAt(0)}%3C/text%3E%3C/svg%3E'" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-sm md:text-base line-clamp-1">${item.name}</h4>
          <p class="font-bold text-brand-orange text-sm md:text-base">${settings.currency} ${item.price.toFixed(2)}</p>
          <div class="flex items-center gap-2 mt-2">
            <button class="qty-decrease w-7 h-7 md:w-8 md:h-8 rounded-full border border-outline hover:bg-brand-blue-soft transition flex items-center justify-center text-sm" data-id="${item.id}">-</button>
            <span class="font-semibold text-sm min-w-[20px] text-center">${item.quantity}</span>
            <button class="qty-increase w-7 h-7 md:w-8 md:h-8 rounded-full border border-outline hover:bg-brand-blue-soft transition flex items-center justify-center text-sm" data-id="${item.id}">+</button>
            <button class="remove-item ml-auto text-red-500 hover:bg-red-50 rounded-full p-1 transition" data-id="${item.id}">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  const total = getCartTotal();
  if (totalEl) totalEl.textContent = `${settings.currency} ${total.toFixed(2)}`;

  container.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const item = cart.find(i => i.id === id);
      if (item) updateCartQuantity(id, item.quantity - 1);
    });
  });

  container.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const item = cart.find(i => i.id === id);
      if (item) updateCartQuantity(id, item.quantity + 1);
    });
  });

  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      removeFromCart(id);
      showToast('🗑️ Item removed from cart');
    });
  });
}

function openCart() {
  if (isCartOpen) {
    renderCartItems();
    return;
  }
  isCartOpen = true;

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);

  if (!document.querySelector('.cart-drawer')) createCartDrawer();

  renderCartItems();
  const drawer = document.querySelector('.cart-drawer');
  if (drawer) setTimeout(() => drawer.classList.add('open'), 50);
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  if (!isCartOpen) return;
  isCartOpen = false;

  const drawer = document.querySelector('.cart-drawer');
  const overlay = document.querySelector('.drawer-overlay');

  if (drawer) drawer.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
  document.body.style.overflow = '';
}

// ==========================================
// NOTIFICATIONS SYSTEM
// ==========================================
function createNotificationDrawer() {
  const existing = document.querySelector('.notification-drawer');
  if (existing) existing.remove();

  const drawer = document.createElement('div');
  drawer.className = 'notification-drawer';
  drawer.innerHTML = `
    <div class="flex items-center justify-between p-4 border-b border-outline/60">
      <h2 class="text-xl font-bold text-trust">Notifications</h2>
      <button class="close-notifications p-2 hover:bg-brand-blue-soft rounded-full transition-all">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="notifications-container flex-1 overflow-y-auto p-4 space-y-3"></div>
  `;

  document.body.appendChild(drawer);

  const closeBtn = drawer.querySelector('.close-notifications');
  const overlay = document.querySelector('.drawer-overlay');

  closeBtn.addEventListener('click', closeNotifications);
  if (overlay) overlay.addEventListener('click', closeNotifications);
}

function renderNotifications() {
  const container = document.querySelector('.notifications-container');
  if (!container) return;

  const sampleNotifications = [
    { id: 1, message: '🎉 Welcome to GAOGETS HUB!', time: 'Just now', read: false },
    { id: 2, message: '📦 Your order #1234 has been shipped', time: '2 hours ago', read: false },
    { id: 3, message: '⭐ New laptops just arrived!', time: '1 day ago', read: true },
  ];

  if (sampleNotifications.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="far fa-bell text-4xl text-muted/40 mb-4"></i>
        <p class="text-muted font-medium">No notifications</p>
        <p class="text-muted text-sm mt-2">You're all caught up!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sampleNotifications.map(notif => `
    <div class="flex items-start gap-3 p-3 ${notif.read ? 'bg-surface' : 'bg-brand-blue-soft'} rounded-xl border border-outline/60">
      <div class="w-2 h-2 rounded-full ${notif.read ? 'bg-muted/30' : 'bg-brand-orange'} mt-2 flex-shrink-0"></div>
      <div>
        <p class="text-sm ${notif.read ? 'text-muted' : 'text-trust'}">${notif.message}</p>
        <p class="text-xs text-muted mt-1">${notif.time}</p>
      </div>
    </div>
  `).join('');

  const hasUnread = sampleNotifications.some(n => !n.read);
  const dot = document.querySelector('.notification-dot');
  if (dot) dot.classList.toggle('hidden', !hasUnread);
}

function openNotifications() {
  if (isNotificationsOpen) {
    renderNotifications();
    return;
  }
  isNotificationsOpen = true;

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);

  if (!document.querySelector('.notification-drawer')) createNotificationDrawer();

  renderNotifications();
  const drawer = document.querySelector('.notification-drawer');
  if (drawer) setTimeout(() => drawer.classList.add('open'), 50);
  document.body.style.overflow = 'hidden';
}

function closeNotifications() {
  if (!isNotificationsOpen) return;
  isNotificationsOpen = false;

  const drawer = document.querySelector('.notification-drawer');
  const overlay = document.querySelector('.drawer-overlay');

  if (drawer) drawer.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
  document.body.style.overflow = '';
}

// ==========================================
// WISHLIST SYSTEM
// ==========================================
function createWishlistDrawer() {
  const existing = document.querySelector('.wishlist-drawer');
  if (existing) existing.remove();

  const drawer = document.createElement('div');
  drawer.className = 'wishlist-drawer';
  drawer.innerHTML = `
    <div class="flex items-center justify-between p-4 border-b border-outline/60">
      <h2 class="text-xl font-bold text-trust">Your Wishlist</h2>
      <button class="close-wishlist p-2 hover:bg-brand-blue-soft rounded-full transition-all">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="wishlist-container flex-1 overflow-y-auto p-4 space-y-3"></div>
  `;

  document.body.appendChild(drawer);

  const closeBtn = drawer.querySelector('.close-wishlist');
  const overlay = document.querySelector('.drawer-overlay');

  closeBtn.addEventListener('click', closeWishlist);
  if (overlay) overlay.addEventListener('click', closeWishlist);
}

function renderWishlist() {
  const container = document.querySelector('.wishlist-container');
  if (!container) return;

  try {
    const saved = localStorage.getItem('shopghana_wishlist');
    if (saved) wishlist = JSON.parse(saved);
  } catch (e) { wishlist = []; }

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="far fa-heart text-4xl text-muted/40 mb-4"></i>
        <p class="text-muted font-medium">Your wishlist is empty</p>
        <p class="text-muted text-sm mt-2">Start saving your favorite items!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = wishlist.map(item => {
    const imageUrl = fixImageUrl(item.image);
    return `
    <div class="flex gap-3 p-3 bg-surface rounded-xl border border-outline/60">
      <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface/50">
        <img src="${imageUrl || ''}" alt="${item.name}" class="w-full h-full object-cover" 
             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%23E6DCD2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2220%22 font-family=%22Inter%22%3E${item.name.charAt(0)}%3C/text%3E%3C/svg%3E'" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-sm">${item.name}</h4>
        <p class="font-bold text-brand-orange text-sm">${settings.currency} ${item.price.toFixed(2)}</p>
        <button class="mt-1 text-xs text-brand-blue hover:underline wishlist-add-to-cart" data-name="${item.name}" data-price="${item.price}" data-image="${imageUrl}" data-id="${item.id}">
          <i class="fas fa-cart-plus"></i> Add to Cart
        </button>
        <button class="mt-1 ml-3 text-xs text-red-500 hover:underline wishlist-remove" data-id="${item.id || item.name}">
          <i class="fas fa-trash-alt"></i> Remove
        </button>
      </div>
    </div>
  `}).join('');

  container.querySelectorAll('.wishlist-add-to-cart').forEach(btn => {
    btn.addEventListener('click', function() {
      const name = this.dataset.name;
      const price = parseFloat(this.dataset.price);
      const image = this.dataset.image;
      const id = this.dataset.id;
      addToCart(name, price, 1, image, id);
    });
  });

  container.querySelectorAll('.wishlist-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      wishlist = wishlist.filter(item => (item.id || item.name) !== id);
      localStorage.setItem('shopghana_wishlist', JSON.stringify(wishlist));
      renderWishlist();
      showToast('💔 Removed from wishlist');
    });
  });
}

function openWishlist() {
  if (isWishlistOpen) {
    renderWishlist();
    return;
  }
  isWishlistOpen = true;

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 10);

  if (!document.querySelector('.wishlist-drawer')) createWishlistDrawer();

  renderWishlist();
  const drawer = document.querySelector('.wishlist-drawer');
  if (drawer) setTimeout(() => drawer.classList.add('open'), 50);
  document.body.style.overflow = 'hidden';
}

function closeWishlist() {
  if (!isWishlistOpen) return;
  isWishlistOpen = false;

  const drawer = document.querySelector('.wishlist-drawer');
  const overlay = document.querySelector('.drawer-overlay');

  if (drawer) drawer.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
  document.body.style.overflow = '';
}

// ==========================================
// HERO SLIDER
// ==========================================
function goToSlide(index) {
  heroSlides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });
  heroDots.forEach((dot, i) => {
    dot.classList.toggle('bg-white/60', i === index);
    dot.classList.toggle('bg-white/30', i !== index);
  });
  currentSlide = index;
}

function nextSlide() {
  goToSlide((currentSlide + 1) % totalSlides);
}

function prevSlide() {
  goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
}

function startHeroSlider() {
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(nextSlide, 5000);
}

// ==========================================
// IMAGE URL HELPER
// ==========================================
function fixImageUrl(url) {
  if (!url) return '';
  
  // If it's already a data URL or a complete URL with a valid protocol
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Handle Google Drive URLs
  try {
    // Check if it's a Google Drive URL
    if (url.includes('drive.google.com')) {
      // Case 1: https://drive.google.com/file/d/FILE_ID/view
      if (url.includes('/file/d/')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match && match[1]) {
          return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
      }
      // Case 2: https://drive.google.com/uc?export=view&id=FILE_ID
      if (url.includes('export=view') || url.includes('uc?')) {
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
          return url; // Already in correct format
        }
      }
      // Case 3: https://drive.google.com/open?id=FILE_ID
      if (url.includes('open?id=')) {
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
      }
      // Case 4: Just the ID directly
      if (url.match(/^[a-zA-Z0-9_-]{20,}$/)) {
        return `https://drive.google.com/uc?export=view&id=${url}`;
      }
    }
  } catch (e) {
    console.warn('Error parsing image URL:', e);
  }
  
  return url;
}

// ==========================================
// PRODUCT RENDERING
// ==========================================
function renderProducts(productsToRender) {
  if (!productGrid) return;
  
  if (!productsToRender || productsToRender.length === 0) {
    productGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-box-open text-3xl text-muted/40"></i>
        <p class="text-muted mt-3">No products found</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = productsToRender.map(product => {
    const imageUrl = fixImageUrl(product.image);
    return `
    <div class="bg-surface-card border border-outline/60 rounded-2xl p-3 md:p-4 hover:shadow-card transition-all group">
      <a href="product-detail.html?id=${product.id}" class="block">
        <div class="relative aspect-square rounded-xl overflow-hidden mb-3 bg-surface/50">
          ${product.badge ? `<span class="absolute top-2 left-2 ${product.badge === 'BESTSELLER' ? 'bg-brand-blue' : 'bg-brand-orange'} text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">${product.badge}</span>` : ''}
          <img class="product-image w-full h-full object-contain p-2 group-hover:scale-105 transition duration-500" 
               src="${imageUrl}" 
               alt="${product.name}" 
               loading="lazy"
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%22%23F5F0EB%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2236%22 font-family=%22Inter%22%3E${product.name.charAt(0)}%3C/text%3E%3C/svg%3E'" />
        </div>
      </a>
      <p class="text-muted text-xs font-medium mb-0.5">${product.brand || 'Brand'}</p>
      <h3 class="font-semibold text-sm md:text-base mb-1 line-clamp-1">${product.name}</h3>
      <div class="flex items-center gap-1 text-sm">
        ${Array.from({ length: Math.floor(product.rating || 0) }, (_, i) => `<i class="fas fa-star text-brand-orange text-[10px]"></i>`)}
        ${product.rating % 1 >= 0.5 ? `<i class="fas fa-star-half-alt text-brand-orange text-[10px]"></i>` : ''}
        <span class="text-muted text-xs">(${product.reviews || 0})</span>
      </div>
      <div class="flex items-baseline gap-2 mt-1">
        <span class="text-lg md:text-xl font-bold text-brand-orange">${settings.currency}${product.price.toLocaleString()}</span>
        ${product.originalPrice ? `<span class="text-xs md:text-sm text-muted line-through">${settings.currency}${product.originalPrice.toLocaleString()}</span>` : ''}
      </div>
      <button class="mt-3 w-full bg-brand-blue text-white font-bold rounded-full py-2 md:py-2.5 flex items-center justify-center gap-2 hover:bg-brand-blue-dark transition text-sm add-to-cart-btn" 
              data-name="${product.name}" data-price="${product.price}" data-image="${imageUrl}" data-id="${product.id}">
        <i class="fas fa-cart-plus"></i> Add to Cart
      </button>
      <button class="mt-1 w-full text-xs text-muted hover:text-red-500 transition wishlist-btn" 
              data-name="${product.name}" data-price="${product.price}" data-image="${imageUrl}" data-id="${product.id}">
        <i class="far fa-heart"></i> Add to Wishlist
      </button>
    </div>
  `}).join('');

  // Attach add to cart events
  productGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const name = this.dataset.name;
      const price = parseFloat(this.dataset.price);
      const image = this.dataset.image;
      const id = this.dataset.id;
      addToCart(name, price, 1, image, id);
      this.style.transform = 'scale(0.95)';
      setTimeout(() => this.style.transform = '', 200);
    });
  });

  // Attach wishlist events
  productGrid.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const name = this.dataset.name;
      const price = parseFloat(this.dataset.price);
      const image = this.dataset.image;
      const id = this.dataset.id;
      
      try {
        const saved = localStorage.getItem('shopghana_wishlist');
        let wishlistItems = saved ? JSON.parse(saved) : [];
        if (!wishlistItems.find(item => item.name === name)) {
          wishlistItems.push({ id, name, price, image });
          localStorage.setItem('shopghana_wishlist', JSON.stringify(wishlistItems));
          showToast(`❤️ "${name}" added to wishlist`);
        } else {
          showToast(`💔 "${name}" already in wishlist`);
        }
      } catch (e) { console.warn('Wishlist error:', e); }
    });
  });
}

function renderTrending(productsToRender) {
  if (!trendingGrid) return;
  
  if (!productsToRender || productsToRender.length === 0) {
    trendingGrid.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-muted text-sm">No trending products</p>
      </div>
    `;
    return;
  }

  trendingGrid.innerHTML = productsToRender.map(product => {
    const imageUrl = fixImageUrl(product.image);
    return `
    <div class="bg-surface-card border border-outline/50 p-2 md:p-3 rounded-2xl hover:shadow-card transition group">
      <a href="product-detail.html?id=${product.id}" class="block">
        <div class="aspect-square rounded-xl overflow-hidden mb-2 bg-surface/30">
          <img class="w-full h-full object-contain p-2 group-hover:scale-105 transition" 
               src="${imageUrl}" 
               alt="${product.name}" 
               loading="lazy"
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%22%23F5F0EB%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2236%22 font-family=%22Inter%22%3E${product.name.charAt(0)}%3C/text%3E%3C/svg%3E'" />
        </div>
      </a>
      <h4 class="font-semibold text-xs md:text-sm line-clamp-1">${product.name}</h4>
      <p class="text-brand-orange font-bold text-xs md:text-sm">${settings.currency}${product.price.toLocaleString()}</p>
      <button class="mt-2 w-full text-[10px] md:text-xs bg-brand-blue text-white font-bold rounded-full py-1.5 flex items-center justify-center gap-1 hover:bg-brand-blue-dark transition add-to-cart-btn" 
              data-name="${product.name}" data-price="${product.price}" data-image="${imageUrl}" data-id="${product.id}">
        <i class="fas fa-cart-plus text-[10px] md:text-xs"></i>
      </button>
    </div>
  `}).join('');

  trendingGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const name = this.dataset.name;
      const price = parseFloat(this.dataset.price);
      const image = this.dataset.image;
      const id = this.dataset.id;
      addToCart(name, price, 1, image, id);
      this.style.transform = 'scale(0.95)';
      setTimeout(() => this.style.transform = '', 200);
    });
  });
}

// ==========================================
// FIREBASE DATA FETCHING
// ==========================================
async function fetchProductsFromFirebase() {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, limit(8));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn('No products found in Firebase');
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function fetchTrendingFromFirebase() {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('reviews', 'desc'), limit(6));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn('No trending found in Firebase');
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching trending:', error);
    return [];
  }
}

async function fetchProductsByCategory(category) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('category', '==', category), limit(8));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`No products found for category ${category}`);
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}

// ==========================================
// LOAD PRODUCTS
// ==========================================
async function loadProducts() {
  try {
    const data = await fetchProductsFromFirebase();
    products = data;
    renderProducts(products);
  } catch (error) {
    console.error('Failed to load products:', error);
    renderProducts([]);
  }
}

async function loadTrending() {
  try {
    const data = await fetchTrendingFromFirebase();
    trendingProducts = data;
    renderTrending(trendingProducts);
  } catch (error) {
    console.error('Failed to load trending:', error);
    renderTrending([]);
  }
}

async function filterByCategory(category) {
  currentCategory = category;
  try {
    let data;
    if (category === 'all') {
      data = await fetchProductsFromFirebase();
    } else {
      data = await fetchProductsByCategory(category);
    }
    products = data;
    renderProducts(products);
    
    document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`📂 Showing ${category} laptops`);
    
    try {
      logEvent(analytics, 'category_filter', { category: category });
    } catch (e) { /* ignore */ }
  } catch (error) {
    console.error('Failed to filter products:', error);
  }
}

// ==========================================
// SEARCH
// ==========================================
function searchProducts(query) {
  if (!query.trim()) {
    renderProducts(products);
    return;
  }
  
  const results = products.filter(p => 
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.brand?.toLowerCase().includes(query.toLowerCase()) ||
    p.category?.toLowerCase().includes(query.toLowerCase())
  );
  
  renderProducts(results);
  if (results.length === 0) {
    showToast('🔍 No products found for "' + query + '"');
  } else {
    showToast(`🔍 Found ${results.length} product(s) for "${query}"`);
  }
}

// ==========================================
// COUNTDOWN TIMER
// ==========================================
function updateCountdown() {
  if (!countdownEl) return;
  const now = new Date();
  const hours = 23 - now.getHours();
  const minutes = 59 - now.getMinutes();
  const seconds = 59 - now.getSeconds();
  countdownEl.textContent = 
    `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
}

// ==========================================
// MOBILE NAV
// ==========================================
function openMobileNav() {
  mobileNav.classList.add('open');
  mobileOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  mobileNav.classList.remove('open');
  mobileOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

// ==========================================
// SCROLL REVEAL
// ==========================================
function setupScrollReveal() {
  const sections = document.querySelectorAll('.scroll-reveal');
  if (sections.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  
  sections.forEach(section => observer.observe(section));
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function init() {
  // Load settings first
  loadSettings().then(() => {
    // Load cart
    loadCart();
    
    // Load products from Firebase
    loadProducts();
    loadTrending();
    
    // Countdown
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Hero slider
    startHeroSlider();
    heroDots.forEach(dot => {
      dot.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        goToSlide(index);
        clearInterval(heroInterval);
        startHeroSlider();
      });
    });
    heroPrev?.addEventListener('click', () => {
      prevSlide();
      clearInterval(heroInterval);
      startHeroSlider();
    });
    heroNext?.addEventListener('click', () => {
      nextSlide();
      clearInterval(heroInterval);
      startHeroSlider();
    });
    
    // Mobile nav
    menuToggle?.addEventListener('click', openMobileNav);
    closeMenu?.addEventListener('click', closeMobileNav);
    mobileOverlay?.addEventListener('click', closeMobileNav);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });
    mobileNav?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });
    
    // Cart toggle
    document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openCart();
      });
    });
    
    // Notification toggle
    notificationToggle?.addEventListener('click', function(e) {
      e.stopPropagation();
      openNotifications();
    });
    mobileNotificationsLink?.addEventListener('click', function(e) {
      e.preventDefault();
      closeMobileNav();
      setTimeout(openNotifications, 300);
    });
    
    // Wishlist toggle
    wishlistToggle?.addEventListener('click', function(e) {
      e.stopPropagation();
      openWishlist();
    });
    mobileWishlistLink?.addEventListener('click', function(e) {
      e.preventDefault();
      closeMobileNav();
      setTimeout(openWishlist, 300);
    });
    
    // Close drawers on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (isCartOpen) closeCart();
        if (isNotificationsOpen) closeNotifications();
        if (isWishlistOpen) closeWishlist();
      }
    });
    
    // Category filters (desktop nav)
    document.querySelectorAll('nav a[data-category]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const category = this.dataset.category;
        filterByCategory(category);
        
        document.querySelectorAll('nav a[data-category]').forEach(l => {
          l.classList.remove('text-brand-orange', 'border-b-2', 'border-brand-orange');
          l.classList.add('text-trust-light');
        });
        this.classList.add('text-brand-orange', 'border-b-2', 'border-brand-orange');
        this.classList.remove('text-trust-light');
      });
    });
    
    // Category cards (bento)
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', function() {
        const category = this.dataset.category;
        filterByCategory(category);
      });
    });
    
    // Mobile nav category links
    document.querySelectorAll('#mobileNav a[data-category]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const category = this.dataset.category;
        filterByCategory(category);
        closeMobileNav();
      });
    });
    
    // Footer category links
    document.querySelectorAll('footer a[data-category]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const category = this.dataset.category;
        filterByCategory(category);
      });
    });
    
    // Search
    function handleSearch() {
      const query = searchInput?.value || mobileSearchInput?.value || '';
      searchProducts(query);
    }
    
    searchBtn?.addEventListener('click', handleSearch);
    mobileSearchBtn?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
    mobileSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
    
    // Trending navigation
    document.querySelector('.trending-prev')?.addEventListener('click', () => {
      trendingGrid.scrollBy({ left: -300, behavior: 'smooth' });
    });
    document.querySelector('.trending-next')?.addEventListener('click', () => {
      trendingGrid.scrollBy({ left: 300, behavior: 'smooth' });
    });
    
    // Scroll reveal
    setupScrollReveal();
    
    console.log('🛍️ GAOGETS HUB initialized with Firebase');
  });
}

// ==========================================
// START APP
// ==========================================
document.addEventListener('DOMContentLoaded', init);