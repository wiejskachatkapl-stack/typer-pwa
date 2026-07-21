MODUŁY EVENTÓW TYPERA

Plik events/events.json wskazuje Event podłączony do przycisku EVENT.

Aby wyłączyć Event:
- ustaw "activeEvent": null w events/events.json

Aby podłączyć inny Event:
1. dodaj jego katalog do events/
2. dodaj wpis w tablicy "events"
3. ustaw jego identyfikator w polu "activeEvent"

Każdy moduł może mieć własne:
- event.js — logikę uruchamiania,
- event.css — wygląd,
- config.json — konfigurację i metadane.

Event MŚ 2026 korzysta obecnie z bezpiecznego mostu zgodności,
dzięki czemu zachowuje dotychczasową mechanikę i istniejące dane Firebase.
