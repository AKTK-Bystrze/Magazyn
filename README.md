# Magazyn

- [Magazyn](#magazyn)
- [Jak uruchomic na Windows (VSCode)](#jak-uruchomic-na-windows-vscode)
  - [Konfiguracja VS Code (GO)](#konfiguracja-vs-code-go)
  - [GCC](#gcc)
  - [Baza danych](#baza-danych)
- [Passwordless authentication](#passwordless-authentication)
  - [Konfiguracja](#konfiguracja)
- [Zmienne środowiskowe](#zmienne-środowiskowe)




Repozytorium na aplikację webową do rezerwowania sprzętu AKTK Bystrze.

Zapraszam do dyskusji w [Issues](https://github.com/AKTK-Bystrze/Magazyn/issues)

# Jak uruchomic na Windows (VSCode)

## Konfiguracja VS Code (GO)
* [tutorial](https://learn.microsoft.com/en-us/azure/developer/go/configure-visual-studio-code) konfiguracji GO na VS Code
* Ustaw zmienną środowiskową
``` bash
set cgo_enabled=1
```

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
            "args": ["127.0.0.1", "8080", "domain"]
        }
    ]
}

```

## GCC
* tutorial : https://code.visualstudio.com/docs/cpp/config-mingw

## Baza danych

* Stwórz bazę 
```cmd
sqlite3 magazyn.db < db.schema
```
* Zapełnij bazę
```powershell
sqlite3 magazyn.db ".read db_test.data"
```

# Passwordless authentication

Autentykacja jest realizowana za pomocą pakietu https://github.com/johnsto/go-passwordless. Token autentykacyjny jest przesyłany
za pomocą emaila zdefiniowanego w **MAGAZYN_BYSTRZE_EMAIL_ADDR**.

 Parametr **SEND_COOKIE_TO_STDOUT** po ustawieniu na:
- **true** 

pozwala na authentykację z pominięciem email. Link authentykacyjny jest podawany w terminalu. Na stronie należy podać "u_username" występujący w bazie

- **false**

pozwala na authentykację poprzez email. Na stronie należy podać adres email występujący w bazie.

## Konfiguracja 

Należy ustawić zmienne środowiskowe dla **MAGAZYN_BYSTRZE_EMAIL_ADDR**. Ponadto w przypadku **gmail** należy ustawić "hasło dla aplikacji" zgodnie z tą instrukcją https://support.google.com/accounts/answer/185833?hl=pl i w ustawieniach skrzynki pocztowej włączyć Dostęp IMAP w ustawienia/przekazywanie i POP/IMAP

# Zmienne środowiskowe

Zmienne środowiskowe pobierane przez aplikację:
- BASE_URL - wymagany do tworzenua linku do szybkieh authentykacji. W przypadku braku używany jest "http://localhost:8080"
- COOKIE_KEY - klucz ciasteczka
- MAGAZYN_BYSTRZE_EMAIL_ADDR - adres konta email wtkorzystywanego do wysyłani maili przez aplikację
- MAGAZYM_BYSTRZE_EMAIL_PASS - hasło do wyżej wspomnianego konta
