Task: Prepare a UI prompt file located at 
.ai/reservations-view-ui-prompt.md
.

Template: Use the structure defined in 
.ai/prompts/ui-plan.md
 (referred to as @ui-plan.md) as your base template.

Context Sources: Fill in the template by extracting relevant implementation details for the "Reservations View" from the following documents:

@documentation/prd
@documentation/ui-plan.md
@documentation/api-plan.md
@documentation/architecture.md
@index.md
View Requirements: The prompt must cover a "Reservations View" that supports two main contexts:

My Reservations: A view where a logged-in user can see only their own reservations.
All Reservations: A view (e.g., for admins) to see reservations for all users.