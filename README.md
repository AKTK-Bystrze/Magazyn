# Magazyn
Repozytorium na serwis webowy do rezerwowania sprzętu AKTK Bystrze oraz stron publicznych.

Zapraszam do dyskusji w [Issues](https://github.com/AKTK-Bystrze/Magazyn/issues)


- [Magazyn](#magazyn)
- [Jak uruchomić](#jak-uruchomić)
  - [Zmienne środowiskowe](#zmienne-środowiskowe)
    - [Konfiguracja](#konfiguracja)
      - [Windows VS Code (GO)](#windows-vs-code-go)
  - [Passwordless authentication](#passwordless-authentication)
    - [Konfiguracja](#konfiguracja-1)
  - [Baza danych](#baza-danych)
  - [deploy](#deploy)
- [Architektura](#architektura)
  - [Apps](#apps)
  - [API](#api)
- [Release](#release)
- [Testy](#testy)
  - [Unit testy](#unit-testy)
  - [E2E testy](#e2e-testy)

# Jak uruchomić
## Zmienne środowiskowe

Zmienne środowiskowe pobierane przez aplikację:
- COOKIE_KEY - klucz ciasteczka. W przypadku braku generowana jest losowa wartość.
- MAGAZYN_BYSTRZE_EMAIL_ADDR - adres konta email wykorzystywanego do wysyłania emaili przez aplikację.
- MAGAZYM_BYSTRZE_EMAIL_PASS - hasło do wyżej wspomnianego konta.
- SMTP_HOST np: smtp.gmail.com
- SMTP_PORT np: 587

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
sqlite3 magazyn.db < db.schema
```
* Zapełnij bazę
```powershell
sqlite3 magazyn.db ".read db_test.data"
```

## deploy
```cmd
go install
go build
bystrze_sprzet.exe 127.0.0.1 8080 http://localhost:8080
```

# Architektura
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
Obraz budownay z flagą `"--target production"`
# Testy

## Unit testy
Konwencja nazewnictwa : Test_metodaTestowana_testowanyStan_oczekiwanyRezultat

Przykład Test_isAdult_ageLessThan18_false

## E2E testy
Obraz wykorzysytwany do testów jest z flagą `"--target test"`

Stworzenie nowego środowiska testowego
```cmd
go run main.go --setUp
```

Testy applikacji warehouse wymagają wydłużenia domyślnego timeout do 1min
```cmd
go.exe test -timeout 60s -run ^Test_reservationMadeAndStartedSameTime$ boxTest/tests/warehouse
```
Uruchomienie wszystkich testów
```cmd
go run main.go --tests 
```
Wyczyszczenie cache. Testy które przeszły nie zostaną wykonane ponownie.
cmd```
go clean -testcache
```