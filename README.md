# Magazyn
Repozytorium aplikacji klubowego magazynu. Składa się z 2 projektów go:
1. bystrze, w /src - klubowa aplikacja
2. boxTest, w /boxTest - aplikacja testująca

Zapraszam do dyskusji w [Issues](https://github.com/AKTK-Bystrze/Magazyn/issues)


- [Magazyn](#magazyn)
- [Jak uruchomić](#jak-uruchomić)
  - [Zmienne środowiskowe](#zmienne-środowiskowe)
    - [Konfiguracja](#konfiguracja)
      - [Windows VS Code (GO)](#windows-vs-code-go)
  - [Passwordless authentication](#passwordless-authentication)
    - [Konfiguracja](#konfiguracja-1)
  - [Baza danych](#baza-danych)
  - [Run](#run)
- [Budowa](#budowa)
  - [Apps](#apps)
  - [API](#api)
- [Release](#release)
- [Testy](#testy)
  - [Unit testy](#unit-testy)
  - [BoxTest](#boxtest)
    - [Budowa](#budowa-1)
    - [Run](#run-1)
    - [Uwagi](#uwagi)

# Jak uruchomić
## Zmienne środowiskowe

Zmienne środowiskowe pobierane przez aplikację:
- COOKIE_KEY - klucz ciasteczka. W przypadku braku generowana jest losowa wartość.
- MAGAZYN_BYSTRZE_EMAIL_ADDR - adres konta email wykorzystywanego do wysyłania emaili przez aplikację.
- MAGAZYM_BYSTRZE_EMAIL_PASS - hasło do wyżej wspomnianego konta.
- SMTP_HOST np: smtp.gmail.com
- SMTP_PORT np: 587
- DEBUG - tryb debugowania true lub false
### Konfiguracja

* Ustaw zmienną środowiskową
``` bash
set cgo_enabled=1
```
#### Windows VS Code (GO)
* [tutorial](https://learn.microsoft.com/en-us/azure/developer/go/configure-visual-studio-code) konfiguracji GO na VS Code

* launch.json

```json
{
    "version": "0.2.0",
    "configurations": [        
        {
            "program": "../${workspaceRoot}",
            "name": "Launch file",
            "type": "go",
            "showLog": true,
            "env": {
                "GO111MODULE": "on",
            },
            "args": ["127.0.0.1", "8080", "http://localhost:8080", "../../magazyn.db"]
        }
    ]
}
```

* GCC 
  tutorial : https://code.visualstudio.com/docs/cpp/config-mingw

## Passwordless authentication

Autentykacja jest realizowana za pomocą pakietu https://github.com/johnsto/go-passwordless. Token autentykacyjny jest przesyłany
za pomocą emaila zdefiniowanego w **MAGAZYN_BYSTRZE_EMAIL_ADDR**.

 Parametr **SEND_COOKIE_TO_STDOUT** po ustawieniu na:
- **true** 

pozwala na authentykację z pominięciem email. Link authentykacyjny jest podawany w terminalu. Na stronie należy podać "u_username" występujący w bazie

- **false**

pozwala na authentykację poprzez email. Na stronie należy podać adres email występujący w bazie.

### Konfiguracja 

Należy ustawić zmienne środowiskowe dla **MAGAZYN_BYSTRZE_EMAIL_ADDR**, **SMTP_HOST**, **SMTP_PORT**. Ponadto w przypadku **gmail** należy ustawić "hasło dla aplikacji" zgodnie z tą instrukcją https://support.google.com/accounts/answer/185833?hl=pl i w ustawieniach skrzynki pocztowej włączyć Dostęp IMAP w ustawienia/przekazywanie i POP/IMAP

## Baza danych

* Stwórz bazę 
```cmd
sqlite3 magazyn_prod.db < db.schema
sqlite3 magazyn_prod.db ".read boxTest/db_test.data" 
```

## Run
```cmd
go install
go build
bystrze_sprzet.exe 127.0.0.1 8080 http://localhost:8080
```

# Budowa
Dwie główne lokalizacje:
- main - server, baza danych, templates
- apps - aplikacje serwisu Bystrze
   
Bystrze (/apps) składa się z czterech głównych aplikacji :
- userManager - autentykacja, autoryzacja, users CRUD
- pages - strony dostępne publicznie
- warehouse - magazyn; wypożyczenia, inwentarz
- common - modele i serwisy współdzielone przez pozostałe aplikacje

## Apps
Są to odrębne serwisy pełniące konretną rolę np. warehouse odpowiada za magazyn. Funkcje aplikacji:
- podział logiki na podrzędne serwisy zbudowane wokół pojedynczych modeli common/models
- zdefiniowanie i obsługa API (router)

Każda aplikacja powstaje w oparciu o struct App w apps.go. Budowa aplikacji:
- konstruktor - np warehouse.go definiuje sposób stworzenia aplikacji, API
- appState - zmienne dostępne dla serwisów wewnątrz aplikacji. Jest to conajmniej struct App.
- serwisy - np. w warehouse: inventory, items, rental odpowiedzialne za operacje CRUD swoich modeli.
- controllers - kontrollery/handlery obsługujące API.

## API
Zdefiniowane w konstruktorze każdej z aplikacji. Budowa według schematu:
```bash
\applikacja\uprawnienia\serwis\operacja\...
```
np:
```bash
\warehouse\admin\reservation\show
```

# Release

Wersja produkcyjna jest oznaczona poprzez git tag w historii commitów:
```cmd
git tag -a <tag-name> -m "<message>"
git tag -a v.1.0.0 -m "First release"
```
Sprawdź poprzednie tagi
```cmd
git tag -n
```
Obraz budownay z flagą `"--target production"` i `DEBUG=false`
```cmd
docker build --target production -t magazyn_bystrze . --build-arg EMAIL=EMAIL --build-arg EMAIL_PASS="PASS" DB_PATH=./magazyn_prod.db DEBUG=false
```
# Testy

## Unit testy
Konwencja nazewnictwa : Test_metodaTestowana_testowanyStan_oczekiwanyRezultat

Przykład Test_isAdult_ageLessThan18_false

## BoxTest
### Budowa
- env - operacje na środowisku testowym. Budowa bazy testowej, aplikacji itd.
- handlers - podzielone na /app i /db. Metody do wykonywania operacji takich jak rezerwacja, zmiana statusu rezerwacji itp a w przypadku /db wykonywania operacji na bazie
- tests - podzielone na testy dotyczące konkretnej aplikacji (apps)
- testUtils - współdzielone metody wykorzystywane w testach
### Run
Box testy. Obraz do testów jest z flagą `"--target test"` i ` DEBUG=true`
```cmd
docker build --target test -t $TEST_APP_NAME --build-arg EMAIL=test_app@bystrzeMail.com --build-arg EMAIL_PASS=password --build-arg DB_PATH="./boxTest/test_db" -f $DOCKERFILE_PATH .  DEBUG=true
```
Stworzenie nowego środowiska testowego
```cmd
go run main.go --setUp
```
Uruchomienie wszystkich testów z listy. 
```cmd
go run main.go --tests 
```
Wyczyszczenie cache. Testy które przeszły nie zostaną wykonane ponownie.
cmd```
go clean -testcache
### Uwagi
```
Testy applikacji warehouse wymagają wydłużenia domyślnego timeout do 1min
```cmd
go.exe test -timeout 60s -run ^Test_reservationMadeAndStartedSameTime$ boxTest/tests/warehouse
```
BoxTesty nie są stabilne, zdarza się, że:
- podczas logowania brak loginlink co powoduje GET request na "". Prawdopodobnie zbyt krótki zakres sprawdzanych logów
- podczas testów rezerwacji, changeshistory (zmiana statusu wypożyczenia np approve->rented->returned) zmienia swoją kolejność 