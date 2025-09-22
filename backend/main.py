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
    print("Criteria: ", req.criteria)
    print("Post: ", req.postText)
    prompt = f"""
        You are helping find a room in SF given the user's criteria for an apartment: {req.criteria}.
        Analyze the post: {req.postText} and return a JSON with fields: confidence, good, bad, suggestedMessage.
            - confidence: 0 to 100 (how well this post aligns the criteria)
            - good: a short summary of what's good in 4-5 words
            - bad: a short summary of what's not good in 4-5 words
            - suggestedMessage: Generate a message 1-2 sentences highlighting the good points to reach out only if the confidence is above 50. 
        Respond only with valid JSON. No markdown, no commentary.
    """
    # prompt = f"""
# You are helping me find housing posts where someone is looking for a roommate or subletter.

# Given the Criteria: {req.criteria} and the Post: "{req.postText}"
# Build a JSON with fields: confidence, good, bad, suggestedMessage.
# Follow the instructions below for the fields - 
# If the post is about subletting, renting out a room or finding a roommate, return the following fields - 
#     - confidence: 0 to 100 (how well this post aligns the criteria)
#     - good: a short summary of what's good in 4-5 words
#     - bad: a short summary of what's not good in 4-5 words
#     - suggestedMessage: Generate a message to reach out only if the confidence is above 50. 
#     Keep the suggestedMessage positive, friendly in 2-3 sentences.
#     Mention that you are excited to explore the locality of the sublease.
#     For example - 
#     Hi Amy! I saw your post, I am interested in the sublease. I am excited to explore the North beach area.
#     I am looking for a sublease in the area of {req.criteria['location']}.
#     The move in date works for me. 
# Else if the post is about someone looking for a sublease or someone moved to SF, return the following fields - 
#     - confidence: 0
#     - good: Not relevant
#     - bad: Not relevant
#     - suggestedMessage: Post isnt't by a subletter, so no need to reach out.

# Respond only with valid JSON. No markdown, no commentary.
# """
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
