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
- [Budowa](#budowa)
  - [Apps](#apps)
  - [API](#api)
- [Release](#release)
- [Testy](#testy)
  - [Unit testy](#unit-testy)
  - [BoxTest](#boxtest)
    - [Budowa](#budowa-1)
    - [Run](#run)
    - [Uwagi](#uwagi)

# Jak uruchomić
1. Za pomocą docker-compose
```bash
docker-compose up --build -d
```
2. Uruchomić bazę danych postgres i aplikację lokalnie
   1. Kontener postgres
      ```bash
      docker build -t postgres -f db-dockerfile .
      ```
   2. Aplikację uruchomić zgodnie z dalszą instrukcją

## Zmienne środowiskowe

Zmienne środowiskowe pobierane przez aplikację:

**wymagane**
1. IP - aplikacji np "127.0.0.1"
2. Port - aplikacji np "8080"
3. Server - adres serwera potrzebny do zbudowania linku logowania np: "http://localhost:8080"
   
**opcjonalne**
- COOKIE_KEY - klucz ciasteczka. W przypadku braku generowana jest losowa wartość.
- MAGAZYN_BYSTRZE_EMAIL_ADDR - adres konta email wykorzystywanego do wysyłania emaili przez aplikację.
- MAGAZYN_BYSTRZE_EMAIL_PASS - hasło do wyżej wspomnianego konta.
- SMTP_HOST np: smtp.gmail.com
- SMTP_PORT np: 587
- DEBUG - tryb debugowania true lub false. True, link logowania pojawia się w terminalu. False, korzysta z poczty email
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
            "args": []
        }
    ]
}
```

* GCC 
  tutorial : https://code.visualstudio.com/docs/cpp/config-mingw

## Passwordless authentication

Autentykacja jest realizowana za pomocą pakietu https://github.com/johnsto/go-passwordless. Token autentykacyjny jest przesyłany
za pomocą emaila zdefiniowanego w **MAGAZYN_BYSTRZE_EMAIL_ADDR**.

 Parametr **DEBU** (SEND_COOKIE_TO_STDOUT) po ustawieniu na:
- **true** 

pozwala na authentykację z pominięciem email. Link authentykacyjny jest podawany w terminalu. Na stronie należy podać "u_username" występujący w bazie

- **false**

pozwala na authentykację poprzez email. Na stronie należy podać adres email występujący w bazie.

### Konfiguracja 

Należy ustawić zmienne środowiskowe dla **MAGAZYN_BYSTRZE_EMAIL_ADDR**, **SMTP_HOST**, **SMTP_PORT**. Ponadto w przypadku **gmail** należy ustawić "hasło dla aplikacji" zgodnie z tą instrukcją https://support.google.com/accounts/answer/185833?hl=pl i w ustawieniach skrzynki pocztowej włączyć Dostęp IMAP w ustawienia/przekazywanie i POP/IMAP

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
docker build --target production -t magazyn_bystrze . --build-arg EMAIL=EMAIL --build-arg EMAIL_PASS="PASS" DEBUG=false
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
Box testy. Uruchamiane za pomocą docker-compose. Obraz do testów jest z flagą `"--target test"` i ` DEBUG=true`
```cmd
docker build --target test DEBUG=true
```
Stworzenie nowego środowiska testowego
```cmd
go run main.go --env
```
Uruchomienie wszystkich testów z listy. 
```cmd
go run main.go --tests 
```
Wyczyszczenie cache. Testy które przeszły nie zostaną wykonane ponownie.
```cmd
go clean -testcache
```

### Uwagi
1. Testy applikacji warehouse wymagają wydłużenia domyślnego timeout do 1min (trzeba ustawić jeżeli testy są uruchamiane pojedynczo. W main.go --tests timeout jest ustawiony)
```cmd
go.exe test -timeout 60s -run ^Test_reservationMadeAndStartedSameTime$ boxTest/tests/warehouse
```