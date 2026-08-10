import { getStoragePublicUrl, uploadSchoolID } from "@/backend/storage";
import Colors from "@/constants/Colors";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import UploadProgressLoader from "./uploadIcon";

interface ImageUploadProp {
  imageUri: string;
  userId?: string;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  onUploaded?: (publicUrl: string) => void;
}
const ImageUpload: React.FC<ImageUploadProp> = ({
  imageUri,
  userId,
  setDone,
  onUploaded,
}) => {
  const [progress, setProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const upload = async () => {
      try {
        setProgress(0);
        setUploadDone(false);
        setDone(true);

        const path = await uploadSchoolID({
          imageUri,
          userId,

          onProgress: (value) => {
            if (!cancelled) {
              setProgress(value);
            }
          },
        });

        if (!cancelled) {
          setProgress(100);
          setUploadDone(true);
          setDone(false);

          const publicUrl = getStoragePublicUrl(path);
          onUploaded?.(publicUrl);
        }
      } catch (error) {
        console.error("School ID upload failed:", error);

        if (!cancelled) {
          setDone(false);
          setUploadDone(false);
        }
      }
    };

    upload();

    return () => {
      cancelled = true;
    };
  }, [imageUri, userId]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        height: 250,
        borderColor: Colors.light.primary,
        borderWidth: 2,
        borderRadius: 12,
        position: "relative",
      }}
    >
      {!uploadDone && <UploadProgressLoader progress={progress} size={85} />}

      <Image
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          borderRadius: 12,
        }}
        source={imageUri}
        contentFit="cover"
        blurRadius={uploadDone ? 0 : 100}
      />
    </View>
  );
};
export default ImageUpload;
