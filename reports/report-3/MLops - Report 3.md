# 

# MLops Report 3

Caden Kamminga (s4370732)  
Tex McGinley (s4299035)  
Raghav Chawla (s4241657)  
January 25th, 2026

# Overview of Effort:

The work distribution was divided equally, with each member contributing around a third to the project. While responsibilities were split we did all help each other on each other's parts. 

| Member | Timespent  | Topic | Action |
| :---- | :---- | :---- | :---- |
| Caden | 33% | Frontend, CI/CD, Model, report writing, and Docker | Coding, Writing, and deploying |
| Tex | 33% | Backend, API, report writing, Model and Data | Coding, Writing, and deploying |
| Raghav | 33% | Monitoring, Prometheus, Loki, Grafana, report writing, and diagrams  | Coding, Writing, and deploying |

## Collaboration Rules and Practices

1. Communicate early and often.  
2. Set clear goals and deadlines.  
3. Divide tasks fairly and stick to them.  
4. Hold regular check-ins.  
5. Resolve conflicts respectfully and quickly.  
6. Ask for help when stuck.

# Use of GEN AI 

**Prompts:**  
We all used copilot in VS code. Specifically we used it to help with the commenting of the code. Since it is autofilled in VS code we do not have a list of prompts for that. 

Additionally we made use of the tool “V0.app” to generate the initial frontend code which we later cleaned up and formatted to be neater. 

Here is the prompt we used on V0.app:  
“””  
Build a slick, modern web frontend for an “ADD Classifier” (Architectural Design Decision detection) tool.

Tech constraints:

Output React components styled with Tailwind CSS.

Prefer shadcn/ui components and lucide-react icons.

No emojis anywhere in code or UI text.

Must work in a Vite \+ React app (no Next.js-specific features like server actions).

Use accessible components (labels, aria attributes, keyboard navigable).

Backend API contract:

Base URL: http://localhost:8000

GET /health \-\> { "status": "ok" }

POST /predict with JSON body: { "summary": string, "description": string }  
Response: { "sentiment": 0 | 1 }  
(0 means “No ADD”, 1 means “ADD detected”)

Show friendly error messages if API is unreachable or returns non-200.

Treat 503 as “Model not loaded yet”.

Primary UI requirements (must implement now):

Single issue prediction page:

Two fields: Summary (textarea) and Description (textarea).

Submit button “Classify”.

Show loading state while request runs.

Show result card after response:

If sentiment=1 \=\> “ADD detected”

If sentiment=0 \=\> “No ADD detected”

Provide a “Clear” button to reset the form and result.

Health indicator:

In the top header, show “API: Online/Offline” with a small colored dot.

Poll /health every 10 seconds.

If offline, disable the Classify button and show an inline warning.

Non-blocking UX:

The UI must remain responsive during requests.

Use asynchronous fetch (Promise-based).

Use abort controller to cancel in-flight request if user clicks “Clear” or resubmits quickly.

Layout and styling:

Sleek “analyst console” look inspired by Linear / Vercel dashboard style.

Centered content, max width around 900px.

Clean typography, spacing, and subtle borders/shadows.

Dark mode default, but keep styles compatible with light mode.

Use shadcn/ui Card, Button, Badge, Tabs, Separator, Alert, Textarea, Input, Tooltip.

Secondary UI features (scaffold but can be “Coming soon”):

Tabs: “Single”, “Batch”, “Keyword search”.

Batch tab: a large textarea or file upload area (CSV/JSON) and a disabled “Run batch” button labeled “Coming soon”.

Keyword search tab: keyword input \+ disabled “Search” button labeled “Coming soon”.

Clearly indicate which features are implemented vs planned.

Bonus (include if easy):

A feedback widget on the result card:

“Mark as ADD” and “Mark as Not ADD”

Store feedback locally in browser (localStorage) as an array of records:  
{ timestamp, summary, description, predicted\_sentiment, user\_label }

Provide a small “Export feedback” button that downloads JSON.

Implementation details:

Provide a single top-level React component file (e.g. App.jsx or AddClassifier.jsx) that includes:

Header with health status

Tabs container with 3 tabs

Single tab fully functional calling /predict

Batch/search stub tabs

Use a small API helper function inside the component (or a tiny separate helper block) for fetch/axios calls.

Include clear comments only where necessary, not excessive.

Do not include any backend code.

Provide the final code as one component, ready to paste into src/App.jsx.  
“””

To generate the README file we used perplexity. We did this by first asking it to answer what makes a great README and then providing it with the project directory layout by pasting in the terminal output from running “tree \-L 3”. Then we handing in the relevant files: 

- gitlab-ci.yml  
- docker-compose.yml  
- docker-compose.override.yml   
- backend/api/main.py   
- backend/api/celery\_app.py   
- backend/api/worker.py  
- data/processing/etl\_pipeline.py  
- data/processing/process\_ADD\_db.py​  
- data/training/train\_model.py 

And prompted it to make a README file using that information. Which resulted in the current README as seen in the root folder. 

We also used a specific gpt called “DiagramGPT” by NGUYEN THANH TUAN on the tool “chatgpt” to help with creating specific plantuml code to help with the creation of C4 diagrams. The prompt we used was:  
“Give me plant uml code for creating a database and a person icon which is connected to another container block. use the c4 container theme from https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4\_Container.puml also use the \!NEW\_C4\_STYLE=1”

- The resulting output was incorporated in our c4 diagrams which were manually created on “[https://editor.plantuml.com/](https://editor.plantuml.com/)” and we connected to the central API container block. 

**Usefulness:**  
The use of generative AI was very useful because due to the new developments we could speed up the process of developing our application and we could easily get help if we were ever stuck because it makes research and debugging our work, and finding solutions to problems much less tedious than it used to be before when all the research and debugging had to be done manually. It also helped with better understanding the project and the new tools and technologies which we were working with through assimilating information and instructions of the project which were given to us on brightspace and were quite a large bit of text. This allowed us to more efficiently and effectively learn course material and achieve the course objectives shown to us at the beginning of this course. We utilised this better understanding of the project in our work, while writing the report as well as knowing exactly what to do for a certain subsection of the project task.   
On the other hand, we feel that at this point generative AI is there to unblock our potential and speed up the pace we are able to complete this project while having a balance in our lives. However, at the end the project is being made by us and the final control and architectural fingerprints on the project need to be done by us. Setting the secrets/credentials, deploying on the VM and creating monitoring workflows, dealing with infrastructure issues like low RAM and disk space, deciding on the criteria for a good model, adherence to academic guidelines; these are all things only we can execute and where AI cannot help us. 

