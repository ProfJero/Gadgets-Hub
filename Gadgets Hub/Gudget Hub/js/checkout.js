/**
 * GAOGETS HUB - Checkout Page
 * Handles: Cart display, order summary, payment method selection, promo codes
 */

import { 
  db,
  doc,
  getDoc,
  analytics,
  logEvent
} from "./firebase-config.js";

// ==========================================
// DOM REFS
// ==========================================
const orderItemsContainer = document.getElementById('orderItemsContainer');
const subtotalAmount = document.querySelector('.subtotal-amount');
const shippingAmount = document.querySelector('.shipping-amount');
const taxAmount = document.querySelector('.tax-amount');
const grandTotal = document.querySelector('.grand-total');
const cartBadge = document.getElementById('cartBadge');
const promoInput = document.getElementById('promoInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const reviewPayBtn = document.getElementById('reviewPayBtn');
const announcementText = document.getElementById('announcementText');
const notificationToggle = document.getElementById('notificationToggle');
const wishlistToggle = document.getElementById('wishlistToggle');

// ==========================================
// SETTINGS (from Firebase)
// ==========================================
let settings = {
  freeDeliveryThreshold: 30000,
  shippingFee: 45,
  expressShippingFee: 85,
  currency: '₵',
  taxRate: 0.025, // 2.5% VAT
  announcementText: 'Free delivery on orders over ₵30,000 • Ghana Independence Month Deals!'
};

let cart = [];
let cartCount = 0;
let promoApplied = false;
let promoDiscount = 0;
let promoCode = '';
let isNotificationsOpen = false;
let isWishlistOpen = false;
let wishlist = [];

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function showToast(message, duration = 3000) {
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
// IMAGE URL HELPER
// ==========================================
function fixImageUrl(url) {
  if (!url) return '';
  
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i)) return url;
  
  if (url.includes('drive.google.com')) {
    let fileId = null;
    const match1 = url.match(/\/d\/([^\/\?]+)/);
    if (match1 && match1[1]) fileId = match1[1];
    if (!fileId) {
      const match2 = url.match(/[?&]id=([^&]+)/);
      if (match2 && match2[1]) fileId = match2[1];
    }
    if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return url;
}

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
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    applySettings();
  }
}

function applySettings() {
  if (announcementText) {
    const threshold = settings.freeDeliveryThreshold || 30000;
    announcementText.textContent = settings.announcementText || 
      `Free delivery on orders over ${settings.currency}${threshold.toLocaleString()} • Shop Ghana Independence Month Deals!`;
  }
}

// ==========================================
// CART FUNCTIONS
// ==========================================
function loadCart() {
  try {
    const saved = localStorage.getItem('shopghana_cart');
    if (saved) {
      cart = JSON.parse(saved);
      cartCount = cart.reduce((total, item) => total + item.quantity, 0);
      updateCartBadge();
      renderOrderSummary();
    }
  } catch (e) { console.warn('Failed to load cart:', e); }
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

// ==========================================
// RENDER ORDER SUMMARY
// ==========================================
function renderOrderSummary() {
  if (!orderItemsContainer) return;

  if (cart.length === 0) {
    orderItemsContainer.innerHTML = `
      <div class="text-center py-8 text-muted text-sm">
        <i class="fas fa-shopping-cart text-2xl mb-2 block"></i>
        <p>No items in cart</p>
        <a href="index.html" class="text-brand-orange hover:underline text-xs">Continue Shopping</a>
      </div>
    `;
    updateTotals(0, 0, 0, 0);
    return;
  }

  let html = '';
  cart.slice(0, 5).forEach(item => {
    const imageUrl = fixImageUrl(item.image);
    const firstChar = item.name ? item.name.charAt(0).toUpperCase() : '?';
    html += `
      <div class="flex gap-3">
        <div class="w-12 h-12 md:w-16 md:h-16 bg-surface rounded-lg border border-outline/60 flex-shrink-0 overflow-hidden">
          <img class="w-full h-full object-cover" src="${imageUrl}" alt="${item.name}" 
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%23E6DCD2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2220%22 font-family=%22Inter%22%3E${firstChar}%3C/text%3E%3C/svg%3E'" />
        </div>
        <div class="flex-grow min-w-0">
          <h4 class="font-semibold text-sm truncate">${item.name}</h4>
          ${item.options && Object.keys(item.options).length > 0 ? 
            `<p class="text-xs text-muted truncate">${Object.values(item.options).join(' • ')}</p>` : ''}
          <div class="flex justify-between items-center mt-0.5">
            <span class="text-xs text-muted">Qty: ${item.quantity}</span>
            <span class="font-semibold text-sm text-brand-orange">${settings.currency} ${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  });

  if (cart.length > 5) {
    html += `<p class="text-xs text-muted text-center">+ ${cart.length - 5} more item(s)</p>`;
  }

  orderItemsContainer.innerHTML = html;
  
  // Calculate totals
  const subtotal = getCartTotal();
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + shipping + tax - discount;
  
  updateTotals(subtotal, shipping, tax, discount, total);
}

function calculateShipping(subtotal) {
  if (cart.length === 0) return 0;
  // Free delivery if order meets threshold
  if (subtotal >= (settings.freeDeliveryThreshold || 30000)) {
    return 0;
  }
  return settings.shippingFee || 45;
}

function calculateTax(subtotal) {
  return subtotal * (settings.taxRate || 0.025);
}

function updateTotals(subtotal, shipping, tax, discount = 0, total) {
  // Ensure all values are numbers
  const safeSubtotal = Number(subtotal) || 0;
  const safeShipping = Number(shipping) || 0;
  const safeTax = Number(tax) || 0;
  const safeDiscount = Number(discount) || 0;
  const safeTotal = Number(total) || (safeSubtotal + safeShipping + safeTax - safeDiscount);
  
  if (subtotalAmount) subtotalAmount.textContent = `${settings.currency} ${safeSubtotal.toFixed(2)}`;
  if (shippingAmount) shippingAmount.textContent = `${settings.currency} ${safeShipping.toFixed(2)}`;
  if (taxAmount) taxAmount.textContent = `${settings.currency} ${safeTax.toFixed(2)}`;
  if (grandTotal) grandTotal.textContent = `${settings.currency} ${safeTotal.toFixed(2)}`;
}

// ==========================================
// PAYMENT METHOD SELECTION
// ==========================================
document.querySelectorAll('.payment-option').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.payment-option').forEach(o => {
      o.classList.remove('selected', 'border-brand-orange', 'bg-brand-orange-soft');
      o.classList.add('border-outline');
      o.style.borderWidth = '1px';
    });
    this.classList.add('selected', 'border-brand-orange', 'bg-brand-orange-soft');
    this.classList.remove('border-outline');
    this.style.borderWidth = '2px';
  });
});

// ==========================================
// PROMO CODE
// ==========================================
applyPromoBtn?.addEventListener('click', function() {
  const code = promoInput?.value.trim();
  if (!code) {
    showToast('⚠️ Please enter a promo code');
    return;
  }
  
  // Simulate promo code validation
  if (code.toUpperCase() === 'SAVE10' || code.toUpperCase() === 'GHANA10') {
    promoApplied = true;
    promoCode = code;
    showToast(`🎫 Promo code "${code}" applied! 10% off`);
    renderOrderSummary();
    promoInput.value = '';
  } else if (code.toUpperCase() === 'FREESHIP') {
    promoApplied = true;
    promoCode = code;
    showToast(`🎫 Promo code "${code}" applied! Free shipping`);
    renderOrderSummary();
    promoInput.value = '';
  } else {
    showToast('❌ Invalid promo code. Try SAVE10, GHANA10, or FREESHIP');
  }
});

// ==========================================
// REVIEW & PAY (Payment First)
// ==========================================
reviewPayBtn?.addEventListener('click', function() {
  if (cart.length === 0) {
    showToast('🛒 Your cart is empty!');
    return;
  }
  
  const subtotal = getCartTotal();
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + shipping + tax - discount;
  
  // Show payment confirmation first
  showToast(`💳 Processing payment: ${settings.currency} ${total.toFixed(2)}...`);
  
  // Simulate payment processing
  setTimeout(() => {
    // Log checkout event
    try {
      logEvent(analytics, 'purchase', {
        value: total,
        currency: settings.currency,
        items: cart.length,
        promo_code: promoCode || 'none'
      });
    } catch (e) { /* ignore */ }
    
    showToast(`✅ Payment successful! Order placed. Total: ${settings.currency} ${total.toFixed(2)}`);
    
    // Clear cart after successful payment
    localStorage.removeItem('shopghana_cart');
    cart = [];
    cartCount = 0;
    promoApplied = false;
    promoCode = '';
    updateCartBadge();
    renderOrderSummary();
  }, 1500);
});

// ==========================================
// NOTIFICATIONS SYSTEM
// ==========================================
function createNotificationDrawer() {
  const existing = document.querySelector('.notification-drawer');
  if (existing) existing.remove();

  const drawer = document.createElement('div');
  drawer.className = 'notification-drawer fixed top-0 right-0 w-full max-w-md h-full bg-white z-[100] shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out overflow-hidden flex flex-col';
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
  overlay.className = 'drawer-overlay fixed inset-0 bg-black/30 z-[99] transition-opacity duration-300';
  overlay.style.opacity = '0';
  document.body.appendChild(overlay);
  setTimeout(() => { overlay.style.opacity = '1'; }, 10);

  if (!document.querySelector('.notification-drawer')) createNotificationDrawer();

  renderNotifications();
  const drawer = document.querySelector('.notification-drawer');
  if (drawer) {
    setTimeout(() => {
      drawer.style.transform = 'translateX(0)';
    }, 50);
  }
  document.body.style.overflow = 'hidden';
}

function closeNotifications() {
  if (!isNotificationsOpen) return;
  isNotificationsOpen = false;

  const drawer = document.querySelector('.notification-drawer');
  const overlay = document.querySelector('.drawer-overlay');

  if (drawer) drawer.style.transform = 'translateX(100%)';
  if (overlay) {
    overlay.style.opacity = '0';
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
  drawer.className = 'wishlist-drawer fixed top-0 right-0 w-full max-w-md h-full bg-white z-[100] shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out overflow-hidden flex flex-col';
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
    const firstChar = item.name ? item.name.charAt(0).toUpperCase() : '?';
    return `
    <div class="flex gap-3 p-3 bg-surface rounded-xl border border-outline/60">
      <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface/50">
        <img src="${imageUrl || ''}" alt="${item.name}" class="w-full h-full object-cover" 
             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%23E6DCD2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2220%22 font-family=%22Inter%22%3E${firstChar}%3C/text%3E%3C/svg%3E'" />
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
      showToast(`🛒 Added "${name}" to cart!`);
      // Add to cart logic would go here
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
  overlay.className = 'drawer-overlay fixed inset-0 bg-black/30 z-[99] transition-opacity duration-300';
  overlay.style.opacity = '0';
  document.body.appendChild(overlay);
  setTimeout(() => { overlay.style.opacity = '1'; }, 10);

  if (!document.querySelector('.wishlist-drawer')) createWishlistDrawer();

  renderWishlist();
  const drawer = document.querySelector('.wishlist-drawer');
  if (drawer) {
    setTimeout(() => {
      drawer.style.transform = 'translateX(0)';
    }, 50);
  }
  document.body.style.overflow = 'hidden';
}

function closeWishlist() {
  if (!isWishlistOpen) return;
  isWishlistOpen = false;

  const drawer = document.querySelector('.wishlist-drawer');
  const overlay = document.querySelector('.drawer-overlay');

  if (drawer) drawer.style.transform = 'translateX(100%)';
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }
  document.body.style.overflow = '';
}

// ==========================================
// MOBILE NAV
// ==========================================
const mobileNav = document.getElementById('mobileNav');
const mobileOverlay = document.getElementById('mobileOverlay');
const menuToggle = document.getElementById('mobileMenuToggle');
const closeMenu = document.getElementById('closeMobileMenu');

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

menuToggle?.addEventListener('click', openMobileNav);
closeMenu?.addEventListener('click', closeMobileNav);
mobileOverlay?.addEventListener('click', closeMobileNav);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileNav();
    if (isNotificationsOpen) closeNotifications();
    if (isWishlistOpen) closeWishlist();
  }
});

mobileNav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

// ==========================================
// NOTIFICATION & WISHLIST TOGGLES
// ==========================================
notificationToggle?.addEventListener('click', function(e) {
  e.stopPropagation();
  openNotifications();
});

wishlistToggle?.addEventListener('click', function(e) {
  e.stopPropagation();
  openWishlist();
});

// ==========================================
// DRAWER OVERLAY CLOSE
// ==========================================
document.addEventListener('click', function(e) {
  const drawers = document.querySelectorAll('.cart-drawer, .notification-drawer, .wishlist-drawer');
  const overlays = document.querySelectorAll('.drawer-overlay');
  
  if (e.target.classList.contains('drawer-overlay')) {
    closeNotifications();
    closeWishlist();
  }
});

// ==========================================
// INIT
// ==========================================
async function init() {
  console.log('🛍️ GAOGETS HUB Checkout initializing...');
  await loadSettings();
  loadCart();
  console.log('✅ Checkout initialized');
}

init();