update documentation
    conversation:
    read @backend 
    update @reservation-workflow.md  about the logic flow in case of reservation, costs calculation and status changes, how failures are handled

proceed with backend implementation of plans in .ai
    implement calendar endpoint .ai/backend/calendar.md

frontend plans
    users
    reservations
    equipments -details etc
    
frontend implementation

e2e testy
implementacja pozostalych endpointow
dokumentacja

deploy - konteneryzacja 


refactor 
1. nowy uzytkonwik nie moze sie tworzyc automatycznie. Wylaczycz tworzenie, tylko admin moze dodawac
2. translate ui to english
3. notification service a centralized service for sending notifications to users
4. Implement credit recalculation logic in 
Update
 when dates are modified.
5. Implement a bulk refund mechanism (or iterative service calls) for 
BulkUpdate
 to ensure admin cancellations process refunds correctly.