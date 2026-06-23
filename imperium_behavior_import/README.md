# Margoneuro Knowledge Import

Ten folder jest neutralnym pakietem danych z obserwacji zachowania:

- `brain.json` - trasy, requesty, interakcje NPC, ustawienia i timeline.
- `runtime/movement-executor.js` - prosty executor punktow trasy.

## Co da sie zaimportowac

1. Trasy `routes[].points` jako gotowe sciezki po kratkach.
2. Interakcje NPC `npcInteractions[]` jako sekwencje `talk&id=...` i `talk&id=...&c=...`.
3. Questy `questActions[]` jako sekwencje `quests&action=...`.
4. Walke `fightActions[]` jako sekwencje `fight&a=attack&...`.
5. Loot `lootActions[]` jako sekwencje `loot&want=...`.
6. Tracking questow `questTracking[]` jako cele TALK/KILL i pozycje.
7. Obserwowana kolejke questow `questObservedQueue[]`.
8. Requesty `requestTimeline[]` jako kolejke akcji kompatybilna z mechanika `_g(...)`.
9. Ustawienia z panelu `settingsObserved[]` jako domyslne flagi modulu.

## Czego jeszcze brakuje

W tym logu nie ma `quests-queue`, wiec Zakon Rownowagi nie zostal zlapany jako pelna kolejka.
Dograj druga sesje, klikajac w bocie:

- Zakolejkuj zakony pierwszego etapu
- Zakolejkuj wszystkie zakony
- uruchom bota i pozwol mu przyjac/oddac minimum jeden etap

Potem uruchom:

```powershell
node .\tools\imperium-extractor\analyze-ws-log.js --input "C:\Users\gunns\OneDrive\Desktop\imperium-ws-log.json" --out imperium-ws-analysis-zr
node .\tools\imperium-extractor\build-margoneuro-knowledge.js --analysis imperium-ws-analysis-zr --out margoneuro-knowledge-zr
```

## Minimalny model importu

W Margoneuro potrzebujesz adapterow:

- `getHeroPosition(): {x, y, mapId}`
- `sendKey(direction): Promise<void>`
- `sendRequest(request): Promise<void>`
- `onMapChanged(callback)`

Aktualny pakiet:

- Trasy: 383
- Interakcje NPC: 6
- Akcje questow: 4
- Akcje walki: 1
- Akcje loot: 1
- Quest tracking: 5
- Quest observed queue: 14
- Requesty: 90
