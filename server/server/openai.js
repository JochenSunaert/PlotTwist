/**
 * This file is responsible for initializing and exporting the OpenAI API client.
 * It ensures that the OpenAI API key is loaded securely from environment variables
 * and provides a configured OpenAI instance for use throughout the application,
 * particularly for interacting with OpenAI's large language models (e.g., for generating stories).
 *
 * To use this file, you must have an OpenAI API key.
 *
 * .env file requirements:
 * Create a file named `.env` in the root directory of your project (where your package.json is).
 * Inside this `.env` file, add your OpenAI API key like this:
 *
 * OPENAI_API_KEY=your_actual_openai_api_key_here
 *
 * Replace `your_actual_openai_api_key_here` with the secret API key you obtain from your OpenAI account.
 * This env file should NOT be committed to version control (e.g., Git) to keep your API key secure.
 */
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