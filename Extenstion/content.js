// My Part Pros - OEC Price Optimizer Content Script
(function() {
  let isOptimizing = false;

  // 1. Initial configuration and state load
  async function init() {
    const session = await chrome.storage.local.get(['licenseKey', 'deviceFingerprint', 'apiBaseUrl']);
    if (!session.licenseKey) {
      console.log('MPP: No active license session found. Please authenticate via the extension popup.');
      return;
    }
    
    // Inject floating controller panel to guarantee user interface availability
    createFloatingPanel();
    
    // Set up observer for dynamic OEC Angular page updates
    const observer = new MutationObserver(() => {
      injectInlineButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Helper to get API Base URL
  async function getApiBaseUrl() {
    const data = await chrome.storage.local.get('apiBaseUrl');
    return data.apiBaseUrl || 'https://better-r4mnqg7i7-davidmpp.vercel.app';
  }

  // 2. DOM Scrapers & Selectors (Heuristic-based for maximum stability)
  function findCustomerNumber() {
    const bodyText = document.body.innerText;
    // Look for patterns like Account: BSH-44201, Customer Code: BSH-44201, etc.
    const match = bodyText.match(/(?:Account|Customer|Shop|Code|#)\s*(?:Number|Code|#)?\s*[:#-]?\s*([A-Za-z0-9-]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return 'BSH-DEFAULT';
  }

  function findCustomerName() {
    // Try to extract customer name near the account number
    const headers = Array.from(document.querySelectorAll('h1, h2, h3, .customer-name, .customer-info, div'));
    for (const h of headers) {
      const text = h.innerText || '';
      if (text.includes('Customer:') || text.includes('Ship To:') || text.includes('Sold To:')) {
        return text.replace(/(?:Customer|Ship To|Sold To):/gi, '').trim().split('\n')[0];
      }
    }
    return 'Acme Body Shop';
  }

  function findFranchise() {
    const bodyText = document.body.innerText;
    // Look for GM, Ford, Toyota, Honda, Nissan, Hyundai, Chrysler, Kia
    const matches = bodyText.match(/\b(GM|Ford|Toyota|Honda|Nissan|Hyundai|Chrysler|Kia|Chevrolet)\b/i);
    return matches ? matches[1].toUpperCase() : 'GM';
  }

  function findPartRows() {
    const rows = Array.from(document.querySelectorAll('tr, .part-row, .row-part'));
    return rows.filter(row => {
      // Must contain an editable price input field
      const hasInput = row.querySelector('input[type="text"], input[type="number"], input:not([type])');
      if (!hasInput) return false;

      // Must contain something resembling a part number (5 to 15 alphanumeric characters)
      const text = row.innerText || '';
      return /\b[A-Za-z0-9-]{5,15}\b/.test(text);
    });
  }

  function scrapeRow(row) {
    const inputs = Array.from(row.querySelectorAll('input'));
    const textCells = Array.from(row.querySelectorAll('td, span, div')).map(el => el.innerText.trim());

    // A. Parse Part Number
    let partNumber = '';
    for (const text of textCells) {
      const m = text.match(/\b([A-Za-z0-9-]{5,15})\b/);
      if (m && !text.includes('$') && isNaN(Number(m[1]))) {
        partNumber = m[1];
        break;
      }
    }
    // Fallback if no clean match found
    if (!partNumber && inputs.length > 0) {
      partNumber = 'PART-' + Math.floor(1000000 + Math.random() * 9000000);
    }

    // B. Parse list and cost prices
    const prices = [];
    
    // Extract numbers containing dollar symbols
    for (const text of textCells) {
      if (text.includes('$')) {
        const val = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(val) && val > 0) {
          prices.push(val);
        }
      }
    }
    
    // Check read-only inputs
    for (const input of inputs) {
      if (input.disabled || input.readOnly) {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          prices.push(val);
        }
      }
    }

    // Sort to distinguish Cost (lowest) and List (highest)
    const sorted = Array.from(new Set(prices)).sort((a, b) => a - b);
    let cost = 0;
    let listPrice = 0;

    if (sorted.length >= 2) {
      cost = sorted[0];
      listPrice = sorted[sorted.length - 1];
    } else if (sorted.length === 1) {
      listPrice = sorted[0];
      cost = Number((listPrice * 0.70).toFixed(2)); // fallback 30% margin cost
    } else {
      // Direct DOM scan failed, look for editable value
      const targetInput = inputs.find(i => !i.disabled && !i.readOnly);
      const val = targetInput ? parseFloat(targetInput.value) : 100.00;
      listPrice = !isNaN(val) && val > 0 ? val : 100.00;
      cost = Number((listPrice * 0.70).toFixed(2));
    }

    // C. Get target input field
    const editableInput = inputs.find(i => !i.disabled && !i.readOnly);

    return {
      partNumber,
      listPrice,
      cost,
      editableInput,
      rowElement: row
    };
  }

  // 3. Floating panel injection
  function createFloatingPanel() {
    if (document.getElementById('mpp-float-panel')) return;

    const container = document.createElement('div');
    container.id = 'mpp-float-panel';
    container.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: rgba(11, 11, 10, 0.9); backdrop-filter: blur(8px);
      border: 1px solid rgba(246, 178, 58, 0.35); border-radius: 12px;
      padding: 16px; width: 260px; font-family: 'Outfit', sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5); color: #ffffff;
      transition: all 0.3s ease;
    `;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:12px;">
        <span style="font-weight:700; color:#f6b23a; letter-spacing:0.05em; font-size:14px;">MPP OPTIMIZER</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="width:8px; height:8px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;"></span>
          <span style="font-size:11px; color:#10b981; font-weight:600;">ACTIVE</span>
        </div>
      </div>
      <div style="font-size:12px; color:#aaa; display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
        <div>Franchise: <strong id="mpp-fran-tag" style="color:white;">-</strong></div>
        <div>Customer Code: <strong id="mpp-cust-tag" style="color:white;">-</strong></div>
        <div>Parts Detected: <strong id="mpp-parts-tag" style="color:white;">0</strong></div>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="mpp-float-opt" class="mpp-btn mpp-btn-optimize" style="flex:1; margin:0;">Optimize</button>
        <button id="mpp-float-max" class="mpp-btn mpp-btn-max" style="flex:1; margin:0;">Max</button>
      </div>
    `;

    document.body.appendChild(container);

    // Event listeners
    document.getElementById('mpp-float-opt').addEventListener('click', () => runPricingOptimization('optimize'));
    document.getElementById('mpp-float-max').addEventListener('click', () => runPricingOptimization('max_reimbursement'));

    // Update tags continuously
    setInterval(() => {
      const parts = findPartRows();
      const customer = findCustomerNumber();
      const franchise = findFranchise();

      const pTag = document.getElementById('mpp-parts-tag');
      const cTag = document.getElementById('mpp-cust-tag');
      const fTag = document.getElementById('mpp-fran-tag');

      if (pTag) pTag.innerText = parts.length;
      if (cTag) cTag.innerText = customer;
      if (fTag) fTag.innerText = franchise;
    }, 2000);
  }

  // 4. Inline button injection (attempting to attach to OEC native toolbar if visible)
  function injectInlineButtons() {
    if (document.getElementById('mpp-inline-container')) return;
    
    // Look for OEC native toolbar or page title sections
    const toolbar = document.querySelector('.toolbar, .action-bar, .buttons, .actions-row, h1');
    if (!toolbar) return;

    const container = document.createElement('div');
    container.id = 'mpp-inline-container';
    container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 16px; vertical-align: middle;';

    const optBtn = document.createElement('button');
    optBtn.className = 'mpp-btn mpp-btn-optimize';
    optBtn.id = 'mpp-inline-opt';
    optBtn.innerText = 'Optimize';
    optBtn.onclick = () => runPricingOptimization('optimize');

    const maxBtn = document.createElement('button');
    maxBtn.className = 'mpp-btn mpp-btn-max';
    maxBtn.id = 'mpp-inline-max';
    maxBtn.innerText = 'Max';
    maxBtn.onclick = () => runPricingOptimization('max_reimbursement');

    container.appendChild(optBtn);
    container.appendChild(maxBtn);
    toolbar.appendChild(container);
  }

  // 5. Dynamic Algorithm loading and runtime execution
  async function runPricingOptimization(optimizationType) {
    if (isOptimizing) return;
    isOptimizing = true;
    
    // Update button states to loading
    const optButtons = [document.getElementById('mpp-float-opt'), document.getElementById('mpp-inline-opt')];
    const maxButtons = [document.getElementById('mpp-float-max'), document.getElementById('mpp-inline-max')];
    
    const targets = optimizationType === 'max_reimbursement' ? maxButtons : optButtons;
    const oldTexts = targets.map(t => t ? t.innerHTML : '');
    
    targets.forEach(t => {
      if (t) t.innerHTML = '<span class="mpp-spinner"></span>';
    });

    try {
      const session = await chrome.storage.local.get(['licenseKey', 'deviceFingerprint']);
      if (!session.licenseKey) {
        alert('Please log in via the My Part Pros extension popup first.');
        isOptimizing = false;
        targets.forEach((t, i) => { if (t) t.innerHTML = oldTexts[i]; });
        return;
      }

      const rows = findPartRows();
      if (rows.length === 0) {
        alert('No parts detected on the page to optimize.');
        isOptimizing = false;
        targets.forEach((t, i) => { if (t) t.innerHTML = oldTexts[i]; });
        return;
      }

      const customerNumber = findCustomerNumber();
      const customerName = findCustomerName();
      const franchise = findFranchise();
      const apiBaseUrl = await getApiBaseUrl();

      // Optimize each row sequentially
      for (const row of rows) {
        const part = scrapeRow(row);
        if (!part.editableInput) continue;

        // Fetch algorithm logic dynamically for this run
        const res = await fetch(`${apiBaseUrl}/api/get-algo-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            deviceFingerprint: session.deviceFingerprint,
            customerNumber,
            customerName,
            franchise,
            listPrice: part.listPrice,
            cost: part.cost,
            reimbursementRate: 0.85,
            optimizationType
          })
        });

        if (!res.ok) {
          throw new Error('Server returned error validating request.');
        }

        const data = await res.json();
        if (!data.success || !data.algoCode) {
          throw new Error('Failed to load algorithm logic.');
        }

        // Run pricing logic in memory and immediately discard
        const calculatedPrice = runAlgorithmInMemory(
          data.algoCode,
          part.listPrice,
          part.cost,
          data.reimbursementRate || 0.85,
          data.minProfit,
          data.maxReimbMode
        );

        if (calculatedPrice !== null && !isNaN(calculatedPrice)) {
          // Update DOM input value
          part.editableInput.value = calculatedPrice.toFixed(2);
          
          // Trigger change events so OEC frameworks register changes
          part.editableInput.dispatchEvent(new Event('input', { bubbles: true }));
          part.editableInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Highlight DOM cell briefly to verify injection
          part.rowElement.classList.add('mpp-price-highlight');
          setTimeout(() => {
            part.rowElement.classList.remove('mpp-price-highlight');
          }, 1500);

          // Log the transaction back to the database
          const reimbAmount = calculatedPrice * (data.reimbursementRate || 0.85);
          const margin = (((calculatedPrice - part.cost) / part.cost) * 100);

          await fetch(`${apiBaseUrl}/api/record-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              licenseKey: session.licenseKey,
              deviceFingerprint: session.deviceFingerprint,
              partNumber: part.partNumber,
              customerNumber,
              customerName,
              franchise,
              listPrice: part.listPrice,
              optimizedPrice: calculatedPrice,
              cost: part.cost,
              reimbursementRate: data.reimbursementRate || 0.85,
              reimbAmount: Number(reimbAmount.toFixed(2)),
              marginAchieved: Number(margin.toFixed(1)),
              optimizationType
            })
          });
        }
      }

    } catch (err) {
      console.error('MPP Price Optimizer Error:', err);
      alert('Error: ' + err.message);
    } finally {
      isOptimizing = false;
      targets.forEach((t, i) => { if (t) t.innerHTML = oldTexts[i]; });
    }
  }

  // Dynamically executes the pricing algorithm and deletes it from context
  function runAlgorithmInMemory(codeStr, listPrice, cost, reimbursementRate, minProfit, maxReimbMode) {
    try {
      const runWrapper = new Function('listPrice', 'cost', 'reimbursementRate', 'minProfit', 'maxReimbMode', `
        ${codeStr}
        if (typeof optimize === 'function') {
          return optimize(listPrice, cost, reimbursementRate, minProfit);
        }
        if (typeof maintainProfit === 'function') {
          return maintainProfit(listPrice, cost, reimbursementRate);
        }
        if (typeof maxReimbursement === 'function') {
          return maxReimbursement(listPrice, cost, reimbursementRate, maxReimbMode);
        }
        throw new Error("No pricing algorithm match found.");
      `);
      
      const result = runWrapper(listPrice, cost, reimbursementRate, minProfit, maxReimbMode);
      // Wrapper garbage collected after returning value
      return result;
    } catch (e) {
      console.error('Runtime error in dynamic pricing algorithm execution:', e);
      return null;
    }
  }

  // Start extension initialization
  init();
})();
