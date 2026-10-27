require("dotenv").config();
const Groq = require("groq-sdk");

async function testGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY missing in server/.env");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: 30000,
    maxRetries: 0,
  });

  const result = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    messages: [
      { role: "user", content: "Reply with only: connection works" },
    ],
    max_tokens: 20,
  });

  console.log(result.choices[0].message.content);
}

testGroq().catch((error) => {
  console.error("Groq test failed:", error.message);
  if (error.cause) console.error("Cause:", error.cause);
});