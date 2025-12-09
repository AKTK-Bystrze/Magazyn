---
description: Polish UI strings for frontend components
---

## Files and translations

| File (relative) | Line(s) | Original English | Polish Replacement |
|-----------------|---------|------------------|--------------------|
| src/pages/login.astro | 6 | `Login \| Equipment Rental` (title) | `Zaloguj się \| Wynajem Sprzętu` |
| src/pages/login.astro | 35 | `<LoginFormContainer client:load />` (component renders) – internal text handled in component |
| src/components/auth/LoginFormContainer.tsx | 26-31 | `Welcome back` / `Enter your email to sign in to your account` | `Witaj ponownie` / `Wpisz swój e‑mail, aby zalogować się do swojego konta` |
| src/components/auth/MagicLinkSent.tsx | 29-33 | `Check your email` / `We sent a login link to {email}.` / `Click the link to sign in.` / `Back to login` | `Sprawdź swoją pocztę` / `Wysłaliśmy link logowania na {email}.` / `Kliknij link, aby się zalogować.` / `Powrót do logowania` |
| src/pages/account-disabled.astro | 38-44 | `Account Pending Activation` / `Your account has been created successfully` | `Konto oczekuje na aktywację` / `Twoje konto zostało pomyślnie utworzone` |
| src/pages/account-disabled.astro | 49-53 | `What's happening?` / `Your account is currently disabled and waiting for approval from a SuperAdmin.` | `Co się dzieje?` / `Twoje konto jest obecnie wyłączone i czeka na zatwierdzenie przez Super‑Admina.` |
| src/pages/account-disabled.astro | 57-62 | `What should you do?` / list items | `Co powinieneś zrobić?` / `Poczekaj, aż Super‑Admin zweryfikuje i włączy Twoje konto` / `Skontaktuj się z administratorem, jeśli potrzebujesz natychmiastowego dostępu` / `Sprawdź ponownie później lub kliknij przycisk odświeżania poniżej` |
| src/pages/account-disabled.astro | 73-78 | `Check Account Status` / `Logout` | `Sprawdź status konta` / `Wyloguj się` |
| src/pages/account-disabled.astro | 108-112 | `Checking...` / `Account enabled! Redirecting...` / `Account is still pending approval.` / error messages | `Sprawdzanie…` / `Konto włączone! Przekierowuję…` / `Konto nadal oczekuje na zatwierdzenie.` / `Nie udało się sprawdzić statusu. Spróbuj ponownie.` |
| src/pages/account-disabled.astro | 161-163 | `Logging out...` | `Wylogowywanie…` |
| src/pages/account-disabled.astro | 179-182 | `Error logging out:` | `Błąd przy wylogowywaniu:` |

*All other UI strings remain unchanged.*
