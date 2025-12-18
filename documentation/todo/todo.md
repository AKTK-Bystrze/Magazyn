

equipments - admin view
    - add equipment
    - update equipment
    - delete equipment
    - equipment details
    - equipment reservation history

user 
    - superAdmin can change users credits by adding or retracting in place of changing balance

credits
    - credit history

code 
documentation

deploy - containerization 
e2e tests


refactor 
1. nowy uzytkonwik nie moze sie tworzyc automatycznie. Wylaczycz tworzenie, tylko admin moze dodawac
2. translate ui to english
3. notification service a centralized service for sending notifications to users
4. Implement credit recalculation logic in Update when dates are modified.
5. Implement a bulk refund mechanism (or iterative service calls) for 
BulkUpdate
 to ensure admin cancellations process refunds correctly.
7. mechanism for finding and handling tokens expiration. It is valid on frontend but not on backend. I am permanetnly logged in on browser
8. in reservation details, on top in navigation instead of the reservation id, use the reservation dates...?
9. highlight of my reservation is not properly working, not all mine reservations are highlighted
10. When link is sent then user can jusr refresh page to login
11. remove service role key usage
12. in top bar credits re invisible on mobile view
13. remove approved status 
14. in reservation when chanign status to returned, show dates in the form with filled values the same as in reservation. User and Admin can change the dates at this moment