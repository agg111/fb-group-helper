from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from openai import OpenAI
import json
import dotenv
import re
dotenv.load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class AnalyzeRequest(BaseModel):
    postText: str
    criteria: dict

@app.post("/analyzePost")
async def analyze_post(req: AnalyzeRequest):
    prompt = f"""
Given this post:
"{req.postText}"

and the user's criteria:
{json.dumps(req.criteria, indent=2)}

Identify if the post is about sublease being listed, if so return a JSON object with:
- matchScore: 0-100 %
- good: What is good about the post in 3-4 words
- bad: What is bad about the post in 3-4 words
- suggestedMessage: Generate a message to reach out only if the matchScore is above 50%. 
Keep the message positive, friendly in 5-6 sentences, structured into paragraphs separated by two newlines. 
Mention that you are excited to explore the locality of the sublease is located in.
For example,
Hi Amy! I saw your post, I am interested in the sublease. I am excited to explore the North beach area.
I am looking for a sublease in the area of {req.criteria['location']} with a budget of {req.criteria['maxBudget']}.
The move in date works for me. 

If the post is about seaching for a sublease, it not relevant. In that case, return JSON object with:
- matchScore: 0
- good: Not relevant
- bad: Not relevant
- suggestedMessage: Post isnt't by a subletter, so no need to reach out

Do NOT include any explanations or extra text. Ensure it is parsable by JSON.
"""
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions="You are a sublease finder assistant",
            input=prompt,
        )
        
        output_text = response.output_text
        print(output_text)

        # Remove extra text before/after JSON
        json_match = re.search(r"\{.*\}", output_text, re.DOTALL)
        if json_match:
            output_text = json_match.group(0)

        try:
            result = json.loads(output_text)
        except:
            result = {"error": "LLM returned invalid JSON", "raw": output_text}

        return result
    except Exception as e:
        return {"error": str(e)}
