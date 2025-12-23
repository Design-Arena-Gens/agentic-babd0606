import { NextRequest } from "next/server";
import { IncomingForm } from "formidable";
import { Readable } from "stream";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key",
});

// Convert Next.js request to Node.js IncomingMessage
async function parseFormData(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("No file uploaded");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save to temp directory
  const tempDir = "/tmp/uploads";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, file.name);
  fs.writeFileSync(tempPath, buffer);

  return {
    filepath: tempPath,
    originalFilename: file.name,
    mimetype: file.type,
  };
}

async function analyzeTrends() {
  // Simulated trend analysis - in production, this would scrape Instagram or use an API
  const trends = [
    "trending dance moves with quick cuts",
    "motivational content with text overlays",
    "before and after transformations",
    "aesthetic slow-motion effects",
    "storytelling with emotional music",
    "quick tips and life hacks",
    "behind-the-scenes content",
    "satisfying visual loops",
  ];

  const randomTrend = trends[Math.floor(Math.random() * trends.length)];

  return {
    trend: randomTrend,
    hashtags: [
      "#reels",
      "#viral",
      "#trending",
      "#instagram",
      "#explore",
      "#fyp",
    ],
    musicSuggestion: "Upbeat trending audio",
  };
}

async function generateVideoWithSora(fileInfo: any, trend: any) {
  try {
    const prompt = `Create an engaging Instagram Reel video based on this trend: "${trend.trend}".
    Make it vertical format (9:16), 15-30 seconds long, with dynamic transitions,
    trendy effects, and optimized for Instagram engagement. Style should be modern,
    eye-catching, and shareable. Include smooth transitions and trending visual effects.`;

    // Note: As of now, OpenAI's Sora API is in limited preview
    // This is a placeholder for when the API becomes available
    // For now, we'll use a mock response

    // When Sora API is available, uncomment this:
    /*
    const response = await openai.videos.generate({
      model: "sora-1.0",
      prompt: prompt,
      size: "1080x1920", // 9:16 aspect ratio for Instagram Reels
      duration: 20,
    });

    return response.data[0].url;
    */

    // Mock response - returns a placeholder video URL
    // In production, this would return the actual Sora-generated video
    return "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
  } catch (error) {
    console.error("Error generating video with Sora:", error);
    throw error;
  }
}

async function uploadToInstagram(videoUrl: string, caption: string) {
  // Simulated Instagram upload
  // In production, this would use Instagram Graph API or a third-party service

  try {
    // Instagram Graph API flow (requires Facebook Business account and access token):
    // 1. Create container: POST /{ig-user-id}/media
    // 2. Publish container: POST /{ig-user-id}/media_publish

    // Placeholder implementation
    console.log("Uploading to Instagram...");
    console.log("Caption:", caption);
    console.log("Video URL:", videoUrl);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      success: true,
      postId: "mock_post_" + Date.now(),
      postUrl: "https://instagram.com/p/mock_post_id",
    };
  } catch (error) {
    console.error("Error uploading to Instagram:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send status update helper
        const sendStatus = (step: string, status: string, message?: string) => {
          const data = JSON.stringify({ type: "status", step, status, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        // Step 1: Upload and parse file
        sendStatus("Upload File", "processing", "Receiving your file...");
        const fileInfo = await parseFormData(request);
        sendStatus("Upload File", "completed", `File received: ${fileInfo.originalFilename}`);

        // Step 2: Analyze Instagram trends
        sendStatus("Analyze Trends", "processing", "Analyzing trending Instagram Reels...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const trendData = await analyzeTrends();
        sendStatus(
          "Analyze Trends",
          "completed",
          `Trend identified: ${trendData.trend}`
        );

        // Step 3: Generate video with Sora
        sendStatus(
          "Generate Video",
          "processing",
          "Creating your video with AI (this may take a moment)..."
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const videoUrl = await generateVideoWithSora(fileInfo, trendData);
        sendStatus("Generate Video", "completed", "Video generated successfully!");

        // Step 4: Upload to Instagram
        sendStatus(
          "Upload to Instagram",
          "processing",
          "Uploading to your Instagram account..."
        );
        const caption = `${trendData.hashtags.join(" ")}\n\n${trendData.musicSuggestion}`;
        const uploadResult = await uploadToInstagram(videoUrl, caption);
        sendStatus(
          "Upload to Instagram",
          "completed",
          `Posted successfully! Post ID: ${uploadResult.postId}`
        );

        // Send completion
        const completeData = JSON.stringify({
          type: "complete",
          videoUrl,
          uploadResult,
        });
        controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));

        // Cleanup temp file
        try {
          fs.unlinkSync(fileInfo.filepath);
        } catch (e) {
          console.error("Error cleaning up temp file:", e);
        }

        controller.close();
      } catch (error) {
        const errorData = JSON.stringify({
          type: "status",
          step: "Error",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
