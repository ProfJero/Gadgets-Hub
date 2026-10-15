// ====== CHECKOUT PAGE INTERACTIONS ======

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  
  // ====== PAYMENT METHOD SELECTION ======
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', function(e) {
      // Remove active styling from all labels
      document.querySelectorAll('label.relative.border-2, label.relative.border').forEach(label => {
        label.classList.remove('border-primary', 'bg-primary/5');
        if (!label.querySelector('input[value="momo"]')) {
          label.classList.add('border-outline-variant', 'bg-surface');
        }
      });
      
      // Add active styling to selected parent label
      const parentLabel = this.closest('label');
      if (parentLabel) {
        parentLabel.classList.add('border-primary', 'bg-primary/5');
        parentLabel.classList.remove('border-outline-variant', 'bg-surface');
      }
      
      // Handle MoMo form visibility
      const momoForm = document.querySelector('.border-t.border-primary\\/20');
      if (this.value === 'momo' && momoForm) {
        momoForm.style.display = 'block';
        // Animate form appearance
        momoForm.style.opacity = '0';
        momoForm.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          momoForm.style.opacity = '1';
          momoForm.style.transform = 'translateY(0)';
        }, 50);
      } else if (momoForm) {
        momoForm.style.display = 'none';
      }
    });
  });
  
  // Initially show MoMo form if checked
  const momoRadio = document.querySelector('input[name="payment_method"][value="momo"]');
  const momoForm = document.querySelector('.border-t.border-primary\\/20');
  if (momoRadio && momoRadio.checked && momoForm) {
    momoForm.style.display = 'block';
  } else if (momoForm) {
    momoForm.style.display = 'none';
  }
  
  // ====== BILLING ADDRESS TOGGLE ======
  const billingToggle = document.getElementById('billing_same');
  if (billingToggle) {
    billingToggle.addEventListener('change', function() {
      const billingSection = document.querySelector('.bg-surface-container-lowest.border.border-outline-variant.rounded-xl.p-lg.shadow-sm:last-of-type');
      if (this.checked) {
        // Add visual feedback
        this.parentElement.style.transition = 'all 0.3s ease';
        this.parentElement.style.borderColor = '#914d00';
        setTimeout(() => {
          this.parentElement.style.borderColor = '';
        }, 600);
      }
    });
  }
  
  // ====== PROMO CODE APPLICATION ======
  const promoInput = document.querySelector('.flex.gap-sm input[placeholder="Promo Code"]');
  const promoButton = document.querySelector('.flex.gap-sm button');
  
  if (promoButton && promoInput) {
    promoButton.addEventListener('click', function() {
      const code = promoInput.value.trim();
      if (code.length > 0) {
        // Visual feedback
        this.textContent = 'Applying...';
        this.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
          if (code.toLowerCase() === 'welcome' || code.toLowerCase() === 'ghana10') {
            // Success feedback
            this.textContent = '✓ Applied!';
            this.style.background = '#22c55e';
            this.style.color = 'white';
            
            // Update total
            const totalSpan = document.querySelector('.font-price-lg.text-price-lg.text-primary');
            if (totalSpan) {
              const currentTotal = parseFloat(totalSpan.textContent.replace('GH₵ ', '').replace(',', ''));
              const discount = currentTotal * 0.1;
              const newTotal = currentTotal - discount;
              totalSpan.textContent = `GH₵ ${newTotal.toFixed(2)}`;
              
              // Show discount line
              const calculations = document.querySelector('.space-y-sm');
              if (calculations) {
                const discountLine = document.createElement('div');
                discountLine.className = 'flex justify-between font-body-md text-body-md text-green-600';
                discountLine.innerHTML = `
                  <span>Discount (10%)</span>
                  <span>-GH₵ ${discount.toFixed(2)}</span>
                `;
                calculations.insertBefore(discountLine, calculations.lastElementChild);
              }
            }
          } else {
            // Error feedback
            this.textContent = 'Invalid Code';
            this.style.background = '#dc2626';
            this.style.color = 'white';
            
            setTimeout(() => {
              this.textContent = 'Apply';
              this.style.background = '';
              this.style.color = '';
              this.disabled = false;
            }, 2000);
          }
        }, 800);
      } else {
        // Empty input feedback
        promoInput.style.borderColor = '#dc2626';
        promoInput.placeholder = 'Please enter a code';
        setTimeout(() => {
          promoInput.style.borderColor = '';
          promoInput.placeholder = 'Promo Code';
        }, 2000);
      }
    });
    
    // Enter key support for promo
    promoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        promoButton.click();
      }
    });
  }
  
  // ====== REVIEW ORDER BUTTON ======
  const reviewBtn = document.querySelector('button.bg-primary.text-on-primary');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', function(e) {
      // Get selected payment method
      const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
      let paymentMethod = 'Mobile Money';
      if (selectedPayment) {
        switch(selectedPayment.value) {
          case 'momo': paymentMethod = 'Mobile Money'; break;
          case 'card': paymentMethod = 'Credit/Debit Card'; break;
          case 'bank': paymentMethod = 'Bank Transfer'; break;
        }
      }
      
      // Show loading state
      const originalText = this.textContent;
      this.textContent = 'Processing...';
      this.classList.add('loading');
      this.disabled = true;
      
      // Simulate order processing
      setTimeout(() => {
        // Success feedback
        this.textContent = '✓ Order Placed!';
        this.style.background = '#22c55e';
        this.style.color = 'white';
        
        // Show success message
        showNotification(`Order confirmed! Payment via ${paymentMethod}`, 'success');
        
        setTimeout(() => {
          this.textContent = originalText;
          this.style.background = '';
          this.style.color = '';
          this.classList.remove('loading');
          this.disabled = false;
        }, 2500);
      }, 1500);
    });
  }
  
  // ====== BACK BUTTON ======
  const backBtn = document.querySelector('button.flex.items-center.gap-sm.text-on-surface-variant');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      // Smooth navigation feedback
      this.style.opacity = '0.5';
      setTimeout(() => {
        this.style.opacity = '1';
        // In production, you would navigate to previous step
        alert('Navigate back to Delivery step');
      }, 200);
    });
  }
  
  // ====== NOTIFICATION SYSTEM ======
  function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification-toast');
    if (existing) {
      existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification-toast fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm animate-slide-up';
    
    // Set colors based on type
    const colors = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      info: 'bg-primary text-white'
    };
    notification.className += ` ${colors[type] || colors.info}`;
    
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">
          ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
        </span>
        <span class="font-body-md">${message}</span>
        <button class="ml-auto text-white hover:opacity-80" onclick="this.closest('.notification-toast').remove()">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
  
  // ====== CURRENCY FORMATTING HELPER ======
  function formatCurrency(amount) {
    return `GH₵ ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  
  // ====== QUANTITY UPDATE (for future enhancement) ======
  // This can be extended to handle quantity changes in the order summary
  
  // ====== KEYBOARD NAVIGATION ======
  document.addEventListener('keydown', function(e) {
    // Escape key closes any open modals (if any in future)
    if (e.key === 'Escape') {
      const notifications = document.querySelectorAll('.notification-toast');
      notifications.forEach(notif => notif.remove());
    }
  });
  
  // ====== ANALYTICS PLACEHOLDER ======
  // Track page view
  console.log('Checkout page loaded');
  
  // Track payment method selection
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log(`Payment method selected: ${this.value}`);
    });
  });
  
  // ====== PERFORMANCE OPTIMIZATION ======
  // Debounce function for future use
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // ====== EXPOSE FUNCTIONS GLOBALLY ======
  window.showNotification = showNotification;
  window.formatCurrency = formatCurrency;
  
  console.log('✅ Checkout script initialized');
});