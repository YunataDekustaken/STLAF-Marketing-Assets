/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateCaption(params: {
  contentTitle: string;
  contentType: string;
  format: string;
  topicTheme: string;
  funnelStatus: string;
  customPrompt?: string;
}) {
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please configure it in the Secrets panel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert social media manager for a legal and educational platform (STLAF).
    Generate a compelling social media caption based on the following details:
    
    Content Title: ${params.contentTitle}
    Content Type: ${params.contentType}
    Format: ${params.format}
    Topic/Theme: ${params.topicTheme}
    Funnel Status: ${params.funnelStatus}
    ${params.customPrompt ? `Additional User Instructions: ${params.customPrompt}` : ""}

    Guidelines:
    - Use a professional yet engaging tone.
    - Include relevant emojis.
    - Include a call to action (e.g., "Share your thoughts below", "Tap the link to read more").
    - Use specific hashtags like #STLAF, #legalph, #batasph, and others relevant to the topic.
    - If the content is "TOTD" (Tip of the Day), start with "𝐓𝐈𝐏 𝐎𝐅 𝐓𝐇𝐄 𝐃𝐀𝐘:".
    - If the content is "JURISPRUDENCE", start with "𝐉𝐔𝐑𝐈𝐒𝐏𝐑𝐔𝐃𝐄𝐍𝐂𝐄:".
    - Keep it concise but informative.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Failed to generate caption.";
  } catch (error) {
    console.error("Error generating caption:", error);
    throw error;
  }
}
