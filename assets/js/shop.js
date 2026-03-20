import { CONFIG } from './config.js';

export class ShopSystem {
    constructor() {
        this.inventory = ['t_default', 'p_circle', 'cc_default']; 
        this.equipped = {
            theme: 't_default',
            particle: 'p_circle',
            avatar: null,
            callcard: 'default'
        };
        this.container = document.getElementById('shop-grid');
    }

    load(data) {
        if (data.inventory) this.inventory = data.inventory;
        if (data.equipped) this.equipped = data.equipped;
    }

    init() {
        this.container = document.getElementById('shop-grid');
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        // --- SUPPLY CRATE — primer elemento del scroll ---
        const crate = document.createElement('div');
        crate.className = 'supply-crate';
        crate.id = 'supply-crate-wrap';
        crate.innerHTML = `
            <div class="sc-left">
                <div class="sc-icon-wrap">
                    <i class="fa-solid fa-box-open sc-icon"></i>
                </div>
                <div class="sc-info">
                    <div class="sc-name">CAJA DE SUMINISTROS</div>
                    <div class="sc-desc">Drop aleatorio de créditos · 1–10,000 CR</div>
                    <div class="sc-odds">
                        <span class="sc-odd common">30% ×0.2</span>
                        <span class="sc-odd rare">40% ×1</span>
                        <span class="sc-odd epic">20% ×2</span>
                        <span class="sc-odd legendary">9% ×10</span>
                        <span class="sc-odd jackpot">1% JACKPOT</span>
                    </div>
                </div>
            </div>
            <button class="sc-btn" id="btn-buy-lootbox">
                <i class="fa-solid fa-lock-open"></i>
                <span>ABRIR</span>
                <span class="sc-cost">500 CR</span>
            </button>`;
        this.container.appendChild(crate);
        // Re-bind del botón lootbox (estaba en el HTML estático, ahora es dinámico)
        const lootBtn = crate.querySelector('#btn-buy-lootbox');
        if(lootBtn) lootBtn.onclick = () => window.app.buyLootBox();

        const categories = {
            'THEME':     { label: 'INTERFAZ VISUAL',       icon: 'fa-desktop'         },
            'CALLCARD':  { label: 'TARJETA DE RESULTADO',  icon: 'fa-id-badge'        },
            'LOOTBOX':   { label: 'CAJAS PREMIUM',         icon: 'fa-boxes-stacked'   },
            'PARTICLE':  { label: 'EFECTOS FX',            icon: 'fa-sparkles'        },
            'AVATAR':    { label: 'IDENTIDAD',              icon: 'fa-user-astronaut'  },
            'HARDWARE':  { label: 'MEJORAS DE SISTEMA',    icon: 'fa-microchip'       },
            'CONSUMABLE':{ label: 'CONSUMIBLES',           icon: 'fa-flask'           }
        };

        for (const [type, meta] of Object.entries(categories)) {
            const items = CONFIG.SHOP.filter(i => i.type === type);
            if (items.length === 0) continue;

            // Título de sección
            const header = document.createElement('div');
            header.className = 'vault-section-title';
            header.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${meta.label}`;
            this.container.appendChild(header);

            // Grid
            const grid = document.createElement('div');
            grid.className = `vault-category-grid layout-${type.toLowerCase()}`;

            items.forEach(item => {
                const isOwned    = this.inventory.includes(item.id) || item.price === 0;
                const isEquipped =
                    (type === 'THEME'    && this.equipped.theme    === item.id) ||
                    (type === 'PARTICLE' && this.equipped.particle === item.id) ||
                    (type === 'CALLCARD' && this.equipped.callcard === item.val) ||
                    (type === 'AVATAR'   && window.app.stats.avatar === item.val && isOwned);

                // Color de acento
                let ic = '#3b82f6';
                if      (type === 'THEME'    && item.val?.primary) ic = item.val.primary;
                else if (type === 'PARTICLE') {
                    const pMap = { star:'#fbbf24', code:'#22c55e', square:'#f472b6',
                                   bio:'#84cc16', money:'#22c55e', heart:'#ec4899',
                                   pizza:'#f97316', note:'#a855f7', bubble:'#38bdf8' };
                    const key = Object.keys(pMap).find(k => item.id.includes(k));
                    if(key) ic = pMap[key];
                }
                else if (type === 'CALLCARD') {
                    const ccMap = {
                        default:'#3b82f6', bsod:'#0078d7', matrix:'#00ff41',
                        fallout:'#95b800', vcity:'#ff6ec7', doom:'#ef4444',
                        minecraft:'#4aab2a', tron:'#00f5ff', discord:'#5865f2',
                        hacker:'#00ff88', retro:'#ff00ff', gold:'#ffd700'
                    };
                    ic = ccMap[item.val] || '#3b82f6';
                }
                else if (type === 'LOOTBOX') {
                    const lbRarityColors = { rare:'#3b82f6', epic:'#a855f7', legendary:'#fbbf24' };
                    ic = lbRarityColors[item.rarity] || '#3b82f6';
                }
                else if (type === 'AVATAR')    ic = item.price >= 5000 ? '#ef4444' : item.price >= 2500 ? '#a855f7' : '#3b82f6';
                else if (type === 'CONSUMABLE') ic = '#f59e0b';
                else if (type === 'HARDWARE')   ic = '#06b6d4';

                // Acción
                let actionHTML = '';
                if (isEquipped) {
                    actionHTML = `<div class="scv2-equipped-badge"><i class="fa-solid fa-check"></i> EQUIPADO</div>`;
                } else if (isOwned) {
                    if (type === 'CONSUMABLE' || type === 'LOOTBOX') {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                            <i class="fa-solid fa-plus"></i> COMPRAR MÁS ($${item.price})
                        </button>`;
                    } else {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.equip('${item.id}')">
                            <i class="fa-solid fa-check-double"></i> EQUIPAR
                        </button>`;
                    }
                } else {
                    if (type === 'THEME') {
                        actionHTML = `
                            <button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                                <i class="fa-solid fa-lock-open"></i> $${item.price.toLocaleString()}
                            </button>
                            <button class="scv2-preview-btn" onclick="window.app.shop.preview('${item.id}')">
                                <i class="fa-solid fa-eye"></i> PREVIEW 5s
                            </button>`;
                    } else if (type === 'LOOTBOX') {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buyAndOpen('${item.id}')">
                            <i class="fa-solid fa-box-open"></i> ABRIR $${item.price.toLocaleString()}
                        </button>`;
                    } else {
                        actionHTML = `<button class="scv2-btn" onclick="window.app.shop.buy('${item.id}')">
                            <i class="fa-solid fa-lock-open"></i> $${item.price.toLocaleString()}
                        </button>`;
                    }
                }

                const card = document.createElement('div');
                card.className = `shop-card-v2 ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;
                card.style.setProperty('--ic', ic);

                card.innerHTML = `
                    <div class="scv2-icon" style="color:${ic};">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="scv2-name">${item.name}</div>
                    <div class="scv2-desc">${item.desc}</div>
                    <div class="scv2-action">${actionHTML}</div>`;

                grid.appendChild(card);
            });

            this.container.appendChild(grid);
        }
    }

    buy(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if (!item) return;

        if (this.inventory.includes(itemId) && item.type !== 'CONSUMABLE') return;

        if (window.app.credits >= item.price) {
            window.app.credits -= item.price;
            
            if (!this.inventory.includes(itemId)) {
                this.inventory.push(itemId);
            }
            
            window.app.audio.playBuy();
            window.app.showToast("COMPRA EXITOSA", `Has adquirido: ${item.name}`, "success");
            
            if (item.type !== 'CONSUMABLE') {
                this.equip(itemId);
            } else {
                this.saveAndRefresh();
            }
        } else {
            window.app.audio.playLose();
            window.app.showToast("ERROR DE FONDOS", "Créditos insuficientes", "danger");
        }
    }

    // Previsualiza un tema durante 5 segundos sin comprarlo
    preview(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if (!item || item.type !== 'THEME') return;
        
        window.app.audio.playClick();
        
        // Guardar tema actual
        const previousTheme = this.equipped.theme;
        
        // Aplicar temporalmente
        window.app.applyTheme(itemId);
        window.app.showToast("PREVIEW", `${item.name} — revierte en 5s`, "default");
        
        // Limpiar timer previo si existe
        if (this._previewTimer) clearTimeout(this._previewTimer);
        
        this._previewTimer = setTimeout(() => {
            window.app.applyTheme(previousTheme);
            this._previewTimer = null;
        }, 5000);
    }

    buyAndOpen(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if(!item || item.type !== 'LOOTBOX') return;
        if(window.app.credits < item.price){
            window.app.audio.playLose();
            window.app.showToast("FONDOS INSUFICIENTES", `Necesitas ${item.price} CR`, "danger");
            return;
        }
        window.app.credits -= item.price;
        window.app.audio.playBuy();
        // Usar la tabla de drops de la caja premium
        const boxCfg = CONFIG.PREMIUM_BOXES[itemId];
        if(!boxCfg){ this.saveAndRefresh(); return; }
        // Llamar a buyLootBox con drops custom
        window.app.openPremiumBox(boxCfg);
        this.saveAndRefresh();
    }

    equip(itemId) {
        const item = CONFIG.SHOP.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'THEME') {
            this.equipped.theme = itemId;
            window.app.applyTheme(item.id);
        } 
        else if (item.type === 'PARTICLE') {
            this.equipped.particle = itemId;
        }
        else if (item.type === 'CALLCARD') {
            this.equipped.callcard = item.val;
            window.app.showToast('TARJETA EQUIPADA', item.name, 'success');
        }
        else if (item.type === 'AVATAR') {
            window.app.stats.avatar = item.val;
        }

        window.app.audio.playClick();
        this.saveAndRefresh();
    }

    saveAndRefresh() {
        window.app.save();
        window.app.updateUI();
        const shopCr = document.getElementById('shop-credits');
        if(shopCr) shopCr.innerText = window.app.credits.toLocaleString();
        this.render();
    }
}