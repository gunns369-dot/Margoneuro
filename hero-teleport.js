// hero-teleport.js
console.log("%c[HERO] Załadowano WZMOCNIONY moduł teleportacji (Pakiety Serwerowe)!", "color: #00acc1; font-weight: bold;");

window.HeroTeleportModule = {
    processDialog: function(targetMap, stopCallback, continueCallback, retryCallback) {
        const normalize = (value) => String(value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        const getAnswerNodes = () => Array.from(document.querySelectorAll(
            'li.dialogue-window-answer.answer.line_option, .dialog-texts li, .dialog-options li, .answer, [data-option]'
        )).filter((el) => normalize(el.textContent).length > 0);

        const clickLikeUser = (el) => {
            if (!el) return false;
            ['mouseover', 'mouseenter', 'mousedown', 'mouseup', 'click'].forEach((type) => {
                el.dispatchEvent(new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            });
            return true;
        };
        
        let dialogBox = document.querySelector('.dialog-texts') || document.querySelector('.dialog-content');
        let isDialogOpen = dialogBox && dialogBox.offsetParent !== null;

        // ETAP 1: Otwieranie dialogu (Bezpośrednie uderzenie do serwera gry)
        if (!isDialogOpen) {
            console.log("%c[HERO] Szukam Zakonnika w pobliżu...", "color: yellow;");
            
            let npcs = (typeof Engine !== 'undefined' && Engine.npcs) ? (typeof Engine.npcs.check === 'function' ? Engine.npcs.check() : Engine.npcs.d) : {};
            let zakonnikId = null;
            
            // Solidne szukanie (usuwamy kolorowe tagi HTML z nicku i szukamy tylko słowa "zakonnik")
            for (let id in npcs) {
                let n = npcs[id].d || npcs[id];
                if (n && n.nick) {
                    let cleanNick = n.nick.replace(/<[^>]*>?/gm, '').toLowerCase();
                    if (cleanNick.includes("zakonnik")) {
                        zakonnikId = parseInt(id, 10);
                        break;
                    }
                }
            }

            if (zakonnikId) {
                console.log(`%c[HERO] Znalazłem Zakonnika (ID: ${zakonnikId}). Wymuszam pakiet rozmowy z serwerem!`, "color: #4caf50; font-weight: bold;");
                
                // Bezpośrednia komenda serwerowa (najskuteczniejsza opcja - ta sama co w auto-ataku)
                if (typeof window._g === 'function') {
                    window._g(`talk&id=${zakonnikId}`);
                } else if (typeof Engine.npcs.interact === 'function') {
                    Engine.npcs.interact(zakonnikId);
                }
            } else {
                console.log("%c[HERO] BŁĄD: Nie widzę Zakonnika na tej mapie!", "color: red; font-weight: bold;");
            }

            retryCallback();
            return;
        }

        // ETAP 2: Wybieranie opcji
        let options = getAnswerNodes();
        
        if (options.length > 0) {
            
            // A. Szukamy słowa "teleport", bo frazy mogą się różnić (Chciałabym / Chciałbym się teleportować)
            let startOpt = options.find((el) => {
                const txt = normalize(el.textContent);
                return txt.includes('teleport') || txt.includes('przenies');
            });
            if (startOpt) {
                console.log(`%c[HERO] Klikam: ${startOpt.textContent.trim()}`, "color: #00acc1;");
                clickLikeUser(startOpt);
                retryCallback();
                return;
            }

            // B. Wybór miasta
            const targetNeedle = normalize(targetMap);
            let destOpt = options.find((el) => normalize(el.textContent).includes(targetNeedle));
            if (destOpt) {
                
                // Zabezpieczenie przed brakiem zezwolenia
                if (normalize(destOpt.textContent).includes("brak zezwolenia")) {
                    console.log(`%c[HERO] Zablokowane! Brak zezwolenia do: ${targetMap}!`, "color: red; font-weight: bold;");
                    let closeOpt = options.find((el) => {
                        const txt = normalize(el.textContent);
                        return txt.includes('nigdzie') || txt.includes('zakoncz');
                    });
                    if (closeOpt) clickLikeUser(closeOpt);
                    stopCallback(); 
                    return;
                }

                console.log(`%c[HERO] 🚀 Cel: ${targetMap} -> Przenoszę!`, "color: #4caf50; font-weight: bold;");
                clickLikeUser(destOpt);
                continueCallback(); 
                return;
            } else {
                // Gdyby miasto było na drugiej stronie u zakonnika
                let moreOpt = options.find((el) => {
                    const txt = normalize(el.textContent);
                    return txt.includes('inne') || txt.includes('dalej') || txt.includes('pokaz wiecej');
                });
                if(moreOpt) {
                    console.log(`%c[HERO] Szukam miasta na kolejnej stronie...`, "color: #00acc1;");
                    clickLikeUser(moreOpt);
                    retryCallback();
                    return;
                }
            }
        }
        
        retryCallback(); 
    }
};
