/**
 * ShopGhana - Product Details JavaScript
 * File: js/main.js
 * Handles: Tab switching, thumbnail selection, quantity controls,
 * option selection, cart interactions, slider navigation, and toast notifications
 */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

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
    // Update buttons
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

    // Update content
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
      // Update main image src
      const img = this.querySelector('img');
      if (img && mainImage) {
        mainImage.src = img.src;
      }

      // Update active state
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

      // Trigger input event for any listeners
      qtyInput.dispatchEvent(new Event('input'));
    });
  });

  // Prevent negative or zero values
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

      // Deselect all in same group
      siblings.forEach(sib => {
        sib.classList.remove('selected', 'border-primary', 'bg-primary-fixed', 'text-on-primary-fixed');
        sib.classList.add('border-outline', 'text-on-surface-variant');
        sib.style.borderWidth = '1px';
      });

      // Select this one
      this.classList.add('selected', 'border-primary', 'bg-primary-fixed', 'text-on-primary-fixed');
      this.classList.remove('border-outline', 'text-on-surface-variant');
      this.style.borderWidth = '2px';

      // Show toast notification
      const label = this.textContent.trim();
      const groupLabel = group === 'processor' ? 'Processor' : 'Storage';
      showToast(`✅ Selected ${groupLabel}: ${label}`);
    });
  });

  // ==========================================
  // 5. ADD TO CART
  // ==========================================
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  const buyNowBtn = document.querySelector('.buy-now-btn');
  const wishlistBtn = document.querySelector('.absolute.top-4.right-4');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      const qty = parseInt(qtyInput.value) || 1;
      const productName = document.querySelector('h1')?.textContent || 'Product';
      showToast(`🛒 Added ${qty} x "${productName}" to cart!`);
      
      // Animate button
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
    });
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', function() {
      const qty = parseInt(qtyInput.value) || 1;
      const productName = document.querySelector('h1')?.textContent || 'Product';
      showToast(`💳 Proceeding to checkout for "${productName}"`);
      
      // Animate button
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
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
  // 6. RECOMMENDATION SLIDER
  // ==========================================
  const slider = document.querySelector('.product-slider');
  const sliderNavs = document.querySelectorAll('.slider-nav');

  sliderNavs.forEach(btn => {
    btn.addEventListener('click', function() {
      const direction = this.dataset.direction;
      if (!slider) return;

      const scrollAmount = 320; // Approximate card width + gap
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
  // 7. RECOMMENDATION "ADD TO CART" BUTTONS
  // ==========================================
  const recAddButtons = document.querySelectorAll('.product-slider .absolute.bottom-4.right-4');

  recAddButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const card = this.closest('.group');
      const productName = card?.querySelector('h4')?.textContent || 'Product';
      showToast(`🛒 Added "${productName}" to cart!`);
      
      // Animation feedback
      this.style.transform = 'scale(0.8)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
    });
  });

  // ==========================================
  // 8. RECOMMENDATION CARD CLICK (view product)
  // ==========================================
  const recCards = document.querySelectorAll('.product-card-hover');

  recCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // Ignore if click is on the add-to-cart button
      if (e.target.closest('.absolute.bottom-4.right-4')) return;
      
      const productName = this.querySelector('h4')?.textContent || 'Product';
      showToast(`📱 Viewing "${productName}"`);
    });
  });

  // ==========================================
  // 9. HEADER SEARCH
  // ==========================================
  const searchInput = document.querySelector('.bg-surface-container-low input');

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
      
      // Check for specific icons
      const icon = this.querySelector('.material-symbols-outlined');
      if (icon) {
        const iconText = icon.textContent.trim();
        if (iconText === 'notifications') {
          showToast('🔔 No new notifications');
        } else if (iconText === 'favorite') {
          showToast('❤️ Your wishlist is empty');
        } else if (iconText === 'shopping_cart') {
          showToast('🛒 View your cart');
        } else if (iconText === 'face_nod' || iconText === 'share') {
          // Footer social icons - handled separately
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
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss
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
  // 17. IMAGE ZOOM (enhancement)
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

      // Constrain zoom to prevent showing empty areas
      const zoomLevel = 1.5;
      const offsetX = Math.max(0, Math.min(1, x));
      const offsetY = Math.max(0, Math.min(1, y));

      img.style.transformOrigin = `${offsetX * 100}% ${offsetY * 100}%`;
      img.style.transform = `scale(${zoomLevel})`;
    });
  }

  // ==========================================
  // 18. INITIALIZE: Set first thumbnail as active
  // ==========================================
  if (thumbnails.length > 0) {
    thumbnails[0].classList.add('active');
    thumbnails[0].style.borderColor = '#914d00';
    thumbnails[0].style.borderWidth = '2px';
  }

  console.log('🛍️ ShopGhana Product Details initialized successfully');
});