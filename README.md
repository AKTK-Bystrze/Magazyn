# Magazyn

- [Magazyn](#magazyn)
- [Jak uruchomic na Windows (VSCode)](#jak-uruchomic-na-windows-vscode)
  - [Konfiguracja VS Code (GO)](#konfiguracja-vs-code-go)
  - [GCC](#gcc)
  - [Baza danych](#baza-danych)


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

