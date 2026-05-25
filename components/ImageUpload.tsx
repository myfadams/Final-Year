import Colors from "@/constants/Colors";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import UploadProgressLoader from "./uploadIcon";
interface ImageUploadProp {
  imageUri: string;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
}

const ImageUpload: React.FC<ImageUploadProp> = ({ imageUri, setDone }) => {
  const [progress, setProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);

  // Simulate upload
  useEffect(() => {
    setProgress(0);
    setUploadDone(false);
    setDone(true);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setUploadDone(true);
          setDone(false);
          return 100;
        }
        return p + 2;
      });
    }, 80);
    setDone(false);
    return () => clearInterval(t);
  }, [imageUri]);

  return (
    <View
      style={{
        flex: 1,
        // backgroundColor: '#fff',
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
        // source={"../designs/images.png"}
        style={{ flex: 1, width: "100%", height: "100%", borderRadius: 12 }}
        source={imageUri}
        // placeholder={{ blurhash }}
        contentFit="cover"
        blurRadius={uploadDone ? 0 : 100}
        // transition={1000}
      />
    </View>
  );
};

export default ImageUpload;
