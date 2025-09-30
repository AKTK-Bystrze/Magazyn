#!/bin/bash

# Używamy set -e na początku, ale kluczowe kroki otoczymy blokami warunkowymi,
# by móc kontrolować wycofywanie zmian.
set -e

# --- Zmienne Globalne dla Rollbacku ---
# Upewnij się, że te zmienne są zdefiniowane i używane w compose.yml
# np. image: bystrze-magazyn-db:${IMAGE_TAG}
LAST_TAG=""
NEW_TAG=""
BACKUP_FILE=""

# Ustawienia Połączenia DB (Używane przez pg_dump na HOŚCIE)
PG_USER="postgres"
PG_PASSWORD="postgres"
PG_HOST="localhost" # Używa portu 54320 mapowanego na 127.0.0.1 na hoście
PG_PORT="54320" 
PG_DB="magazyn"

# --- Funkcje Obsługi Błędów i Rollbacku ---

# 1. Funkcja przywracająca schemat DB z backupu
rollback_db_schema() {
    echo "🚨 Schemat bazy danych nieudany! Rozpoczynam przywracanie z backupu..."
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "❌ Błąd: Nie zdefiniowano pliku backupu. Nie można przywrócić."
        return 1
    fi
    
    # Najpierw zatrzymujemy i usuwamy nieudany kontener DB (serwis 'db')
    docker compose stop db
    docker compose rm -f db
    
    # Uruchamiamy tymczasowy kontener, który użyje starego obrazu i istniejącego woluminu
    echo "🔄 Ponowne uruchamianie kontenera DB (serwis 'db') z LAST_TAG: $LAST_TAG"
    # Używamy LAST_TAG do zapewnienia stabilnej bazy
    IMAGE_TAG=$LAST_TAG docker compose up -d --no-build db
    
    # Oczekiwanie na uruchomienie DB
    sleep 10 
    
    # Przywracanie danych
    echo "⏳ Przywracanie danych z pliku $BACKUP_FILE..."
    # Używamy PG_HOST/PG_PORT skonfigurowanych dla połączenia z hosta
    if pg_restore -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -c -C -d "$PG_DB" "$BACKUP_FILE"; then
        echo "✅ Przywracanie danych zakończone sukcesem!"
        exit 1 # Koniec działania skryptu, ponieważ migracja się nie powiodła
    else
        echo "❌ KRYTYCZNY BŁĄD: Przywracanie danych z backupu ($BACKUP_FILE) nie powiodło się!"
        exit 1 # Krytyczny błąd, który powinien zostać natychmiast zgłoszony
    fi
}

# 2. Funkcja przywracająca kontenery do stanu LAST_TAG
rollback_containers() {
    echo "🚨 Wdrożenie kontenerów nieudane! Cofanie do poprzedniej wersji: $LAST_TAG..."
    
    if [[ -z "$LAST_TAG" ]]; then
        echo "❌ Błąd: Brak zdefiniowanego LAST_TAG. Nie można cofnąć."
        return 1
    fi

    echo "🔄 Uruchamianie kontenerów z LAST_TAG: $LAST_TAG..."
    # Używamy poprzedniego taga i wymuszamy ponowne utworzenie kontenerów
    # Pamiętaj, że w compose.yml serwisy to 'db' i 'web'
    IMAGE_TAG=$LAST_TAG docker compose -f compose.yml up -d --force-recreate
    
    if [ $? -eq 0 ]; then
        echo "✅ Cofnięcie do wersji $LAST_TAG zakończone sukcesem."
    else
        echo "❌ KRYTYCZNY BŁĄD: Automatyczne cofnięcie nie powiodło się. Wymagana ręczna interwencja."
    fi
    
    exit 1 # Koniec działania skryptu po nieudanym wdrożeniu
}

# 3. Główna funkcja obsługi błędów
cleanup_on_failure() {
    # Ta funkcja jest wywoływana, gdy którekolwiek z poleceń zakończy się błędem,
    # jeśli nie został on obsłużony lokalnie (np. w bloku if/else).
    
    # Ponieważ kluczowe błędy (migracja, deployment) obsługujemy lokalnie
    # (z wywołaniem exit 1 w ich ciele), ta funkcja jest głównie dla nieprzewidzianych
    # błędów (np. błąd budowania obrazu).
    
    # Sprawdzamy kod wyjścia ostatniego polecenia
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo "💥 Wystąpił nieoczekiwany błąd. Szczegóły błędu: $EXIT_CODE."
    fi
}

# Ustawienie pułapki (trap), aby wywołać funkcję w przypadku błędu
trap cleanup_on_failure ERR

# ---------------------------------------------------------------------
# 1. Sprawdzenie gałęzi i ustalenie tagów
# ---------------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "⚠️  Jesteś na gałęzi '$CURRENT_BRANCH', a nie 'main'."
  read -p "Czy chcesz wdrożyć z tej gałęzi? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Wdrożenie anulowane."
    exit 1
  fi
fi

echo "📌 Wyszukiwanie ostatniego taga..."
LAST_TAG=$(git tag --sort=-v:refname | grep '^v' | head -n 1)
echo "🔍 Ostatni działający tag: ${LAST_TAG:-none}"

if [[ -z "$LAST_TAG" ]]; then
  NEW_TAG="v1.0.0"
else
  # Używamy prostszej logiki inkrementacji taga
  # Zakładamy, że LAST_TAG ma format vX.Y.Z
  IFS='.' read -r major minor patch <<< "${LAST_TAG#v}"
  patch=$((patch + 1))
  NEW_TAG="v$major.$minor.$patch"
fi

echo "🏷️ Nowy tag: $NEW_TAG"
# Ustawiamy zmienną środowiskową dla nowych obrazów
export IMAGE_TAG=$NEW_TAG

# ---------------------------------------------------------------------
# 2. Budowanie Obrazów
# ---------------------------------------------------------------------
echo "🔧 Budowanie obrazów z tagiem $NEW_TAG..."

docker build -f db-dockerfile -t bystrze-magazyn-db:$NEW_TAG .
docker build -f app-dockerfile -t bystrze-magazyn-app:$NEW_TAG .

echo "✅ Obrazy zbudowane: bystrze-magazyn-db:$NEW_TAG i bystrze-magazyn-app:$NEW_TAG"

# ---------------------------------------------------------------------
# 3. Backup PostgreSQL database (Kluczowy krok przed migracją)
# ---------------------------------------------------------------------
echo "💾 Tworzenie kopii zapasowej bazy danych PostgreSQL..."
# Upewnij się, że PATH zawiera pg_dump lub pg_dump jest dostępny.
# Ustawienia połączenia (PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DB są zdefiniowane na górze skryptu)

# Ustawienie ścieżki do backupu
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
# Zmienna globalna dla rollbacku
BACKUP_FILE="/tmp/magazyn_backup_$TIMESTAMP.sql" # Używamy ścieżki dostępnej na hoście

export PGPASSWORD=$PG_PASSWORD

# Upewnij się, że masz pg_dump zainstalowane na hoście
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Błąd: pg_dump nie znaleziono w PATH. Przerwanie skryptu."
    exit 1
fi

pg_dump -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -F c -b -v -f "$BACKUP_FILE" "$PG_DB"

echo "✅ Backup zapisany jako $BACKUP_FILE"

# ---------------------------------------------------------------------
# 4. Migracja schematu bazy danych (Punkt Rollbacku DB)
# ---------------------------------------------------------------------
echo "🔄 Migracja schematu bazy danych..."
# Upewnij się, że serwis 'migrate' jest skonfigurowany, by używać serwisu 'db' (jest!)
if ! docker compose run --rm migrate; then
  # Jeśli migracja się nie powiodła, wywołaj funkcję rollbacku schematu
  rollback_db_schema
fi

echo "✅ Migracja schematu zakończona sukcesem!"

# ---------------------------------------------------------------------
# 5. Deployment (Punkt Rollbacku Kontenerów)
# ---------------------------------------------------------------------
echo "🚀 Wdrażanie nowych kontenerów (serwisy: db i web) z tagiem $NEW_TAG..."

# Wdrażamy, używając IMAGE_TAG ($NEW_TAG) ustawionego jako zmienna środowiskowa
# Wymuszamy ponowne utworzenie, aby użyć nowego obrazu
if ! docker compose -f compose.yml up -d --force-recreate; then
    # Jeśli wdrożenie się nie powiedzie (np. nowy kontener DB nie startuje - Twój błąd)
    rollback_containers
fi

# Krótka weryfikacja (opcjonalnie, ale zalecana)
echo "⏳ Sprawdzanie stanu kontenerów..."
# Wyszukujemy serwisy 'db' i 'web'
if ! docker compose ps | grep -E 'db|web' | grep 'running'; then
    echo "❌ BŁĄD: Nowe kontenery (db lub web) nie są w stanie 'running' po wdrożeniu."
    rollback_containers
fi

echo "✅ Wdrożenie zakończone z wersją $NEW_TAG"

# ---------------------------------------------------------------------
# 6. Finalizacja — Tworzenie Taga Git (TYLKO jeśli wszystko się powiodło)
# ---------------------------------------------------------------------
echo "🏷️ Finalizacja i tworzenie taga Git..."
git tag "$NEW_TAG"
git push origin "$NEW_TAG"
echo "✅ Utworzono i wypchnięto tag $NEW_TAG"
