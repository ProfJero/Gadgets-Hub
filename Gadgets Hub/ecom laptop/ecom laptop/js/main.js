/**
 * ShopGhana - Main JavaScript with Full Cart System
 * Handles: Cart management, tab switching, thumbnail selection,
 * quantity controls, option selection, slider navigation, and toast notifications
 */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // ==========================================
  // CART SYSTEM
  // ==========================================
  
  // Cart state
  let cart = [];
  let cartCount = 0;
  let isCartOpen = false;

  // Load cart from localStorage
  function loadCart() {
    try {
      const saved = localStorage.getItem('shopghana_cart');
      if (saved) {
        cart = JSON.parse(saved);
        cartCount = cart.reduce((total, item) => total + item.quantity, 0);
        updateCartBadge();
      }
    } catch (e) {
      console.warn('Failed to load cart:', e);
    }
  }

  // Save cart to localStorage
  function saveCart() {
    try {
      localStorage.setItem('shopghana_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart:', e);
    }
  }

  // Update cart badge
  function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
      if (cartCount > 0) {
        badge.textContent = cartCount;
        badge.classList.remove('hidden');
      } else {
        badge.textContent = '0';
        badge.classList.add('hidden');
      }
    });
  }

  // Add item to cart
  function addToCart(productName, price, quantity = 1, image = '', options = {}) {
    // Check if product already exists in cart
    const existingItem = cart.find(item => 
      item.name === productName && 
      JSON.stringify(item.options) === JSON.stringify(options)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: productName,
        price: price,
        quantity: quantity,
        image: image || 'https://via.placeholder.com/80',
        options: options
      });
    }

    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    updateCartBadge();
    saveCart();
    showToast(`🛒 Added "${productName}" to cart!`);
    renderCartItems();
    
    // Open cart drawer after adding item
    setTimeout(() => {
      openCart();
    }, 400);
  }

  // Remove item from cart
  function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    updateCartBadge();
    saveCart();
    renderCartItems();
    
    if (cart.length === 0) {
      showToast('🛒 Cart is now empty');
    }
  }

  // Update item quantity
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

  // Get cart total
  function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // ==========================================
  // CART DRAWER / SIDEBAR
  // ==========================================

  // Create cart drawer
  function createCartDrawer() {
    // Remove existing drawer if any
    const existingDrawer = document.querySelector('.cart-drawer');
    if (existingDrawer) existingDrawer.remove();

    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer fixed top-0 right-0 w-full max-w-md h-full bg-white z-[100] shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out overflow-hidden flex flex-col';
    drawer.innerHTML = `
      <div class="flex items-center justify-between p-4 border-b border-outline-variant">
        <h2 class="font-headline-md text-headline-md">Your Cart</h2>
        <button class="close-cart p-2 hover:bg-surface-container-low rounded-full transition-all">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="cart-items-container flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Cart items will be rendered here -->
      </div>
      <div class="cart-footer border-t border-outline-variant p-4 bg-surface-container-low">
        <div class="flex justify-between items-center mb-4">
          <span class="font-label-lg text-label-lg">Total:</span>
          <span class="font-price-lg text-price-lg text-primary cart-total">GH₵ 0.00</span>
        </div>
        <button class="checkout-btn w-full bg-primary text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all">
          Proceed to Checkout
        </button>
        <button class="continue-shopping w-full mt-2 text-on-surface-variant hover:text-primary transition-colors font-label-lg text-label-lg">
          Continue Shopping
        </button>
      </div>
    `;

    document.body.appendChild(drawer);

    // Close cart events
    const closeBtn = drawer.querySelector('.close-cart');
    const continueBtn = drawer.querySelector('.continue-shopping');
    const overlay = document.querySelector('.cart-overlay');

    closeBtn.addEventListener('click', closeCart);
    continueBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    // Checkout button
    const checkoutBtn = drawer.querySelector('.checkout-btn');
    checkoutBtn.addEventListener('click', function() {
      if (cart.length === 0) {
        showToast('🛒 Your cart is empty!');
        return;
      }
      const total = getCartTotal();
      showToast(`💳 Proceeding to checkout. Total: GH₵ ${total.toFixed(2)}`);
      // You can redirect to checkout page here
      // window.location.href = 'checkout.html';
    });
  }

  // Render cart items
  function renderCartItems() {
    const container = document.querySelector('.cart-items-container');
    const totalElement = document.querySelector('.cart-total');
    
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-outline-variant mb-4">shopping_cart</span>
          <p class="text-on-surface-variant font-body-lg text-body-lg">Your cart is empty</p>
          <p class="text-on-surface-variant text-sm mt-2">Start adding some items!</p>
        </div>
      `;
      if (totalElement) totalElement.textContent = 'GH₵ 0.00';
      return;
    }

    let html = '';
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      html += `
        <div class="flex gap-4 p-3 bg-surface-container-low rounded-xl border border-outline-variant cart-item" data-id="${item.id}">
          <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-title-md text-title-md line-clamp-1">${item.name}</h4>
            <p class="font-price-sm text-price-sm text-primary">GH₵ ${item.price.toFixed(2)}</p>
            ${item.options && Object.keys(item.options).length > 0 ? 
              `<p class="text-on-surface-variant text-[12px]">${Object.values(item.options).join(' • ')}</p>` : ''}
            <div class="flex items-center gap-2 mt-2">
              <button class="qty-decrease w-8 h-8 rounded-full border border-outline-variant hover:bg-surface-container transition-all" data-id="${item.id}">-</button>
              <span class="font-label-lg text-label-lg min-w-[24px] text-center">${item.quantity}</span>
              <button class="qty-increase w-8 h-8 rounded-full border border-outline-variant hover:bg-surface-container transition-all" data-id="${item.id}">+</button>
              <button class="remove-item ml-auto text-error hover:bg-error-container rounded-full p-1 transition-all" data-id="${item.id}">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Update total
    if (totalElement) {
      totalElement.textContent = `GH₵ ${getCartTotal().toFixed(2)}`;
    }

    // Attach event listeners to cart item buttons
    container.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.id;
        const item = cart.find(i => i.id === id);
        if (item) {
          updateCartQuantity(id, item.quantity - 1);
        }
      });
    });

    container.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.id;
        const item = cart.find(i => i.id === id);
        if (item) {
          updateCartQuantity(id, item.quantity + 1);
        }
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

  // Open cart drawer
  function openCart() {
    if (isCartOpen) {
      // If already open, just render items
      renderCartItems();
      return;
    }
    isCartOpen = true;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay fixed inset-0 bg-black/30 z-[99] transition-opacity duration-300';
    overlay.style.opacity = '0';
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '1'; }, 10);

    // Create drawer if doesn't exist
    if (!document.querySelector('.cart-drawer')) {
      createCartDrawer();
    }

    renderCartItems();

    // Open drawer
    const drawer = document.querySelector('.cart-drawer');
    if (drawer) {
      setTimeout(() => {
        drawer.style.transform = 'translateX(0)';
      }, 50);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Close cart drawer
  function closeCart() {
    if (!isCartOpen) return;
    isCartOpen = false;

    const drawer = document.querySelector('.cart-drawer');
    const overlay = document.querySelector('.cart-overlay');

    if (drawer) {
      drawer.style.transform = 'translateX(100%)';
    }

    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }

    document.body.style.overflow = '';
  }

  // ==========================================
  // INITIALIZE CART
  // ==========================================
  loadCart();

  // Cart button click handler
  const cartButtons = document.querySelectorAll('[data-cart-toggle]');
  cartButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openCart();
    });
  });

  // Also bind header cart button
  const headerCartBtn = document.querySelector('[data-icon="shopping_cart"]')?.closest('button');
  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openCart();
    });
  }

  // Keyboard shortcut: ESC to close cart
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isCartOpen) {
      closeCart();
    }
  });

  // ==========================================
  // 1. TAB SWITCHING
  // ==========================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = {
    description: document.getElementById('tab-description'),
    specifications: document.getElementById('tab-specifications'),
    reviews: document.getElementById('tab-reviews')
  };

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.classList.remove('border-transparent', 'text-on-surface-variant');
        btn.classList.add('border-primary', 'text-primary', 'font-bold');
      } else {
        btn.classList.remove('border-primary', 'text-primary', 'font-bold');
        btn.classList.add('border-transparent', 'text-on-surface-variant');
      }
    });

    Object.keys(tabContents).forEach(key => {
      const content = tabContents[key];
      if (key === tabId) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  // ==========================================
  // 2. THUMBNAIL SELECTION
  // ==========================================
  const thumbnails = document.querySelectorAll('.thumbnail-item');
  const mainImage = document.querySelector('.main-image');

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', function() {
      const img = this.querySelector('img');
      if (img && mainImage) {
        mainImage.src = img.src;
      }

      thumbnails.forEach(t => t.classList.remove('active', 'border-primary'));
      this.classList.add('active');
      this.style.borderColor = '#914d00';
      this.style.borderWidth = '2px';
    });
  });

  // ==========================================
  // 3. QUANTITY CONTROLS
  // ==========================================
  const qtyInput = document.querySelector('.qty-input');
  const qtyBtns = document.querySelectorAll('.qty-btn');

  qtyBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.dataset.action;
      let currentValue = parseInt(qtyInput.value) || 1;

      if (action === 'increase') {
        qtyInput.value = currentValue + 1;
      } else if (action === 'decrease') {
        if (currentValue > 1) {
          qtyInput.value = currentValue - 1;
        }
      }

      qtyInput.dispatchEvent(new Event('input'));
    });
  });

  qtyInput.addEventListener('change', function() {
    let value = parseInt(this.value) || 1;
    if (value < 1) {
      this.value = 1;
    }
  });

  // ==========================================
  // 4. OPTION BUTTONS (Processor & Storage)
  // ==========================================
  const optionButtons = document.querySelectorAll('.option-btn');

  optionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const group = this.dataset.group;
      const siblings = this.closest('.space-y-xs').querySelectorAll('.option-btn');

      siblings.forEach(sib => {
        sib.classList.remove('selected', 'border-primary', 'bg-primary-fixed', 'text-on-primary-fixed');
        sib.classList.add('border-outline', 'text-on-surface-variant');
        sib.style.borderWidth = '1px';
      });

      this.classList.add('selected', 'border-primary', 'bg-primary-fixed', 'text-on-primary-fixed');
      this.classList.remove('border-outline', 'text-on-surface-variant');
      this.style.borderWidth = '2px';

      const label = this.textContent.trim();
      const groupLabel = group === 'processor' ? 'Processor' : 'Storage';
      showToast(`✅ Selected ${groupLabel}: ${label}`);
    });
  });

  // ==========================================
  // 5. ADD TO CART - PRODUCT DETAIL PAGE
  // ==========================================
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  const buyNowBtn = document.querySelector('.buy-now-btn');
  const wishlistBtn = document.querySelector('.absolute.top-4.right-4');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      const qty = parseInt(qtyInput.value) || 1;
      const productName = document.querySelector('h1')?.textContent || 'Premium UltraBook X1';
      
      // Get selected options
      const selectedProcessor = document.querySelector('.option-btn[data-group="processor"].selected');
      const selectedStorage = document.querySelector('.option-btn[data-group="storage"].selected');
      
      // Get price (remove currency symbol and commas)
      const priceText = document.querySelector('.font-price-lg')?.textContent || 'GH₵ 12,499.00';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      
      // Get main image
      const mainImg = document.querySelector('.main-image');
      const image = mainImg ? mainImg.src : '';
      
      const options = {};
      if (selectedProcessor) options.processor = selectedProcessor.textContent.trim();
      if (selectedStorage) options.storage = selectedStorage.textContent.trim();

      addToCart(productName, price, qty, image, options);
      
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
    });
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', function() {
      const qty = parseInt(qtyInput.value) || 1;
      const productName = document.querySelector('h1')?.textContent || 'Premium UltraBook X1';
      const priceText = document.querySelector('.font-price-lg')?.textContent || 'GH₵ 12,499.00';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const mainImg = document.querySelector('.main-image');
      const image = mainImg ? mainImg.src : '';
      
      const selectedProcessor = document.querySelector('.option-btn[data-group="processor"].selected');
      const selectedStorage = document.querySelector('.option-btn[data-group="storage"].selected');
      
      const options = {};
      if (selectedProcessor) options.processor = selectedProcessor.textContent.trim();
      if (selectedStorage) options.storage = selectedStorage.textContent.trim();

      addToCart(productName, price, qty, image, options);
      
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
      
      // Open cart after adding
      setTimeout(() => {
        openCart();
      }, 500);
    });
  }

  if (wishlistBtn) {
    let isWishlisted = false;
    wishlistBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      isWishlisted = !isWishlisted;
      const icon = this.querySelector('.material-symbols-outlined');
      
      if (icon) {
        if (isWishlisted) {
          icon.style.fontVariationSettings = "'FILL' 1";
          this.classList.remove('text-primary');
          this.classList.add('text-error');
          showToast('❤️ Added to wishlist');
        } else {
          icon.style.fontVariationSettings = "'FILL' 0";
          this.classList.remove('text-error');
          this.classList.add('text-primary');
          showToast('💔 Removed from wishlist');
        }
      }
    });
  }

  // ==========================================
  // 6. HOME PAGE "ADD TO CART" BUTTONS
  // ==========================================
  const homeAddButtons = document.querySelectorAll('.add-to-cart-btn-home');

  homeAddButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const productName = this.dataset.name || 'Product';
      const price = parseFloat(this.dataset.price) || 0;
      const image = this.dataset.image || '';
      
      addToCart(productName, price, 1, image, {});
      
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
    });
  });

  // ==========================================
  // 7. RECOMMENDATION SLIDER
  // ==========================================
  const slider = document.querySelector('.product-slider');
  const sliderNavs = document.querySelectorAll('.slider-nav');

  sliderNavs.forEach(btn => {
    btn.addEventListener('click', function() {
      const direction = this.dataset.direction;
      if (!slider) return;

      const scrollAmount = 320;
      const currentScroll = slider.scrollLeft;
      
      if (direction === 'next') {
        slider.scrollTo({
          left: currentScroll + scrollAmount,
          behavior: 'smooth'
        });
      } else if (direction === 'prev') {
        slider.scrollTo({
          left: currentScroll - scrollAmount,
          behavior: 'smooth'
        });
      }
    });
  });

  // ==========================================
  // 8. RECOMMENDATION CARD CLICK
  // ==========================================
  const recCards = document.querySelectorAll('.product-card-hover, .trending-card, .group.bg-white');

  recCards.forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.add-to-cart-btn-home') || 
          e.target.closest('button') ||
          e.target.closest('a')) return;
      
      const productName = this.querySelector('h3, h4')?.textContent || 'Product';
      showToast(`📱 Viewing "${productName}"`);
    });
  });

  // ==========================================
  // 9. HEADER SEARCH
  // ==========================================
  const searchInput = document.querySelector('.bg-surface-container-low input, .search-input');

  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query.length > 0) {
          showToast(`🔍 Searching for "${query}"...`);
        }
      }
    });
  }

  // ==========================================
  // 10. HEADER NAVIGATION LINKS
  // ==========================================
  const navLinks = document.querySelectorAll('header nav a');

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const category = this.textContent.trim();
      showToast(`📂 Browsing: ${category}`);
    });
  });

  // ==========================================
  // 11. HEADER ICON BUTTONS
  // ==========================================
  const headerButtons = document.querySelectorAll('header .flex.items-center.gap-sm button, header button.flex.items-center');

  headerButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const icon = this.querySelector('.material-symbols-outlined');
      if (icon) {
        const iconText = icon.textContent.trim();
        if (iconText === 'notifications') {
          showToast('🔔 No new notifications');
        } else if (iconText === 'favorite') {
          showToast('❤️ Your wishlist is empty');
        } else if (iconText === 'shopping_cart') {
          openCart();
        } else if (iconText === 'face_nod' || iconText === 'share') {
          // Footer social icons
        } else {
          showToast(`🔘 ${iconText} clicked`);
        }
      }
    });
  });

  // ==========================================
  // 12. FOOTER SOCIAL ICONS
  // ==========================================
  const socialIcons = document.querySelectorAll('.social-icon, .w-10.h-10.rounded-full.bg-surface-container');

  socialIcons.forEach(icon => {
    icon.addEventListener('click', function(e) {
      e.preventDefault();
      const label = this.querySelector('.material-symbols-outlined')?.textContent || 'social';
      showToast(`🔗 ${label} link clicked`);
    });
  });

  // ==========================================
  // 13. FOOTER LINKS
  // ==========================================
  const footerLinks = document.querySelectorAll('footer nav a');

  footerLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const text = this.textContent.trim();
      showToast(`📄 Navigating to: ${text}`);
    });
  });

  // ==========================================
  // 14. BREADCRUMB LINKS
  // ==========================================
  const breadcrumbLinks = document.querySelectorAll('.breadcrumb-link, nav a');

  breadcrumbLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const text = this.textContent.trim();
      if (text && !text.includes('chevron_right')) {
        showToast(`📂 ${text}`);
      }
    });
  });

  // ==========================================
  // 15. TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message, duration = 2500) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  // ==========================================
  // 16. KEYBOARD SHORTCUT: ESC to close toast
  // ==========================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const toast = document.querySelector('.toast-notification');
      if (toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }
  });

  // ==========================================
  // 17. IMAGE ZOOM
  // ==========================================
  const zoomContainer = document.querySelector('.zoom-container');

  if (zoomContainer) {
    let isZooming = false;

    zoomContainer.addEventListener('mouseenter', function() {
      isZooming = true;
    });

    zoomContainer.addEventListener('mouseleave', function() {
      isZooming = false;
      const img = this.querySelector('.main-image');
      if (img) {
        img.style.transform = 'scale(1)';
      }
    });

    zoomContainer.addEventListener('mousemove', function(e) {
      if (!isZooming) return;
      
      const img = this.querySelector('.main-image');
      if (!img) return;

      const rect = this.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const zoomLevel = 1.5;
      const offsetX = Math.max(0, Math.min(1, x));
      const offsetY = Math.max(0, Math.min(1, y));

      img.style.transformOrigin = `${offsetX * 100}% ${offsetY * 100}%`;
      img.style.transform = `scale(${zoomLevel})`;
    });
  }

  // ==========================================
  // 18. COUNTDOWN TIMER
  // ==========================================
  const countdownElement = document.getElementById('countdown');
  
  if (countdownElement) {
    function updateCountdown() {
      const now = new Date();
      const hours = 23 - now.getHours();
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();
      
      countdownElement.textContent = 
        `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ==========================================
  // 19. SCROLL REVEAL ANIMATIONS
  // ==========================================
  const sections = document.querySelectorAll('section');
  
  if (sections.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(section => {
      section.classList.add('scroll-reveal');
      observer.observe(section);
    });
  } else {
    sections.forEach(section => {
      section.classList.add('visible');
    });
  }

  // ==========================================
  // 20. INITIALIZE
  // ==========================================
  if (thumbnails.length > 0) {
    thumbnails[0].classList.add('active');
    thumbnails[0].style.borderColor = '#914d00';
    thumbnails[0].style.borderWidth = '2px';
  }

  // Add cart toggle data attribute to cart buttons
  document.querySelectorAll('[data-icon="shopping_cart"]').forEach(el => {
    const btn = el.closest('button');
    if (btn) {
      btn.setAttribute('data-cart-toggle', 'true');
    }
  });

  console.log('🛍️ ShopGhana initialized with full cart system');
});