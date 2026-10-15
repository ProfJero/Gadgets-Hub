/**
 * GAOGETS HUB - Admin Console
 * Handles: Product CRUD, page navigation, all admin pages, Firebase integration
 */

import { 
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  logEvent,
  analytics
} from "./firebase-config.js";

// ==========================================
// DOM REFS
// ==========================================
const productsTableBody = document.getElementById('productsTableBody');
const totalProductsEl = document.getElementById('totalProducts');
const inStockCountEl = document.getElementById('inStockCount');
const outOfStockCountEl = document.getElementById('outOfStockCount');
const modalOverlay = document.getElementById('modalOverlay');
const productModal = document.getElementById('productModal');
const deleteOverlay = document.getElementById('deleteOverlay');
const deleteModal = document.getElementById('deleteModal');
const modalTitle = document.getElementById('modalTitle');
const productForm = document.getElementById('productForm');
const productId = document.getElementById('productId');
const productName = document.getElementById('productName');
const productBrand = document.getElementById('productBrand');
const productCategory = document.getElementById('productCategory');
const productPrice = document.getElementById('productPrice');
const productOriginalPrice = document.getElementById('productOriginalPrice');
const productRating = document.getElementById('productRating');
const productReviews = document.getElementById('productReviews');
const productImage = document.getElementById('productImage');
const productBadge = document.getElementById('productBadge');
const productDescription = document.getElementById('productDescription');
const deleteProductName = document.getElementById('deleteProductName');
const imagePreview = document.getElementById('imagePreview');
const globalSearch = document.getElementById('globalSearch');
const settingsProductCount = document.getElementById('settingsProductCount');

let products = [];
let deleteTargetId = null;
let currentPage = 'products';

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
// IMAGE URL HELPER - IMPROVED
// ==========================================
function fixImageUrl(url) {
  if (!url) return '';
  
  // Clean the URL
  let cleanUrl = url.trim();
  
  // If it's already a data URL or blob URL
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }
  
  // If it's already a direct image URL with common extensions
  if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i)) {
    return cleanUrl;
  }
  
  // Handle Google Drive URLs - MORE ROBUST
  if (cleanUrl.includes('drive.google.com')) {
    let fileId = null;
    
    // Pattern 1: /file/d/FILE_ID/view or /file/d/FILE_ID/
    const match1 = cleanUrl.match(/\/d\/([^\/\?]+)/);
    if (match1 && match1[1]) {
      fileId = match1[1];
    }
    
    // Pattern 2: id=FILE_ID (works for uc?id=, open?id=, etc.)
    if (!fileId) {
      const match2 = cleanUrl.match(/[?&]id=([^&]+)/);
      if (match2 && match2[1]) {
        fileId = match2[1];
      }
    }
    
    // Pattern 3: /open?id=FILE_ID
    if (!fileId) {
      const match3 = cleanUrl.match(/open\?id=([^&]+)/);
      if (match3 && match3[1]) {
        fileId = match3[1];
      }
    }
    
    // Pattern 4: Just the ID as a string (if URL is just the ID)
    if (!fileId && cleanUrl.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      fileId = cleanUrl;
    }
    
    if (fileId) {
      // Use the direct download URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // If the URL contains a Google Drive file ID pattern but not a full URL
  if (cleanUrl.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    return `https://drive.google.com/uc?export=view&id=${cleanUrl}`;
  }
  
  // If none of the above, return the original URL
  return cleanUrl;
}

// ==========================================
// VALIDATE IMAGE URL
// ==========================================
function validateImageUrl(url) {
  if (!url) return false;
  const fixedUrl = fixImageUrl(url);
  // Check if it's a valid URL format
  try {
    new URL(fixedUrl);
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// PAGE NAVIGATION
// ==========================================
function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active-nav', 'bg-brand-orange', 'text-white', 'font-bold');
    link.classList.add('text-trust-light');
    if (link.dataset.page === page) {
      link.classList.add('active-nav', 'bg-brand-orange', 'text-white', 'font-bold');
      link.classList.remove('text-trust-light');
    }
  });
  
  currentPage = page;
  closeMobileNav();
}

// ==========================================
// MOBILE NAV
// ==========================================
const mobileNav = document.getElementById('mobileNav');
const mobileOverlay = document.getElementById('mobileOverlay');

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
// MODAL CONTROLS
// ==========================================
function openModal(title, data = null) {
  modalTitle.textContent = title;
  if (data) {
    productId.value = data.id || '';
    productName.value = data.name || '';
    productBrand.value = data.brand || '';
    productCategory.value = data.category || '';
    productPrice.value = data.price || '';
    productOriginalPrice.value = data.originalPrice || '';
    productRating.value = data.rating || 4.5;
    productReviews.value = data.reviews || 0;
    productImage.value = data.image || '';
    productBadge.value = data.badge || '';
    productDescription.value = data.description || '';
    if (data.image) {
      showImagePreview(data.image);
    } else {
      hideImagePreview();
    }
  } else {
    productForm.reset();
    productId.value = '';
    productRating.value = 4.5;
    productReviews.value = 0;
    hideImagePreview();
  }
  modalOverlay.classList.add('show');
  productModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('show');
  productModal.classList.remove('show');
  document.body.style.overflow = '';
}

function openDeleteModal(id, name) {
  deleteTargetId = id;
  deleteProductName.textContent = name;
  deleteOverlay.classList.add('show');
  deleteModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('show');
  deleteModal.classList.remove('show');
  document.body.style.overflow = '';
  deleteTargetId = null;
}

// ==========================================
// IMAGE PREVIEW - IMPROVED
// ==========================================
function showImagePreview(url) {
  if (!url) {
    hideImagePreview();
    return;
  }
  
  const fixedUrl = fixImageUrl(url);
  console.log('Previewing image URL:', fixedUrl);
  
  imagePreview.classList.remove('hidden', 'error');
  imagePreview.style.display = 'block';
  imagePreview.src = fixedUrl;
  
  // Set a timeout to handle loading issues
  let loadTimeout = setTimeout(() => {
    if (!imagePreview.complete) {
      imagePreview.style.display = 'none';
      imagePreview.classList.add('error');
      showImagePreviewError('Image loading timed out. The URL may not be accessible.');
    }
  }, 10000);
  
  imagePreview.onload = function() {
    clearTimeout(loadTimeout);
    this.style.display = 'block';
    this.classList.remove('error');
    // Remove any existing error messages
    const existingError = this.parentNode.querySelector('.preview-error');
    if (existingError) existingError.remove();
  };
  
  imagePreview.onerror = function() {
    clearTimeout(loadTimeout);
    this.style.display = 'none';
    this.classList.add('error');
    
    // Check if it's a Google Drive URL and show helpful message
    const errorMsg = url.includes('drive.google.com') 
      ? 'Google Drive image could not be loaded. Make sure the file is shared with "Anyone with the link".'
      : 'Image could not be loaded. Please check the URL.';
    
    showImagePreviewError(errorMsg);
  };
}

function showImagePreviewError(message) {
  // Remove existing error
  const existingError = imagePreview.parentNode.querySelector('.preview-error');
  if (existingError) existingError.remove();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'preview-error text-xs text-red-500 mt-1 p-2 bg-red-50 rounded';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${message}`;
  imagePreview.parentNode.appendChild(errorDiv);
}

function hideImagePreview() {
  imagePreview.classList.add('hidden', 'error');
  imagePreview.style.display = 'none';
  const existingError = imagePreview.parentNode.querySelector('.preview-error');
  if (existingError) existingError.remove();
}

// Image URL preview on input change - with debounce
let previewTimeout = null;
productImage.addEventListener('input', function() {
  clearTimeout(previewTimeout);
  const url = this.value.trim();
  previewTimeout = setTimeout(() => {
    if (url) {
      showImagePreview(url);
    } else {
      hideImagePreview();
    }
  }, 500);
});

// ==========================================
// LOAD PRODUCTS FROM FIRESTORE
// ==========================================
function loadProducts() {
  console.log('Loading products from Firebase...');
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('name'));
    
    onSnapshot(q, (snapshot) => {
      console.log('Products loaded:', snapshot.docs.length);
      products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderProducts(products);
      updateStats(products);
      if (settingsProductCount) {
        settingsProductCount.textContent = products.length;
      }
    }, (error) => {
      console.error('Error loading products:', error);
      showToast('❌ Error loading products from Firebase');
    });
  } catch (error) {
    console.error('Error setting up products listener:', error);
    showToast('❌ Error connecting to Firebase');
  }
}

// ==========================================
// RENDER PRODUCTS
// ==========================================
function renderProducts(productsList) {
  if (!productsTableBody) return;
  
  if (!productsList || productsList.length === 0) {
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-muted">
          <i class="fas fa-box-open text-2xl text-muted/40"></i>
          <p class="mt-2">No products found. Click "Add Product" to get started.</p>
        </td>
      </tr>
    `;
    return;
  }

  productsTableBody.innerHTML = productsList.map(product => {
    const imageUrl = fixImageUrl(product.image || '');
    const firstChar = product.name ? product.name.charAt(0).toUpperCase() : '?';
    
    return `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <img src="${imageUrl}" alt="${product.name}" class="w-10 h-10 rounded-lg object-cover" 
               onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23E6DCD2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%237C6F64%22 font-size=%2214%22 font-family=%22Inter%22%3E${firstChar}%3C/text%3E%3C/svg%3E'" />
          <div>
            <p class="font-semibold text-sm text-trust">${product.name || 'Unnamed'}</p>
            <p class="text-xs text-muted truncate max-w-[150px]">${product.id || ''}</p>
          </div>
        </div>
      </td>
      <td class="hidden md:table-cell text-sm">${product.brand || '-'}</td>
      <td class="hidden sm:table-cell">
        <span class="badge ${product.category === 'gaming' ? 'badge-active' : 'badge-inactive'}">${product.category || 'Uncategorized'}</span>
      </td>
      <td>
        <span class="font-bold text-brand-orange text-sm">₵${(product.price || 0).toLocaleString()}</span>
        ${product.originalPrice ? `<span class="text-xs text-muted line-through ml-1">₵${product.originalPrice.toLocaleString()}</span>` : ''}
      </td>
      <td class="hidden lg:table-cell">
        <span class="badge ${product.stock !== false ? 'badge-active' : 'badge-inactive'}">
          ${product.stock !== false ? 'In Stock' : 'Out of Stock'}
        </span>
      </td>
      <td class="text-right">
        <div class="flex items-center justify-end gap-2">
          <button class="edit-btn text-brand-blue hover:text-brand-blue-dark transition p-1" data-id="${product.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn text-red-500 hover:text-red-700 transition p-1" data-id="${product.id}" data-name="${product.name}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `}).join('');

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      openEditModal(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const name = this.dataset.name;
      openDeleteModal(id, name);
    });
  });
}

// ==========================================
// UPDATE STATS
// ==========================================
function updateStats(productsList) {
  if (totalProductsEl) totalProductsEl.textContent = productsList.length;
  const inStock = productsList.filter(p => p.stock !== false).length;
  const outOfStock = productsList.filter(p => p.stock === false).length;
  if (inStockCountEl) inStockCountEl.textContent = inStock;
  if (outOfStockCountEl) outOfStockCountEl.textContent = outOfStock;
}

// ==========================================
// EDIT PRODUCT
// ==========================================
async function openEditModal(id) {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() };
      openModal('Edit Product', data);
    } else {
      showToast('❌ Product not found');
    }
  } catch (error) {
    console.error('Error loading product:', error);
    showToast('❌ Error loading product');
  }
}

// ==========================================
// SAVE PRODUCT
// ==========================================
async function saveProduct(data) {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    showToast(`✅ "${data.name}" added successfully!`);
    logEvent(analytics, 'admin_add_product', { product_name: data.name });
    return docRef;
  } catch (error) {
    console.error('Error adding product:', error);
    showToast('❌ Error adding product');
    return null;
  }
}

async function updateProduct(id, data) {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    showToast(`✅ "${data.name}" updated successfully!`);
    logEvent(analytics, 'admin_update_product', { product_name: data.name });
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    showToast('❌ Error updating product');
    return false;
  }
}

async function deleteProduct(id) {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
    showToast('🗑️ Product deleted successfully');
    logEvent(analytics, 'admin_delete_product', { product_id: id });
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    showToast('❌ Error deleting product');
    return false;
  }
}

// ==========================================
// SEARCH
// ==========================================
function handleSearch(query) {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) {
    renderProducts(products);
    return;
  }
  const filtered = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm) ||
    p.brand?.toLowerCase().includes(searchTerm) ||
    p.category?.toLowerCase().includes(searchTerm)
  );
  renderProducts(filtered);
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // Mobile nav
  document.getElementById('mobileMenuToggle')?.addEventListener('click', openMobileNav);
  document.getElementById('closeMobileMenu')?.addEventListener('click', closeMobileNav);
  mobileOverlay?.addEventListener('click', closeMobileNav);

  // Add product buttons
  document.getElementById('addProductBtn')?.addEventListener('click', () => openModal('Add New Product'));
  document.getElementById('addProductBtnTop')?.addEventListener('click', () => openModal('Add New Product'));

  // Close modal
  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', closeModal);

  // Delete modal
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', async function() {
    if (deleteTargetId) {
      await deleteProduct(deleteTargetId);
      closeDeleteModal();
    }
  });
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
  deleteOverlay?.addEventListener('click', closeDeleteModal);

  // Form submit
  productForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const data = {
      name: productName.value.trim(),
      brand: productBrand.value.trim(),
      category: productCategory.value,
      price: parseFloat(productPrice.value) || 0,
      originalPrice: productOriginalPrice.value ? parseFloat(productOriginalPrice.value) : null,
      rating: parseFloat(productRating.value) || 4.5,
      reviews: parseInt(productReviews.value) || 0,
      image: productImage.value.trim(),
      badge: productBadge.value || null,
      description: productDescription.value.trim(),
      stock: true
    };

    if (!data.name || !data.brand || !data.category || !data.price || !data.image) {
      showToast('⚠️ Please fill in all required fields');
      return;
    }

    const editId = productId.value;
    if (editId) {
      await updateProduct(editId, data);
    } else {
      await saveProduct(data);
    }
    closeModal();
  });

  // Global search
  globalSearch?.addEventListener('input', function() {
    if (currentPage === 'products') {
      handleSearch(this.value);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openModal('Add New Product');
    }
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('show')) closeModal();
      if (deleteOverlay.classList.contains('show')) closeDeleteModal();
      closeMobileNav();
    }
  });
}

// ==========================================
// INIT
// ==========================================
function init() {
  console.log('🛍️ GAOGETS HUB Admin Console initializing...');
  
  if (typeof db === 'undefined') {
    console.error('Firebase db is not defined. Check firebase-config.js');
    showToast('❌ Firebase configuration error. Check console.');
    return;
  }
  
  setupEventListeners();
  loadProducts();
  
  console.log('✅ Admin Console initialized');
}

// Start the app
init();