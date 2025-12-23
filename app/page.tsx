"use client";

import { useState } from "react";

interface WorkflowStatus {
  step: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setWorkflowStatus([]);
      setVideoUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setWorkflowStatus([]);
    setVideoUrl(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "status") {
                  setWorkflowStatus((prev) => {
                    const newStatus = [...prev];
                    const existingIndex = newStatus.findIndex(
                      (s) => s.step === data.step
                    );

                    if (existingIndex >= 0) {
                      newStatus[existingIndex] = {
                        step: data.step,
                        status: data.status,
                        message: data.message,
                      };
                    } else {
                      newStatus.push({
                        step: data.step,
                        status: data.status,
                        message: data.message,
                      });
                    }

                    return newStatus;
                  });
                } else if (data.type === "complete") {
                  setVideoUrl(data.videoUrl);
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setWorkflowStatus((prev) => [
        ...prev,
        {
          step: "Error",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: WorkflowStatus["status"]) => {
    switch (status) {
      case "completed":
        return "✓";
      case "processing":
        return "⟳";
      case "error":
        return "✗";
      default:
        return "○";
    }
  };

  const getStatusColor = (status: WorkflowStatus["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "processing":
        return "text-blue-500 animate-spin";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Instagram Auto Video Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Upload your photo/video, and we'll create a trending Instagram Reel automatically
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Upload Photo or Video
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              disabled={uploading}
            />
          </div>

          {file && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Selected file:</span> {file.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {uploading ? "Processing..." : "Generate & Upload Reel"}
          </button>
        </div>

        {workflowStatus.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              Workflow Progress
            </h2>
            <div className="space-y-4">
              {workflowStatus.map((status, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span
                    className={`text-2xl ${getStatusColor(status.status)} ${
                      status.status === "processing" ? "animate-spin" : ""
                    }`}
                  >
                    {getStatusIcon(status.status)}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      {status.step}
                    </h3>
                    {status.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {status.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              Generated Video
            </h2>
            <div className="aspect-[9/16] max-w-md mx-auto bg-black rounded-lg overflow-hidden">
              <video src={videoUrl} controls className="w-full h-full" />
            </div>
            <div className="mt-6 text-center">
              <p className="text-green-600 dark:text-green-400 font-semibold text-lg">
                ✓ Video uploaded to Instagram successfully!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
