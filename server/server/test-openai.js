require('dotenv').config();
const openai = require("./openai");

async function testOpenAI() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      temperature: 0.7,
    });

    console.log("📖 Test AI Response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error testing OpenAI:", error);
  }
}

testOpenAI();