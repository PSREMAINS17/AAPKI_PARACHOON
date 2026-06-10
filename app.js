/* Grocery Management System - client-side JS
   - Uses localStorage for persistence
   - Exports CSV for inventory/prices/history
   - Maintains animations & layout similar to Tkinter app
*/

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6'
};

let state = {
  inventory: [],
  prices: [],
  history: []
};

// load from localStorage
function loadState() {
  try {
    const raw = localStorage.getItem('grocery_state');
    if (raw) state = JSON.parse(raw);
  } catch (e) { console.error(e); }
}
function saveState() {
  localStorage.setItem('grocery_state', JSON.stringify(state));
}

// Utilities
function $(sel) { return document.querySelector(sel) }
function el(tag, cls) { const e=document.createElement(tag); if(cls) e.className=cls; return e }
function addHistory(action, desc) {
  state.history.push({ datetime: new Date().toISOString().replace('T',' ').split('.')[0], action, description: desc });
  saveState();
}

// Initialize nav
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showSection(btn.dataset.target);
    });
    // set base color
    let c = getComputedStyle(btn).getPropertyValue('--btn-color');
    // hover lighten is in CSS via filter
  });
}

// Show section
function showSection(name) {
  const content = $('#content');
  content.innerHTML = '';
  if (name === 'store') renderStore(content);
  else if (name === 'prices') renderPrices(content);
  else if (name === 'history') renderHistory(content);
  else renderDashboard(content);
}

// --- STORE (Inventory) ---
function renderStore(container) {
  // title
  const title = el('h2','h2'); title.textContent = '📦 Store Inventory Management';
  container.appendChild(title);

  // Input card
  const inputCard = el('div','card');
  inputCard.style.marginBottom='12px';
  const inGrid = el('div','grid');

  const lbl1 = el('div'); lbl1.innerHTML=`<div class="label">Item Name:</div><input id="store_name" class="input">`;
  const lbl2 = el('div'); lbl2.innerHTML=`<div class="label">Category:</div><select id="store_category" class="select">
    <option value="">Select</option>
    <option>Fruits</option><option>Vegetables</option><option>Dairy</option><option>Grains</option><option>Beverages</option><option>Snacks</option><option>Other</option>
  </select>`;
  const lbl3 = el('div'); lbl3.innerHTML=`<div class="label">Quantity:</div><input id="store_quantity" class="input" type="number">`;
  const lbl4 = el('div'); lbl4.innerHTML=`<div class="label">Unit:</div><select id="store_unit" class="select">
    <option value="">Select</option><option>kg</option><option>g</option><option>L</option><option>ml</option><option>pcs</option><option>dozen</option>
  </select>`;
  const lbl5 = el('div'); lbl5.innerHTML=`<div class="label">Reorder Level:</div><input id="store_reorder" class="input" type="number">`;
  const controls = el('div'); controls.className='row-btns';

  inGrid.appendChild(lbl1);
  inGrid.appendChild(lbl2);
  inGrid.appendChild(lbl3);
  inGrid.appendChild(lbl4);
  inGrid.appendChild(lbl5);
  inputCard.appendChild(inGrid);

  const addBtn = el('button','btn green'); addBtn.textContent='✓ Add';
  const updateBtn = el('button','btn amber'); updateBtn.textContent='✏ Update';
  const deleteBtn = el('button','btn red'); deleteBtn.textContent='🗑 Delete';
  const exportBtn = el('button','btn purple'); exportBtn.textContent='📊 Export';

  controls.appendChild(addBtn); controls.appendChild(updateBtn); controls.appendChild(deleteBtn); controls.appendChild(exportBtn);
  inputCard.appendChild(controls);
  container.appendChild(inputCard);

  // Table card
  const tableCard = el('div','card');
  const tableTitle = el('div'); tableTitle.className='label'; tableTitle.textContent='📋 Inventory List';
  tableCard.appendChild(tableTitle);

  const table = el('table','table'); table.id='inventory_table';
  const thead = el('thead'); thead.innerHTML=`<tr>
    <th>Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Reorder</th><th>Status</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = el('tbody'); table.appendChild(tbody);
  tableCard.appendChild(table);
  container.appendChild(tableCard);

  // Events
  function clearInputs(){ $('#store_name').value=''; $('#store_category').value=''; $('#store_quantity').value=''; $('#store_unit').value=''; $('#store_reorder').value=''; }
  function refreshTable(){
    tbody.innerHTML='';
    state.inventory.forEach((it, idx)=>{
      const tr = el('tr'); tr.dataset.index = idx;
      const status = (Number(it.quantity) <= Number(it.reorder_level)) ? '⚠ Low Stock' : '✓ In Stock';
      tr.innerHTML = `<td>${escapeHtml(it.name)}</td><td>${escapeHtml(it.category)}</td><td>${it.quantity}</td><td>${escapeHtml(it.unit)}</td><td>${it.reorder_level}</td><td>${status}</td>`;
      tr.addEventListener('click', ()=>{
        // slide-in animation imitation
        tr.animate([{transform:'translateX(-6px)'},{transform:'translateX(0)'}],{duration:140});
        $('#store_name').value = it.name;
        $('#store_category').value = it.category;
        $('#store_quantity').value = it.quantity;
        $('#store_unit').value = it.unit;
        $('#store_reorder').value = it.reorder_level;
        // highlight
        tbody.querySelectorAll('tr').forEach(r=>r.style.background='');
        tr.style.background = '#eef9ff';
      });
      tbody.appendChild(tr);
    });
  }

  addBtn.onclick = ()=>{
    const name = $('#store_name').value.trim();
    const category = $('#store_category').value.trim();
    const qty = Number($('#store_quantity').value);
    const unit = $('#store_unit').value.trim();
    const reorder = Number($('#store_reorder').value);
    if (!name || !category || !unit || isNaN(qty) || isNaN(reorder)) { alert('Please fill all fields with valid values'); return; }
    state.inventory.push({ name, category, quantity: qty, unit, reorder_level: reorder, last_updated: new Date().toISOString() });
    addHistory('Added', `Added ${name} to inventory`);
    saveState(); refreshTable(); clearInputs(); alert('✓ Item added successfully!');
  };

  updateBtn.onclick = ()=>{
    // find selected row
    const selected = tbody.querySelector('tr[style*="background"]');
    if (!selected) { alert('Please select an item to update'); return; }
    const idx = Number(selected.dataset.index);
    const name = $('#store_name').value.trim();
    const category = $('#store_category').value.trim();
    const qty = Number($('#store_quantity').value);
    const unit = $('#store_unit').value.trim();
    const reorder = Number($('#store_reorder').value);
    if (!name || !category || !unit || isNaN(qty) || isNaN(reorder)) { alert('Please fill all fields with valid values'); return; }
    state.inventory[idx] = { name, category, quantity: qty, unit, reorder_level: reorder, last_updated: new Date().toISOString() };
    addHistory('Updated', `Updated ${name} in inventory`);
    saveState(); refreshTable(); clearInputs(); alert('✓ Item updated successfully!');
  };

  deleteBtn.onclick = ()=>{
    const selected = tbody.querySelector('tr[style*="background"]');
    if (!selected) { alert('Please select an item to delete'); return; }
    if (!confirm('Are you sure you want to delete this item?')) return;
    const idx = Number(selected.dataset.index);
    const name = state.inventory[idx].name;
    state.inventory.splice(idx,1);
    addHistory('Deleted', `Deleted ${name} from inventory`);
    saveState(); refreshTable(); clearInputs(); alert('✓ Item deleted successfully!');
  };

  exportBtn.onclick = ()=> exportCSV('inventory');

  // initial render
  refreshTable();
}

// --- PRICES ---
function renderPrices(container){
  const title = el('h2','h2'); title.textContent = '💰 Price Management';
  container.appendChild(title);

  const inputCard = el('div','card');
  const inGrid = el('div','grid');

  const lbl1 = el('div'); lbl1.innerHTML=`<div class="label">Item Name:</div><input id="price_name" class="input">`;
  const lbl2 = el('div'); lbl2.innerHTML=`<div class="label">Cost Price:</div><input id="price_cost" class="input" type="number">`;
  const lbl3 = el('div'); lbl3.innerHTML=`<div class="label">Selling Price:</div><input id="price_selling" class="input" type="number">`;
  const lbl4 = el('div'); lbl4.innerHTML=`<div class="label">Currency:</div><select id="price_currency" class="select">
    <option>₹ INR</option><option>$ USD</option><option>€ EUR</option><option>£ GBP</option>
  </select>`;

  inGrid.appendChild(lbl1); inGrid.appendChild(lbl2); inGrid.appendChild(lbl3); inGrid.appendChild(lbl4);
  inputCard.appendChild(inGrid);

  const controls = el('div'); controls.className='row-btns';
  const addBtn = el('button','btn green'); addBtn.textContent='✓ Add';
  const updateBtn = el('button','btn amber'); updateBtn.textContent='✏ Update';
  const deleteBtn = el('button','btn red'); deleteBtn.textContent='🗑 Delete';
  const exportBtn = el('button','btn purple'); exportBtn.textContent='📊 Export';
  controls.appendChild(addBtn); controls.appendChild(updateBtn); controls.appendChild(deleteBtn); controls.appendChild(exportBtn);
  inputCard.appendChild(controls);
  container.appendChild(inputCard);

  // table
  const tableCard = el('div','card');
  const tableTitle = el('div'); tableTitle.className='label'; tableTitle.textContent='📋 Price List';
  tableCard.appendChild(tableTitle);
  const table = el('table','table'); const thead = el('thead'); thead.innerHTML = `<tr><th>Name</th><th>Cost</th><th>Selling</th><th>Profit</th><th>Margin</th><th>Currency</th></tr>`; table.appendChild(thead); const tbody = el('tbody'); table.appendChild(tbody); tableCard.appendChild(table); container.appendChild(tableCard);

  function refresh(){
    tbody.innerHTML='';
    state.prices.forEach((p, idx)=>{
      const tr = el('tr'); tr.dataset.index = idx;
      tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${p.cost_price}</td><td>${p.selling_price}</td><td>${p.profit}</td><td>${p.margin}%</td><td>${escapeHtml(p.currency)}</td>`;
      tr.addEventListener('click', ()=> {
        tbody.querySelectorAll('tr').forEach(r=>r.style.background='');
        tr.style.background='#eef9ff';
        $('#price_name').value = p.name; $('#price_cost').value = p.cost_price; $('#price_selling').value = p.selling_price; $('#price_currency').value = p.currency;
      });
      tbody.appendChild(tr);
    });
  }

  addBtn.onclick = ()=>{
    const name = $('#price_name').value.trim();
    const cost = Number($('#price_cost').value);
    const selling = Number($('#price_selling').value);
    const currency = $('#price_currency').value;
    if (!name || isNaN(cost) || isNaN(selling)) { alert('Please enter valid numbers'); return; }
    const profit = selling - cost;
    const margin = cost > 0 ? Math.round((profit / cost) * 100 * 100)/100 : 0;
    state.prices.push({ name, cost_price: cost, selling_price: selling, profit, margin, currency, last_updated: new Date().toISOString() });
    addHistory('Price Added', `Added price for ${name}`);
    saveState(); refresh(); alert('✓ Price added successfully!');
  };

  updateBtn.onclick = ()=>{
    const sel = tbody.querySelector('tr[style*="background"]');
    if (!sel) { alert('Please select an item to update'); return; }
    const idx = Number(sel.dataset.index);
    const name = $('#price_name').value.trim();
    const cost = Number($('#price_cost').value);
    const selling = Number($('#price_selling').value);
    const currency = $('#price_currency').value;
    if (!name || isNaN(cost) || isNaN(selling)) { alert('Please enter valid numbers'); return; }
    const profit = selling - cost;
    const margin = cost > 0 ? Math.round((profit / cost) * 100 * 100)/100 : 0;
    state.prices[idx] = { name, cost_price: cost, selling_price: selling, profit, margin, currency, last_updated: new Date().toISOString() };
    addHistory('Price Updated', `Updated price for ${name}`);
    saveState(); refresh(); alert('✓ Price updated successfully!');
  };

  deleteBtn.onclick = ()=>{
    const sel = tbody.querySelector('tr[style*="background"]');
    if (!sel) { alert('Please select an item to delete'); return; }
    if (!confirm('Delete this price entry?')) return;
    const idx = Number(sel.dataset.index); const name = state.prices[idx].name;
    state.prices.splice(idx,1);
    addHistory('Price Deleted', `Deleted price for ${name}`);
    saveState(); refresh(); alert('✓ Price deleted!');
  };

  exportBtn.onclick = ()=> exportCSV('prices');

  refresh();
}

// --- HISTORY ---
function renderHistory(container){
  const title = el('h2','h2'); title.textContent = '📊 Activity History';
  container.appendChild(title);

  const btnRow = el('div','row-btns'); btnRow.style.marginBottom='8px';
  const clearBtn = el('button','btn red'); clearBtn.textContent='🗑 Clear History';
  const exportBtn = el('button','btn purple'); exportBtn.textContent='📊 Export';
  btnRow.appendChild(clearBtn); btnRow.appendChild(exportBtn);
  container.appendChild(btnRow);

  const card = el('div','card');
  const table = el('table','table'); table.innerHTML = `<thead><tr><th>DateTime</th><th>Action</th><th>Description</th></tr></thead><tbody id="history_tbody"></tbody>`;
  card.appendChild(table); container.appendChild(card);

  function refresh(){
    const tb = $('#history_tbody'); tb.innerHTML='';
    [...state.history].reverse().forEach(h=>{
      const tr = el('tr'); tr.innerHTML = `<td>${escapeHtml(h.datetime)}</td><td>${escapeHtml(h.action)}</td><td>${escapeHtml(h.description)}</td>`; tb.appendChild(tr);
    });
  }

  clearBtn.onclick = ()=>{
    if (!confirm('Clear all history?')) return;
    state.history = []; saveState(); refresh(); alert('✓ History cleared!');
  };
  exportBtn.onclick = ()=> exportCSV('history');
  refresh();
}

// --- DASHBOARD ---
function renderDashboard(container){
  const title = el('h2','h2'); title.textContent='📈 Sales Dashboard';
  container.appendChild(title);

  const summary = el('div','summary');
  const low_stock = state.inventory.filter(i => Number(i.quantity) <= Number(i.reorder_level)).length;

  const cards = [
    ['Total Items', state.inventory.length, '📦', COLORS.secondary],
    ['Low Stock', low_stock, '⚠', COLORS.danger],
    ['Price Entries', state.prices.length, '💰', COLORS.success],
    ['Activities', state.history.length, '📊', COLORS.warning]
  ];

  cards.forEach(([t,v,icon,color])=>{
    const c = el('div','sum-card'); c.style.background=color; c.innerHTML = `<div style="font-size:30px">${icon}</div><div style="font-size:28px;font-weight:800">${v}</div><div style="margin-top:6px">${t}</div>`; summary.appendChild(c);
  });

  container.appendChild(summary);

  if (low_stock > 0){
    const alert = el('div','alert'); alert.textContent = `⚠ Warning: ${low_stock} item(s) running low on stock!`;
    container.appendChild(alert);
  }

  // Category breakdown
  const catCard = el('div','card'); const catTitle = el('div'); catTitle.className='label'; catTitle.textContent='📊 Inventory by Category'; catCard.appendChild(catTitle);
  const categories = {};
  state.inventory.forEach(it => { categories[it.category] = (categories[it.category]||0)+1; });

  if (Object.keys(categories).length>0){
    Object.entries(categories).forEach(([cat,count])=>{
      const cf = el('div','cat-frame'); cf.innerHTML = `<div style="font-weight:700">${escapeHtml(cat)}</div><div style="color:var(--secondary)">${count} items</div>`;
      catCard.appendChild(cf);
    });
  } else {
    const p = el('div'); p.textContent='No inventory data available'; p.style.color='var(--muted)'; p.style.padding='18px 0'; catCard.appendChild(p);
  }
  container.appendChild(catCard);
}

// Export CSV (inventory / prices / history)
function exportCSV(type){
  let headers=[], rows=[];
  if (type==='inventory'){
    headers = ["Item Name","Category","Quantity","Unit","Reorder Level","Status","Last Updated"];
    rows = state.inventory.map(it=>[it.name, it.category, it.quantity, it.unit, it.reorder_level, (Number(it.quantity)<=Number(it.reorder_level)) ? 'Low Stock':'In Stock', it.last_updated||'']);
  } else if (type==='prices'){
    headers = ["Item Name","Cost Price","Selling Price","Profit","Margin %","Currency","Last Updated"];
    rows = state.prices.map(p=>[p.name,p.cost_price,p.selling_price,p.profit,p.margin,p.currency,p.last_updated||'']);
  } else {
    headers = ["Date & Time","Action","Description"];
    rows = state.history.map(h=>[h.datetime,h.action,h.description]);
  }
  const csv = [headers.join(',')].concat(rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${type}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  addHistory('Export', `Exported ${type} data to CSV`);
  saveState();
  alert('✓ Data exported successfully!');
}

// helpers
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// initial boot
function boot(){
  loadState();
  initNav();
  showSection('store'); // default
}

// attach to DOM
document.addEventListener('DOMContentLoaded', boot);
