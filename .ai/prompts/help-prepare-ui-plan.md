<VIEW NAME> </VIEW NAME>
<VIEW CONTEXT> </VIEW CONTEXT>

Task: Prepare a UI prompt file located at 
.ai/<VIEW NAME>-view-ui-prompt.md
.

Template: Use the structure defined in 
.ai/prompts/ui-plan.md
 (referred to as @ui-plan.md) as your base template.

Context Sources: Fill in the template by extracting relevant implementation details for the <VIEW NAME> from the following documents:

@documentation/prd
@documentation/ui-plan.md
@documentation/api-plan.md
@documentation/architecture.md
@index.md
View Requirements: The prompt must cover a "<VIEW NAME>" that supports main context:

<VIEW CONTEXT>