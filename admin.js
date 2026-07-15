let API_URL = new URLSearchParams(window.location.search).get('api') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : "");
let storefrontUrl = "";
let products = [];
let orders = [];
let activeOrderDetail = null;

// Default Mock Data for local fallback
const mockProducts = [];

const mockOrders = [];;

const ordersTableBody = document.getElementById('orders-table-body');
const productsTableBody = document.getElementById('products-table-body');
const adminPanels = document.querySelectorAll('.admin-panel');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const apiUrlInput = document.getElementById('api-url-input');
const lineNotifyTokenInput = document.getElementById('line-notify-token-input');
const lineBotTokenInput = document.getElementById('line-bot-token-input');
const lineBotUseridInput = document.getElementById('line-bot-userid-input');

const orderDetailModal = document.getElementById('order-detail-modal');
const orderDetailClose = document.getElementById('order-detail-close');
const orderDetailCancel = document.getElementById('order-detail-cancel');
const saveStatusBtn = document.getElementById('save-status-btn');
const updateStatusSelect = document.getElementById('update-status-select');

const productModal = document.getElementById('product-modal');
const addProductBtn = document.getElementById('add-product-btn');
const productClose = document.getElementById('product-close');
const productCancelBtn = document.getElementById('product-cancel-btn');
const productForm = document.getElementById('product-form');

// Canvas Image compression components
const imageFileInput = document.getElementById('prod-image-file');
const hiddenImageUrl = document.getElementById('prod-imageurl');
const previewContainer = document.getElementById('image-preview-container');
const previewImg = document.getElementById('prod-image-preview-element');

// Admin Search & Category Filter
const adminProdSearch = document.getElementById('admin-prod-search');
const adminProdFilterCategory = document.getElementById('admin-prod-filter-category');

window.addEventListener('DOMContentLoaded', () => {
  apiUrlInput.value = API_URL;
  document.getElementById('storefront-url-input').value = storefrontUrl;
  
  if (!API_URL) {
    showToast("⚠️ รันระบบในโหมดจำลอง (ยังไม่ได้เชื่อมต่อ Google Sheets API)", "warning");
    products = [...mockProducts];
    orders = [...mockOrders];
    renderStats();
    renderProductsTable();
    renderOrdersTable();
  } else {
    fetchAdminData();
  }
  startPolling();
});

function showToast(message, type = "success") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle'}"></i> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "toast-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- SIDEBAR TAB SWITCHING & DRAWER CONTROLS ---
const adminSidebar = document.getElementById('admin-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

// Handle sidebar tab selection click
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const tabName = item.dataset.tab;
    if (!tabName) return; // settings trigger handles itself
    
    // Toggle active link
    document.querySelectorAll('.sidebar-item').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    
    // Toggle active panel
    adminPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === `panel-${tabName}`) {
        panel.classList.add('active');
      }
    });
    
    // Close sidebar on mobile
    adminSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });
});

// Settings trigger from sidebar
document.getElementById('menu-trigger-settings').addEventListener('click', () => {
  settingsModal.classList.add('active');
  loadIntegrationConfig();
  adminSidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
});

document.getElementById('open-storefront-btn-sidebar').addEventListener('click', (e) => {
  e.preventDefault();
  let urlToOpen = storefrontUrl;
  
  if (!urlToOpen) {
    if (window.location.protocol === 'file:') {
      urlToOpen = '../Sombat Sale/index.html';
    } else {
      // Auto-detect and resolve Sombat-Store with Sombat-Sale for GitHub Pages
      const currentUrl = window.location.href;
      if (currentUrl.includes('Sombat-Store')) {
        // Replace repo name and trailing index.html safely
        urlToOpen = currentUrl.replace('Sombat-Store', 'Sombat-Sale').split('?')[0].split('#')[0];
        if (!urlToOpen.endsWith('/')) urlToOpen += '/';
      } else {
        urlToOpen = '../Sombat-Sale/index.html';
      }
    }
  }
  
  if (urlToOpen.includes('?')) {
    urlToOpen += `&api=${encodeURIComponent(API_URL)}`;
  } else {
    urlToOpen += `?api=${encodeURIComponent(API_URL)}`;
  }
  
  window.open(urlToOpen, '_blank');
});

// Mobile burger icon menu toggle
mobileMenuToggle.addEventListener('click', () => {
  adminSidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
});

// Close sidebar on mobile clicking overlay background
sidebarOverlay.addEventListener('click', () => {
  adminSidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
});

async function fetchAdminData() {
  if (!API_URL) return;
  
  ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">กำลังดึงข้อมูล...</td></tr>`;
  productsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem;">กำลังดึงข้อมูล...</td></tr>`;
  
  try {
    const prodRes = await fetch(`${API_URL}?action=getProducts`);
    const prodJson = await prodRes.json();
    
    const orderRes = await fetch(`${API_URL}?action=getOrders`);
    const orderJson = await orderRes.json();
    
    if (prodJson.success && orderJson.success) {
      products = prodJson.data;
      orders = orderJson.data;
      
      renderStats();
      renderProductsTable();
      renderOrdersTable();
      showToast("⚡ รีเฟรชฐานข้อมูล Google Sheets สำเร็จ");
    } else {
      showToast("❌ การดึงข้อมูลบางส่วนล้มเหลว", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("⚠️ เชื่อมต่อ Google Sheets API ล้มเหลว กรุณาตรวจสอบการตั้งค่าเชื่อมโยง", "error");
    loadFallback();
  }
}

function loadFallback() {
  products = [...mockProducts];
  orders = [...mockOrders];
  renderStats();
  renderProductsTable();
  renderOrdersTable();
}

// Stats render function
function renderStats() {
  const activeProductsCount = products.length;
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.Status === "รอดำเนินการ").length;
  const totalSalesSum = orders
    .filter(o => o.Status !== "ยกเลิก")
    .reduce((sum, o) => sum + Number(o.TotalPrice || 0), 0);
    
  document.getElementById('stat-total-sales').textContent = totalSalesSum.toLocaleString() + " บาท";
  document.getElementById('stat-total-orders').textContent = totalOrdersCount;
  document.getElementById('stat-pending-orders').textContent = pendingOrdersCount;
  document.getElementById('stat-total-products').textContent = activeProductsCount;
}

// --- RENDER PRODUCTS TABLE WITH SEARCH AND CATEGORY FILTER ---
function renderProductsTable() {
  productsTableBody.innerHTML = "";
  
  const query = adminProdSearch.value.toLowerCase().trim();
  const catFilter = adminProdFilterCategory.value;
  
  let filtered = [...products];
  
  if (catFilter !== 'all') {
    filtered = filtered.filter(p => p.Category === catFilter);
  }
  
  if (query) {
    filtered = filtered.filter(p => 
      p.Name.toLowerCase().includes(query) || 
      p.ID.toLowerCase().includes(query)
    );
  }
  
  if (filtered.length === 0) {
    productsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">ไม่พบสินค้าที่ตรงกับการค้นหา</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 600;">${p.ID}</td>
      <td><img src="${p.ImageURL || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=30'}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; border: 1px solid var(--surface-border);"></td>
      <td><span class="badge" style="background-color: #f1f5f9; color: var(--text-main); font-weight: 500;">${p.Category}</span></td>
      <td style="font-weight: 500;">${p.Name}</td>
      <td style="font-weight: 700; color: var(--primary);">${Number(p.Price) === 0 ? 'เสนอราคา' : Number(p.Price).toLocaleString()}</td>
      <td>${p.Unit}</td>
      <td style="font-weight: 600; color: ${p.Stock < 10 ? 'var(--danger)' : 'inherit'}">${p.Stock}</td>
      <td>
        <button class="action-btn edit" onclick="openEditProductModal('${p.ID}')"><i class="bx bx-edit-alt"></i> แก้ไข</button>
        <button class="action-btn delete" onclick="deleteProduct('${p.ID}')"><i class="bx bx-trash"></i> ลบ</button>
      </td>
    `;
    productsTableBody.appendChild(row);
  });
}

adminProdSearch.addEventListener('input', renderProductsTable);
adminProdFilterCategory.addEventListener('change', renderProductsTable);

function renderOrdersTable() {
  ordersTableBody.innerHTML = "";
  
  const sortedOrders = [...orders].sort((a,b) => new Date(b.Date) - new Date(a.Date));
  
  sortedOrders.forEach(o => {
    let statusClass = "pending";
    if (o.Status === "กำลังดำเนินการ") statusClass = "processing";
    if (o.Status === "สำเร็จ") statusClass = "completed";
    if (o.Status === "ยกเลิก") statusClass = "cancelled";
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 700; color: var(--primary);">${o.OrderID}</td>
      <td>${o.Date}</td>
      <td style="font-weight: 500;">${o.CustomerName}</td>
      <td>${o.Phone}</td>
      <td style="font-weight: 700; color: var(--primary);">${Number(o.TotalPrice || 0).toLocaleString()}</td>
      <td><span class="badge ${statusClass}">${o.Status}</span></td>
      <td>
        <button class="action-btn" onclick="viewOrderDetail('${o.OrderID}')"><i class="bx bx-show-alt"></i> เปิดดู</button>
        <button class="action-btn" style="color: var(--secondary); font-weight: 500;" onclick="viewWorkOrder('${o.OrderID}')"><i class="bx bx-printer"></i> ใบสั่งงาน</button>
        <button class="action-btn delete" onclick="deleteOrder('${o.OrderID}')"><i class="bx bx-trash"></i> ลบ</button>
      </td>
    `;
    ordersTableBody.appendChild(row);
  });
}

// Load integration configurations from Google Sheet Config table
async function loadIntegrationConfig() {
  if (!API_URL) return;
  
  try {
    const response = await fetch(`${API_URL}?action=getConfig`);
    const json = await response.json();
    if (json.success) {
      lineNotifyTokenInput.value = json.data.lineNotifyToken || "";
      lineBotTokenInput.value = json.data.lineChannelAccessToken || "";
      lineBotUseridInput.value = json.data.lineUserOrGroupId || "";
      if (json.data.storefrontUrl) {
        storefrontUrl = json.data.storefrontUrl;
        document.getElementById('storefront-url-input').value = storefrontUrl;
      }
    }
  } catch (err) {
    console.error("Failed to load config: ", err);
  }
}


const closeSettings = () => settingsModal.classList.remove('active');
settingsClose.addEventListener('click', closeSettings);
settingsCancelBtn.addEventListener('click', closeSettings);

settingsSaveBtn.addEventListener('click', async () => {
  const url = apiUrlInput.value.trim();
  API_URL = url;
  
  const lineNotifyToken = lineNotifyTokenInput.value.trim();
  const inputStorefrontUrl = document.getElementById('storefront-url-input').value.trim();
  storefrontUrl = inputStorefrontUrl;
  
  const lineChannelAccessToken = lineBotTokenInput.value.trim();
  const lineUserOrGroupId = lineBotUseridInput.value.trim();
  
  settingsSaveBtn.disabled = true;
  settingsSaveBtn.innerHTML = "กำลังซิงค์... <i class='bx bx-loader-alt bx-spin'></i>";
  
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "saveConfig",
          lineNotifyToken,
          lineChannelAccessToken,
          lineUserOrGroupId,
          storefrontUrl
        })
      });
      
      let success = false;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        success = json.success;
      } catch (e) {
        if (res.ok) success = true;
      }
      
      if (success) {
        showToast("💾 บันทึกและซิงค์การตั้งค่าลง Google Sheets สำเร็จ");
        closeSettings();
        fetchAdminData();
      } else {
        showToast(`❌ ซิงค์ข้อมูลล้มเหลว: ${json.message}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ เชื่อมโยงระบบขัดข้อง แต่บันทึกปลายทางสำเร็จ", "warning");
      closeSettings();
    }
  } else {
    showToast("💾 บันทึกปลายทาง (Offline Mode) เรียบร้อย");
    closeSettings();
  }
  
  settingsSaveBtn.disabled = false;
  settingsSaveBtn.innerHTML = "บันทึกและซิงค์ข้อมูล";
});

window.viewOrderDetail = (orderId) => {
  const order = orders.find(o => o.OrderID === orderId);
  if (!order) return;
  
  activeOrderDetail = order;
  
  document.getElementById('detail-id').textContent = order.OrderID;
  document.getElementById('detail-date').textContent = order.Date;
  document.getElementById('detail-name').textContent = order.CustomerName;
  document.getElementById('detail-phone').textContent = order.Phone;
  document.getElementById('detail-address').textContent = order.Address;
  document.getElementById('detail-notes').textContent = order.Notes || "-";
  document.getElementById('detail-grand-total').textContent = Number(order.TotalPrice || 0).toLocaleString() + " บาท";
  
  updateStatusSelect.value = order.Status;
  
  const itemsBody = document.getElementById('detail-items-body');
  itemsBody.innerHTML = "";
  
  try {
    const items = JSON.parse(order.Items);
    items.forEach(item => {
      const itemTotal = Number(item.price) * Number(item.qty);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600;">${item.id}</td>
        <td>${item.name}</td>
        <td style="text-align: right;">${Number(item.price) === 0 ? 'ประเมินราคา' : Number(item.price).toLocaleString()}</td>
        <td style="text-align: center; font-weight: 600;">${item.qty}</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary);">${Number(item.price) === 0 ? 'เสนอราคา' : itemTotal.toLocaleString()}</td>
      `;
      itemsBody.appendChild(row);
    });
  } catch (e) {
    console.error(e);
    itemsBody.innerHTML = `<tr><td colspan="5" style="color: var(--danger);">ไม่สามารถถอดรหัสรายการสิ่งของได้: ${order.Items}</td></tr>`;
  }
  
  orderDetailModal.classList.add('active');
};

const closeOrderDetail = () => {
  orderDetailModal.classList.remove('active');
  activeOrderDetail = null;
};
orderDetailClose.addEventListener('click', closeOrderDetail);
orderDetailCancel.addEventListener('click', closeOrderDetail);

saveStatusBtn.addEventListener('click', async () => {
  if (!activeOrderDetail) return;
  
  const newStatus = updateStatusSelect.value;
  const orderId = activeOrderDetail.OrderID;
  
  saveStatusBtn.disabled = true;
  saveStatusBtn.innerHTML = "กำลังบันทึก... <i class='bx bx-loader-alt bx-spin'></i>";
  
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateOrderStatus",
          orderId: orderId,
          status: newStatus
        })
      });
      
      let success = false;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        success = json.success;
      } catch (e) {
        if (res.ok) success = true;
      }
      
      if (success) {
        showToast("✅ อัปเดตสถานะใน Google Sheets เรียบร้อย");
        closeOrderDetail();
        fetchAdminData();
      } else {
        showToast(`❌ อัปเดตสถานะผิดพลาด: ${json.message}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ การเชื่อมต่อ API ขัดข้อง", "error");
    }
  } else {
    const orderIndex = orders.findIndex(o => o.OrderID === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].Status = newStatus;
      renderStats();
      renderOrdersTable();
      showToast("✅ อัปเดตสถานะ (Offline Mock) เรียบร้อย");
      closeOrderDetail();
    }
  }
  
  saveStatusBtn.disabled = false;
  saveStatusBtn.innerHTML = "บันทึกอัปเดตสถานะ";
});

const closeProductModal = () => productModal.classList.remove('active');
productClose.addEventListener('click', closeProductModal);
productCancelBtn.addEventListener('click', closeProductModal);

// --- CLIENT-SIDE CANVAS IMAGE COMPRESSION & BASE64 ENCODING ---
imageFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxSize = 300; // Optimal square dimension for Shopee UI
      
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress quality to 0.7 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      hiddenImageUrl.value = dataUrl;
      
      // Preview Thumbnail
      previewImg.src = dataUrl;
      previewContainer.style.display = 'block';
      showToast("📸 อัปโหลดและย่อขนาดภาพสำเร็จ");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

addProductBtn.addEventListener('click', () => {
  document.getElementById('product-modal-title').textContent = "เพิ่มรายการสินค้า/บริการใหม่";
  productForm.reset();
  document.getElementById('prod-id').readOnly = false;
  document.getElementById('prod-id').style.backgroundColor = "transparent";
  
  // Reset Image upload preview states
  hiddenImageUrl.value = "";
  previewImg.src = "";
  previewContainer.style.display = 'none';
  
  productModal.classList.add('active');
});

window.openEditProductModal = (id) => {
  const prod = products.find(p => p.ID === id);
  if (!prod) return;
  
  document.getElementById('product-modal-title').textContent = `แก้ไขสินค้า: ${prod.Name}`;
  
  document.getElementById('prod-id').value = prod.ID;
  document.getElementById('prod-id').readOnly = true;
  document.getElementById('prod-id').style.backgroundColor = "var(--light)";
  
  document.getElementById('prod-category').value = prod.Category;
  document.getElementById('prod-name').value = prod.Name;
  document.getElementById('prod-desc').value = prod.Description || '';
  document.getElementById('prod-price').value = Number(prod.Price);
  document.getElementById('prod-unit').value = prod.Unit;
  document.getElementById('prod-stock').value = Number(prod.Stock);
  
  // Load existing Image preview URL or Base64 string
  imageFileInput.value = ""; // Clear file picker input
  if (prod.ImageURL) {
    hiddenImageUrl.value = prod.ImageURL;
    previewImg.src = prod.ImageURL;
    previewContainer.style.display = 'block';
  } else {
    hiddenImageUrl.value = "";
    previewImg.src = "";
    previewContainer.style.display = 'none';
  }
  
  productModal.classList.add('active');
};

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('prod-id').value.trim();
  const category = document.getElementById('prod-category').value;
  const name = document.getElementById('prod-name').value.trim();
  const description = document.getElementById('prod-desc').value.trim();
  const price = Number(document.getElementById('prod-price').value);
  const unit = document.getElementById('prod-unit').value.trim();
  const stock = Number(document.getElementById('prod-stock').value);
  const imageUrl = hiddenImageUrl.value; // Get Base64 image
  
  const productPayload = {
    action: "saveProduct",
    id, category, name, description, price, unit, stock, imageUrl
  };
  
  const submitBtn = document.getElementById('save-product-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = "กำลังบันทึก... <i class='bx bx-loader-alt bx-spin'></i>";
  
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(productPayload)
      });
      
      let success = false;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        success = json.success;
      } catch (e) {
        if (res.ok) success = true;
      }
      
      if (success) {
        showToast("💾 บันทึกข้อมูลสินค้าลง Google Sheet เรียบร้อยแล้ว");
        closeProductModal();
        fetchAdminData();
      } else {
        showToast(`❌ เกิดข้อผิดพลาด: ${json.message}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("❌ เชื่อมต่อ API ล้มเหลว", "error");
    }
  } else {
    const existingIdx = products.findIndex(p => p.ID === id);
    const itemObj = { ID: id, Category: category, Name: name, Description: description, Price: price, Unit: unit, Stock: stock, ImageURL: imageUrl };
    
    if (existingIdx !== -1) {
      products[existingIdx] = itemObj;
      showToast("💾 แก้ไขข้อมูลสินค้า (Offline Mock) เรียบร้อย");
    } else {
      products.push(itemObj);
      showToast("💾 เพิ่มสินค้าใหม่ (Offline Mock) เรียบร้อย");
    }
    
    renderStats();
    renderProductsTable();
    closeProductModal();
  }
  
  submitBtn.disabled = false;
  submitBtn.innerHTML = "บันทึกข้อมูลสินค้า";
});

window.deleteProduct = async (id) => {
  if (!confirm(`คุณต้องการลบสินค้า/บริการ รหัส ${id} ใช่หรือไม่?`)) return;
  
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deleteProduct",
          id: id
        })
      });
      
      let success = false;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        success = json.success;
      } catch (e) {
        if (res.ok) success = true;
      }
      
      if (success) {
        showToast("🗑️ ลบข้อมูลสินค้าสำเร็จ");
        fetchAdminData();
      } else {
        showToast(`❌ ลบผิดพลาด: ${json.message}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("❌ เชื่อมต่อ API ขัดข้อง", "error");
    }
  } else {
    products = products.filter(p => p.ID !== id);
    renderStats();
    renderProductsTable();
    showToast("🗑️ ลบสินค้าสำเร็จ (Offline Mock)");
  }
};

window.deleteOrder = async (orderId) => {
  if (!confirm(`คุณต้องการลบคำสั่งซื้อหมายเลข ${orderId} ใช่หรือไม่?`)) return;
  
  if (API_URL) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deleteOrder",
          orderId: orderId
        })
      });
      
      let success = false;
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        success = json.success;
      } catch (e) {
        if (res.ok) success = true;
      }
      
      if (success) {
        showToast("🗑️ ลบคำสั่งซื้อสำเร็จ");
        fetchAdminData();
      } else {
        showToast(`❌ ลบคำสั่งซื้อผิดพลาด: ${json.message}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("❌ เชื่อมต่อ API ขัดข้อง", "error");
    }
  } else {
    orders = orders.filter(o => o.OrderID !== orderId);
    renderStats();
    renderOrdersTable();
    showToast("🗑️ ลบคำสั่งซื้อสำเร็จ (Offline Mock)");
  }
};


// --- WORK ORDER PREVIEW & PRINT LOGIC (ใบสั่งงาน) ---
window.viewWorkOrder = (orderId) => {
  const order = orders.find(o => o.OrderID === orderId);
  if (!order) return;
  
  document.getElementById('wo-id').textContent = order.OrderID;
  // Format date to local Thai format (พ.ศ.) for brevity and clean layout
  let formattedDate = order.Date;
  try {
    const d = new Date(order.Date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543; // พ.ศ.
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      formattedDate = day + "/" + month + "/" + year + " " + hours + ":" + minutes;
    }
  } catch (e) {
    console.error("Date format error:", e);
  }
  document.getElementById('wo-date').textContent = formattedDate;
  document.getElementById('wo-customer-name').textContent = order.CustomerName;
  document.getElementById('wo-customer-phone').textContent = order.Phone;
  document.getElementById('wo-customer-address').textContent = order.Address;
  document.getElementById('wo-customer-notes').textContent = order.Notes || "ไม่มีหมายเหตุพิเศษ";
  
  const tbody = document.getElementById('wo-table-body');
  tbody.innerHTML = "";
  
  let parsedItems = [];
  try {
    parsedItems = typeof order.Items === 'string' ? JSON.parse(order.Items) : order.Items;
  } catch (e) {
    console.error('Failed to parse items for work order', e);
  }
  
  parsedItems.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="work-order-sheet-checkbox">
        <span class="work-order-sheet-checkbox-box"></span>
      </td>
      <td style="text-align: center; font-weight: 600;">${item.id || "-"}</td>
      <td style="font-weight: 500;">${item.name || "-"}</td>
      <td style="text-align: center; font-weight: 700; color: var(--secondary);">${item.qty || 1}</td>
      <td style="text-align: center;">${item.unit || "ชิ้น"}</td>
      <td style="text-align: right;">${Number(item.price || 0).toLocaleString()}</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary);">${Number((item.price || 0) * (item.qty || 1)).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('work-order-modal').classList.add('active');
};

document.getElementById('work-order-close-btn').addEventListener('click', () => {
  document.getElementById('work-order-modal').classList.remove('active');
});

document.getElementById('work-order-print-btn').addEventListener('click', () => {
  window.print();
});


// --- AUTOMATIC REAL-TIME POLLING SYSTEM (Every 10 seconds) ---
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  
  pollingInterval = setInterval(() => {
    if (API_URL) {
      fetchAdminDataQuietly();
    }
  }, 10000); // Poll every 10 seconds for real-time responsiveness
}

async function fetchAdminDataQuietly() {
  if (!API_URL) return;
  
  try {
    const prodRes = await fetch(`${API_URL}?action=getProducts`);
    const prodJson = await prodRes.json();
    
    const orderRes = await fetch(`${API_URL}?action=getOrders`);
    const orderJson = await orderRes.json();
    
    if (prodJson.success && orderJson.success) {
      // Check if data actually changed to avoid redundant screen updates
      const prodChanged = JSON.stringify(products) !== JSON.stringify(prodJson.data);
      const orderChanged = JSON.stringify(orders) !== JSON.stringify(orderJson.data);
      
      if (prodChanged || orderChanged) {
        products = prodJson.data;
        orders = orderJson.data;
        renderStats();
        renderProductsTable();
        renderOrdersTable();
        console.log("⚡ [Real-time Polling] Data auto-updated in background.");
      }
    }
  } catch (err) {
    console.error("Background polling sync error:", err);
  }
}



