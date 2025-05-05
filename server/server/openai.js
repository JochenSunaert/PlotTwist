require('dotenv').config();

const { OpenAI } = require("openai");

try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY is not set in the environment variables.");
    throw new Error("OPENAI_API_KEY is missing");
  }

  console.log("✅ OPENAI_API_KEY is set.");

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  console.log("✅ Successfully created OpenAI instance.");
  module.exports = openai;
} catch (error) {
  console.error("❌ Failed to initialize OpenAI:", error);
  throw error;
}