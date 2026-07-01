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
    createContextMenuEvent: function() {
        return {
            button: 2,
            which: 3,
            type: 'contextmenu',
            stopPropagation: function() {},
            preventDefault: function() {}
        };
    },
    getNpcEntry: function(targetId) {
        const normalizedTargetId = this.normalizeRuntimeId(targetId);
        if (normalizedTargetId === null || typeof Engine === 'undefined' || !Engine.npcs) return null;
        let npcs = Engine.npcs.d || {};
        if ((!npcs || !npcs[normalizedTargetId]) && typeof Engine.npcs.check === 'function') {
            npcs = Engine.npcs.check() || {};
        }
        const direct = npcs[normalizedTargetId] || npcs[String(normalizedTargetId)];
        if (direct) return { id: normalizedTargetId, npc: direct, data: direct.d || direct };
        for (const key in npcs) {
            const npc = npcs[key];
            const data = npc?.d || npc || {};
            if (String(data.id ?? key) === String(normalizedTargetId)) {
                return { id: normalizedTargetId, npc, data };
            }
        }
        return null;
    },
    isAdjacentNpc: function(npcData) {
        if (typeof Engine === 'undefined' || !Engine.hero || !Engine.hero.d || !npcData) return false;
        const hx = Number(Engine.hero.d.x);
        const hy = Number(Engine.hero.d.y);
        const nx = Number(npcData.x);
        const ny = Number(npcData.y);
        return Number.isFinite(hx) && Number.isFinite(hy) && Number.isFinite(nx) && Number.isFinite(ny)
            && Math.abs(hx - nx) <= 1
            && Math.abs(hy - ny) <= 1;
    },
    isQuickFightCandidate: function(npcData) {
        return !!npcData && [1, 2, 3].includes(Number(npcData.type));
    },
    quickFightNpc: function(targetId) {
        const entry = this.getNpcEntry(targetId);
        if (!entry || !this.isAdjacentNpc(entry.data) || !this.isQuickFightCandidate(entry.data)) return false;

        if (typeof entry.npc.oncontextmenu === 'function') {
            entry.npc.oncontextmenu(this.createContextMenuEvent());
            return true;
        }
        if (Engine.interactions && typeof Engine.interactions.quickFight === 'function') {
            Engine.interactions.quickFight(entry.id);
            return true;
        }
        return false;
    },
    enableGargonemBerserk: function() {
        console.log("%c[QUICK ATTACK] Server berserk disabled; using PPM/quickFight.", "color: #00acc1; font-weight: bold;");
        return false;
    },
    disableGargonemBerserk: function() {
        return false;
    },
    brutalAttack: function(targetId) {
        const normalizedTargetId = this.normalizeRuntimeId(targetId);
        if (normalizedTargetId === null) return false;
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
            if (Date.now() - window.__heroCombatLastAttackAt > 850 && this.quickFightNpc(normalizedTargetId)) {
                window.__heroCombatLastAttackAt = Date.now();
                clearInterval(window.brutalAttackInterval);
            }
            const confirmBtn = document.querySelector(".green.button, .podejdz-btn, .zaatakuj-btn");
            if (confirmBtn) confirmBtn.click();
        }, 450);
        return true;
    }
};
