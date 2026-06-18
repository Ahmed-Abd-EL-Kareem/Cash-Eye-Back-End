import OpenAI from "openai";
import logger from "../../config/logger.js";

if (!process.env.OPENAI_API_KEY) {
  logger.warn("[OpenAI] OPENAI_API_KEY is not set — AI features will fail");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// openai.client.js
// import OpenAI from "openai";
// import logger from "../../config/logger.js";

export const chatClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});
export const embeddingClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});
// export const embeddingClient = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

if (!process.env.NVIDIA_API_KEY) {
  logger.warn("[NVIDIA] NVIDIA_API_KEY is not set");
}
if (!process.env.OPENAI_API_KEY) {
  logger.warn("[OpenAI] OPENAI_API_KEY is not set for embeddings");
}
