continue dashboard display adjustments, remove mock tiles

reservation flow - select dates and preview available equipment
reservation flow - user can see all reservations
reservation flow - admin see username on reservations list
reservation flow - changing statuses by user
reservation flow - changing statuses by admin
equipments - admin view

credits request
dokumentacja

deploy - konteneryzacja 
e2e testy

backend left to do from api-plan:
    credit request
    mainteneace logs/analytics


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
6. reservation status update. user should be able to change status of his own reservation when renting and returning equipment
7. mechanism for finding and handling tokens expiration. It is valid on frontend but not on backend. I am permanetnly logged in on browser
8. no alert when adding to cart
9. after reserving the status of avaiablity is not updated