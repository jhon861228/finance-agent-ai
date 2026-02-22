import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Bedrock Model
const BEDROCK_MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0';

export class LlmParser {
    static async parse(text: string) {
        if (!text) {
            throw new Error('No text provided');
        }

        console.log(`[LLM] Parsing text: "${text}"`);

        const prompt = `
            You are a financial assistant.
            Analyze the user's text and determine if they want to record a new expense or retrieve their existing expenses.
            
            Return strictly a JSON object.
            
            If they want to RECORD an expense:
            - "intent": "RecordExpense"
            - "description": "The item or service"
            - "amount": Numeric value
            - "currency": ISO code (default USD)
            - "category": e.g., Food, Transport, Utilities, General
            - "groupName": (Optional) The name of the group if mentioned (e.g., "en el grupo Viaje" -> "Viaje")
            
            If they want to RETRIEVE or see their expenses:
            - "intent": "RetrieveExpenses"
            - "groupName": (Optional) The name of the group if mentioned
            - "scope": "personal" | "group" | "all"
            
            Text: "${text}"
            JSON:
        `;

        const provider = process.env.LLM_PROVIDER || 'bedrock';

        if (provider === 'groq') {
            console.log(`[LLM] Using Groq provider`);
            return this.parseWithGroq(prompt);
        } else if (provider === 'openai') {
            console.log(`[LLM] Using OpenAI provider`);
            return this.parseWithOpenAI(prompt);
        } else {
            console.log(`[LLM] Using Bedrock provider`);
            return this.parseWithBedrock(prompt);
        }
    }

    private static async parseWithGroq(prompt: string) {
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0].message.content;
            console.log(content);
            return content ? JSON.parse(content) : null;
        } catch (error) {
            console.error('Groq invocation failed', error);
            throw error;
        }
    }

    private static async parseWithOpenAI(prompt: string) {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        try {
            const response = await openai.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content) : null;
        } catch (error) {
            console.error('OpenAI invocation failed', error);
            throw error;
        }
    }

    private static async parseWithBedrock(prompt: string) {
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: prompt }]
                }
            ]
        };

        try {
            const command = new InvokeModelCommand({
                modelId: BEDROCK_MODEL_ID,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(payload),
            });

            const response = await bedrockClient.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const resultText = responseBody.content[0].text;
            console.log(`[LLM] Bedrock raw response: ${resultText}`);

            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
            console.log(`[LLM] Parsed JSON: ${JSON.stringify(result)}`);
            return result;
        } catch (error) {
            console.error('Bedrock invocation failed', error);
            throw error;
        }
    }
}

export const handler: Handler = async (event) => {
    const text = JSON.parse(event.body || '{}').text;

    try {
        const result = await LlmParser.parse(text);
        return {
            statusCode: 200,
            body: JSON.stringify({ result }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
