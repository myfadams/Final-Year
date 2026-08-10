import { decode } from "base64-arraybuffer";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import * as tus from "tus-js-client";
import { supabase } from "./supabaseConfig";

interface UploadSchoolIDOptions {
  imageUri: string;
  userId: string;
  onProgress?: (progress: number) => void;
}

export const uploadSchoolID = async ({
  imageUri,
  userId,
  onProgress,
}: UploadSchoolIDOptions): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    // expo-file-system may not export EncodingType in some versions; use string literal
    encoding: "base64",
  });

  const fileData = decode(base64);

  const fileName = `${userId}-${Date.now()}.jpg`;
  const filePath = `schoolID/${fileName}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("User is not authenticated");
  }

  const projectId = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Supabase project ID is missing");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(Buffer.from(fileData), {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,

      retryDelays: [0, 3000, 5000, 10000],

      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },

      uploadDataDuringCreation: true,

      metadata: {
        bucketName: "images",
        objectName: filePath,
        contentType: "image/jpeg",
        cacheControl: "3600",
      },

      onError(error) {
        console.error("Upload failed:", error);
        reject(error);
      },

      onProgress(bytesUploaded, bytesTotal) {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);

        onProgress?.(percentage);
      },

      onSuccess() {
        console.log("School ID uploaded successfully");

        resolve(filePath);
      },
    });

    upload.start();
  });
};
