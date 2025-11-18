// n8n_function_parse_goal.js
// Paste this into an n8n "Function" node (JavaScript).
// Purpose: Parse incoming webhook body or input and return a structured plan (steps).
// Input expectation (example webhook JSON):
// { "goal":"create youtube short about funny rishta", "channel":"youtube", "language":"Hinglish", "topic":"rishta" }

const input = (() => {
  // n8n exposes incoming item(s) as $input or $json
  // try common places for incoming payload
  if ($json && Object.keys($json).length) return $json;
  if ($input && $input.item && $input.item.json) return $input.item.json;
  return {};
})();

// helper: normalize string
const norm = (s) => (s || "").toString().trim().toLowerCase();

const goalText = norm(input.goal || input.text || `${input.channel || ""} ${input.topic || ""}`);

// default plan buckets
const plans = {
  youtube: ["trend_search", "script_gen", "thumbnail_prompt", "tts_generate", "image_prompts", "assemble_video", "upload_youtube", "log"],
  instagram: ["script_short", "caption_gen", "image_prompt", "post_ig", "log"],
  whatsapp: ["parse_message", "ai_reply", "send_whatsapp", "log"],
  image_video: ["image_prompts", "tts_generate", "assemble_video", "store_video", "log"]
};

// pick channel if explicit
let channel = (input.channel || "").toString().toLowerCase();
if (!channel) {
  if (goalText.includes("youtube") || goalText.includes("short") || goalText.includes("youtube short")) channel = "youtube";
  else if (goalText.includes("instagram") || goalText.includes("ig")) channel = "instagram";
  else if (goalText.includes("whatsapp")) channel = "whatsapp";
  else if (goalText.includes("image to video") || goalText.includes("image->video") || goalText.includes("image to video")) channel = "image_video";
  else channel = "youtube"; // safe default
}

// choose steps from plan
const steps = plans[channel] ? plans[channel].slice() : ["research", "plan", "execute"];

// refine based on keywords in goal
if (goalText.includes("auto") || goalText.includes("automation") || goalText.includes("automate")) {
  // ensure logging and retries included
  if (!steps.includes("retry_check")) steps.push("retry_check");
  if (!steps.includes("notify")) steps.push("notify");
}

if (goalText.includes("tts") || goalText.includes("voice") || goalText.includes("voiceover") || goalText.includes("audio")) {
  if (!steps.includes("tts_generate")) steps.splice(Math.min(2, steps.length), 0, "tts_generate");
}

// prepare friendly metadata
const metadata = {
  channel,
  topic: input.topic || input.topic === "" ? input.topic : (input.goal || "").slice(0, 60),
  language: input.language || "Hinglish",
  requested_by: input.requested_by || null,
  timestamp: new Date().toISOString()
};

return [
  {
    json: {
      ok: true,
      parsed_input: input,
      metadata,
      plan: {
        steps,
        notes: `Auto-chosen plan for channel='${channel}'. Edit steps in the Function node if you want different ordering.`
      }
    }
  }
];
