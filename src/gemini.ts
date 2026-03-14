import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateInsight(meal: string, scores: { energy: number; focus: number; mood: number }, history: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a nutritional intelligence assistant. 
      User just ate: "${meal}"
      Current scores (1-10): Energy: ${scores.energy}, Focus: ${scores.focus}, Mood: ${scores.mood}.
      
      Historical context (last 5 entries): ${JSON.stringify(history.slice(0, 5))}
      
      Provide a concise, actionable insight (max 2 sentences) about how this meal might impact their performance or a correlation you notice. 
      Be specific. Avoid generic platitudes. 
      Example: "High-carb lunch noticed. Your energy dipped 2 hours later. Consider adding protein/fiber to your afternoon routine."`,
    });

    return response.text || "Insight pending more data...";
  } catch (error) {
    console.error("Error generating insight:", error);
    return "Focus on balanced macros for sustained energy.";
  }
}

export async function generateRecommendations(history: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this nutritional and performance history: ${JSON.stringify(history)}
      
      Provide 3 personalized, low-friction recommendations for cognitive optimization. 
      Format as a JSON array of strings.
      Focus on causal links between food and focus/energy.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [
      "Try adding a handful of almonds to your 3 PM routine for steadier energy.",
      "Consider a lighter lunch to avoid the post-meal focus dip.",
      "Hydrate with electrolytes during deep work sessions."
    ];
  }
}

export async function chatWithAssistant(message: string, history: any[]) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are the "Fuel & Focus" assistant. You help users understand the link between their diet and cognitive performance. 
        Use the user's history to provide personalized advice: ${JSON.stringify(history)}
        Be concise, scientific but approachable, and always focus on "cognitive optimization" rather than just weight loss or generic health.`,
      },
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm having trouble connecting right now. Let's talk about your focus levels later.";
  }
}

export async function textToSpeech(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mp3;base64,${base64Audio}`;
    }
  } catch (error) {
    console.error("TTS error:", error);
  }
  return null;
}
