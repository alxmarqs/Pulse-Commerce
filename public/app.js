// Global Application State
let currentUserId = 'alice';
let usersList = [];
let productsList = [];
let networkInstance = null;
let simIntervalId = null;
let dbLogFilters = {
    MongoDB: true,
    Redis: true,
    Neo4j: true
};

// DOM Elements
const userSelect = document.getElementById('active-user-select');
const cartToggle = document.getElementById('cart-toggle');
const cartClose = document.getElementById('cart-close');
const cartOverlay = document.getElementById('cart-overlay-bg');
const cartSidebar = document.getElementById('cart-sidebar-panel');
const cartItemsWrapper = document.getElementById('cart-items-wrapper');
const cartTotal = document.getElementById('cart-total');
const cartBadge = document.getElementById('cart-badge-count');
const btnCheckout = document.getElementById('btn-checkout');

// Modals
const recommendModal = document.getElementById('recommend-modal');
const recommendModalClose = document.getElementById('recommend-modal-close');
const btnCancelRecommend = document.getElementById('btn-cancel-recommend');
const btnSendRecommend = document.getElementById('btn-send-recommend');
const recommendFriendSelect = document.getElementById('recommend-friend-select');
const recommendProductInfo = document.getElementById('recommend-product-info');

const friendModal = document.getElementById('friend-modal');
const friendModalClose = document.getElementById('friend-modal-close');
const btnCancelFriend = document.getElementById('btn-cancel-friend');
const btnConnectFriends = document.getElementById('btn-connect-friends');
const friendUser1 = document.getElementById('friend-user1');
const friendUser2 = document.getElementById('friend-user2');
const btnAddFriendModal = document.getElementById('btn-add-friend-modal');

// Diagnostics Logs
const consoleLogsContainer = document.getElementById('console-logs-container');
const btnClearLogs = document.getElementById('btn-clear-logs');
const filterToggles = document.querySelectorAll('.filter-toggle');

// Admin Forms
const adminProductForm = document.getElementById('admin-product-form');
const adminUserForm = document.getElementById('admin-user-form');

// Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const btnRefreshGraph = document.getElementById('btn-refresh-graph');

// Active state for recommendation target
let selectedProductIdForRecommend = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    initializeLogsSSE();
    loadUsers();
    loadProducts();
    setupCartHandlers();
    setupRecommendationModal();
    setupFriendModal();
    setupDiagnosticsFilters();
    setupAdminHandlers();
    setupSimulator();
    
    // Refresh graph click
    if (btnRefreshGraph) {
        btnRefreshGraph.addEventListener('click', loadSocialGraph);
    }
});

// 1. NAVIGATION TAB SYSTEM
function setupTabNavigation() {
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTabId = tab.getAttribute('data-tab');
            
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) targetContent.classList.add('active');

            // Trigger specific tab loading actions
            if (targetTabId === 'social-tab') {
                loadSocialGraph();
                loadActivities();
            } else if (targetTabId === 'leaderboard-tab') {
                loadLeaderboard();
            }
        });
    });
}

// 2. LOGS SSE CONNECTION (Real-time NoSQL queries logger)
function initializeLogsSSE() {
    const sse = new EventSource('/api/logs');

    sse.onmessage = (event) => {
        try {
            const log = JSON.parse(event.data);
            if (log.message) {
                console.log('SSE connected:', log.message);
                return;
            }
            appendLogToConsole(log);
        } catch (err) {
            console.error('Error parsing SSE log:', err);
        }
    };

    sse.onerror = (error) => {
        console.error('SSE Error:', error);
        sse.close();
        // Retry connection in 5 seconds
        setTimeout(initializeLogsSSE, 5000);
    };

    // Clear logs button
    btnClearLogs.addEventListener('click', () => {
        consoleLogsContainer.innerHTML = '';
        showToast('Logs do console limpos.', 'info');
    });
}

function appendLogToConsole(log) {
    // Check filter toggles
    if (!dbLogFilters[log.db]) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${log.db.toLowerCase()}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${new Date(log.timestamp).toLocaleTimeString()}]`;
    
    const dbSpan = document.createElement('span');
    dbSpan.className = 'log-db';
    dbSpan.textContent = log.db;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'log-message';
    messageSpan.textContent = log.query;

    logEntry.appendChild(timeSpan);
    logEntry.appendChild(dbSpan);
    logEntry.appendChild(messageSpan);

    if (log.durationMs) {
        const durationSpan = document.createElement('span');
        durationSpan.className = 'log-duration';
        durationSpan.textContent = `${log.durationMs}ms`;
        logEntry.appendChild(durationSpan);
    }

    consoleLogsContainer.appendChild(logEntry);
    
    // Auto Scroll console
    consoleLogsContainer.scrollTop = consoleLogsContainer.scrollHeight;
}

function setupDiagnosticsFilters() {
    filterToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const db = btn.getAttribute('data-db');
            dbLogFilters[db] = !dbLogFilters[db];
            
            if (dbLogFilters[db]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            showToast(`Filtro do ${db} ${dbLogFilters[db] ? 'ativado' : 'desativado'}`, 'info');
        });
    });
}

// 3. USER MANAGEMENT & STATE SWITCHER
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        usersList = await response.json();
        
        userSelect.innerHTML = '';
        usersList.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });

        // Set default user
        if (usersList.some(u => u.id === 'alice')) {
            currentUserId = 'alice';
            userSelect.value = 'alice';
        } else if (usersList.length > 0) {
            currentUserId = usersList[0].id;
            userSelect.value = currentUserId;
        }

        // Fetch cart for current user
        loadCart();

        // Add change listener to switch active user
        userSelect.addEventListener('change', (e) => {
            currentUserId = e.target.value;
            showToast(`Usuário ativo alterado para ${userSelect.options[userSelect.selectedIndex].text}`, 'info');
            
            // Reload user specific data
            loadCart();
            loadProducts();
            
            // If active tab is leaderboard or social, refresh
            const activeTab = document.querySelector('.nav-tab.active').getAttribute('data-tab');
            if (activeTab === 'leaderboard-tab') {
                loadLeaderboard();
            } else if (activeTab === 'social-tab') {
                loadSocialGraph();
            }
        });
    } catch (err) {
        console.error('Error loading users:', err);
        showToast('Erro ao carregar usuários.', 'error');
    }
}

// 4. E-COMMERCE PRODUCTS STORE (MongoDB Catalog)
async function loadProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: {
                'userid': currentUserId
            }
        });
        productsList = await response.json();
        renderProducts(productsList);
    } catch (err) {
        console.error('Error loading products:', err);
        showToast('Erro ao carregar catálogo de produtos.', 'error');
    }
}

function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card glass';
        
        // Render specs list dynamically to showcase schemaless model
        let specsHtml = '';
        if (p.specs && Object.keys(p.specs).length > 0) {
            specsHtml = `
                <div class="product-specs">
                    <span class="specs-title"><i class="fa-solid fa-gears"></i> Ficha Técnica (Documental)</span>
                    <ul class="spec-list">
            `;
            for (const [key, val] of Object.entries(p.specs)) {
                // Formatting camelCase/snake_case labels nicely
                const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1');
                specsHtml += `
                    <li class="spec-item">
                        <span class="spec-label">${formattedKey}:</span>
                        <span class="spec-value">${val === true ? 'Sim' : val === false ? 'Não' : val}</span>
                    </li>
                `;
            }
            specsHtml += `</ul></div>`;
        }

        card.innerHTML = `
            <div class="product-img-wrapper">
                <span class="product-category-badge">${p.category}</span>
                <img src="${p.image}" alt="${p.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'">
            </div>
            <div class="product-body">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-price">R$ ${p.price.toFixed(2)}</p>
                ${p.friendsWhoBought && p.friendsWhoBought.length > 0 ? `
                    <div class="social-buyers-hint" style="font-size: 0.75rem; color: var(--green); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem; background: rgba(16,185,129,0.06); padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid rgba(16,185,129,0.15);">
                        <i class="fa-solid fa-user-group"></i>
                        <span>${p.friendsWhoBought.length === 1 ? 
                            `Amigo <strong>${p.friendsWhoBought[0]}</strong> comprou` : 
                            `Amigos <strong>${p.friendsWhoBought.slice(0, 2).join(', ')}</strong>${p.friendsWhoBought.length > 2 ? ' e outros' : ''} compraram`}</span>
                    </div>
                ` : ''}
                ${specsHtml}
                <div class="product-actions">
                    <button class="primary-btn btn-full btn-add-cart" data-id="${p._id}">
                        <i class="fa-solid fa-cart-plus"></i> Carrinho
                    </button>
                    <button class="glass-btn action-icon-btn btn-recommend" data-id="${p._id}" title="Recomendar para um amigo">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    // Add Cart button listeners
    container.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prodId = btn.getAttribute('data-id');
            addToCart(prodId);
        });
    });

    // Add Recommendation button listeners
    container.querySelectorAll('.btn-recommend').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prodId = btn.getAttribute('data-id');
            openRecommendModal(prodId);
        });
    });
}

// 5. SHOPPING CART drawer (Redis key-value)
setupCartHandlers = () => {
    cartToggle.addEventListener('click', () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
    });

    cartClose.addEventListener('click', closeCartPanel);
    cartOverlay.addEventListener('click', closeCartPanel);

    btnCheckout.addEventListener('click', processCheckout);
};

function closeCartPanel() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
}

async function loadCart() {
    try {
        const response = await fetch('/api/cart', {
            headers: {
                'userid': currentUserId
            }
        });
        const cartItems = await response.json();
        renderCart(cartItems);
    } catch (err) {
        console.error('Error fetching cart:', err);
        showToast('Erro ao carregar carrinho do Redis.', 'error');
    }
}

function renderCart(cartItems) {
    cartItemsWrapper.innerHTML = '';
    
    if (cartItems.length === 0) {
        cartItemsWrapper.innerHTML = `
            <div class="text-center text-muted" style="margin-top: 3rem;">
                <i class="fa-solid fa-shopping-bag" style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4;"></i>
                <p>Seu carrinho está vazio.</p>
            </div>
        `;
        cartTotal.textContent = 'R$ 0,00';
        cartBadge.textContent = '0';
        btnCheckout.disabled = true;
        return;
    }

    btnCheckout.disabled = false;
    let total = 0;
    let totalQty = 0;

    cartItems.forEach(item => {
        const subtotal = item.product.price * item.quantity;
        total += subtotal;
        totalQty += item.quantity;

        const row = document.createElement('div');
        row.className = 'cart-item-card';
        row.innerHTML = `
            <img src="${item.product.image}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-price">R$ ${item.product.price.toFixed(2)}</div>
                <div class="cart-item-qty">Qtd: ${item.quantity}</div>
            </div>
            <button class="cart-item-remove-btn" data-id="${item.product._id}">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        cartItemsWrapper.appendChild(row);
    });

    cartTotal.textContent = `R$ ${total.toFixed(2)}`;
    cartBadge.textContent = totalQty.toString();

    // Setup remove click handlers
    cartItemsWrapper.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prodId = btn.getAttribute('data-id');
            removeFromCart(prodId);
        });
    });
}

async function addToCart(productId) {
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                productId,
                quantity: 1
            })
        });
        const res = await response.json();
        if (res.success) {
            showToast('Produto adicionado ao carrinho no Redis!', 'success');
            loadCart();
        } else {
            showToast(res.error, 'error');
        }
    } catch (err) {
        console.error('Error adding to cart:', err);
        showToast('Erro ao atualizar carrinho.', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                productId
            })
        });
        const res = await response.json();
        if (res.success) {
            showToast('Produto removido do carrinho.', 'info');
            loadCart();
        } else {
            showToast(res.error, 'error');
        }
    } catch (err) {
        console.error('Error removing from cart:', err);
        showToast('Erro ao remover item.', 'error');
    }
}

async function processCheckout() {
    try {
        btnCheckout.disabled = true;
        btnCheckout.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        
        const res = await response.json();
        
        btnCheckout.innerHTML = '<i class="fa-solid fa-credit-card"></i> Finalizar Compra';
        btnCheckout.disabled = false;
        
        if (response.ok) {
            closeCartPanel();
            showToast(`Compra finalizada! Você acumulou +${res.pointsEarned} Pulse Points!`, 'success');
            
            // Reload cart (will be empty)
            loadCart();
            
            // Switch to leaderboard tab to see updated points
            setTimeout(() => {
                const leaderboardTab = document.querySelector('.nav-tab[data-tab="leaderboard-tab"]');
                if (leaderboardTab) leaderboardTab.click();
            }, 1500);
        } else {
            showToast(res.error || 'Erro durante a compra.', 'error');
        }
    } catch (err) {
        console.error('Error checkout:', err);
        btnCheckout.innerHTML = '<i class="fa-solid fa-credit-card"></i> Finalizar Compra';
        btnCheckout.disabled = false;
        showToast('Erro ao concluir compra.', 'error');
    }
}

// 6. SOCIAL NETWORK & FEED (Neo4j Graph Network & MongoDB Feed)
async function loadActivities() {
    try {
        const response = await fetch('/api/activities');
        const activities = await response.json();
        const container = document.getElementById('activities-container');
        container.innerHTML = '';

        if (activities.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-4">Nenhuma atividade registrada no feed.</div>';
            return;
        }

        activities.forEach(act => {
            const card = document.createElement('div');
            card.className = `activity-card ${act.type || 'info'}`;
            
            const localTime = new Date(act.timestamp).toLocaleString();
            
            // Icon selection
            let icon = 'fa-info-circle';
            if (act.type === 'purchase') icon = 'fa-shopping-bag';
            if (act.type === 'recommendation') icon = 'fa-paper-plane';
            if (act.type === 'influence_reward') icon = 'fa-gift';

            card.innerHTML = `
                <div class="activity-meta">
                    <span class="activity-user"><i class="fa-solid ${icon}"></i> ${act.userName}</span>
                    <span class="activity-time">${localTime}</span>
                </div>
                <div class="activity-desc">${act.description}</div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error fetching activities feed:', err);
    }
}

async function loadSocialGraph() {
    const canvas = document.getElementById('social-graph-canvas');
    canvas.innerHTML = '<div class="text-center text-muted p-4"><i class="fa-solid fa-spinner fa-spin"></i> Renderizando Grafo Neo4j...</div>';

    try {
        const response = await fetch('/api/social');
        const graphData = await response.json();
        
        canvas.innerHTML = '';
        
        // Define Custom groups styling
        const options = {
            nodes: {
                font: {
                    color: '#f3f4f6',
                    face: 'Plus Jakarta Sans',
                    size: 12,
                    strokeWidth: 2,
                    strokeColor: '#090a10'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0, 0, 0, 0.4)',
                    size: 8,
                    x: 2,
                    y: 4
                }
            },
            edges: {
                font: {
                    color: '#9ca3af',
                    face: 'Plus Jakarta Sans',
                    size: 9,
                    strokeWidth: 1,
                    strokeColor: '#090a10'
                },
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'none',
                    roundness: 0.5
                }
            },
            groups: {
                users: {
                    shape: 'icon',
                    icon: {
                        face: '"Font Awesome 6 Free"',
                        weight: '900',
                        code: '\uf508', // astronaut
                        size: 38,
                        color: '#10b981'
                    }
                },
                products: {
                    shape: 'icon',
                    icon: {
                        face: '"Font Awesome 6 Free"',
                        weight: '900',
                        code: '\uf466', // box-open
                        size: 32,
                        color: '#06b6d4'
                    }
                }
            },
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -80,
                    centralGravity: 0.015,
                    springLength: 130,
                    springConstant: 0.06
                },
                maxVelocity: 50,
                solver: 'forceAtlas2Based',
                timestep: 0.35,
                stabilization: { 
                    enabled: true,
                    iterations: 150,
                    updateInterval: 25
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 100,
                navigationButtons: true, // Exibe botões de zoom e navegação no canvas
                keyboard: true
            }
        };

        // Initialize Vis.js network graph
        const data = {
            nodes: new vis.DataSet(graphData.nodes),
            edges: new vis.DataSet(graphData.edges)
        };

        setTimeout(() => {
            networkInstance = new vis.Network(canvas, data, options);
        }, 50);
    } catch (err) {
        console.error('Error drawing social graph:', err);
        canvas.innerHTML = '<div class="text-center text-muted p-4">Erro ao processar grafo do Neo4j.</div>';
    }
}

// 7. LEADERBOARD (Redis ZREVRANGE)
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const leaderboard = await response.json();
        
        const podiumContainer = document.getElementById('leaderboard-podium');
        const rowsContainer = document.getElementById('leaderboard-rows-container');
        
        if (!podiumContainer || !rowsContainer) return;
        
        podiumContainer.innerHTML = '';
        rowsContainer.innerHTML = '';

        if (leaderboard.length === 0) {
            podiumContainer.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem;">Aguardando pontuações no Redis...</div>';
            rowsContainer.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-dark);">Nenhum ponto registrado ainda.</td></tr>';
            return;
        }

        // 1. Render Podium (Rank 1, 2, 3)
        const top3 = leaderboard.slice(0, 3);
        
        // Visual Order: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
        let p2Html = `
            <div class="podium-card second" style="opacity: 0.4;">
                <div style="font-size: 0.8rem; color: var(--text-dark);">2º Lugar</div>
            </div>
        `;
        let p1Html = `
            <div class="podium-card first" style="opacity: 0.4;">
                <div style="font-size: 0.8rem; color: var(--text-dark);">1º Lugar</div>
            </div>
        `;
        let p3Html = `
            <div class="podium-card third" style="opacity: 0.4;">
                <div style="font-size: 0.8rem; color: var(--text-dark);">3º Lugar</div>
            </div>
        `;

        if (top3[0]) {
            const isSelf = top3[0].userId === currentUserId;
            p1Html = `
                <div class="podium-card first glass ${isSelf ? 'border-active' : ''}">
                    <div class="podium-avatar-wrapper">
                        <i class="fa-solid fa-crown podium-crown"></i>
                        <div class="podium-avatar"><i class="fa-solid fa-user-astronaut text-yellow" style="color: var(--yellow);"></i></div>
                        <span class="podium-rank-badge">1º</span>
                    </div>
                    <div class="podium-name">${top3[0].name} ${isSelf ? '<i class="fa-solid fa-user-astronaut text-cyan" style="font-size: 0.75rem;"></i>' : ''}</div>
                    <div class="podium-username">@${top3[0].userId}</div>
                    <div class="podium-points">${top3[0].score} <span style="font-size: 0.75rem; font-weight: 500;">pts</span></div>
                </div>
            `;
        }

        if (top3[1]) {
            const isSelf = top3[1].userId === currentUserId;
            p2Html = `
                <div class="podium-card second glass ${isSelf ? 'border-active' : ''}">
                    <div class="podium-avatar-wrapper">
                        <div class="podium-avatar"><i class="fa-solid fa-user-astronaut" style="color: #cbd5e1;"></i></div>
                        <span class="podium-rank-badge" style="background: #cbd5e1; color: #000;">2º</span>
                    </div>
                    <div class="podium-name">${top3[1].name} ${isSelf ? '<i class="fa-solid fa-user-astronaut text-cyan" style="font-size: 0.75rem;"></i>' : ''}</div>
                    <div class="podium-username">@${top3[1].userId}</div>
                    <div class="podium-points">${top3[1].score} <span style="font-size: 0.7rem; font-weight: 500;">pts</span></div>
                </div>
            `;
        }

        if (top3[2]) {
            const isSelf = top3[2].userId === currentUserId;
            p3Html = `
                <div class="podium-card third glass ${isSelf ? 'border-active' : ''}">
                    <div class="podium-avatar-wrapper">
                        <div class="podium-avatar"><i class="fa-solid fa-user-astronaut" style="color: var(--orange);"></i></div>
                        <span class="podium-rank-badge" style="background: var(--orange); color: white;">3º</span>
                    </div>
                    <div class="podium-name">${top3[2].name} ${isSelf ? '<i class="fa-solid fa-user-astronaut text-cyan" style="font-size: 0.75rem;"></i>' : ''}</div>
                    <div class="podium-username">@${top3[2].userId}</div>
                    <div class="podium-points">${top3[2].score} <span style="font-size: 0.7rem; font-weight: 500;">pts</span></div>
                </div>
            `;
        }

        podiumContainer.innerHTML = p2Html + p1Html + p3Html;

        // 2. Render Ranks 4+
        const remaining = leaderboard.slice(3);
        if (remaining.length === 0) {
            rowsContainer.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-dark); font-size: 0.8rem;">Apenas o Top 3 possui pontos registrados.</td></tr>';
            return;
        }

        remaining.forEach((row, index) => {
            const rank = index + 4;
            const tr = document.createElement('tr');
            tr.className = 'leaderboard-tr';
            
            const isSelf = row.userId === currentUserId;
            const nameClass = isSelf ? 'leaderboard-td active-user-row' : 'leaderboard-td';
            const selfIcon = isSelf ? '<i class="fa-solid fa-user-astronaut text-cyan" style="margin-left: 0.5rem;" title="Você"></i>' : '';

            tr.innerHTML = `
                <td style="text-align: center; font-weight: 700; color: var(--text-dark); padding: 1rem;"><div class="rank-badge">${rank}</div></td>
                <td class="${nameClass}" style="font-weight: 600; color: white;">${row.name} ${selfIcon}</td>
                <td class="leaderboard-td" style="color: var(--text-muted);">@${row.userId}</td>
                <td class="leaderboard-td" style="text-align: right; padding-right: 1.5rem; font-weight: 700; color: var(--cyan);">${row.score} pts</td>
            `;

            rowsContainer.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        showToast('Erro ao carregar classificação.', 'error');
    }
}

// 8. RECOMMENDATION MODAL ACTIONS (Neo4j relationships creation)
function setupRecommendationModal() {
    recommendModalClose.addEventListener('click', closeRecommendModal);
    btnCancelRecommend.addEventListener('click', closeRecommendModal);
    
    btnSendRecommend.addEventListener('click', async () => {
        const toId = recommendFriendSelect.value;
        if (!toId) {
            showToast('Por favor, selecione um amigo.', 'warning');
            return;
        }

        try {
            btnSendRecommend.disabled = true;
            btnSendRecommend.textContent = 'Enviando...';

            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: currentUserId,
                    toId,
                    productId: selectedProductIdForRecommend
                })
            });

            const res = await response.json();
            btnSendRecommend.disabled = false;
            btnSendRecommend.textContent = 'Enviar Recomendação';

            if (response.ok) {
                closeRecommendModal();
                showToast(`Recomendação enviada no Neo4j com sucesso!`, 'success');
            } else {
                showToast(res.error || 'Erro ao enviar recomendação.', 'error');
            }
        } catch (err) {
            console.error('Error recommending product:', err);
            btnSendRecommend.disabled = false;
            btnSendRecommend.textContent = 'Enviar Recomendação';
            showToast('Erro de conexão.', 'error');
        }
    });
}

function openRecommendModal(productId) {
    selectedProductIdForRecommend = productId;
    const product = productsList.find(p => p._id === productId);
    if (!product) return;

    // Set product details in modal
    recommendProductInfo.innerHTML = `
        <img src="${product.image}" onerror="this.src='https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400'">
        <div>
            <div class="product-info-mini-name">${product.name}</div>
            <div class="text-muted" style="font-size:0.8rem;">R$ ${product.price.toFixed(2)}</div>
        </div>
    `;

    // Populate friends dropdown (exclude current active user)
    recommendFriendSelect.innerHTML = '';
    usersList.forEach(u => {
        if (u.id !== currentUserId) {
            const option = document.createElement('option');
            option.value = u.id;
            option.textContent = u.name;
            recommendFriendSelect.appendChild(option);
        }
    });

    recommendModal.classList.add('active');
}

function closeRecommendModal() {
    recommendModal.classList.remove('active');
    selectedProductIdForRecommend = null;
}

// 9. CREATE GRAPH FRIENDSHIPS MODAL (Neo4j network extensions)
function setupFriendModal() {
    btnAddFriendModal.addEventListener('click', () => {
        // Populate user dropdowns
        friendUser1.innerHTML = '';
        friendUser2.innerHTML = '';

        usersList.forEach(u => {
            const opt1 = document.createElement('option');
            opt1.value = u.id;
            opt1.textContent = u.name;
            friendUser1.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = u.id;
            opt2.textContent = u.name;
            friendUser2.appendChild(opt2);
        });

        // Preselect current user for dropdown 1 and another for dropdown 2
        friendUser1.value = currentUserId;
        const otherUser = usersList.find(u => u.id !== currentUserId);
        if (otherUser) friendUser2.value = otherUser.id;

        friendModal.classList.add('active');
    });

    friendModalClose.addEventListener('click', closeFriendModal);
    btnCancelFriend.addEventListener('click', closeFriendModal);

    btnConnectFriends.addEventListener('click', async () => {
        const u1 = friendUser1.value;
        const u2 = friendUser2.value;

        if (u1 === u2) {
            showToast('Selecione dois usuários diferentes.', 'warning');
            return;
        }

        try {
            btnConnectFriends.disabled = true;
            btnConnectFriends.textContent = 'Criando Relação...';

            const response = await fetch('/api/social/friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId1: u1,
                    userId2: u2
                })
            });

            const res = await response.json();
            btnConnectFriends.disabled = false;
            btnConnectFriends.textContent = 'Criar Amizade (Neo4j)';

            if (response.ok) {
                closeFriendModal();
                showToast('Amizade criada no Grafo Neo4j!', 'success');
                // Reload graph
                loadSocialGraph();
            } else {
                showToast(res.error || 'Erro ao conectar usuários.', 'error');
            }
        } catch (err) {
            console.error('Error connecting friends:', err);
            btnConnectFriends.disabled = false;
            btnConnectFriends.textContent = 'Criar Amizade (Neo4j)';
            showToast('Erro de conexão.', 'error');
        }
    });
}

function closeFriendModal() {
    friendModal.classList.remove('active');
}

// 10. TOAST SYSTEM
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'error') icon = 'fa-circle-xmark';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// 11. ADMIN SANDBOX FORM HANDLERS
function setupAdminHandlers() {
    if (adminProductForm) {
        adminProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = document.getElementById('prod-id').value.trim();
            const name = document.getElementById('prod-name').value.trim();
            const price = document.getElementById('prod-price').value;
            const category = document.getElementById('prod-category').value.trim();
            const image = document.getElementById('prod-image').value.trim();
            const specsRaw = document.getElementById('prod-specs').value.trim();

            let specs = {};
            try {
                specs = JSON.parse(specsRaw);
            } catch (err) {
                showToast('Especificações inválidas. Certifique-se de que é um JSON válido.', 'warning');
                return;
            }

            try {
                const submitBtn = adminProductForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...';

                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, name, price, category, image, specs })
                });

                const res = await response.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar no Catálogo NoSQL';

                if (response.ok) {
                    showToast(`Produto "${name}" cadastrado no MongoDB e Neo4j!`, 'success');
                    adminProductForm.reset();
                    loadProducts(); // Reload catalog
                } else {
                    showToast(res.error || 'Erro ao cadastrar produto.', 'error');
                }
            } catch (err) {
                console.error('Error submitting product form:', err);
                showToast('Erro de conexão.', 'error');
            }
        });
    }

    if (adminUserForm) {
        adminUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('user-id').value.trim().toLowerCase();
            const name = document.getElementById('user-name').value.trim();

            // Basic validation for username
            if (!/^[a-zA-Z0-9_]+$/.test(id)) {
                showToast('O ID do usuário deve conter apenas letras, números e underline.', 'warning');
                return;
            }

            try {
                const submitBtn = adminUserForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';

                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, name })
                });

                const res = await response.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Registrar Usuário NoSQL';

                if (response.ok) {
                    showToast(`Usuário "${name}" cadastrado no Neo4j e Redis!`, 'success');
                    adminUserForm.reset();
                    loadUsers(); // Reload user lists (will update dropdowns)
                } else {
                    showToast(res.error || 'Erro ao cadastrar usuário.', 'error');
                }
            } catch (err) {
                console.error('Error submitting user form:', err);
                showToast('Erro de conexão.', 'error');
            }
        });
    }
}

// 12. LIVE DATA SIMULATOR (Poliglota NoSQL Activity Generator)
function setupSimulator() {
    const btnToggleSim = document.getElementById('btn-toggle-sim');
    const simStatus = document.getElementById('sim-status');
    const simIndicator = document.getElementById('sim-indicator');
    const simLastAction = document.getElementById('sim-last-action');

    if (!btnToggleSim) return;

    btnToggleSim.addEventListener('click', () => {
        if (simIntervalId) {
            // Stop simulator
            clearInterval(simIntervalId);
            simIntervalId = null;
            btnToggleSim.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar Simulação Automática';
            btnToggleSim.style.background = 'linear-gradient(135deg, var(--cyan), var(--primary))';
            simStatus.textContent = 'INATIVO';
            simStatus.style.color = 'var(--text-dark)';
            simIndicator.style.backgroundColor = 'var(--text-dark)';
            simIndicator.style.boxShadow = 'none';
            showToast('Simulação automática de tráfego parada.', 'info');
        } else {
            // Start simulator
            simStatus.textContent = 'SIMULANDO...';
            simStatus.style.color = 'var(--cyan)';
            simIndicator.style.backgroundColor = 'var(--cyan)';
            simIndicator.style.boxShadow = '0 0 10px var(--cyan)';
            btnToggleSim.innerHTML = '<i class="fa-solid fa-pause"></i> Parar Simulação Automática';
            btnToggleSim.style.background = 'linear-gradient(135deg, var(--red), var(--orange))';
            
            showToast('Simulação automática de tráfego iniciada!', 'success');
            
            // Run immediately
            runSimulationStep(simLastAction);
            
            // Set interval every 5 seconds
            simIntervalId = setInterval(() => {
                runSimulationStep(simLastAction);
            }, 5000);
        }
    });
}

async function runSimulationStep(lastActionEl) {
    if (usersList.length === 0 || productsList.length === 0) {
        lastActionEl.textContent = 'Aguardando carregamento de usuários e produtos...';
        return;
    }

    // Pick a random action (0: friendship, 1: recommendation, 2: purchase)
    const actionType = Math.floor(Math.random() * 3);
    
    // Choose random users and products
    const u1 = usersList[Math.floor(Math.random() * usersList.length)];
    let u2 = usersList[Math.floor(Math.random() * usersList.length)];
    while (u2.id === u1.id && usersList.length > 1) {
        u2 = usersList[Math.floor(Math.random() * usersList.length)];
    }
    const product = productsList[Math.floor(Math.random() * productsList.length)];

    try {
        if (actionType === 0) {
            // Simulate Friendship (Neo4j)
            lastActionEl.innerHTML = `<i class="fa-solid fa-sync fa-spin"></i> Conectando amizade entre ${u1.name} e ${u2.name}...`;
            const response = await fetch('/api/social/friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId1: u1.id, userId2: u2.id })
            });
            if (response.ok) {
                const msg = `Amizade simulada entre ${u1.name} e ${u2.name} no Neo4j!`;
                lastActionEl.innerHTML = `<span style="color: var(--green);"><i class="fa-solid fa-check"></i> ${msg}</span>`;
                showToast(msg, 'success');
                refreshActiveTabViews();
            }
        } else if (actionType === 1) {
            // Simulate Recommendation (Neo4j + MongoDB log)
            lastActionEl.innerHTML = `<i class="fa-solid fa-sync fa-spin"></i> Enviando recomendação de ${u1.name} para ${u2.name}...`;
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromId: u1.id, toId: u2.id, productId: product._id })
            });
            if (response.ok) {
                const msg = `${u1.name} recomendou "${product.name}" para ${u2.name}!`;
                lastActionEl.innerHTML = `<span style="color: var(--yellow);"><i class="fa-solid fa-check"></i> ${msg}</span>`;
                showToast(msg, 'success');
                refreshActiveTabViews();
            }
        } else {
            // Simulate Purchase (Add to Redis, Checkout)
            lastActionEl.innerHTML = `<i class="fa-solid fa-sync fa-spin"></i> ${u1.name} comprando ${product.name}...`;
            
            // Add to Redis cart
            const cartRes = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: u1.id, productId: product._id, quantity: 1 })
            });
            
            if (cartRes.ok) {
                // Checkout (Redis -> Neo4j -> Redis -> MongoDB)
                const checkoutRes = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: u1.id })
                });
                
                if (checkoutRes.ok) {
                    const data = await checkoutRes.json();
                    const msg = `${u1.name} comprou "${product.name}" (+${data.pointsEarned} Pulse Points)!`;
                    lastActionEl.innerHTML = `<span style="color: var(--cyan);"><i class="fa-solid fa-check"></i> ${msg}</span>`;
                    showToast(msg, 'success');
                    
                    if (u1.id === currentUserId) {
                        loadCart(); // Update UI cart if it's the active browser user
                    }
                    refreshActiveTabViews();
                }
            }
        }
    } catch (err) {
        console.error('Error running simulation step:', err);
        lastActionEl.textContent = 'Erro ao executar passo de simulação.';
    }
}

function refreshActiveTabViews() {
    const activeTabButton = document.querySelector('.nav-tab.active');
    if (!activeTabButton) return;
    const activeTab = activeTabButton.getAttribute('data-tab');
    if (activeTab === 'social-tab') {
        loadSocialGraph();
        loadActivities();
    } else if (activeTab === 'leaderboard-tab') {
        loadLeaderboard();
    }
}
