import { API_CONFIG } from "@/lib/config";

/**
 * Performs a health check on the API backend.
 * * @param signal - Optional AbortSignal to cancel the request.
 * @returns Promise<boolean> - True if the server returns status "ok".
 */
export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/health?warpgate-target=Group 4 HTTP Backend`,
      { signal }
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Fetches a random issue summary and description from the server.
 * * @param signal - Optional AbortSignal to cancel the request.
 * @returns Promise - Object containing success status and issue data.
 */
export async function getRandomIssue(signal?: AbortSignal): Promise<{
  success: boolean;
  data?: { summary: string; description: string };
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/random?warpgate-target=Group 4 HTTP Backend`,
      {
        method: "GET",
        signal,
      },
    );

    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request cancelled" };
    }
    return {
      success: false,
      error: "Unable to reach the API. Please check your connection.",
    };
  }
}

// interface PredictionResult {
//   sentiment: 0 | 1;
// }
interface PredictionResult {
  task_id: string;
}
/**
 * Sends issue text to the ML model for classification.
 * Handles specific 503 errors when the model is still initializing.
 * * @param summary - The title/summary of the issue.
 * @param description - The full text description of the issue.
 * @param signal - Optional AbortSignal to cancel the request.
 * @returns Promise - Classification result (0 for NOT_ADD, 1 for ADD).
 */
export async function predictClassification(
  summary: string,
  description: string,
  signal?: AbortSignal,
): Promise<{ success: boolean; data?: PredictionResult; error?: string }> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/predict?warpgate-target=Group 4 HTTP Backend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: { summary, description } }),
        signal,
      },
    );

    if (response.status === 503) {
      return {
        success: false,
        error: "Model not loaded yet. Please wait and try again.",
      };
    }

    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request cancelled" };
    }
    return {
      success: false,
      error: "Unable to reach the API. Please check your connection.",
    };
  }
}

/**
 * Searches the document database for issues containing a specific keyword.
 * * @param keyword - The search term to query.
 * @param signal - Optional AbortSignal to cancel the request.
 * @returns Promise - Array of document ID strings.
 */
export async function searchKeyword(
  keyword: string,
  signal?: AbortSignal,
): Promise<{
  success: boolean;
  data?: Array<string>;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&warpgate-target=Group 4 HTTP Backend`,
      {
        method: "GET",
        signal,
      },
    );

    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data: data.results || data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request cancelled" };
    }
    return {
      success: false,
      error: "Unable to reach the API. Please check your connection.",
    };
  }
}

type IssueDocument = Record<string, unknown>;

/**
 * Fetches the full metadata for a specific issue document from the database using its ID.
 * * @param id - The unique identifier of the issue document to retrieve.
 * @returns A promise resolving to a result object:
 * - On success: { success: true, data: IssueDocument }
 * - On failure: { success: false, error: string }
 */
export async function getIssueById(
  id: string,
): Promise<{ success: boolean; data?: IssueDocument; error?: string }> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/issue/${encodeURIComponent(id)}?warpgate-target=Group 4 HTTP Backend`,
    );

    if (response.status === 404) {
      return { success: false, error: "Issue not found" };
    }

    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: "Unable to reach the API. Please check your connection.",
    };
  }
}

// The initial response from /predict
interface PredictResponse {
  task_id: string;
  status: string;
}

export function pollForResult(taskId: string): Promise<0 | 1> {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_CONFIG.baseUrl}/result/${taskId}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
          clearInterval(pollInterval);
          // This "completes" the Promise and returns the value to the caller
          resolve(data.sentiment);
        } else if (data.status === 'FAILURE') {
          clearInterval(pollInterval);
          reject(new Error("Prediction failed on the server."));
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, 1500);
  });
}