import * as tus from "tus-js-client";
import { supabase } from "./supabaseConfig";

interface UploadSchoolIDOptions {
  imageUri: string;
  userId?: string;
  onProgress?: (progress: number) => void;
}

export const uploadSchoolID = async ({
  imageUri,
  userId,
  onProgress,
}: UploadSchoolIDOptions): Promise<string> => {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("User is not authenticated");
  }

  const effectiveUserId = userId || session.user.id;
  const fileName = `${effectiveUserId}-${Date.now()}.jpg`;
  const filePath = `schoolID/${fileName}`;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const projectId =
    process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID ||
    supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectId) {
    throw new Error("Supabase project ID is missing");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(blob, {
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

      async onError(error) {
        console.warn("TUS Upload failed, trying standard Supabase storage upload...", error);
        try {
          const { error: sbError } = await supabase.storage
            .from("images")
            .upload(filePath, blob, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (sbError) throw sbError;
          onProgress?.(100);
          resolve(filePath);
        } catch (fallbackError) {
          console.error("Standard storage upload failed:", fallbackError);
          reject(error);
        }
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

export const getStoragePublicUrl = (filePath: string): string => {
  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
};

