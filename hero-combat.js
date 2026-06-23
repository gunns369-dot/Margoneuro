window.HeroCombatModule = {
    normalizeRuntimeId: function(value) {
        const id = parseInt(value, 10);
        return Number.isFinite(id) && id !== 0 ? id : null;
    },
    buildFightAttackRequest: function(targetId, fastFight = 1) {
        const id = this.normalizeRuntimeId(targetId);
        if (id === null) return '';
        return `fight&a=attack&id=${id}&ff=${fastFight ? 1 : 0}`;
    },
    enableGargonemBerserk: function(minLvlOffset = -20, maxLvlOffset = 100) {
        if (typeof window._g !== 'function') return;
        console.log("%c[SERWER BERSERK] Konfiguruję natywnego berserka...", "color: #00acc1; font-weight: bold;");
        window._g(`settings&action=update&id=34&v=1`);
        window._g(`settings&action=update&id=34&key=elite&v=1`);
        window._g(`settings&action=update&id=34&key=elite2&v=1`);
        window._g(`settings&action=update&id=34&key=lvlmin&v=${minLvlOffset}`);
        window._g(`settings&action=update&id=34&key=lvlmax&v=${maxLvlOffset}`);
    },
    disableGargonemBerserk: function() {
        if (typeof window._g === 'function') window._g(`settings&action=update&id=34&v=0`);
    },
    brutalAttack: function(targetId) {
        const normalizedTargetId = this.normalizeRuntimeId(targetId);
        if (normalizedTargetId === null) return false;
        const attackRequest = this.buildFightAttackRequest(normalizedTargetId);
        if (window.brutalAttackInterval) clearInterval(window.brutalAttackInterval);
        window.__heroCombatLastAttackAt = window.__heroCombatLastAttackAt || 0;
        const startedAt = Date.now();
        window.brutalAttackInterval = setInterval(() => {
            if (typeof Engine === 'undefined' || !Engine.hero || !Engine.hero.d) return;
            if (Engine.battle && (Engine.battle.show || Engine.battle.d)) {
                clearInterval(window.brutalAttackInterval);
                return;
            }
            if (Date.now() - startedAt > 12000) {
                clearInterval(window.brutalAttackInterval);
                return;
            }
            if (Engine.npcs && typeof Engine.npcs.interact === 'function') Engine.npcs.interact(normalizedTargetId);
            if (typeof window._g === 'function' && Date.now() - window.__heroCombatLastAttackAt > 850) {
                window.__heroCombatLastAttackAt = Date.now();
                window._g(attackRequest);
            }
            let confirmBtn = document.querySelector(".green.button, .podejdz-btn, .zaatakuj-btn");
            if (confirmBtn) confirmBtn.click();
        }, 450);
        return true;
    }
};
